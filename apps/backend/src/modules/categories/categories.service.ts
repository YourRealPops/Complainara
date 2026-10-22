import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { SetCategoryRouteDto } from './dto/set-category-route.dto';
import { UnitsService } from '../units/units.service';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly unitsService: UnitsService,
    private readonly branchesService: BranchesService,
  ) {}

  create(orgId: string, dto: CreateCategoryDto) {
    return this.categoriesRepository.create(orgId, dto);
  }

  async update(
    id: string,
    orgId: string,
    dto: Partial<{ name: string; slaHours: number }>,
  ) {
    // Confirms it exists and belongs to this org first — clean 404 instead of a silent no-op
    await this.findById(id, orgId);

    await this.categoriesRepository.update(id, orgId, dto);
    return this.findById(id, orgId);
  }

  async delete(id: string, orgId: string) {
    await this.findById(id, orgId);
    await this.categoriesRepository.delete(id, orgId);
  }

  findAllByOrg(orgId: string) {
    return this.categoriesRepository.findAllByOrg(orgId);
  }

  async findById(id: string, orgId: string) {
    const category = await this.categoriesRepository.findById(id, orgId);
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  // ---- Per-branch routing (ORG_ADMIN manages; HQ policy stays org-wide) ----

  /**
   * Set where complaints of this category route within a branch.
   * Validates: category in org, branch in org, unit belongs to that branch.
   */
  async setRoute(
    orgId: string,
    categoryId: string,
    dto: SetCategoryRouteDto,
  ) {
    await this.findById(categoryId, orgId);
    // 404 if the branch is outside the org
    await this.branchesService.findByIdInOrg(dto.branchId, orgId);
    // 404 if the unit is outside the org or in a DIFFERENT branch
    await this.unitsService.findByIdInBranch(dto.unitId, orgId, dto.branchId);

    const route = await this.categoriesRepository.upsertRoute(
      categoryId,
      dto.branchId,
      dto.unitId,
    );
    return this.categoriesRepository.findRoute(categoryId, route.branchId);
  }

  async removeRoute(
    orgId: string,
    categoryId: string,
    branchId: string,
  ) {
    await this.findById(categoryId, orgId);
    const result = await this.categoriesRepository.deleteRoute(
      categoryId,
      branchId,
    );
    if (result.count === 0) {
      throw new NotFoundException(
        `No routing configured for this category in branch ${branchId}`,
      );
    }
  }

  async listRoutes(orgId: string, categoryId: string) {
    // 404 unless the category belongs to this org
    await this.findById(categoryId, orgId);
    return this.categoriesRepository.listRoutes(categoryId);
  }

  /**
   * Complaint-creation routing lookup: the unit configured for the
   * category + the complainant's branch. No route -> null ("needs routing",
   * shown to the branch admin).
   */
  findRouteForComplaint(categoryId: string, branchId: string) {
    return this.categoriesRepository.findRoute(categoryId, branchId);
  }
}
