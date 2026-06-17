import { describe, it, expect, vi } from 'vitest';
import { StartProjectHandler } from './StartProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(id = 'proj-1'): StoredEvent {
  return { id: 1, aggregateId: id, aggregateType: 'project', eventType: 'ProjectCreated', payload: { id, name: 'T', categoryId: 'cat-1' }, version: 1, createdAt: new Date() };
}

describe('StartProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new StartProjectHandler(store).handle({ type: 'StartProjectCommand', payload: { id: 'proj-1' } })).rejects.toThrow('Project not found');
  });

  it('appends ProjectStarted', async () => {
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{ id: 2, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectStarted', payload: { id: 'proj-1' }, version: 2, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new StartProjectHandler(store).handle({ type: 'StartProjectCommand', payload: { id: 'proj-1' } });
    const [events, version] = vi.mocked(store.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('ProjectStarted');
    expect(version).toBe(1);
    expect(result).toBe(stored);
  });
});
