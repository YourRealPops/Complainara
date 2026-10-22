import { Prisma, UserRole } from '@prisma/client';

/**
 * Single source of truth for visibility scoping.
 *
 * Every list, single-fetch and mutation path builds its Prisma `where`
 * from the VERIFIED JWT (never client input) via these helpers. The rules,
 * fail-closed:
 *
 * | Role            | Sees                                                        |
 * |-----------------|-------------------------------------------------------------|
 * | COMPLAINANT     | Own complaints in their branch only                          |
 * | RESOLVER        | Complaints assigned to them (or they filed) in their branch  |
 * | BRANCH_ADMIN    | Everything in their branch only                              |
 * | ORG_ADMIN       | Everything across all branches in the org                    |
 * | SUPER_ADMIN     | Everything across all branches in the org                    |
 *
 * Fail-closed guarantees:
 * - Only ORG_ADMIN / SUPER_ADMIN get org-wide scope. Role is checked
 *   FIRST: a null branchId is only acceptable for those roles.
 * - Any other role with a missing/null branchId gets a where clause that
 *   matches NOTHING (`{ id: { in: [] } }`) — never an org-wide query.
 * - An unrecognized role matches nothing.
 * - `undefined` is never emitted; branchId is always resolved to a string
 *   or the clause short-circuits to no-match.
 */
export type ScopeActor = {
  sub: string;
  orgId: string;
  role: string;
  branchId?: string | null;
};

/** A where fragment that can never match a row. */
const NO_MATCH = { id: { in: [] } } satisfies Prisma.ComplaintWhereInput;

function isHQRole(role: string): boolean {
  return role === UserRole.ORG_ADMIN || role === UserRole.SUPER_ADMIN;
}

/**
 * Resolves the actor's branch scope or null when the scope is invalid
 * (unknown role, or a non-HQ role without a branch). Callers must treat
 * null as "matches nothing".
 */
function branchScope(actor: ScopeActor): string | null {
  if (isHQRole(actor.role)) return actor.orgId; // HQ: org-wide; value unused as a branch filter
  if (
    actor.role === UserRole.BRANCH_ADMIN ||
    actor.role === UserRole.RESOLVER ||
    actor.role === UserRole.COMPLAINANT
  ) {
    return actor.branchId ?? null; // null = fail closed
  }
  return null; // unknown role: fail closed
}

/** Visibility scope for complaints. */
export function complaintScopeWhere(
  actor: ScopeActor,
): Prisma.ComplaintWhereInput {
  if (isHQRole(actor.role)) {
    return { orgId: actor.orgId };
  }
  const branchId = branchScope(actor);
  if (!branchId) {
    return { ...NO_MATCH };
  }
  if (actor.role === UserRole.BRANCH_ADMIN) {
    return { orgId: actor.orgId, branchId };
  }
  if (actor.role === UserRole.COMPLAINANT) {
    return { orgId: actor.orgId, branchId, complainantId: actor.sub };
  }
  // RESOLVER: assigned to them OR filed by them, never the unit queue.
  return {
    orgId: actor.orgId,
    branchId,
    OR: [{ assignedResolverId: actor.sub }, { complainantId: actor.sub }],
  };
}

/** Visibility scope for units (and any other branch-scoped entity list). */
export function branchScopedWhere(actor: ScopeActor): Prisma.UnitWhereInput {
  if (isHQRole(actor.role)) {
    return { orgId: actor.orgId };
  }
  const branchId = branchScope(actor);
  if (!branchId) {
    return { ...NO_MATCH };
  }
  return { orgId: actor.orgId, branchId };
}

/** Visibility scope for users. */
export function userScopeWhere(actor: ScopeActor): Prisma.UserWhereInput {
  if (isHQRole(actor.role)) {
    return { orgId: actor.orgId };
  }
  const branchId = branchScope(actor);
  if (!branchId) {
    return { id: { in: [] } };
  }
  return { orgId: actor.orgId, branchId };
}

/**
 * Single-entity access check for flows that already loaded a row
 * (mutations, cross-entity validation). Same fail-closed rules.
 */
export function isWithinScope(
  actor: ScopeActor,
  target: { orgId: string; branchId?: string | null },
): boolean {
  if (target.orgId !== actor.orgId) {
    return false;
  }
  if (isHQRole(actor.role)) {
    return true;
  }
  const branchId = branchScope(actor);
  if (!branchId) {
    return false;
  }
  return target.branchId === branchId;
}
