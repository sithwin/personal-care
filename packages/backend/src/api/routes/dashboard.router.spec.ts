import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IDashboardQueryService, DashboardView } from '../../application/ports/IDashboardQueryService';
import { makeDashboardRouter } from './dashboard.router';
import { errorHandler } from '../middleware/error-handler';

function makeDashboardView(overrides: Partial<DashboardView> = {}): DashboardView {
  return {
    counts: {
      id: 1,
      ready_count: 1,
      ongoing_count: 0,
      pending_count: 0,
      planned_count: 0,
      to_buy_count: 0,
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    balanceStatus: [],
    upNext: [],
    ...overrides,
  };
}

describe('dashboard router', () => {
  let queryService: IDashboardQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { get: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/dashboard', makeDashboardRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns the dashboard view', async () => {
    const dashboard = makeDashboardView();
    vi.mocked(queryService.get).mockResolvedValue(dashboard);

    const res = await fetch(`${baseUrl}/dashboard`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(dashboard);
  });
});
