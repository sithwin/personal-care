import { describe, it, expect, vi } from 'vitest';
import { ResumeProjectHandler } from './ResumeProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makePausedHistory(): StoredEvent[] {
  return [
    { id: 1, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectCreated', payload: { id: 'p1', name: 'T', categoryId: 'c1' }, version: 1, createdAt: new Date() },
    { id: 2, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectStarted', payload: { id: 'p1' }, version: 2, createdAt: new Date() },
    { id: 3, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectPaused', payload: { id: 'p1' }, version: 3, createdAt: new Date() },
  ];
}

describe('ResumeProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new ResumeProjectHandler(store).handle({ type: 'ResumeProjectCommand', payload: { id: 'p1' } })).rejects.toThrow('Project not found');
  });

  it('throws Project is not on hold when status is draft', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([makePausedHistory()[0]!]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new ResumeProjectHandler(store).handle({ type: 'ResumeProjectCommand', payload: { id: 'p1' } })).rejects.toThrow('Project is not on hold');
  });

  it('appends ProjectResumed when on_hold', async () => {
    const history = makePausedHistory();
    const stored: StoredEvent[] = [{ id: 4, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectResumed', payload: { id: 'p1' }, version: 4, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await new ResumeProjectHandler(store).handle({ type: 'ResumeProjectCommand', payload: { id: 'p1' } });
    expect(vi.mocked(store.append).mock.calls[0]![0][0].eventType).toBe('ProjectResumed');
  });
});
