import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * ORG_ADMIN: any role, any branch. BRANCH_ADMIN: COMPLAINANT/RESOLVER in
   * their own branch only (privilege escalation blocked in the service).
   * The JWT org is authoritative — a body orgId that disagrees is rejected.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.createInOrg(user, dto);
  }

  /** ORG_ADMIN only. */
  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, user, dto.role);
  }

  /**
   * Org member list, scoped to the caller's visibility: ORG_ADMIN /
   * SUPER_ADMIN see everyone, BRANCH_ADMIN their own branch only.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @Get()
  findAllByOrg(@CurrentUser() user: JwtPayload, @Query() query: FindUsersDto) {
    return this.usersService.findAllByOrg(user, query);
  }

  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findByIdScoped(id, user);
  }
}
