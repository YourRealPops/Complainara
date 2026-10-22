import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitsRepository } from './units.repository';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { BranchesService } from '../branches/branches.service';
import { branchScopedWhere } from '../../common/scope';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class UnitsService {
  constructor(
    private readonly unitsRepository: UnitsRepository,
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * BRANCH_ADMIN: always creates in their own branch (a dto.branchId naming
   * another branch is rejected). ORG_ADMIN: any branch in the org, or none
   * for an HQ unit.
   */
  async create(actor: JwtPayload, dto: CreateUnitDto) {
    let branchId: string | null;

    if (actor.role === 'BRANCH_ADMIN') {
      if (!actor.branchId) {
        throw new ForbiddenException('Your account has no branch');
      }
      if (dto.branchId && dto.branchId !== actor.branchId) {
        throw new ForbiddenException(
          'Branch admins can only create units in their own branch',
        );
      }
      branchId = actor.branchId;
    } else {
      if (dto.branchId) {
        // Throws NotFound if the branch doesn't exist or is in another org
        await this.branchesService.findByIdInOrg(dto.branchId, actor.orgId);
      }
      branchId = dto.branchId ?? null;
    }

    return this.unitsRepository.create(actor.orgId, dto.name, branchId);
  }

  async update(id: string, actor: JwtPayload, dto: UpdateUnitDto) {
    // Scoped fetch: a BRANCH_ADMIN reaching for another branch's unit 404s
    await this.findByIdScoped(id, actor);

    let branchUpdate: { branchId?: string | null } = {};
    if (dto.branchId !== undefined) {
      if (actor.role === 'BRANCH_ADMIN') {
        // Moving a unit to another branch is an HQ decision
        throw new ForbiddenException(
          'Branch admins cannot move units between branches',
        );
      }
      if (dto.branchId) {
        // Throws NotFound if the branch is outside the org
        await this.branchesService.findByIdInOrg(dto.branchId, actor.orgId);
      }
      branchUpdate = { branchId: dto.branchId ?? null };
    }

    await this.unitsRepository.update(id, actor.orgId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...branchUpdate,
    });
    return this.findByIdScoped(id, actor);
  }

  async delete(id: string, actor: JwtPayload) {
    // Scoped fetch: 404 outside the caller's scope
    await this.findByIdScoped(id, actor);

    // A unit that is a category's route target must be un-routed first —
    // explicit over silent cascade (matches the branch-delete 409 rule).
    const routes = await this.unitsRepository.countRoutesTargeting(id);
    if (routes > 0) {
      throw new ConflictException(
        `Unit is the routing target of ${routes} category route(s) — update the routing first`,
      );
    }

    await this.unitsRepository.delete(id, actor.orgId);
  }

  /**
   * List with caller visibility: HQ sees all org units, BRANCH_ADMIN their
   * branch, everyone else their branch's units.
   */
  findAllByOrg(actor: JwtPayload) {
    return this.unitsRepository.findAllScoped(branchScopedWhere(actor));
  }

  async findById(id: string, orgId: string) {
    const unit = await this.unitsRepository.findById(id, orgId);
    if (!unit) {
      throw new NotFoundException(`Unit with id ${id} not found`);
    }
    return unit;
  }

  /** Scope-verified fetch — 404 for anything outside the caller's scope. */
  async findByIdScoped(id: string, actor: JwtPayload) {
    const unit = await this.unitsRepository.findByIdScoped(
      id,
      branchScopedWhere(actor),
    );
    if (!unit) {
      throw new NotFoundException(`Unit with id ${id} not found`);
    }
    return unit;
  }

  /**
   * Validates that a unit exists in the org AND belongs to the expected
   * branch (used when creating RESOLVER users: unit and branch must match).
   */
  async findByIdInBranch(id: string, orgId: string, branchId: string | null) {
    const unit = await this.findById(id, orgId);
    if (unit.branchId !== branchId) {
      throw new NotFoundException(`Unit with id ${id} not found`);
    }
    return unit;
  }
}
