import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ComplaintsRepository } from './complaints.repository';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import {
  getResolverTransitions,
  isValidTransition,
} from './complaint-status.rules';
import type { NotificationService } from '../notifications/notifications.interface';
import type { UserRole } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    private readonly complaintsRepository: ComplaintsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
    @Inject('NotificationService')
    private readonly notificationService: NotificationService,
  ) {}

  async create(orgId: string, complainantId: string, dto: CreateComplaintDto) {
    // Throws NotFoundException if the category doesn't exist or belongs to another org
    const category = await this.categoriesService.findById(
      dto.categoryId,
      orgId,
    );

    const slaDueAt = this.calculateSlaDueAt(category.slaHours);

    return this.complaintsRepository.create({
      orgId,
      complainantId,
      categoryId: dto.categoryId,
      assignedUnitId: category.defaultUnitId,
      title: dto.title,
      description: dto.description,
      location: dto.location,
      priority: dto.priority,
      slaDueAt,
    });
  }

  /**
   * Role-scoped list of complaints:
   * - COMPLAINANT: only their own complaints
   * - RESOLVER: complaints assigned to their unit + their own
   * - ORG_ADMIN / SUPER_ADMIN: all complaints in the org
   */
  async findAllByOrg(orgId: string, role: UserRole, userId: string) {
    if (role === 'COMPLAINANT') {
      return this.complaintsRepository.findAllByComplainant(orgId, userId);
    }
    if (role === 'RESOLVER') {
      // The JWT carries no unitId, so load the user for the unit clause.
      // A resolver without a unit just sees their own complaints.
      const unitId = (await this.usersService.findById(userId)).unitId ?? null;
      return this.complaintsRepository.findAllByUnitOrOwner(
        orgId,
        userId,
        unitId,
      );
    }
    // ORG_ADMIN, SUPER_ADMIN see everything
    return this.complaintsRepository.findAllByOrg(orgId);
  }

  /**
   * Internal fetch by id + orgId without role scoping.
   * NOTE: anything reachable from a route must go through findByIdScoped —
   * this exists for trusted internal flows only.
   */
  async findById(id: string, orgId: string) {
    const complaint = await this.complaintsRepository.findById(id, orgId);
    if (!complaint) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }
    return complaint;
  }

  /**
   * Public-facing fetch with role scoping.
   * - COMPLAINANT: only their own complaint, else 404
   * - RESOLVER: complaint in their unit or their own, else 404
   * - ORG_ADMIN / SUPER_ADMIN: any complaint in the org
   * Callers that already loaded the user may pass `unitId` to avoid a re-fetch.
   */
  async findByIdScoped(
    id: string,
    orgId: string,
    role: UserRole,
    userId: string,
    unitId?: string | null,
  ) {
    const complaint = await this.complaintsRepository.findById(id, orgId);
    if (!complaint) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }

    if (role === 'COMPLAINANT') {
      if (complaint.complainantId !== userId) {
        throw new NotFoundException(`Complaint with id ${id} not found`);
      }
    } else if (role === 'RESOLVER') {
      const resolvedUnitId =
        unitId !== undefined
          ? unitId
          : ((await this.usersService.findById(userId)).unitId ?? null);
      const isOwn = complaint.complainantId === userId;
      const isInUnit =
        resolvedUnitId !== null && complaint.assignedUnitId === resolvedUnitId;
      if (!isOwn && !isInUnit) {
        throw new NotFoundException(`Complaint with id ${id} not found`);
      }
    }
    // ORG_ADMIN / SUPER_ADMIN: no additional check

    return complaint;
  }

  /**
   * Counts for the resolver queue stats strip. Same unit + own-complaint
   * scope as findAllByOrg. overdue includes ESCALATED — an escalated
   * complaint is one whose SLA was already missed.
   */
  async getQueueSummary(orgId: string, userId: string) {
    const unitId = (await this.usersService.findById(userId)).unitId ?? null;
    return this.complaintsRepository.getQueueSummary(orgId, userId, unitId);
  }

  async updateStatus(
    id: string,
    orgId: string,
    authorId: string,
    role: UserRole,
    dto: UpdateStatusDto,
  ) {
    // Role-scoped fetch: a RESOLVER can only touch complaints assigned to
    // their unit (or ones they filed themselves); COMPLAINANTs only their own;
    // admins org-wide. findByIdScoped 404s anything outside the caller's scope.
    let unitId: string | null | undefined;
    if (role === 'RESOLVER') {
      unitId = (await this.usersService.findById(authorId)).unitId ?? null;
    }
    const complaint = await this.findByIdScoped(
      id,
      orgId,
      role,
      authorId,
      unitId,
    );

    if (!isValidTransition(complaint.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${complaint.status} to ${dto.status}`,
      );
    }

    if (
      role === 'RESOLVER' &&
      !getResolverTransitions(complaint.status).includes(dto.status)
    ) {
      // ESCALATED is reserved for the SLA cron / admins — resolvers don't escalate.
      throw new ForbiddenException(
        'Resolvers cannot escalate complaints — escalation happens automatically on SLA breach',
      );
    }

    const updated = await this.complaintsRepository.updateStatus(
      id,
      orgId,
      authorId,
      complaint.status,
      dto.status,
      dto.note,
    );

    // TODO: fetch complainant email from users table when notification service is real
    // For now the stub just logs
    await this.notificationService.send({
      to: 'complainant@example.com',
      subject: `[Complainara] Complaint "${complaint.title}" — status changed to ${dto.status}`,
      body: `Your complaint "${complaint.title}" (${complaint.location}) has been updated from ${complaint.status} to ${dto.status}.${dto.note ? `\nNote: ${dto.note}` : ''}`,
    });

    return updated;
  }

  private calculateSlaDueAt(slaHours: number): Date {
    const due = new Date();
    due.setHours(due.getHours() + slaHours);
    return due;
  }

  /**
   * Runs every 15 minutes. Finds complaints past their SLA deadline
   * that are not RESOLVED/CLOSED/ESCALATED, and escalates them.
   * Reuses the existing isValidTransition rule to confirm ESCALATED
   * is a valid next state from the current status.
   */
  @Cron('*/15 * * * *')
  async handleEscalation() {
    this.logger.log('Running SLA escalation check…');

    const overdue = await this.complaintsRepository.findOverdueComplaints();
    let escalated = 0;

    for (const complaint of overdue) {
      if (!isValidTransition(complaint.status, 'ESCALATED')) {
        this.logger.warn(
          `Skipping complaint ${complaint.id}: cannot transition from ${complaint.status} to ESCALATED`,
        );
        continue;
      }

      await this.complaintsRepository.escalateComplaint(
        complaint.id,
        complaint.status,
      );

      // TODO: fetch complainant email from users table when notification service is real
      await this.notificationService.send({
        to: 'complainant@example.com',
        subject: `[Complainara] Complaint escalated — SLA deadline passed`,
        body: `Your complaint "${complaint.title}" has been automatically escalated because the SLA deadline was missed.`,
      });

      escalated++;
    }

    this.logger.log(
      `Escalation check complete. Escalated ${escalated} complaint(s).`,
    );
  }
}
