import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
        ...(dto.defaultUnitId && {
          defaultUnit: { connect: { id: dto.defaultUnitId } },
        }),
      },
    });
  }

  update(
    id: string,
    orgId: string,
    data: Partial<{ name: string; slaHours: number; defaultUnitId: string }>,
  ) {
    return this.prisma.category.updateMany({
      where: { id, orgId },
      data,
    });
  }

  delete(id: string, orgId: string) {
    return this.prisma.category.deleteMany({
      where: { id, orgId },
    });
  }

  findAllByOrg(orgId: string) {
    return this.prisma.category.findMany({ where: { orgId } });
  }

  findById(id: string, orgId: string) {
    return this.prisma.category.findFirst({ where: { id, orgId } });
  }
}
