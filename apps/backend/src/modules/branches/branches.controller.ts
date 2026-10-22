import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /** ORG_ADMIN only — create a branch. */
  @Roles(UserRole.ORG_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(user, dto);
  }

  /**
   * ORG_ADMIN: all branches. BRANCH_ADMIN: their own branch only.
   * Drives the "hide branch UI for single-site orgs" behaviour.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Get()
  findAllByOrg(@CurrentUser() user: JwtPayload) {
    return this.branchesService.findAllByOrg(user);
  }

  /** ORG_ADMIN: any branch. BRANCH_ADMIN: their own branch only (else 404). */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Get(':id/join-code')
  getJoinCode(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.branchesService.getJoinCode(id, user);
  }

  /** Same permissions as getJoinCode. */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Post(':id/regenerate-join-code')
  regenerateJoinCode(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.regenerateJoinCode(id, user);
  }

  /** ORG_ADMIN only. */
  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, user, dto);
  }

  /** ORG_ADMIN only. 409 when the branch still has users/units/complaints. */
  @Roles(UserRole.ORG_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.branchesService.delete(id, user);
  }
}
