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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /**
   * ORG_ADMIN: any branch (or an HQ unit). BRANCH_ADMIN: their own branch
   * only — enforced in the service, a foreign branchId is rejected.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(user, dto);
  }

  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitsService.update(id, user, dto);
  }

  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.unitsService.delete(id, user);
  }

  @Get()
  findAllByOrg(@CurrentUser() user: JwtPayload) {
    return this.unitsService.findAllByOrg(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.unitsService.findByIdScoped(id, user);
  }
}
