import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { SetCategoryRouteDto } from './dto/set-category-route.dto';
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

  /**
   * Per-branch routing (HQ policy): ORG_ADMIN sets where a category
   * routes inside each branch. No route = "needs routing" for that branch.
   */
  @Roles(UserRole.ORG_ADMIN)
  @Put(':id/routes')
  setRoute(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @Body() dto: SetCategoryRouteDto,
  ) {
    return this.categoriesService.setRoute(orgId, id, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Delete(':id/routes/:branchId')
  removeRoute(
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.categoriesService.removeRoute(orgId, id, branchId);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Get(':id/routes')
  listRoutes(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.categoriesService.listRoutes(orgId, id);
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
