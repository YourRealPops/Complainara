import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, name: string, branchId: string | null) {
    return this.prisma.unit.create({
      data: {
        name,
        organization: { connect: { id: orgId } },
        ...(branchId && { branch: { connect: { id: branchId } } }),
      },
    });
  }

  update(
    id: string,
    orgId: string,
    data: Partial<{ name: string; branchId: string | null }>,
  ) {
    // updateMany accepts the relation scalar directly (no connect/disconnect).
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

  /**
   * List with the caller's visibility scope (built by common/scope.ts) —
   * the only listing entry point.
   */
  findAllScoped(where: Prisma.UnitWhereInput) {
    return this.prisma.unit.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.unit.findFirst({ where: { id, orgId } });
  }

  /** Fetch within the caller's visibility scope (common/scope.ts). */
  findByIdScoped(id: string, where: Prisma.UnitWhereInput) {
    return this.prisma.unit.findFirst({ where: { id, ...where } });
  }

  /** Count units attached to a branch (used for branch-delete checks). */
  countByBranch(branchId: string) {
    return this.prisma.unit.count({ where: { branchId } });
  }

  /** Category-route rows targeting this unit (delete blocker). */
  countRoutesTargeting(unitId: string) {
    return this.prisma.categoryRoute.count({ where: { unitId } });
  }
}
