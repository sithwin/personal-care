import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IBalanceQueryService, BalanceRuleView, BalanceStatusView } from '../../application/ports/IBalanceQueryService';
import { makeBalanceRouter } from './balance.router';
import { errorHandler } from '../middleware/error-handler';

function makeBalanceRuleView(overrides: Partial<BalanceRuleView> = {}): BalanceRuleView {
  return {
    id: 'rule-1',
    category_id: 'cat-1',
    minimum_count: 2,
    frequency: 'weekly',
    day_restriction: null,
    ...overrides,
  };
}

function makeBalanceStatusView(overrides: Partial<BalanceStatusView> = {}): BalanceStatusView {
  return {
    rule_id: 'rule-1',
    category_id: 'cat-1',
    frequency: 'weekly',
    target_count: 2,
    actual_count: 1,
    is_met: false,
    period_start: '2026-01-01T00:00:00.000Z',
    period_end: '2026-01-08T00:00:00.000Z',
    category_name: 'Health',
    category_icon: 'heart',
    ...overrides,
  };
}

describe('balance router', () => {
  let queryService: IBalanceQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getRules: vi.fn(), getStatus: vi.fn(), getUnmetStatus: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/balance', makeBalanceRouter(queryService));
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

  it('returns all balance rules', async () => {
    const rules = [makeBalanceRuleView()];
    vi.mocked(queryService.getRules).mockResolvedValue(rules);

    const res = await fetch(`${baseUrl}/balance/rules`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rules);
  });

  it('returns all balance status entries', async () => {
    const status = [makeBalanceStatusView()];
    vi.mocked(queryService.getStatus).mockResolvedValue(status);

    const res = await fetch(`${baseUrl}/balance/status`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(status);
  });

  it('returns only unmet balance status entries', async () => {
    const unmet = [makeBalanceStatusView({ is_met: false })];
    vi.mocked(queryService.getUnmetStatus).mockResolvedValue(unmet);

    const res = await fetch(`${baseUrl}/balance/status/unmet`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(unmet);
  });
});
