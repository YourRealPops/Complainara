import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateEmailDomainDto } from './dto/update-email-domain.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UserRole } from '@prisma/client';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  // Specific routes BEFORE :id to avoid param capture
  @Get('join-code')
  @Roles(UserRole.ORG_ADMIN)
  getJoinCode(@CurrentOrg() orgId: string) {
    return this.organizationsService.getJoinCode(orgId);
  }

  @Post('regenerate-join-code')
  @Roles(UserRole.ORG_ADMIN)
  regenerateJoinCode(@CurrentOrg() orgId: string) {
    return this.organizationsService.regenerateJoinCode(orgId);
  }

  @Patch('settings')
  @Roles(UserRole.ORG_ADMIN)
  updateSettings(
    @CurrentOrg() orgId: string,
    @Body() dto: UpdateEmailDomainDto,
  ) {
    return this.organizationsService.updateAllowedEmailDomain(
      orgId,
      dto.allowedEmailDomain ?? null,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }
}
