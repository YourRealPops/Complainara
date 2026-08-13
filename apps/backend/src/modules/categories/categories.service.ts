import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  create(orgId: string, dto: CreateCategoryDto) {
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
