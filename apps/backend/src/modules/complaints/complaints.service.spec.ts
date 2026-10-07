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

async function buildService(opts: {
  complaint?: Record<string, unknown> | null;
  caller?: Partial<{
    id: string;
    orgId: string;
    role: string;
    unitId: string | null;
    name: string;
  }>;
}) {
  const repo: Repo = {
    findAllByComplainant: jest.fn().mockResolvedValue([]),
    findAllByResolver: jest.fn().mockResolvedValue([]),
    findAllByOrg: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(opts.complaint ?? null),
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
    escalateComplaint: jest.fn(),
  };
  const categories: Categories = { findById: jest.fn() };
  const users: Users = {
    findById: jest.fn().mockResolvedValue({
      id: R1,
      orgId: ORG,
      role: 'RESOLVER',
      unitId: UNIT_A,
      name: 'Resolver One',
      ...opts.caller,
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
    await service.findAllByOrg(ORG, 'RESOLVER', R1);
    expect(repo.findAllByResolver).toHaveBeenCalledWith(ORG, R1);
    expect(repo.findAllByResolver).not.toHaveBeenCalledWith(
      ORG,
      R1,
      expect.anything(),
    );
  });

  it('findByIdScoped: RESOLVER sees a complaint assigned to them', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
      assignedResolver: { id: R1, name: 'Resolver One' },
    };
    const { service } = await buildService({ complaint: assignedToR1 });
    await expect(
      service.findByIdScoped('c1', ORG, 'RESOLVER', R1),
    ).resolves.toBeTruthy();
  });

  it('CRITICAL: RESOLVER gets 404 on a complaint assigned to a DIFFERENT resolver in their SAME unit', async () => {
    // Both resolvers are in unit-a; complaint is assigned to r2. r1 must not see it.
    const { service } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
      caller: { id: R1, unitId: UNIT_A },
    });
    await expect(
      service.findByIdScoped('c1', ORG, 'RESOLVER', R1),
    ).rejects.toThrow(NotFoundException);
  });

  it('CRITICAL: RESOLVER cannot status-change a complaint assigned to another resolver in the same unit', async () => {
    const { service } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
      caller: { id: R1, unitId: UNIT_A },
    });
    await expect(
      service.updateStatus('c1', ORG, R1, 'RESOLVER', {
        status: 'ACKNOWLEDGED',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('RESOLVER can status-change a complaint assigned to THEM', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
    };
    const { service } = await buildService({
      complaint: assignedToR1,
      caller: { id: R1 },
    });
    const result = await service.updateStatus('c1', ORG, R1, 'RESOLVER', {
      status: 'ACKNOWLEDGED',
    });
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
      service.findByIdScoped('c1', ORG, 'RESOLVER', R1),
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
      service.updateStatus('c1', ORG, R1, 'RESOLVER', {
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
      service.updateStatus('c1', ORG, R1, 'RESOLVER', { status: 'ESCALATED' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ORG_ADMIN can update any complaint in the org', async () => {
    const { service } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2,
    });
    await expect(
      service.updateStatus('c1', ORG, 'admin1', 'ORG_ADMIN', {
        status: 'ACKNOWLEDGED',
      }),
    ).resolves.toBeTruthy();
  });

  it('invalid transition is still rejected with BadRequest', async () => {
    const assignedToR1 = {
      ...COMPLAINT_ASSIGNED_TO_R2,
      assignedResolverId: R1,
    };
    const { service } = await buildService({ complaint: assignedToR1 });
    await expect(
      service.updateStatus('c1', ORG, R1, 'RESOLVER', { status: 'CLOSED' }),
    ).rejects.toThrow('Cannot transition from SUBMITTED to CLOSED');
  });
});

describe('ComplaintsService — assign (ORG_ADMIN)', () => {
  it('assigns a resolver in the same org and logs it', async () => {
    const { service, repo } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
      },
      caller: { id: R1 },
    });
    await service.assign('c1', ORG, 'admin1', { resolverId: R1 });
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      ORG,
      'admin1',
      R1,
      'SUBMITTED',
      'Assigned to Resolver One',
    );
  });

  it('reassigns and logs from → to', async () => {
    const { service, repo } = await buildService({
      complaint: COMPLAINT_ASSIGNED_TO_R2, // currently r2
    });
    await service.assign('c1', ORG, 'admin1', { resolverId: R1 });
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      ORG,
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
    await service.assign('c1', ORG, 'admin1', { resolverId: null });
    expect(repo.assign).toHaveBeenCalledWith(
      'c1',
      ORG,
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
    await expect(service.assign('c1', ORG, 'admin1', {})).rejects.toThrow(
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
      caller: { id: 'outsider', orgId: 'org2', role: 'RESOLVER' },
    });
    await expect(
      service.assign('c1', ORG, 'admin1', { resolverId: 'outsider' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('404s a non-RESOLVER user as assignee', async () => {
    const { service } = await buildService({
      complaint: {
        ...COMPLAINT_ASSIGNED_TO_R2,
        assignedResolverId: null,
        assignedResolver: null,
      },
      caller: {
        id: 'cust1',
        orgId: ORG,
        role: 'COMPLAINANT',
        name: 'Customer',
      },
    });
    await expect(
      service.assign('c1', ORG, 'admin1', { resolverId: 'cust1' }),
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
      caller: { id: R1, unitId: 'unit-b' }, // resolver in a DIFFERENT unit
    });
    await service.assign('c1', ORG, 'admin1', { resolverId: R1 });
    const firstCall = repo.assign.mock.calls[0] as [
      string, // id
      string, // orgId
      string, // authorId
      string | null, // resolverId
      string, // oldStatus
      string, // note
    ];
    const note = firstCall[5];
    expect(note).toContain('Assigned to Resolver One');
    expect(note).toContain('not in the complaint');
  });

  it('404s when the complaint is not in the caller org', async () => {
    const { service } = await buildService({ complaint: null });
    await expect(
      service.assign('c1', ORG, 'admin1', { resolverId: R1 }),
    ).rejects.toThrow(NotFoundException);
  });
});
