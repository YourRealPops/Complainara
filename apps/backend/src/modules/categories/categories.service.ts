import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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

  async update(id: string, orgId: string, dto: UpdateCategoryDto) {
    // Confirms it exists and belongs to this org first — clean 404 instead of a silent no-op
    await this.findById(id, orgId);

    if (dto.defaultUnitId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.unitsService.findById(dto.defaultUnitId, orgId);
    }

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
}
