import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Aggregation queries for HQ monitoring. Only this repository touches
 * Prisma, per the project's Controller -> Service -> Repository layout.
 */
@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  branchesOf(orgId: string) {
    return this.prisma.branch.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
  }

  /** Per-branch counts for a filtered set of statuses. */
  countByBranch(
    where: Prisma.ComplaintWhereInput,
  ) {
    return this.prisma.complaint.groupBy({
      by: ['branchId'],
      where,
      _count: { _all: true },
    });
  }

  /** Resolved complaints' timing rows for avg-resolution + SLA-hit-rate. */
  resolvedRows(where: Prisma.ComplaintWhereInput) {
    return this.prisma.complaint.findMany({
      where,
      select: {
        branchId: true,
        createdAt: true,
        resolvedAt: true,
        slaDueAt: true,
      },
    });
  }

  /** Level-2 escalations flagged to HQ (top of the overview page). */
  levelTwoEscalations(where: Prisma.ComplaintWhereInput, limit = 20) {
    return this.prisma.complaint.findMany({
      where: { ...where, escalationLevel: 2, status: 'ESCALATED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        slaDueAt: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
      },
    });
  }

  /** Paginated audit log built on complaint_updates, scoped + filterable. */
  async auditLog(
    where: Prisma.ComplaintWhereInput,
    opts: { page: number; pageSize: number; complaintId?: string },
  ) {
    const complaintWhere: Prisma.ComplaintUpdateWhereInput = {
      complaint: where,
      ...(opts.complaintId && { complaintId: opts.complaintId }),
    };

    const [total, entries] = await Promise.all([
      this.prisma.complaintUpdate.count({ where: complaintWhere }),
      this.prisma.complaintUpdate.findMany({
        where: complaintWhere,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: {
          author: { select: { id: true, name: true } },
          complaint: {
            select: {
              id: true,
              title: true,
              branchId: true,
              branch: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { total, page: opts.page, pageSize: opts.pageSize, entries };
  }
}
