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
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.ORG_ADMIN)
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateUserDto) {
    // The JWT org is authoritative — a body orgId that disagrees is rejected
    return this.usersService.createInOrg(orgId, dto);
  }

  @Roles(UserRole.ORG_ADMIN)
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, orgId, dto.role);
  }

  /**
   * Org member list. Filters let the admin UI populate assignment dropdowns
   * (?role=RESOLVER, ?unitId=...). SUPER_ADMIN keeps access so the existing
   * users page doesn't break for platform admins.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAllByOrg(@CurrentOrg() orgId: string, @Query() query: FindUsersDto) {
    return this.usersService.findAllByOrg(orgId, query);
  }

  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.usersService.findByIdInOrg(id, orgId);
  }
}
