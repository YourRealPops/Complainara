import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UnitsService } from '../units/units.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly unitsService: UnitsService,
  ) {}

  async create(orgId: string, dto: CreateCategoryDto) {
    if (dto.defaultUnitId) {
      // Throws NotFoundException automatically if the unit doesn't belong to this org
      await this.unitsService.findById(dto.defaultUnitId, orgId);
    }
    return this.categoriesRepository.create(orgId, dto);
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
}
