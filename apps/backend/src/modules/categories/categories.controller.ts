import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles(UserRole.ORG_ADMIN)
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(orgId, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, orgId, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.categoriesService.delete(id, orgId);
  }

  @Get()
  findAllByOrg(@CurrentOrg() orgId: string) {
    return this.categoriesService.findAllByOrg(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.categoriesService.findById(id, orgId);
  }
}
