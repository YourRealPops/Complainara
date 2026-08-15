import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ComplaintsRepository } from './complaints.repository';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CategoriesService } from '../categories/categories.service';
import { isValidTransition } from './complaint-status.rules';

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly complaintsRepository: ComplaintsRepository,
    private readonly categoriesService: CategoriesService,
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

    return this.complaintsRepository.updateStatus(
      id,
      orgId,
      authorId,
      complaint.status,
      dto.status,
      dto.note,
    );
  }

  private calculateSlaDueAt(slaHours: number): Date {
    const due = new Date();
    due.setHours(due.getHours() + slaHours);
    return due;
  }
}
