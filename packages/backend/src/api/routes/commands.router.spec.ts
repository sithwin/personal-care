import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { StoredEvent } from '../../types';
import { makeCommandsRouter } from './commands.router';
import { errorHandler } from '../middleware/error-handler';
import { AppError } from '../errors/app-error';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';
const VALID_CATEGORY_UUID = '22222222-2222-2222-2222-222222222222';

function makeStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'agg-1',
    aggregateType: 'test',
    eventType: 'TestCreated',
    payload: { foo: 'bar' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('commands router', () => {
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    bus = { dispatch: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/commands', makeCommandsRouter(bus));
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

  it('dispatches a command built from the URL type and request body', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([makeStoredEvent()]);

    await fetch(`${baseUrl}/commands/CreateTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID, name: 'Buy milk', categoryId: VALID_CATEGORY_UUID }),
    });

    expect(bus.dispatch).toHaveBeenCalledWith({
      type: 'CreateTaskCommand',
      payload: { id: VALID_UUID, name: 'Buy milk', categoryId: VALID_CATEGORY_UUID },
    });
  });

  it('returns 201 with the events mapped to id, eventType and aggregateId', async () => {
    const stored = [
      makeStoredEvent({ id: 1, eventType: 'TaskCreated', aggregateId: 'task-1' }),
      makeStoredEvent({ id: 2, eventType: 'TaskScheduled', aggregateId: 'task-1' }),
    ];
    vi.mocked(bus.dispatch).mockResolvedValue(stored);

    const res = await fetch(`${baseUrl}/commands/CreateTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID, name: 'Buy milk', categoryId: VALID_CATEGORY_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      events: [
        { id: 1, eventType: 'TaskCreated', aggregateId: 'task-1' },
        { id: 2, eventType: 'TaskScheduled', aggregateId: 'task-1' },
      ],
    });
  });

  it('returns an empty events array when the bus reports no events', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/commands/StartTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ events: [] });
  });

  it('propagates the status and message of an AppError thrown by the bus', async () => {
    vi.mocked(bus.dispatch).mockRejectedValue(new AppError('Concurrency conflict', 409));

    const res = await fetch(`${baseUrl}/commands/StartTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toMatchObject({ success: false, message: 'Concurrency conflict' });
  });

  it('falls back to a 500 response for unexpected errors', async () => {
    vi.mocked(bus.dispatch).mockRejectedValue(new Error('boom'));

    const res = await fetch(`${baseUrl}/commands/StartTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({ success: false, message: 'boom' });
  });

  it('returns 400 without calling the bus when the command type is unknown', async () => {
    const res = await fetch(`${baseUrl}/commands/Bogus`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ success: false, message: 'Unknown command type: Bogus' });
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('returns 400 with validation details without calling the bus when the payload is invalid', async () => {
    const res = await fetch(`${baseUrl}/commands/CreateTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'not-a-uuid' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ error: 'Validation failed' });
    expect(bus.dispatch).not.toHaveBeenCalled();
  });
});
