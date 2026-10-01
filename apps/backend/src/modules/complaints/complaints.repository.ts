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
 * "unit-assigned OR own complaints". A resolver with no unitId simply
 * sees only their own complaints (graceful empty queue, not an error).
 */
export function getResolverWhere(
  orgId: string,
  userId: string,
  unitId?: string | null,
): Prisma.ComplaintWhereInput {
  return {
    orgId,
    OR: [
      { complainantId: userId },
      ...(unitId ? [{ assignedUnitId: unitId }] : []),
    ],
  };
}

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
      include: { category: true, assignedUnit: true },
    });
  }

  /** Only complaints filed by this user */
  findAllByComplainant(orgId: string, complainantId: string) {
    return this.prisma.complaint.findMany({
      where: { orgId, complainantId },
      orderBy: { createdAt: 'desc' },
      include: { category: true, assignedUnit: true },
    });
  }

  /**
   * Complaints assigned to the user's unit, plus the user's own complaints.
   * unitId comes from the service/controller (which loads the user for
   * authorization anyway) so the repository stays a pure data layer.
   */
  findAllByUnitOrOwner(orgId: string, userId: string, unitId?: string | null) {
    return this.prisma.complaint.findMany({
      where: getResolverWhere(orgId, userId, unitId),
      orderBy: { createdAt: 'desc' },
      include: { category: true, assignedUnit: true },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.complaint.findFirst({
      where: { id, orgId },
      include: {
        category: true,
        assignedUnit: true,
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
          category: true,
          assignedUnit: true,
          updates: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Counts for the resolver's queue stats strip, scoped to their unit (plus
   * own complaints). overdue also counts ESCALATED — an escalated complaint
   * is by definition one whose SLA was missed.
   */
  getQueueSummary(orgId: string, userId: string, unitId?: string | null) {
    const where = getResolverWhere(orgId, userId, unitId);
    const now = new Date();

    return Promise.all([
      this.prisma.complaint.count({
        where: { ...where, status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.complaint.count({
        where: {
          // AND (not a top-level OR) so the unit/own isolation clause in
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
