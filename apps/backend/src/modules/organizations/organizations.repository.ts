import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { generateJoinCode } from '../../common/utils/join-code';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * New orgs auto-create their default "Main" branch in the same
   * transaction. The org record (kept for the rollback window) shares the
   * Main branch's join code, so both join paths always agree.
   */
  create(data: CreateOrganizationDto) {
    const joinCode = generateJoinCode();
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          ...data,
          joinCode,
        },
      });
      await tx.branch.create({
        data: {
          organization: { connect: { id: org.id } },
          name: 'Main',
          joinCode,
        },
      });
      return org;
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
