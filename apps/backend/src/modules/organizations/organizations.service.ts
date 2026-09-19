import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { generateJoinCode } from '../../common/utils/join-code';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
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
    const newCode = generateJoinCode();
    return this.organizationsRepository.updateJoinCode(orgId, newCode);
  }

  async getJoinCode(orgId: string) {
    const org = await this.findById(orgId);
    return { joinCode: org.joinCode };
  }

  async updateAllowedEmailDomain(orgId: string, domain: string | null) {
    return this.organizationsRepository.updateAllowedEmailDomain(orgId, domain);
  }
}
