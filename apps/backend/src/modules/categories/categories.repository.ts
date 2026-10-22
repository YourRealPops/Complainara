import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slaHours: dto.slaHours,
        organization: { connect: { id: orgId } },
      },
    });
  }

  update(
    id: string,
    orgId: string,
    data: Partial<{ name: string; slaHours: number }>,
  ) {
    return this.prisma.category.updateMany({
      where: { id, orgId },
      data,
    });
  }

  /** Category delete — routes go first (their FK would block the delete). */
  async delete(id: string, orgId: string) {
    return this.prisma.$transaction([
      this.prisma.categoryRoute.deleteMany({ where: { categoryId: id } }),
      this.prisma.category.deleteMany({ where: { id, orgId } }),
    ]);
  }

  findAllByOrg(orgId: string) {
    return this.prisma.category.findMany({ where: { orgId } });
  }

  findById(id: string, orgId: string) {
    return this.prisma.category.findFirst({ where: { id, orgId } });
  }

  // ---- CategoryRoute (per-branch routing) ----

  /** Upsert the (categoryId, branchId) -> unitId mapping. */
  upsertRoute(categoryId: string, branchId: string, unitId: string) {
    return this.prisma.categoryRoute.upsert({
      where: {
        categoryId_branchId: { categoryId, branchId },
      },
      create: { categoryId, branchId, unitId },
      update: { unitId },
    });
  }

  findRoute(categoryId: string, branchId: string) {
    return this.prisma.categoryRoute.findUnique({
      where: {
        categoryId_branchId: { categoryId, branchId },
      },
    });
  }

  listRoutes(categoryId: string) {
    return this.prisma.categoryRoute.findMany({
      where: { categoryId },
      include: {
        branch: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    });
  }

  deleteRoute(categoryId: string, branchId: string) {
    return this.prisma.categoryRoute.deleteMany({
      where: { categoryId, branchId },
    });
  }
}
