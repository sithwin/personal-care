import { describe, it, expect, vi } from 'vitest';
import { RemoveItemRequirementHandler } from './RemoveItemRequirementHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { RemoveItemRequirementCommand } from '../../../domain/task/commands/RemoveItemRequirementCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'task-1',
    aggregateType: 'task',
    eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}


const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

describe('RemoveItemRequirementHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: RemoveItemRequirementCommand = {
      type: 'RemoveItemRequirementCommand',
      payload: { taskId: 'task-1', itemId: 'item-1' },
    };
    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    await expect(new RemoveItemRequirementHandler(mockEventStore).handle(cmd, ctx))
      .rejects.toThrow('Task not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends ItemRequirementRemoved with expectedVersion equal to history.length', async () => {
    const cmd: RemoveItemRequirementCommand = {
      type: 'RemoveItemRequirementCommand',
      payload: { taskId: 'task-1', itemId: 'item-1' },
    };
    const history = [makeCreatedEvent()];
    const mockStoredEvents: StoredEvent[] = [{
      id: 2, aggregateId: 'task-1', aggregateType: 'task',
      eventType: 'ItemRequirementRemoved',
      payload: { taskId: 'task-1', itemId: 'item-1' },
      version: 2, createdAt: new Date(),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const result = await new RemoveItemRequirementHandler(mockEventStore).handle(cmd, ctx);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('ItemRequirementRemoved');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });
});
