import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Tenant-scoped fetch — user must belong to the given org. */
  findByIdInOrg(id: string, orgId: string) {
    return this.prisma.user.findFirst({ where: { id, orgId } });
  }

  /**
   * Tenant-scoped role update: updateMany with id + orgId so a role can
   * never be changed on a user outside the caller's org. Returns the
   * update count (0 means not found in this org).
   */
  updateRole(id: string, orgId: string, role: UserRole) {
    return this.prisma.user.updateMany({
      where: { id, orgId },
      data: { role },
    });
  }

  findAllByOrg(orgId: string, filters?: { role?: UserRole; unitId?: string }) {
    return this.prisma.user.findMany({
      where: {
        orgId,
        ...(filters?.role && { role: filters.role }),
        ...(filters?.unitId && { unitId: filters.unitId }),
      },
    });
  }
}
