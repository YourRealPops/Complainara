import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ComplaintPriority, ComplaintStatus } from '@prisma/client';

type CreateComplaintData = {
  orgId: string;
  complainantId: string;
  categoryId: string;
  assignedUnitId: string | null;
  title: string;
  description: string;
  location: string;
  priority?: ComplaintPriority;
  slaDueAt: Date | null;
};

/**
 * Tenant/role filter for resolver views — always org-scoped, always
 * "assigned to me OR filed by me". Unit membership grants nothing:
 * a resolver only sees complaints specifically assigned to them
 * (plus ones they filed personally). A resolver with no assignments
 * simply gets an empty queue, not an error.
 */
export function getResolverWhere(
  orgId: string,
  userId: string,
): Prisma.ComplaintWhereInput {
  return {
    orgId,
    OR: [{ assignedResolverId: userId }, { complainantId: userId }],
  };
}

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
        ...(data.assignedUnitId && {
          assignedUnit: { connect: { id: data.assignedUnitId } },
        }),
      },
    });
  }

  findAllByOrg(orgId: string) {
    return this.prisma.complaint.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: COMPLAINT_INCLUDE,
    });
  }

  /** Only complaints filed by this user */
  findAllByComplainant(orgId: string, complainantId: string) {
    return this.prisma.complaint.findMany({
      where: { orgId, complainantId },
      orderBy: { createdAt: 'desc' },
      include: COMPLAINT_INCLUDE,
    });
  }

  /**
   * Complaints assigned to this resolver, plus the ones they filed
   * themselves. NOT their unit's queue — unit membership grants no
   * visibility (see getResolverWhere).
   */
  findAllByResolver(orgId: string, userId: string) {
    return this.prisma.complaint.findMany({
      where: getResolverWhere(orgId, userId),
      orderBy: { createdAt: 'desc' },
      include: COMPLAINT_INCLUDE,
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.complaint.findFirst({
      where: { id, orgId },
      include: {
        ...COMPLAINT_INCLUDE,
        updates: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    orgId: string,
    authorId: string,
    oldStatus: ComplaintStatus,
    newStatus: ComplaintStatus,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'RESOLVED' && { resolvedAt: new Date() }),
        },
      });

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
        where: { id, orgId },
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
   * The updateMany is scoped with id + orgId (tenant isolation): if the
   * complaint vanished or left the org mid-flight, count is 0 and we 404.
   * The status itself does not change — oldStatus === newStatus keeps the
   * existing ComplaintUpdate pattern intact, the note carries the details.
   */
  async assign(
    id: string,
    orgId: string,
    authorId: string,
    resolverId: string | null,
    oldStatus: ComplaintStatus,
    note: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.complaint.updateMany({
        where: { id, orgId },
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
        where: { id, orgId },
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
   * Counts for the resolver's queue stats strip, scoped to complaints
   * assigned to them (plus their own). overdue also counts ESCALATED —
   * an escalated complaint is by definition one whose SLA was missed.
   */
  getQueueSummary(orgId: string, userId: string) {
    const where = getResolverWhere(orgId, userId);
    const now = new Date();

    return Promise.all([
      this.prisma.complaint.count({
        where: { ...where, status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.complaint.count({
        where: {
          // AND (not a top-level OR) so the assigned/own isolation clause in
          // `where` isn't overwritten by the overdue conditions.
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
   * Escalate a complaint and log the update. No authorId — the system
   * user (null) is used as the author for automated transitions.
   */
  async escalateComplaint(id: string, oldStatus: ComplaintStatus) {
    return this.prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { status: 'ESCALATED' },
      });

      await tx.complaintUpdate.create({
        data: {
          complaintId: id,
          authorId: '00000000-0000-0000-0000-000000000000', // system user
          oldStatus,
          newStatus: 'ESCALATED',
          note: 'Automatically escalated — SLA deadline passed.',
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
