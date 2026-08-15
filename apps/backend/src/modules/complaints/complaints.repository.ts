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
      const complaint = await tx.complaint.update({
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

      return complaint;
    });
  }
}
