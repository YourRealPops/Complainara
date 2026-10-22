import {
  complaintScopeWhere,
  branchScopedWhere,
  userScopeWhere,
  isWithinScope,
  ScopeActor,
} from './scope';

const ORG = 'org1';
const BRANCH = 'branch-a';

const a = (
  over: Partial<ScopeActor> & Pick<ScopeActor, 'role'>,
): ScopeActor => ({
  sub: 'user1',
  orgId: ORG,
  branchId: BRANCH,
  ...over,
});

describe('scope helper — fail-closed guarantees', () => {
  describe('complaintScopeWhere', () => {
    it('ORG_ADMIN gets org-wide scope even with a NULL branchId', () => {
      expect(
        complaintScopeWhere(a({ role: 'ORG_ADMIN', branchId: null })),
      ).toEqual({ orgId: ORG });
    });

    it('SUPER_ADMIN gets org-wide scope', () => {
      expect(
        complaintScopeWhere(a({ role: 'SUPER_ADMIN', branchId: null })),
      ).toEqual({ orgId: ORG });
    });

    it('BRANCH_ADMIN scope is org + own branch only', () => {
      expect(complaintScopeWhere(a({ role: 'BRANCH_ADMIN' }))).toEqual({
        orgId: ORG,
        branchId: BRANCH,
      });
    });

    it('CRITICAL: BRANCH_ADMIN with NULL branchId matches NOTHING (never org-wide)', () => {
      expect(
        complaintScopeWhere(a({ role: 'BRANCH_ADMIN', branchId: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('CRITICAL: unknown role matches NOTHING', () => {
      expect(complaintScopeWhere(a({ role: 'NOT_A_ROLE' }))).toEqual({
        id: { in: [] },
      });
    });

    it('empty-string branchId is treated as missing (fail closed)', () => {
      expect(
        complaintScopeWhere(a({ role: 'BRANCH_ADMIN', branchId: '' })),
      ).toEqual({ id: { in: [] } });
    });

    it('COMPLAINANT: own complaints in own branch only', () => {
      expect(complaintScopeWhere(a({ role: 'COMPLAINANT' }))).toEqual({
        orgId: ORG,
        branchId: BRANCH,
        complainantId: 'user1',
      });
    });

    it('COMPLAINANT with NULL branchId matches NOTHING', () => {
      expect(
        complaintScopeWhere(a({ role: 'COMPLAINANT', branchId: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('RESOLVER: assigned-to-me OR filed-by-me, in my branch; never a unit clause', () => {
      const scope = complaintScopeWhere(a({ role: 'RESOLVER' }));
      expect(scope).toEqual({
        orgId: ORG,
        branchId: BRANCH,
        OR: [{ assignedResolverId: 'user1' }, { complainantId: 'user1' }],
      });
      expect(scope).not.toHaveProperty('unitId');
    });

    it('RESOLVER with NULL branchId matches NOTHING', () => {
      expect(
        complaintScopeWhere(a({ role: 'RESOLVER', branchId: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('never emits undefined for branchId', () => {
      const scope = complaintScopeWhere(a({ role: 'BRANCH_ADMIN' })) as Record<
        string,
        unknown
      >;
      expect(scope.branchId).toBe(BRANCH);
      expect(scope.branchId).not.toBeUndefined();
    });
  });

  describe('branchScopedWhere / userScopeWhere', () => {
    it('admins: org-wide', () => {
      expect(branchScopedWhere(a({ role: 'ORG_ADMIN', branchId: null }))).toEqual(
        { orgId: ORG },
      );
      expect(userScopeWhere(a({ role: 'ORG_ADMIN', branchId: null }))).toEqual({
        orgId: ORG,
      });
    });

    it('BRANCH_ADMIN: own branch; null branch fails closed', () => {
      expect(branchScopedWhere(a({ role: 'BRANCH_ADMIN' }))).toEqual({
        orgId: ORG,
        branchId: BRANCH,
      });
      expect(
        branchScopedWhere(a({ role: 'BRANCH_ADMIN', branchId: null })),
      ).toEqual({ id: { in: [] } });
      expect(
        userScopeWhere(a({ role: 'BRANCH_ADMIN', branchId: null })),
      ).toEqual({ id: { in: [] } });
    });

    it('unknown role: matches nothing', () => {
      expect(userScopeWhere(a({ role: 'weird' }))).toEqual({ id: { in: [] } });
    });
  });

  describe('isWithinScope', () => {
    it('ORG_ADMIN can act on any target in their org, any branch', () => {
      const admin = a({ role: 'ORG_ADMIN', branchId: null });
      expect(isWithinScope(admin, { orgId: ORG, branchId: BRANCH })).toBe(true);
      expect(isWithinScope(admin, { orgId: ORG, branchId: null })).toBe(true);
    });

    it('ORG_ADMIN cannot act cross-org', () => {
      const admin = a({ role: 'ORG_ADMIN', branchId: null });
      expect(isWithinScope(admin, { orgId: 'org2' })).toBe(false);
    });

    it('BRANCH_ADMIN can act only on own-branch targets', () => {
      const ba = a({ role: 'BRANCH_ADMIN' });
      expect(isWithinScope(ba, { orgId: ORG, branchId: BRANCH })).toBe(true);
      expect(isWithinScope(ba, { orgId: ORG, branchId: 'branch-b' })).toBe(
        false,
      );
      expect(isWithinScope(ba, { orgId: ORG, branchId: null })).toBe(false);
    });

    it('CRITICAL: BRANCH_ADMIN with NULL branchId cannot act on ANYTHING', () => {
      const ba = a({ role: 'BRANCH_ADMIN', branchId: null });
      expect(isWithinScope(ba, { orgId: ORG, branchId: null })).toBe(false);
      expect(isWithinScope(ba, { orgId: ORG, branchId: BRANCH })).toBe(false);
    });

    it('unknown role cannot act on anything', () => {
      const weird = a({ role: 'nope' });
      expect(isWithinScope(weird, { orgId: ORG, branchId: BRANCH })).toBe(
        false,
      );
    });
  });
});
