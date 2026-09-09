import { Injectable } from '@nestjs/common';
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

  findById(id: string, orgId: string) {
    return this.prisma.complaint.findFirst({
      where: { id, orgId },
      include: { category: true, assignedUnit: true, updates: true },
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
        include: { category: true, assignedUnit: true, updates: true },
      });
    });
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
