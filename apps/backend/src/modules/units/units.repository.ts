import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, name: string) {
    return this.prisma.unit.create({
      data: { name, organization: { connect: { id: orgId } } },
    });
  }

  update(id: string, orgId: string, data: Partial<{ name: string }>) {
    return this.prisma.unit.updateMany({
      where: { id, orgId },
      data,
    });
  }

  delete(id: string, orgId: string) {
    return this.prisma.unit.deleteMany({
      where: { id, orgId },
    });
  }

  findAllByOrg(orgId: string) {
    return this.prisma.unit.findMany({ where: { orgId } });
  }

  findById(id: string, orgId: string) {
    return this.prisma.unit.findFirst({ where: { id, orgId } });
  }
}
