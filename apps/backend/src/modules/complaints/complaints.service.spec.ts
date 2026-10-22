import { Test } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// @nestjs/schedule ships ESM-only output that ts-jest can't require; mock the
// decorator so importing the service (which uses @Cron) works in tests.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
}));

import { ComplaintsService } from './complaints.service';
import { ComplaintsRepository } from './complaints.repository';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

type Repo = Record<string, jest.Mock>;
type Categories = Record<string, jest.Mock>;
type Users = Record<string, jest.Mock>;
type Notifier = { send: jest.Mock };

/**
 * Two resolvers in the SAME unit — the critical isolation scenario:
 * r1 (u1) and r2 (u2) both belong to unit-a; complaint B is assigned to r2.
 */
const UNIT_A = 'unit-a';
const R1 = 'u1';
const R2 = 'u2';
const ORG = 'org1';
const BRANCH_A = 'branch-a';
const BRANCH_B = 'branch-b';

const actor = (
  over: Partial<JwtPayload> & Pick<JwtPayload, 'sub' | 'role'>,
): JwtPayload => ({
  orgId: ORG,
  branchId: BRANCH_A,
  ...over,
});

async function buildService(opts: {
  complaint?: Record<string, unknown> | null;
  assignee?: Partial<{
    id: string;
    orgId: string;
    role: string;
    unitId: string | null;
    branchId: string | null;
    name: string;
  }>;
}) {
  const repo: Repo = {
    findAllScoped: jest.fn().mockResolvedValue([]),
    findByIdScoped: jest.fn().mockResolvedValue(opts.complaint ?? null),
    create: jest.fn(),
    updateStatus: jest
      .fn()
      .mockResolvedValue({ id: 'c1', status: 'ACKNOWLEDGED' }),
    assign: jest.fn().mockResolvedValue({ id: 'c1', assignedResolverId: 'x' }),
    getQueueSummary: jest.fn().mockResolvedValue({
      needsAction: 0,
      overdue: 0,
      inProgress: 0,
      resolvedToday: 0,
    }),
    findOverdueComplaints: jest.fn().mockResolvedValue([]),
    findTierOneEscalated: jest.fn().mockResolvedValue([]),
    getEscalatedAt: jest.fn().mockResolvedValue(null),
    escalateComplaint: jest.fn(),
  };
  const categories: Categories = {
    findById: jest.fn().mockResolvedValue({
      id: 'cat1',
      orgId: ORG,
      name: 'General',
      slaHours: 24,
      defaultUnitId: null,
    }),
    // Per-branch routing lookup used by create(); null = no route configured
    // (complaint is created with no unit, shown to the branch admin).
    findRouteForComplaint: jest.fn().mockResolvedValue(null),
  };
  const users: Users = {
    findById: jest.fn().mockResolvedValue({
      id: R1,
      orgId: ORG,
      role: 'RESOLVER',
      unitId: UNIT_A,
      branchId: BRANCH_A,
      name: 'Resolver One',
      ...opts.assignee,
    }),
  };
  const notifier: Notifier = { send: jest.fn().mockResolvedValue(undefined) };

  const moduleRef = await Test.createTestingModule({
    providers: [
      ComplaintsService,
      { provide: ComplaintsRepository, useValue: repo },
      { provide: CategoriesService, useValue: categories },
      { provide: UsersService, useValue: users },
      { provide: 'NotificationService', useValue: notifier },
    ],
  }).compile();

  return {
    service: moduleRef.get(ComplaintsService),
    repo,
    users,
    notifier,
  };
}

const COMPLAINT_ASSIGNED_TO_R2 = {
  id: 'c1',
  orgId: ORG,
  complainantId: 'someone-else',
  assignedUnitId: UNIT_A,
  assignedResolverId: R2,
  assignedResolver: { id: R2, name: 'Resolver Two' },
  title: 'Leaking faucet',
  status: 'SUBMITTED',
  updates: [],
};

