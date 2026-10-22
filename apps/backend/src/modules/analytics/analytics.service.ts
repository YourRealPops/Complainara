import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { complaintScopeWhere } from '../../common/scope';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import type { Prisma } from '@prisma/client';

type BranchMetric = {
  branchId: string | null;
  branchName: string;
  open: number;
  overdue: number;
  escalatedLevel1: number;
  escalatedLevel2: number;
  resolved: number;
  avgResolutionMs: number | null;
  slaHitRate: number | null;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  /**
   * ORG_ADMIN: all branches of the org. BRANCH_ADMIN: own branch only.
   * Returns per-branch metrics + org totals + the level-2 escalation list.
   */
  async overview(actor: JwtPayload) {
    const scope = complaintScopeWhere(actor);
    const isHQ =
      actor.role === 'ORG_ADMIN' || actor.role === 'SUPER_ADMIN';

    // Branches in scope (HQ: all; BRANCH_ADMIN: own)
    let branches = await this.analyticsRepository.branchesOf(actor.orgId);
    if (!isHQ) {
      branches = branches.filter((b) => b.id === actor.branchId);
    }
    const branchName = (id: string | null) =>
      branches.find((b) => b.id === id)?.name ?? 'Unassigned';

    const now = new Date();
    const notClosed: Prisma.ComplaintWhereInput = {
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    };

    const [open, overdue, esc1, esc2, resolvedRows, level2] =
      await Promise.all([
        this.analyticsRepository.countByBranch({ ...scope, ...notClosed }),
        this.analyticsRepository.countByBranch({
          ...scope,
          ...notClosed,
          slaDueAt: { lt: now },
        }),
        this.analyticsRepository.countByBranch({
          ...scope,
          status: 'ESCALATED',
          escalationLevel: 1,
        }),
        this.analyticsRepository.countByBranch({
          ...scope,
          status: 'ESCALATED',
          escalationLevel: 2,
        }),
        this.analyticsRepository.resolvedRows({
          ...scope,
          status: 'RESOLVED',
        }),
        this.analyticsRepository.levelTwoEscalations(scope),
      ]);

    const tally = (rows: { branchId: string | null; _count: { _all: number } }[]) =>
      new Map(rows.map((r) => [r.branchId, r._count._all]));

    const openBy = tally(open);
    const overdueBy = tally(overdue);
    const esc1By = tally(esc1);
    const esc2By = tally(esc2);

    // Resolution timing per branch (computed from resolved rows)
    const resolvedAgg = new Map<
      string | null,
      { count: number; totalMs: number; slaHits: number; slaTotal: number }
    >();
    for (const row of resolvedRows) {
      const agg = resolvedAgg.get(row.branchId) ?? {
        count: 0,
        totalMs: 0,
        slaHits: 0,
        slaTotal: 0,
      };
      agg.count += 1;
      if (row.resolvedAt) {
        agg.totalMs += row.resolvedAt.getTime() - row.createdAt.getTime();
      }
      if (row.slaDueAt) {
        agg.slaTotal += 1;
        if (row.resolvedAt && row.resolvedAt <= row.slaDueAt) {
          agg.slaHits += 1;
        }
      }
      resolvedAgg.set(row.branchId, agg);
    }

    const branchIds = new Set<string | null>([
      ...branches.map((b) => b.id as string | null),
      ...resolvedAgg.keys(),
      ...openBy.keys(),
    ]);

    const metrics: BranchMetric[] = [...branchIds].map((id) => {
      const agg = resolvedAgg.get(id) ?? {
        count: 0,
        totalMs: 0,
        slaHits: 0,
        slaTotal: 0,
      };
      return {
        branchId: id,
        branchName: branchName(id),
        open: openBy.get(id) ?? 0,
        overdue: overdueBy.get(id) ?? 0,
        escalatedLevel1: esc1By.get(id) ?? 0,
        escalatedLevel2: esc2By.get(id) ?? 0,
        resolved: agg.count,
        avgResolutionMs: agg.count > 0 ? Math.round(agg.totalMs / agg.count) : null,
        slaHitRate:
          agg.slaTotal > 0 ? agg.slaHits / agg.slaTotal : null,
      };
    });

    const totals = metrics.reduce(
      (acc, m) => ({
        open: acc.open + m.open,
        overdue: acc.overdue + m.overdue,
        escalatedLevel1: acc.escalatedLevel1 + m.escalatedLevel1,
        escalatedLevel2: acc.escalatedLevel2 + m.escalatedLevel2,
        resolved: acc.resolved + m.resolved,
      }),
      {
        open: 0,
        overdue: 0,
        escalatedLevel1: 0,
        escalatedLevel2: 0,
        resolved: 0,
      },
    );
    const allResolved = resolvedRows.length;
    const allSlaTotal = resolvedRows.filter((r) => r.slaDueAt).length;
    const allSlaHits = resolvedRows.filter(
      (r) => r.slaDueAt && r.resolvedAt && r.resolvedAt <= r.slaDueAt,
    ).length;

    return {
      branches: metrics,
      totals: {
        ...totals,
        avgResolutionMs:
          allResolved > 0
            ? Math.round(
                resolvedRows.reduce(
                  (sum, r) =>
                    sum +
                    (r.resolvedAt ? r.resolvedAt.getTime() - r.createdAt.getTime() : 0),
                  0,
                ) / allResolved,
              )
            : null,
        slaHitRate: allSlaTotal > 0 ? allSlaHits / allSlaTotal : null,
      },
      level2Escalations: level2,
    };
  }

  /**
   * Cross-branch audit log (paginated, filterable by branch) built on
   * complaint_updates. BRANCH_ADMIN is hard-limited to their own branch —
   * a branchId filter naming another branch cannot widen the scope.
   */
  async auditLog(actor: JwtPayload, query: AuditLogQueryDto) {
    const scope = complaintScopeWhere(actor);
    const isHQ =
      actor.role === 'ORG_ADMIN' || actor.role === 'SUPER_ADMIN';

    let branchFilter = query.branchId;
    if (!isHQ) {
      branchFilter = actor.branchId ?? '__none__'; // fail closed: no branch -> no rows
    }

    const where: Prisma.ComplaintWhereInput = {
      ...scope,
      ...(branchFilter && { branchId: branchFilter }),
    };

    return this.analyticsRepository.auditLog(where, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      ...(query.complaintId && { complaintId: query.complaintId }),
    });
  }
}
