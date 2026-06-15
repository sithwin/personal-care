import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from './command-bus';
import type { IEventStore } from '../application/ports/IEventStore';
import type { StoredEvent } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'agg-1',
    aggregateType: 'category',
    eventType: 'CategoryCreated',
    payload: {},
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

function mockEventStore(history: StoredEvent[] = []): IEventStore {
  return {
    getEvents: vi.fn().mockResolvedValue(history),
    append: vi.fn().mockImplementation(
      async (events) => events.map((e, i) => makeStoredEvent({ ...e, id: i + 1, version: history.length + i + 1 })),
    ),
    getAllEventsSince: vi.fn().mockResolvedValue([]),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommandBus', () => {
  describe('dispatch', () => {
    it('should route CreateCategory to the category aggregate and persist the event', async () => {
      const eventStore = mockEventStore();
      const bus = new CommandBus(eventStore);

      const stored = await bus.dispatch({
        type: 'CreateCategory',
        payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false },
      });

      expect(stored).toHaveLength(1);
      expect(stored[0].eventType).toBe('CategoryCreated');
      expect(eventStore.append).toHaveBeenCalledOnce();
    });

    it('should route CreateTask to the task aggregate and persist the event', async () => {
      const eventStore = mockEventStore();
      const bus = new CommandBus(eventStore);

      const stored = await bus.dispatch({
        type: 'CreateTask',
        payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' },
      });

      expect(stored).toHaveLength(1);
      expect(stored[0].eventType).toBe('TaskCreated');
    });

    it('should resolve aggregate ID from taskId field for AddItemRequirement', async () => {
      const history = [makeStoredEvent({ aggregateId: 'task-1', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' } })];
      const eventStore = mockEventStore(history);
      const bus = new CommandBus(eventStore);

      await bus.dispatch({
        type: 'AddItemRequirement',
        payload: { taskId: 'task-1', itemId: 'item-1', consumable: true },
      });

      expect(eventStore.getEvents).toHaveBeenCalledWith('task-1');
    });

    it('should call onEventsStored callback after persisting', async () => {
      const eventStore = mockEventStore();
      const onEventsStored = vi.fn().mockResolvedValue(undefined);
      const bus = new CommandBus(eventStore, onEventsStored);

      await bus.dispatch({
        type: 'CreateCategory',
        payload: { id: 'cat-2', name: 'Work', icon: '💼', color: '#6366f1', isDefault: false },
      });

      expect(onEventsStored).toHaveBeenCalledOnce();
      expect(onEventsStored).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ eventType: 'CategoryCreated' }),
      ]));
    });

    it('should throw for an unknown command type', async () => {
      const eventStore = mockEventStore();
      const bus = new CommandBus(eventStore);

      await expect(
        bus.dispatch({ type: 'NonExistentCommand' as never, payload: {} }),
      ).rejects.toThrow('No handler registered for command: NonExistentCommand');
    });

    it('should pass expectedVersion based on history length to eventStore.append', async () => {
      const history = [
        makeStoredEvent({ version: 1 }),
        makeStoredEvent({ version: 2 }),
      ];
      const eventStore = mockEventStore(history);
      const bus = new CommandBus(eventStore);

      await bus.dispatch({
        type: 'CreateCategory',
        payload: { id: 'cat-3', name: 'Health', icon: '❤️', color: '#ef4444', isDefault: false },
      });

      expect(eventStore.append).toHaveBeenCalledWith(
        expect.any(Array),
        2,
      );
    });
  });
});
