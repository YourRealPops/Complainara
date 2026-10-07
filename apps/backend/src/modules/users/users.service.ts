import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UnitsService } from '../units/units.service';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly unitsService: UnitsService,
  ) {}

  /**
   * Trusted internal creation (signup / join flows) — the org comes from
   * the server-resolved dto, not from a client token.
   */
  async create(dto: CreateUserDto) {
    return this.createInOrg(dto.orgId, dto);
  }

  /**
   * Authenticated creation (POST /users, ORG_ADMIN): the caller's org from
   * the JWT is authoritative. A body orgId that disagrees with the token is
   * rejected rather than silently honored. unitId, when given, must reference
   * a unit in the SAME org.
   */
  async createInOrg(orgId: string, dto: CreateUserDto) {
    if (dto.orgId && dto.orgId !== orgId) {
      throw new ForbiddenException(
        'Cannot create users in another organization',
      );
    }

    // Throws NotFound if the unit doesn't exist or belongs to another org
    if (dto.unitId) {
      await this.unitsService.findById(dto.unitId, orgId);
    }

    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      organization: { connect: { id: orgId } },
      ...(dto.unitId && { unit: { connect: { id: dto.unitId } } }),
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

  /** Tenant-scoped fetch: 404 unless the user belongs to the given org. */
  async findByIdInOrg(id: string, orgId: string) {
    const user = await this.usersRepository.findByIdInOrg(id, orgId);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.sanitize(user);
  }

  /** Tenant-scoped role change: the target user must be in the caller's org. */
  async updateRole(id: string, orgId: string, role: UserRole) {
    await this.findByIdInOrg(id, orgId);
    const result = await this.usersRepository.updateRole(id, orgId, role);
    if (result.count === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.findByIdInOrg(id, orgId);
  }

  async findAllByOrg(
    orgId: string,
    filters?: { role?: UserRole; unitId?: string },
  ) {
    const users = await this.usersRepository.findAllByOrg(orgId, filters);
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
