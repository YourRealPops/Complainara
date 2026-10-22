import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { BranchesService } from '../branches/branches.service';

/**
 * Join codes live on Branch now (one per branch). The organization-level
 * endpoints below proxy to the org's default "Main" branch so existing
 * HQ settings screens and shared links keep working unchanged.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly branchesService: BranchesService,
  ) {}

  create(dto: CreateOrganizationDto) {
    return this.organizationsRepository.create(dto);
  }

  findAll() {
    return this.organizationsRepository.findAll();
  }

  async findById(id: string) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }
    return organization;
  }

  findByJoinCode(joinCode: string) {
    return this.organizationsRepository.findByJoinCode(joinCode);
  }

  async regenerateJoinCode(orgId: string) {
    return this.branchesService.regenerateMainJoinCode(orgId);
  }

  async getJoinCode(orgId: string) {
    const main = await this.branchesService.getMainJoinCode(orgId);
    return { joinCode: main.joinCode };
  }

  async updateAllowedEmailDomain(orgId: string, domain: string | null) {
    return this.organizationsRepository.updateAllowedEmailDomain(orgId, domain);
  }
}
