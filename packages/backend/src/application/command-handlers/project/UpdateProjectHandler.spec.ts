import { describe, it, expect, vi } from 'vitest';
import { UpdateProjectHandler } from './UpdateProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

function makeCreatedEvent(): StoredEvent {
  return { id: 1, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectCreated', payload: { id: 'p1', name: 'Old', categoryId: 'c1' }, version: 1, createdAt: new Date() };
}

describe('UpdateProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new UpdateProjectHandler(store).handle({ type: 'UpdateProjectCommand', payload: { id: 'p1', name: 'New' } }, ctx)).rejects.toThrow('Project not found');
  });

  it('appends ProjectUpdated with expectedVersion = history.length', async () => {
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{ id: 2, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectUpdated', payload: { id: 'p1', name: 'New' }, version: 2, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new UpdateProjectHandler(store).handle({ type: 'UpdateProjectCommand', payload: { id: 'p1', name: 'New' } }, ctx);
    const [events, version] = vi.mocked(store.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('ProjectUpdated');
    expect(version).toBe(1);
    expect(result).toBe(stored);
  });
});
