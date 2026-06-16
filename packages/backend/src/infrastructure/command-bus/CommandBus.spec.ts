import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from './CommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
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

describe('CommandBus', () => {
  it('routes to the registered handler', async () => {
    const bus = new CommandBus();
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    const result = await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } });
    expect(result).toBe(stored);
    expect(handler.handle).toHaveBeenCalledWith({ type: 'CreateFoo', payload: { id: '1' } });
  });

  it('throws for unknown command type', async () => {
    const bus = new CommandBus();
    await expect(
      bus.dispatch({ type: 'UnknownCommand', payload: {} }),
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
    await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } });
    expect(onEventsStored).toHaveBeenCalledWith(stored);
  });
});
