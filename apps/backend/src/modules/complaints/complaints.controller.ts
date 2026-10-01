import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintsService.create(orgId, user.sub, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStatusDto,
  ) {
    const role = user.role as UserRole;
    const userId = user.sub;

    if (role === 'COMPLAINANT') {
      // COMPLAINANTs can only transition RESOLVED → CLOSED on their own complaint.
      // (Ownership itself is re-verified inside the service via findByIdScoped.)
      if (dto.status !== 'CLOSED') {
        throw new ForbiddenException(
          'Complainants can only confirm resolution (RESOLVED → CLOSED) on their own complaints',
        );
      }
    }

    return this.complaintsService.updateStatus(id, orgId, userId, role, dto);
  }

  /**
   * Resolver queue stats — declared before @Get(':id') so "queue-summary"
   * is not captured as an id.
   */
  @Roles(UserRole.RESOLVER)
  @Get('queue-summary')
  getQueueSummary(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.complaintsService.getQueueSummary(orgId, user.sub);
  }

  @Get()
  findAllByOrg(@CurrentOrg() orgId: string, @CurrentUser() user: JwtPayload) {
    const role = user.role as UserRole;
    return this.complaintsService.findAllByOrg(orgId, role, user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const role = user.role as UserRole;
    return this.complaintsService.findByIdScoped(id, orgId, role, user.sub);
  }
}
