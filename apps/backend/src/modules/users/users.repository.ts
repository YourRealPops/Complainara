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
   * Fetch within the caller's scope (built by common/scope.ts) — used for
   * anything route-reachable, so a BRANCH_ADMIN can never read or verify a
   * user outside their own branch.
   */
  findByIdScoped(id: string, where: Prisma.UserWhereInput) {
    return this.prisma.user.findFirst({ where: { id, ...where } });
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

  /**
   * List with the caller's visibility scope (built by common/scope.ts)
   * plus optional filters — the only listing entry point.
   */
  findAllScoped(
    where: Prisma.UserWhereInput,
    filters?: { role?: UserRole; unitId?: string; branchId?: string },
  ) {
    return this.prisma.user.findMany({
      where: {
        ...where,
        ...(filters?.role && { role: filters.role }),
        ...(filters?.unitId && { unitId: filters.unitId }),
        ...(filters?.branchId && { branchId: filters.branchId }),
      },
    });
  }

  /** Count users attached to a branch (used for branch-delete checks). */
  countByBranch(branchId: string) {
    return this.prisma.user.count({ where: { branchId } });
  }
}
