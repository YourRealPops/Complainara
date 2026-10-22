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
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateComplaintDto,
  ) {
    // branchId is derived server-side from the caller's verified token
    return this.complaintsService.create(user, dto);
  }

  /**
   * ORG_ADMIN (any complaint in the org) / BRANCH_ADMIN (own branch only)
   * — resolvers cannot self-assign or reassign.
   * Assign, reassign or unassign (resolverId: null) the resolver.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignComplaintDto,
  ) {
    return this.complaintsService.assign(id, user, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStatusDto,
  ) {
    if (user.role === 'COMPLAINANT') {
      // COMPLAINANTs can only transition RESOLVED → CLOSED on their own complaint.
      // (Visibility itself is re-verified inside the service via findByIdScoped.)
      if (dto.status !== 'CLOSED') {
        throw new ForbiddenException(
          'Complainants can only confirm resolution (RESOLVED → CLOSED) on their own complaints',
        );
      }
    }

    return this.complaintsService.updateStatus(id, user, dto);
  }

  /**
   * Resolver queue stats — declared before @Get(':id') so "queue-summary"
   * is not captured as an id.
   */
  @Roles(UserRole.RESOLVER)
  @Get('queue-summary')
  getQueueSummary(@CurrentUser() user: JwtPayload) {
    return this.complaintsService.getQueueSummary(user);
  }

  @Get()
  findAllByOrg(@CurrentUser() user: JwtPayload) {
    return this.complaintsService.findAllByOrg(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.complaintsService.findByIdScoped(id, user);
  }
}
