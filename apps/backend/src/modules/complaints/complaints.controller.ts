import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

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
  updateStatus(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.complaintsService.updateStatus(id, orgId, user.sub, dto);
  }

  @Get()
  findAllByOrg(@CurrentOrg() orgId: string) {
    return this.complaintsService.findAllByOrg(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.complaintsService.findById(id, orgId);
  }
}
