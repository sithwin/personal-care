import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandBus } from './CommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { ILogger } from '../../application/ports/ILogger';
import type { StoredEvent } from '../../types';

function makeStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'agg-1',
    aggregateType: 'test',
    eventType: 'TestCreated',
    payload: {},
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeMockLogger(): ILogger {
  const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

let httpCtx: { requestId: string; log: ILogger };

describe('CommandBus', () => {
  beforeEach(() => {
    httpCtx = { requestId: 'req-1', log: makeMockLogger() };
  });
  it('routes to the registered handler', async () => {
    const bus = new CommandBus();
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    const result = await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } }, httpCtx);
    expect(result).toBe(stored);
    expect(handler.handle).toHaveBeenCalledWith(
      { type: 'CreateFoo', payload: { id: '1' } },
      expect.objectContaining({ requestId: 'req-1', correlationId: expect.any(String) }),
    );
  });

  it('throws for unknown command type', async () => {
    const bus = new CommandBus();
    await expect(
      bus.dispatch({ type: 'UnknownCommand', payload: {} }, httpCtx),
    ).rejects.toThrow('No handler registered for command: UnknownCommand');
  });

  it('calls onEventsStored after handler returns', async () => {
    const onEventsStored = vi.fn().mockResolvedValue(undefined);
    const bus = new CommandBus(onEventsStored);
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } }, httpCtx);
    expect(onEventsStored).toHaveBeenCalledWith(
      stored,
      expect.objectContaining({ requestId: 'req-1', correlationId: expect.any(String) }),
    );
  });
});
