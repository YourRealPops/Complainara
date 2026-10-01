import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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

async function buildService(opts: {
  unitId: string | null;
  complaint?: Record<string, unknown> | null;
}) {
  const repo: Repo = {
    findAllByComplainant: jest.fn().mockResolvedValue([]),
    findAllByUnitOrOwner: jest.fn().mockResolvedValue([]),
    findAllByOrg: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(opts.complaint ?? null),
    create: jest.fn(),
    updateStatus: jest
      .fn()
      .mockResolvedValue({ id: 'c1', status: 'ACKNOWLEDGED' }),
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
    findById: jest.fn().mockResolvedValue({ id: 'u1', unitId: opts.unitId }),
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

const COMPLAINT_IN_UNIT_A = {
  id: 'c1',
  orgId: 'org1',
  complainantId: 'someone-else',
  assignedUnitId: 'unit-a',
  title: 'Leaking faucet',
  status: 'SUBMITTED',
  updates: [],
};

describe('ComplaintsService — resolver scoping', () => {
  it('findAllByOrg passes the resolver unitId to the repository', async () => {
    const { service, repo } = await buildService({ unitId: 'unit-a' });
    await service.findAllByOrg('org1', 'RESOLVER', 'u1');
    expect(repo.findAllByUnitOrOwner).toHaveBeenCalledWith(
      'org1',
      'u1',
      'unit-a',
    );
  });

  it('resolver with no unit still gets their own complaints (empty unit clause)', async () => {
    const { service, repo } = await buildService({ unitId: null });
    await service.findAllByOrg('org1', 'RESOLVER', 'u1');
    expect(repo.findAllByUnitOrOwner).toHaveBeenCalledWith('org1', 'u1', null);
  });

  it('RESOLVER can update a complaint assigned to their own unit', async () => {
    const { service } = await buildService({
      unitId: 'unit-a',
      complaint: COMPLAINT_IN_UNIT_A,
    });
    const result = await service.updateStatus('c1', 'org1', 'u1', 'RESOLVER', {
      status: 'ACKNOWLEDGED' as never,
    });
    expect(result?.status).toBe('ACKNOWLEDGED');
  });

  it('RESOLVER cannot touch a complaint assigned to another unit — 404', async () => {
    const { service } = await buildService({
      unitId: 'unit-b',
      complaint: COMPLAINT_IN_UNIT_A,
    });
    await expect(
      service.updateStatus('c1', 'org1', 'u1', 'RESOLVER', {
        status: 'ACKNOWLEDGED' as never,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('RESOLVER cannot touch an unassigned complaint outside their unit — 404', async () => {
    const { service } = await buildService({
      unitId: 'unit-a',
      complaint: { ...COMPLAINT_IN_UNIT_A, assignedUnitId: null },
    });
    await expect(
      service.updateStatus('c1', 'org1', 'u1', 'RESOLVER', {
        status: 'ACKNOWLEDGED' as never,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('RESOLVER can still work a complaint they filed personally', async () => {
    const { service } = await buildService({
      unitId: 'unit-a',
      complaint: {
        ...COMPLAINT_IN_UNIT_A,
        assignedUnitId: null,
        complainantId: 'u1',
      },
    });
    await expect(
      service.updateStatus('c1', 'org1', 'u1', 'RESOLVER', {
        status: 'ACKNOWLEDGED' as never,
      }),
    ).resolves.toBeTruthy();
  });

  it('RESOLVER cannot escalate — Forbidden even with a valid transition', async () => {
    const { service } = await buildService({
      unitId: 'unit-a',
      complaint: COMPLAINT_IN_UNIT_A,
    });
    await expect(
      service.updateStatus('c1', 'org1', 'u1', 'RESOLVER', {
        status: 'ESCALATED' as never,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ORG_ADMIN can update any complaint in the org', async () => {
    const { service } = await buildService({
      unitId: null,
      complaint: COMPLAINT_IN_UNIT_A,
    });
    await expect(
      service.updateStatus('c1', 'org1', 'admin1', 'ORG_ADMIN', {
        status: 'ACKNOWLEDGED' as never,
      }),
    ).resolves.toBeTruthy();
  });

  it('invalid transition is still rejected with BadRequest', async () => {
    const { service } = await buildService({
      unitId: 'unit-a',
      complaint: COMPLAINT_IN_UNIT_A,
    });
    await expect(
      service.updateStatus('c1', 'org1', 'u1', 'RESOLVER', {
        status: 'CLOSED' as never,
      }),
    ).rejects.toThrow('Cannot transition from SUBMITTED to CLOSED');
  });
});
