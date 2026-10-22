import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ComplaintPriority, ComplaintStatus } from '@prisma/client';

type CreateComplaintData = {
  orgId: string;
  complainantId: string;
  categoryId: string;
  assignedUnitId: string | null;
  branchId: string | null;
  title: string;
  description: string;
  location: string;
  priority?: ComplaintPriority;
  slaDueAt: Date | null;
};

/** Consistent include for list/detail reads. */
const COMPLAINT_INCLUDE = {
  category: true,
  assignedUnit: true,
  assignedResolver: { select: { id: true, name: true } },
} satisfies Prisma.ComplaintInclude;

@Injectable()
export class ComplaintsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateComplaintData) {
    return this.prisma.complaint.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        priority: data.priority,
        slaDueAt: data.slaDueAt,
        organization: { connect: { id: data.orgId } },
        complainant: { connect: { id: data.complainantId } },
        category: { connect: { id: data.categoryId } },
        branch: data.branchId ? { connect: { id: data.branchId } } : undefined,
        ...(data.assignedUnitId && {
          assignedUnit: { connect: { id: data.assignedUnitId } },
        }),
      },
    });
  }

  /**
   * List with a caller scope built by common/scope.ts — the only listing
   * entry point. Scope failures yield an empty result, never wider data.
   */
  findAllScoped(where: Prisma.ComplaintWhereInput) {
    return this.prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: COMPLAINT_INCLUDE,
    });
  }

  /**
   * Fetch by id within the caller's scope — the only single-fetch entry
   * point for route-reachable flows. Out-of-scope ids return null (404).
   */
  findByIdScoped(id: string, where: Prisma.ComplaintWhereInput) {
    return this.prisma.complaint.findFirst({
      where: { id, ...where },
      include: {
        ...COMPLAINT_INCLUDE,
        updates: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Status transition + audit entry. The updateMany is scoped with the
   * caller's full scope (id + org + branch/role clause): if the complaint
   * left the scope mid-flight, count is 0 and we report not-found.
   */
  async updateStatus(
    id: string,
    where: Prisma.ComplaintWhereInput,
    authorId: string,
    oldStatus: ComplaintStatus,
    newStatus: ComplaintStatus,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.complaint.updateMany({
        where: { id, ...where },
        data: {
          status: newStatus,
          ...(newStatus === 'RESOLVED' && { resolvedAt: new Date() }),
        },
      });
      if (result.count === 0) {
        return null;
      }

      await tx.complaintUpdate.create({
        data: {
          complaintId: id,
          authorId,
          oldStatus,
          newStatus,
          note,
        },
      });

      return tx.complaint.findFirst({
        where: { id, ...where },
        include: {
          ...COMPLAINT_INCLUDE,
          updates: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Assign / reassign / unassign a resolver, with an audit-log entry.
   * The updateMany is scoped with the caller's full scope (tenant +
   * branch isolation): count 0 means not-found in scope.
   * The status itself does not change — oldStatus === newStatus keeps the
   * existing ComplaintUpdate pattern intact, the note carries the details.
   */
  async assign(
    id: string,
    where: Prisma.ComplaintWhereInput,
    authorId: string,
    resolverId: string | null,
    oldStatus: ComplaintStatus,
    note: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.complaint.updateMany({
        where: { id, ...where },
        data: { assignedResolverId: resolverId },
      });
      if (result.count === 0) {
        return null;
      }

      await tx.complaintUpdate.create({
        data: {
          complaintId: id,
          authorId,
          oldStatus,
          newStatus: oldStatus,
          note,
        },
      });

      return tx.complaint.findFirst({
        where: { id, ...where },
        include: {
          ...COMPLAINT_INCLUDE,
          updates: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Counts for the resolver's queue stats strip, scoped by the caller's
   * scope where clause (built in common/scope.ts). overdue also counts
   * ESCALATED — an escalated complaint is by definition one whose SLA was
   * missed.
   */
  getQueueSummary(where: Prisma.ComplaintWhereInput) {
    const now = new Date();

    return Promise.all([
      this.prisma.complaint.count({
        where: { ...where, status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.complaint.count({
        where: {
          // AND (not a top-level OR) so the scope clause in `where`
          // isn't overwritten by the overdue conditions.
          AND: [
            where,
            { status: { notIn: ['RESOLVED', 'CLOSED'] } },
            { OR: [{ slaDueAt: { lt: now } }, { status: 'ESCALATED' }] },
          ],
        },
      }),
      this.prisma.complaint.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),
      this.prisma.complaint.count({
        where: {
          ...where,
          status: 'RESOLVED',
          resolvedAt: { gte: startOfToday(now) },
        },
      }),
    ]).then(([needsAction, overdue, inProgress, resolvedToday]) => ({
      needsAction,
      overdue,
      inProgress,
      resolvedToday,
    }));
  }

  /**
   * Find all complaints that are past their SLA deadline and not yet
   * in a terminal or already-escalated state.
   * Used by the escalation cron job — no orgId filter since the job
   * runs across all tenants.
   */
  findOverdueComplaints() {
    return this.prisma.complaint.findMany({
      where: {
        slaDueAt: { lt: new Date() },
        status: {
          notIn: ['RESOLVED', 'CLOSED', 'ESCALATED'],
        },
      },
    });
  }

  /**
   * Tier-1 candidates already escalated but never taken to the next tier:
   * status ESCALATED, level 1, not resolved since.
   * Used by the escalation cron job.
   */
  findTierOneEscalated() {
    return this.prisma.complaint.findMany({
      where: {
        status: 'ESCALATED',
        escalationLevel: 1,
        resolvedAt: null,
      },
    });
  }

  /** When the complaint was escalated to tier 1 (from its audit log). */
  getEscalatedAt(complaintId: string) {
    return this.prisma.complaintUpdate.findFirst({
      where: { complaintId, newStatus: 'ESCALATED' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
  }

  /**
   * Escalate a complaint to the given level and log the update.
   * No authorId — the system user (null) is used as the author for
   * automated transitions.
   */
  async escalateComplaint(
    id: string,
    oldStatus: ComplaintStatus,
    level: 1 | 2,
    note: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { status: 'ESCALATED', escalationLevel: level },
      });

      await tx.complaintUpdate.create({
        data: {
          complaintId: id,
          authorId: '00000000-0000-0000-0000-000000000000', // system user
          oldStatus,
          newStatus: 'ESCALATED',
          note,
        },
      });

      return tx.complaint.findFirst({ where: { id } });
    });
  }
}

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
