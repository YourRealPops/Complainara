import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { orgId: string; name: string; location: string | null; joinCode: string }) {
    return this.prisma.branch.create({
      data: {
        organization: { connect: { id: data.orgId } },
        name: data.name,
        location: data.location,
        joinCode: data.joinCode,
      },
    });
  }

  /** Scope-based list: the single listing entry point. */
  findAllScoped(where: Prisma.BranchWhereInput) {
    return this.prisma.branch.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { users: true, units: true, complaints: true },
        },
      },
    });
  }

  findByIdScoped(id: string, where: Prisma.BranchWhereInput) {
    return this.prisma.branch.findFirst({ where: { id, ...where } });
  }

  findByIdInOrg(id: string, orgId: string) {
    return this.prisma.branch.findFirst({ where: { id, orgId } });
  }

  findMainByOrg(orgId: string) {
    return this.prisma.branch.findFirst({
      where: { orgId, name: 'Main' },
    });
  }

  findByJoinCode(joinCode: string) {
    return this.prisma.branch.findUnique({
      where: { joinCode },
      include: { organization: true },
    });
  }

  update(id: string, orgId: string, data: Prisma.BranchUpdateManyMutationInput) {
    return this.prisma.branch.updateMany({ where: { id, orgId }, data });
  }

  updateJoinCode(id: string, orgId: string, joinCode: string) {
    return this.prisma.branch.updateMany({
      where: { id, orgId },
      data: { joinCode },
    });
  }

  delete(id: string, orgId: string) {
    return this.prisma.branch.deleteMany({ where: { id, orgId } });
  }

  /** Attachment counts used by the delete guard (409 when non-zero). */
  async countAttached(id: string) {
    const [users, units, complaints] = await Promise.all([
      this.prisma.user.count({ where: { branchId: id } }),
      this.prisma.unit.count({ where: { branchId: id } }),
      this.prisma.complaint.count({ where: { branchId: id } }),
    ]);
    return { users, units, complaints, total: users + units + complaints };
  }
}
