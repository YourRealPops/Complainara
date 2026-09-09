import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ComplaintsRepository } from './complaints.repository';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CategoriesService } from '../categories/categories.service';
import { isValidTransition } from './complaint-status.rules';
import type { NotificationService } from '../notifications/notifications.interface';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    private readonly complaintsRepository: ComplaintsRepository,
    private readonly categoriesService: CategoriesService,
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

  findAllByOrg(orgId: string) {
    return this.complaintsRepository.findAllByOrg(orgId);
  }

  async findById(id: string, orgId: string) {
    const complaint = await this.complaintsRepository.findById(id, orgId);
    if (!complaint) {
      throw new NotFoundException(`Complaint with id ${id} not found`);
    }
    return complaint;
  }

  async updateStatus(
    id: string,
    orgId: string,
    authorId: string,
    dto: UpdateStatusDto,
  ) {
    const complaint = await this.findById(id, orgId);

    if (!isValidTransition(complaint.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${complaint.status} to ${dto.status}`,
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

    this.logger.log(`Escalation check complete. Escalated ${escalated} complaint(s).`);
  }
}
