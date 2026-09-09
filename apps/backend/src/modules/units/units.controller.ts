import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Roles(UserRole.ORG_ADMIN)
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(orgId, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitsService.update(id, orgId, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.unitsService.delete(id, orgId);
  }

  @Get()
  findAllByOrg(@CurrentOrg() orgId: string) {
    return this.unitsService.findAllByOrg(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.unitsService.findById(id, orgId);
  }
}
