import { describe, it, expect, vi } from 'vitest';
import { UpdateTaskHandler } from './UpdateTaskHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { UpdateTaskCommand } from '../../../domain/task/commands/UpdateTaskCommand';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'task-1',
    aggregateType: 'task',
    eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Morning run', categoryId: 'cat-1' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('UpdateTaskHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: UpdateTaskCommand = {
      type: 'UpdateTaskCommand',
      payload: { id: 'task-1', name: 'Evening run' },
    };
    const mockStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    await expect(new UpdateTaskHandler(mockStore).handle(cmd)).rejects.toThrow('Task not found');
    expect(mockStore.append).not.toHaveBeenCalled();
  });

  it('appends TaskUpdated with expectedVersion equal to history.length', async () => {
    const cmd: UpdateTaskCommand = {
      type: 'UpdateTaskCommand',
      payload: { id: 'task-1', name: 'Evening run' },
    };
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{
      id: 2, aggregateId: 'task-1', aggregateType: 'task',
      eventType: 'TaskUpdated', payload: { id: 'task-1', name: 'Evening run' },
      version: 2, createdAt: new Date(),
    }];
    const mockStore = {
      append: vi.fn().mockResolvedValue(stored),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const result = await new UpdateTaskHandler(mockStore).handle(cmd);

    expect(mockStore.getEvents).toHaveBeenCalledWith('task-1');
    const [events, version] = vi.mocked(mockStore.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('TaskUpdated');
    expect(version).toBe(history.length);
    expect(result).toBe(stored);
  });
});
