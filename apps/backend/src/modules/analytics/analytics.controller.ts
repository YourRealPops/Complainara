import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UserRole } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Per-branch metrics: open / overdue / escalated (by level) / resolved,
   * avg resolution time, SLA hit rate + level-2 escalation list.
   * ORG_ADMIN: all branches. BRANCH_ADMIN: own branch only.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Get('overview')
  overview(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.overview(user);
  }

  /**
   * Cross-branch audit log (paginated, filterable by branch) built on
   * complaint_updates. BRANCH_ADMIN is hard-scoped to their own branch.
   */
  @Roles(UserRole.ORG_ADMIN, UserRole.BRANCH_ADMIN)
  @Get('audit-log')
  auditLog(
    @CurrentUser() user: JwtPayload,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.analyticsService.auditLog(user, query);
  }
}
