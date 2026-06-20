import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { StoredEvent } from '../../types';
import { requestContextMiddleware } from '../middleware/request-context';
import { errorHandler } from '../middleware/error-handler';
import { makeBalanceRulesRouter } from './balance-rules.router';

describe('Balance-rules router', () => {
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    bus = { dispatch: vi.fn().mockResolvedValue([{
      id: 1, aggregateId: 'new-uuid', aggregateType: 'balance-rule',
      eventType: 'BalanceRuleCreated', payload: {}, version: 1, createdAt: new Date(),
    } as StoredEvent]) } as unknown as ICommandBus;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { log: { child: () => unknown } }).log = {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) }),
      };
      next();
    });
    app.use(requestContextMiddleware);
    app.use('/balance-rules', makeBalanceRulesRouter(bus));
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

  it('POST / creates a balance rule and returns 201 with id', async () => {
    const res = await fetch(`${baseUrl}/balance-rules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', minimumCount: 3, frequency: 'weekly', dayRestriction: null }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-uuid' });
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateBalanceRuleCommand', payload: { categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', minimumCount: 3, frequency: 'weekly', dayRestriction: null } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(`${baseUrl}/balance-rules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('PATCH /:id updates a balance rule and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/balance-rules/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minimumCount: 5 }),
    });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'UpdateBalanceRuleCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', minimumCount: 5 } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('DELETE /:id deletes a balance rule and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/balance-rules/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, { method: 'DELETE' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'DeleteBalanceRuleCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('PATCH /:id returns 400 for invalid UUID', async () => {
    const res = await fetch(`${baseUrl}/balance-rules/not-a-uuid`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minimumCount: 5 }),
    });
    expect(res.status).toBe(400);
  });
});
