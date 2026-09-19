import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { generateJoinCode } from '../../common/utils/join-code';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        ...data,
        joinCode: generateJoinCode(),
      },
    });
  }

  findAll() {
    return this.prisma.organization.findMany();
  }

  findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  findByJoinCode(joinCode: string) {
    return this.prisma.organization.findUnique({ where: { joinCode } });
  }

  updateJoinCode(id: string, joinCode: string) {
    return this.prisma.organization.update({
      where: { id },
      data: { joinCode },
    });
  }

  updateAllowedEmailDomain(id: string, allowedEmailDomain: string | null) {
    return this.prisma.organization.update({
      where: { id },
      data: { allowedEmailDomain },
    });
  }
}
