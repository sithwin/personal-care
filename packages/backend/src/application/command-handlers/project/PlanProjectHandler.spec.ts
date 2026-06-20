import { describe, it, expect, vi } from 'vitest';
import { PlanProjectHandler } from './PlanProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

function makeCreatedEvent(id = 'proj-1'): StoredEvent {
  return {
    id: 1, aggregateId: id, aggregateType: 'project', eventType: 'ProjectCreated',
    payload: { id, name: 'Test', categoryId: 'cat-1' }, version: 1, createdAt: new Date(),
  };
}

describe('PlanProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new PlanProjectHandler(store).handle({ type: 'PlanProjectCommand', payload: { id: 'proj-1', startDate: '2026-07-01', endDate: '2026-07-31' } }, ctx)).rejects.toThrow('Project not found');
  });

  it('appends ProjectPlanned with expectedVersion = history.length', async () => {
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{ id: 2, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectPlanned', payload: { id: 'proj-1', startDate: '2026-07-01', endDate: '2026-07-31' }, version: 2, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new PlanProjectHandler(store).handle({ type: 'PlanProjectCommand', payload: { id: 'proj-1', startDate: '2026-07-01', endDate: '2026-07-31' } }, ctx);
    const [events, version] = vi.mocked(store.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('ProjectPlanned');
    expect(version).toBe(1);
    expect(result).toBe(stored);
  });
});
