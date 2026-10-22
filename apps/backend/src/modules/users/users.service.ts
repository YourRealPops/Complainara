import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UnitsService } from '../units/units.service';
import { BranchesService } from '../branches/branches.service';
import { userScopeWhere } from '../../common/scope';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 10;

/** HQ roles never belong to a branch. */
function isHQRole(role: UserRole): boolean {
  return role === UserRole.ORG_ADMIN || role === UserRole.SUPER_ADMIN;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly unitsService: UnitsService,
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * Trusted internal creation (signup / join flows) — the org and branch
   * come from server-resolved data, not from a client token. No role or
   * branch validation here: callers are the auth flows themselves.
   */
  async create(dto: CreateUserDto) {
    return this.persist(dto.orgId, dto, dto.branchId ?? null);
  }

  /**
   * Authenticated creation (POST /users):
   * - The caller's org from the JWT is authoritative; a body orgId that
   *   disagrees is rejected rather than silently honored.
   * - ORG_ADMIN: may create any role; HQ roles (ORG_ADMIN/SUPER_ADMIN)
   *   always get branchId = null; branch roles need a branch in the org.
   * - BRANCH_ADMIN: may ONLY create COMPLAINANT and RESOLVER users, always
   *   in their own branch (privilege escalation blocked).
   * - RESOLVER requires a branchId and a unitId belonging to that branch.
   */
  async createInOrg(actor: JwtPayload, dto: CreateUserDto) {
    if (dto.orgId && dto.orgId !== actor.orgId) {
      throw new ForbiddenException(
        'Cannot create users in another organization',
      );
    }

    const role = dto.role ?? UserRole.COMPLAINANT;
    const isBranchAdmin = actor.role === UserRole.BRANCH_ADMIN;

    if (isBranchAdmin) {
      // Privilege escalation guards: branch admins create foot soldiers only
      if (role !== UserRole.COMPLAINANT && role !== UserRole.RESOLVER) {
        throw new ForbiddenException(
          'Branch admins can only create COMPLAINANT or RESOLVER users',
        );
      }
      if (!actor.branchId) {
        throw new ForbiddenException('Your account has no branch');
      }
      if (dto.branchId && dto.branchId !== actor.branchId) {
        throw new ForbiddenException(
          'Branch admins can only create users in their own branch',
        );
      }
    }

    // Resolve + validate the target branch
    let branchId: string | null;
    if (isHQRole(role)) {
      branchId = null; // HQ users are never attached to a branch
    } else if (isBranchAdmin) {
      branchId = actor.branchId ?? null;
    } else {
      if (!dto.branchId) {
        throw new BadRequestException(
          `branchId is required when creating a ${role} user`,
        );
      }
      // Throws NotFound if the branch doesn't exist or is in another org
      await this.branchesService.findByIdInOrg(dto.branchId, actor.orgId);
      branchId = dto.branchId;
    }

    // Unit validation: must exist in the org, and for branch users it must
    // belong to the SAME branch. RESOLVER requires one.
    if (role === UserRole.RESOLVER && !dto.unitId) {
      throw new BadRequestException('A RESOLVER user requires a unitId');
    }
    if (dto.unitId) {
      await this.unitsService.findByIdInBranch(
        dto.unitId,
        actor.orgId,
        branchId,
      );
    }

    return this.persist(actor.orgId, dto, branchId);
  }

  private async persist(
    orgId: string,
    dto: CreateUserDto,
    branchId: string | null,
  ) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role ?? UserRole.COMPLAINANT,
      organization: { connect: { id: orgId } },
      ...(dto.unitId && { unit: { connect: { id: dto.unitId } } }),
      ...(branchId && { branch: { connect: { id: branchId } } }),
    });

    return this.sanitize(user);
  }

  // Returns the raw user including password hash — used only by AuthService to verify credentials
  async findByEmailWithPassword(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.sanitize(user);
  }

  /**
   * Scope-verified fetch: HQ reads any user in the org, BRANCH_ADMIN only
   * users in their branch (404 otherwise — no cross-branch probing).
   */
  async findByIdScoped(id: string, actor: JwtPayload) {
    const user = await this.usersRepository.findByIdScoped(
      id,
      userScopeWhere(actor),
    );
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.sanitize(user);
  }

  /**
   * Tenant-scoped role change (ORG_ADMIN only — controller-enforced).
   * Guards against creating unassignable states:
   * - RESOLVER requires the target to already have a unit + branch
   * - BRANCH_ADMIN requires the target to have a branch
   */
  async updateRole(id: string, actor: JwtPayload, role: UserRole) {
    const target = await this.findByIdScoped(id, actor);

    if (role === UserRole.RESOLVER && (!target.unitId || !target.branchId)) {
      throw new BadRequestException(
        'A user must have a branch and a unit before becoming a RESOLVER',
      );
    }
    if (role === UserRole.BRANCH_ADMIN && !target.branchId) {
      throw new BadRequestException(
        'A user must have a branch before becoming a BRANCH_ADMIN',
      );
    }

    const result = await this.usersRepository.updateRole(
      id,
      actor.orgId,
      role,
    );
    if (result.count === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.findByIdScoped(id, actor);
  }

  /**
   * Org member list with the caller's visibility scope: ORG_ADMIN /
   * SUPER_ADMIN see everyone, BRANCH_ADMIN only their branch.
   * Filters let the admin UI populate assignment dropdowns
   * (?role=RESOLVER, ?unitId=..., ?branchId=...).
   */
  async findAllByOrg(
    actor: JwtPayload,
    filters?: { role?: UserRole; unitId?: string; branchId?: string },
  ) {
    const users = await this.usersRepository.findAllScoped(
      userScopeWhere(actor),
      filters,
    );
    return users.map((user) => this.sanitize(user));
  }

  // Strips the password hash before returning user data to any client
  private sanitize<T extends { password: string }>(
    user: T,
  ): Omit<T, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }
}