describe('ComplaintsService — resolver scoping (assignment-based, not unit-based)', () => {
  it('findAllByOrg scopes a RESOLVER to complaints assigned to them (no unit clause)', async () => {
    const { service, repo } = await buildService({});
    await service.findAllByOrg(actor({ sub: R1, role: 'RESOLVER' }));
    expect(repo.findAllScoped).toHaveBeenCalledWith({
      orgId: ORG,
      branchId: BRANCH_A,
      OR: [{ assignedResolverId: R1 }, { complainantId: R1 }],
    });
    // Unit membership grants no visibility — the scope has no unit clause.
    const scope = repo.findAllScoped.mock.calls[0][0] as Record<string, unknown>;
    expect(scope).not.toHaveProperty('unitId');
    expect(scope).not.toHaveProperty('assignedUnitId');
  });

  it('findByIdScoped: RESOLVER sees a complaint assigned to them', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
      assignedResolver: { id: R1, name: 'Resolver One' },
    };
    const { service } = await buildService({ complaint: assignedToR1 });
    await expect(
      service.findByIdScoped('c1', actor({ sub: R1, role: 'RESOLVER' })),
    ).resolves.toBeTruthy();
  });

  it('CRITICAL: RESOLVER gets 404 on a complaint assigned to a DIFFERENT resolver in their SAME unit', async () => {
    // Both resolvers are in unit-a; complaint is assigned to r2. The scoped
    // fetch matches nothing, so the repo returns null -> 404.
    const { service, repo } = await buildService({
      complaint: null,
    });
    repo.findByIdScoped.mockResolvedValue(null);
    await expect(
      service.findByIdScoped('c1', actor({ sub: R1, role: 'RESOLVER' })),
    ).rejects.toThrow(NotFoundException);
    // And the scope it used excludes other resolvers' complaints.
    expect(repo.findByIdScoped).toHaveBeenCalledWith('c1', {
      orgId: ORG,
      branchId: BRANCH_A,
      OR: [{ assignedResolverId: R1 }, { complainantId: R1 }],
    });
  });

  it('CRITICAL: RESOLVER cannot status-change a complaint assigned to another resolver in the same unit', async () => {
    const { service } = await buildService({
      complaint: null, // scoped fetch finds nothing
    });
    await expect(
      service.updateStatus('c1', actor({ sub: R1, role: 'RESOLVER' }), {
        status: 'ACKNOWLEDGED',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('RESOLVER can status-change a complaint assigned to THEM', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
    };
    const { service } = await buildService({ complaint: assignedToR1 });
    const result = await service.updateStatus(
      'c1',
      actor({ sub: R1, role: 'RESOLVER' }),
      { status: 'ACKNOWLEDGED' },
    );
    expect(result?.status).toBe('ACKNOWLEDGED');
  });

  it('RESOLVER still SEES a complaint they filed personally…', async () => {
    const ownFiled = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      complainantId: R1,
      assignedResolverId: R2, // assigned to someone else
    };
    const { service } = await buildService({ complaint: ownFiled });
    await expect(
      service.findByIdScoped('c1', actor({ sub: R1, role: 'RESOLVER' })),
    ).resolves.toBeTruthy();
  });

  it('…but cannot ACT on it — status changes require being the assigned resolver', async () => {
    const ownFiled = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      complainantId: R1,
      assignedResolverId: R2,
    };
    const { service } = await buildService({ complaint: ownFiled });
    await expect(
      service.updateStatus('c1', actor({ sub: R1, role: 'RESOLVER' }), {
        status: 'ACKNOWLEDGED',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('RESOLVER cannot escalate — Forbidden even with a valid transition', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
    };
    const { service } = await buildService({ complaint: assignedToR1 });
    await expect(
      service.updateStatus('c1', actor({ sub: R1, role: 'RESOLVER' }), {
        status: 'ESCALATED',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ORG_ADMIN can update any complaint in the org', async () => {
    const { service, repo } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
    });
    await expect(
      service.updateStatus(
        'c1',
        actor({ sub: 'admin1', role: 'ORG_ADMIN', branchId: null }),
        { status: 'ACKNOWLEDGED' },
      ),
    ).resolves.toBeTruthy();
    // HQ scope is org-wide regardless of the admin's (null) branch.
    expect(repo.findByIdScoped).toHaveBeenCalledWith('c1', { orgId: ORG });
  });

  it('invalid transition is still rejected with BadRequest', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
    };
    const { service } = await buildService({ complaint: assignedToR1 });
    await expect(
      service.updateStatus('c1', actor({ sub: R1, role: 'RESOLVER' }), {
        status: 'CLOSED',
      }),
    ).rejects.toThrow('Cannot transition from SUBMITTED to CLOSED');
  });
});

describe('ComplaintsService — branch scoping (BRANCH_ADMIN)', () => {
  it('BRANCH_ADMIN list/fetch scope is their branch only', async () => {
    const { service, repo } = await buildService({});
    await service.findAllByOrg(actor({ sub: 'ba1', role: 'BRANCH_ADMIN' }));
    expect(repo.findAllScoped).toHaveBeenCalledWith({
      orgId: ORG,
      branchId: BRANCH_A,
    });
  });

  it('CRITICAL: BRANCH_ADMIN gets 404 on another branch’s complaint (scoped fetch finds nothing)', async () => {
    const { service, repo } = await buildService({ complaint: null });
    await expect(
      service.findByIdScoped('c1', actor({ sub: 'ba1', role: 'BRANCH_ADMIN' })),
    ).rejects.toThrow(NotFoundException);
    expect(repo.findByIdScoped).toHaveBeenCalledWith('c1', {
      orgId: ORG,
      branchId: BRANCH_A,
    });
  });

  it('CRITICAL: BRANCH_ADMIN with a NULL branchId fails closed — matches-nothing scope, never org-wide', async () => {
    const { service, repo } = await buildService({ complaint: null });
    await service.findAllByOrg(
      actor({ sub: 'ba1', role: 'BRANCH_ADMIN', branchId: null }),
    );
    expect(repo.findAllScoped).toHaveBeenCalledWith({ id: { in: [] } });
    await expect(
      service.findByIdScoped(
        'c1',
        actor({ sub: 'ba1', role: 'BRANCH_ADMIN', branchId: null }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('CRITICAL: unknown role fails closed', async () => {
    const { service, repo } = await buildService({ complaint: null });
    await service.findAllByOrg(actor({ sub: 'x', role: 'HACKER' as never }));
    expect(repo.findAllScoped).toHaveBeenCalledWith({ id: { in: [] } });
  });

  it('BRANCH_ADMIN cannot status-change another branch’s complaint', async () => {
    const { service } = await buildService({ complaint: null });
    await expect(
      service.updateStatus(
        'c1',
        actor({ sub: 'ba1', role: 'BRANCH_ADMIN' }),
        { status: 'ACKNOWLEDGED' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('BRANCH_ADMIN can status-change a complaint in their branch', async () => {
    const { service } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
    });
    await expect(
      service.updateStatus(
        'c1',
        actor({ sub: 'ba1', role: 'BRANCH_ADMIN' }),
        { status: 'ACKNOWLEDGED' },
      ),
    ).resolves.toBeTruthy();
  });

  it('complainant filing requires a branch (Forbidden otherwise)', async () => {
    const { service } = await buildService({});
    await expect(
      service.create(
        actor({ sub: R1, role: 'COMPLAINANT', branchId: null }),
        { categoryId: 'cat1', title: 't', description: 'd', location: 'l' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('complaint creation tags the branch server-side from the token', async () => {
    const { service, repo } = await buildService({});
    await service.create(actor({ sub: R1, role: 'COMPLAINANT' }), {
      categoryId: 'cat1',
      title: 't',
      description: 'd',
      location: 'l',
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG,
        complainantId: R1,
        branchId: BRANCH_A, // from the verified token, never the body
      }),
    );
    const payload = repo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('branch'); // no client-controlled branch
  });
});

describe('ComplaintsService — assign (ORG_ADMIN / BRANCH_ADMIN)', () => {
  const adminActor = actor({ sub: 'admin1', role: 'ORG_ADMIN', branchId: null });

  it('assigns a resolver in the same org and logs it', async () => {
    const { service, repo } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
      },
      assignee: { id: R1 },
    });
    await service.assign('c1', adminActor, { resolverId: R1 });
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      { orgId: ORG },
      'admin1',
      R1,
      'SUBMITTED',
      'Assigned to Resolver One',
    );
  });

  it('reassigns and logs from → to', async () => {
    const { service, repo } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2, // currently r2
      assignee: { id: R1 },
    });
    await service.assign('c1', adminActor, { resolverId: R1 });
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      { orgId: ORG },
      'admin1',
      R1,
      'SUBMITTED',
      'Reassigned from Resolver Two to Resolver One',
    );
  });

  it('unassigns with resolverId: null and logs it', async () => {
    const { service, repo } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
    });
    await service.assign('c1', adminActor, { resolverId: null });
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      { orgId: ORG },
      'admin1',
      null,
      'SUBMITTED',
      'Unassigned (was Resolver Two)',
    );
  });

  it('rejects a missing resolverId key with BadRequest', async () => {
    const { service } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
    });
    await expect(service.assign('c1', adminActor, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('404s a resolver from ANOTHER org (no cross-org probing)', async () => {
    const { service } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
      },
      assignee: { id: 'outsider', orgId: 'org2', role: 'RESOLVER' },
    });
    await expect(
      service.assign('c1', adminActor, { resolverId: 'outsider' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('CRITICAL: BRANCH_ADMIN cannot assign a resolver from ANOTHER branch', async () => {
    const { service } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
        branchId: BRANCH_A,
      },
      assignee: { id: R1, branchId: BRANCH_B, name: 'Other Branch Resolver' },
    });
    await expect(
      service.assign(
        'c1',
        actor({ sub: 'ba1', role: 'BRANCH_ADMIN' }),
        { resolverId: R1 },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('BRANCH_ADMIN can assign a resolver from their OWN branch', async () => {
    const { service, repo } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
        branchId: BRANCH_A,
      },
      assignee: { id: R1, branchId: BRANCH_A },
    });
    await service.assign(
      'c1',
      actor({ sub: 'ba1', role: 'BRANCH_ADMIN' }),
      { resolverId: R1 },
    );
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      { orgId: ORG, branchId: BRANCH_A },
      'ba1',
      R1,
      'SUBMITTED',
      'Assigned to Resolver One',
    );
  });

  it('404s a non-RESOLVER user as assignee', async () => {
    const { service } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
      },
      assignee: {
        id: 'cust1',
        orgId: ORG,
        role: 'COMPLAINANT',
        name: 'Customer',
      },
    });
    await expect(
      service.assign('c1', adminActor, { resolverId: 'cust1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows a cross-unit assignment but flags it in the audit note', async () => {
    const { service, repo } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
        assignedUnitId: UNIT_A,
      },
      assignee: { id: R1, unitId: 'unit-b' }, // resolver in a DIFFERENT unit
    });
    await service.assign('c1', adminActor, { resolverId: R1 });
    const firstCall = repo.assign.mock.calls[0] as [
      string, // id
      Record<string, unknown>, // scope
      string, // authorId
      string | null, // resolverId
      string, // oldStatus
      string, // note
    ];
    const note = firstCall[5];
    expect(note).toContain('Assigned to Resolver One');
    expect(note).toContain('not in the complaint');
  });

  it('404s when the complaint is not in the caller scope', async () => {
    const { service } = await buildService({ complaint: null });
    await expect(
      service.assign('c1', adminActor, { resolverId: R1 }),
    ).rejects.toThrow(NotFoundException);
  });
});
