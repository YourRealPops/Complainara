import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { generateJoinCode } from '../../common/utils/join-code';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class BranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}

  /** ORG_ADMIN only (controller-enforced). */
  async create(actor: JwtPayload, dto: CreateBranchDto) {
    return this.branchesRepository.create({
      orgId: actor.orgId,
      name: dto.name,
      location: dto.location ?? null,
      joinCode: generateJoinCode(),
    });
  }

  /**
   * ORG_ADMIN: all branches in the org. BRANCH_ADMIN: their own branch
   * only. A Branch row has no branch_id (it IS the branch), so the scope
   * matches on the branch's own id — fail-closed to a non-matching id when
   * a BRANCH_ADMIN somehow has no branch.
   */
  findAllByOrg(actor: JwtPayload) {
    if (actor.role === 'BRANCH_ADMIN') {
      return this.branchesRepository.findAllScoped({
        orgId: actor.orgId,
        id: actor.branchId ?? '__no-such-branch__',
      });
    }
    return this.branchesRepository.findAllScoped({ orgId: actor.orgId });
  }

  /**
   * ORG_ADMIN only (controller-enforced). 404s outside the org so branch
   * ids from other tenants can't be probed.
   */
  async update(id: string, actor: JwtPayload, dto: UpdateBranchDto) {
    await this.findByIdInOrg(id, actor.orgId);
    await this.branchesRepository.update(id, actor.orgId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.location !== undefined && { location: dto.location }),
    });
    return this.findByIdInOrg(id, actor.orgId);
  }

  /**
   * ORG_ADMIN only (controller-enforced).
   * - The org's "Main" branch can never be deleted (it carries the
   *   organization's original join code and is the default branch).
   * - A branch with users, units, or complaints is blocked with a 409
   *   listing what's attached — HQ reassigns/deletes those first.
   */
  async delete(id: string, actor: JwtPayload) {
    const branch = await this.findByIdInOrg(id, actor.orgId);
    if (branch.name === 'Main') {
      throw new BadRequestException(
        'The Main branch cannot be deleted — reassign its contents first',
      );
    }

    const attached = await this.branchesRepository.countAttached(id);
    if (attached.total > 0) {
      throw new ConflictException(
        `Branch still has ${attached.users} user(s), ${attached.units} unit(s) and ${attached.complaints} complaint(s) — reassign or delete them first`,
      );
    }

    const result = await this.branchesRepository.delete(id, actor.orgId);
    if (result.count === 0) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }
  }

  /**
   * ORG_ADMIN: any branch in the org. BRANCH_ADMIN: their own branch only —
   * any other id is a 404 (no cross-branch probing).
   */
  async getJoinCode(id: string, actor: JwtPayload) {
    const branch = await this.findVisibleBranch(id, actor);
    return { joinCode: branch.joinCode };
  }

  /** Same permissions as getJoinCode. */
  async regenerateJoinCode(id: string, actor: JwtPayload) {
    const branch = await this.findVisibleBranch(id, actor);
    const newCode = generateJoinCode();
    await this.branchesRepository.updateJoinCode(id, branch.orgId, newCode);
    return { joinCode: newCode };
  }

  private async findVisibleBranch(id: string, actor: JwtPayload) {
    if (actor.role === 'BRANCH_ADMIN') {
      if (!actor.branchId || actor.branchId !== id) {
        // Same 404 whether the id exists or not — no cross-branch probing
        throw new NotFoundException(`Branch with id ${id} not found`);
      }
    }
    const branch = await this.findByIdInOrg(id, actor.orgId);
    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }
    return branch;
  }

  // ---- Internal, trusted flows (auth / signup) ----

  async findByIdInOrg(id: string, orgId: string) {
    const branch = await this.branchesRepository.findByIdInOrg(id, orgId);
    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }
    return branch;
  }

  findByJoinCode(joinCode: string) {
    return this.branchesRepository.findByJoinCode(joinCode);
  }

  /**
   * Signup flow: every new org gets a default "Main" branch. When a join
   * code is supplied it is shared with the org record (kept for the
   * rollback window) so old and new join paths agree.
   */
  createDefaultBranch(orgId: string, joinCode: string) {
    return this.branchesRepository.create({
      orgId,
      name: 'Main',
      location: null,
      joinCode,
    });
  }

  findMainByOrg(orgId: string) {
    return this.branchesRepository.findMainByOrg(orgId);
  }

  /**
   * The org's Main-branch join code — used by the organizations
   * join-code endpoints so a single code lives on the branch.
   */
  async getMainJoinCode(orgId: string) {
    const main = await this.branchesRepository.findMainByOrg(orgId);
    if (!main) {
      throw new NotFoundException('This organization has no Main branch');
    }
    return main;
  }

  async regenerateMainJoinCode(orgId: string) {
    const main = await this.getMainJoinCode(orgId);
    const newCode = generateJoinCode();
    await this.branchesRepository.updateJoinCode(main.id, orgId, newCode);
    return { joinCode: newCode };
  }
}
