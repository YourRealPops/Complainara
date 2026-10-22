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
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import {
  getResolverTransitions,
  isValidTransition,
} from './complaint-status.rules';
import {
  complaintScopeWhere,
  isWithinScope,
} from '../../common/scope';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
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

  async create(actor: JwtPayload, dto: CreateComplaintDto) {
    // Complaints must always belong to a branch — derived server-side from
    // the complainant's verified token, never from client input.
    if (!actor.branchId) {
      throw new ForbiddenException(
        'Your account is not attached to a branch — complaints can only be filed from a branch',
      );
    }

    // Throws NotFoundException if the category doesn't exist or belongs to another org
    const category = await this.categoriesService.findById(
      dto.categoryId,
      actor.orgId,
    );

    const slaDueAt = this.calculateSlaDueAt(category.slaHours);

    // Per-branch routing: unit configured for this category + the
    // complainant's branch. No route -> created with no unit, shown to the
    // branch admin as "Needs routing". A branch never routes to another
    // branch's unit.
    const route = await this.categoriesService.findRouteForComplaint(
      dto.categoryId,
      actor.branchId,
    );

    return this.complaintsRepository.create({
      orgId: actor.orgId,
      complainantId: actor.sub,
      categoryId: dto.categoryId,
      assignedUnitId: route?.unitId ?? null,
      branchId: actor.branchId,
      title: dto.title,
      description: dto.description,
      location: dto.location,
      priority: dto.priority,
      slaDueAt,
    });
  }

  /**
   * Role/branch-scoped list of complaints — the scope is built in ONE
   * place (common/scope.ts) from the verified JWT:
   * - COMPLAINANT: only their own complaints, in their branch
   * - RESOLVER: complaints assigned to THEM + ones they filed, in their
   *   branch (never the whole unit queue — unit membership grants nothing)
   * - BRANCH_ADMIN: every complaint in their branch
   * - ORG_ADMIN / SUPER_ADMIN: every complaint in the org
   * Fail-closed: any invalid scope returns [] rather than wider data.
   */
  async findAllByOrg(actor: JwtPayload) {
    return this.complaintsRepository.findAllScoped(complaintScopeWhere(actor));
  }

  /**
   * Public-facing fetch with role/branch scoping. Anything outside the
   * caller's scope is a 404 — including a BRANCH_ADMIN guessing an id in
   * another branch.
   */
  async findByIdScoped(id: string, actor: JwtPayload) {
    const complaint = await this.complaintsRepository.findByIdScoped(
      id,
      complaintScopeWhere(actor),
    );
    if (!complaint) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }
    return complaint;
  }

  /**
   * Counts for the resolver queue stats strip, scoped to what is assigned
   * to them (plus their own). overdue includes ESCALATED — an escalated
   * complaint is one whose SLA was already missed.
   */
  async getQueueSummary(actor: JwtPayload) {
    return this.complaintsRepository.getQueueSummary(
      complaintScopeWhere(actor),
    );
  }

  /**
   * Assign / reassign / unassign a resolver.
   * - resolverId must be a RESOLVER visible to the caller (same org for
   *   ORG_ADMIN; same branch for BRANCH_ADMIN) — anything else 404s, so
   *   cross-org / cross-branch ids can't be probed
   * - unit match is NOT hard-enforced (admin decision): a cross-unit
   *   assignment is allowed and called out in the audit note
   * - resolverId: null unassigns
   */
  async assign(id: string, actor: JwtPayload, dto: AssignComplaintDto) {
    if (dto.resolverId === undefined) {
      throw new BadRequestException(
        'resolverId is required — send null to unassign',
      );
    }

    const scopeWhere = complaintScopeWhere(actor);
    const complaint = await this.complaintsRepository.findByIdScoped(
      id,
      scopeWhere,
    );
    if (!complaint) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }

    let resolver: {
      id: string;
      name: string;
      unitId: string | null;
      branchId: string | null;
    } | null = null;
    if (dto.resolverId !== null) {
      const user = await this.usersService.findById(dto.resolverId);
      // The assignee must satisfy the caller's own scope: same org for
      // ORG_ADMIN, same branch for BRANCH_ADMIN. Same 404 whether the id
      // exists elsewhere or not — no cross-org/cross-branch probing.
      if (
        user.role !== 'RESOLVER' ||
        !isWithinScope(actor, { orgId: user.orgId, branchId: user.branchId })
      ) {
        throw new NotFoundException(`Resolver not found in this organization`);
      }
      resolver = {
        id: user.id,
        name: user.name,
        unitId: user.unitId,
        branchId: user.branchId,
      };
    }

    const previous = complaint.assignedResolver;
    const unitMismatch =
      resolver !== null &&
      complaint.assignedUnitId !== null &&
      resolver.unitId !== complaint.assignedUnitId;

    let note: string;
    if (resolver === null) {
      note = previous
        ? `Unassigned (was ${previous.name})`
        : 'Unassigned (no resolver was assigned)';
    } else if (previous) {
      note = `Reassigned from ${previous.name} to ${resolver.name}`;
    } else {
      note = `Assigned to ${resolver.name}`;
    }
    if (unitMismatch) {
      note += ' — note: resolver is not in the complaint\u2019s unit';
    }

    const updated = await this.complaintsRepository.assign(
      id,
      scopeWhere,
      actor.sub,
      resolver?.id ?? null,
      complaint.status,
      note,
    );
    if (!updated) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }
    return updated;
  }

  async updateStatus(
    id: string,
    actor: JwtPayload,
    dto: UpdateStatusDto,
  ) {
    const role = actor.role as UserRole;
    // Role/branch-scoped fetch: anything outside the caller's scope 404s,
    // including a BRANCH_ADMIN reaching for another branch's complaint.
    const complaint = await this.findByIdScoped(id, actor);

    // Acting (status changes) requires being the assigned resolver —
    // seeing a complaint you filed does not make it yours to work.
    if (role === 'RESOLVER' && complaint.assignedResolverId !== actor.sub) {
      throw new ForbiddenException(
        'Only the assigned resolver can update this complaint',
      );
    }

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
      complaintScopeWhere(actor),
      actor.sub,
      complaint.status,
      dto.status,
      dto.note,
    );
    if (!updated) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }

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

  /** Hours a complaint may sit at tier 1 before going to tier 2 (HQ). */
  private tierTwoHours(): number {
    const raw = process.env.ESCALATION_TIER2_HOURS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  }

  /**
   * Runs every 15 minutes. Two tiers:
   * - Tier 1: complaints past their SLA deadline that are not
   *   RESOLVED/CLOSED/ESCALATED -> status ESCALATED, escalationLevel 1,
   *   visible to the branch admin as needing attention.
   * - Tier 2: complaints still unresolved ESCALATION_TIER2_HOURS (default
   *   24) after their tier-1 escalation -> escalationLevel 2, flagged to HQ.
   * Both reuse the existing isValidTransition rule and write a
   * ComplaintUpdate audit entry per escalation.
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
        1,
        'Automatically escalated — SLA deadline passed.',
      );

      // TODO: fetch complainant email from users table when notification service is real
      await this.notificationService.send({
        to: 'complainant@example.com',
        subject: `[Complainara] Complaint escalated — SLA deadline passed`,
        body: `Your complaint "${complaint.title}" has been automatically escalated because the SLA deadline was missed.`,
      });

      escalated++;
    }

    // Tier 2: escalated at tier 1, still unresolved after N hours -> HQ.
    const thresholdMs = this.tierTwoHours() * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - thresholdMs);
    const tierOne = await this.complaintsRepository.findTierOneEscalated();
    let tierTwo = 0;

    for (const complaint of tierOne) {
      // When was tier 1? The escalation audit entry — resolvedAt stays
      // null while unresolved, so a complaint resolved-and-reopened later
      // is not silently re-escalated.
      const escalatedAt = await this.complaintsRepository.getEscalatedAt(
        complaint.id,
      );
      if (!escalatedAt || escalatedAt.createdAt > cutoff) {
        continue;
      }

      await this.complaintsRepository.escalateComplaint(
        complaint.id,
        complaint.status,
        2,
        `Escalated to HQ — still unresolved ${this.tierTwoHours()}h after the initial escalation.`,
      );

      this.logger.warn(
        `Complaint ${complaint.id} escalated to HQ (tier 2)`,
      );
      tierTwo++;
    }

    this.logger.log(
      `Escalation check complete. Escalated ${escalated} complaint(s) to tier 1, ${tierTwo} to tier 2.`,
    );
  }
}
