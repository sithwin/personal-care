import { describe, it, expect, vi } from 'vitest';
import { PauseProjectHandler } from './PauseProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makeHistory(): StoredEvent[] {
  return [
    { id: 1, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectCreated', payload: { id: 'proj-1', name: 'T', categoryId: 'cat-1' }, version: 1, createdAt: new Date() },
    { id: 2, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectStarted', payload: { id: 'proj-1' }, version: 2, createdAt: new Date() },
  ];
}

describe('PauseProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new PauseProjectHandler(store).handle({ type: 'PauseProjectCommand', payload: { id: 'proj-1' } })).rejects.toThrow('Project not found');
  });

  it('throws Project is not active when status is draft', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([makeHistory()[0]!]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new PauseProjectHandler(store).handle({ type: 'PauseProjectCommand', payload: { id: 'proj-1' } })).rejects.toThrow('Project is not active');
  });

  it('appends ProjectPaused when active', async () => {
    const history = makeHistory();
    const stored: StoredEvent[] = [{ id: 3, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectPaused', payload: { id: 'proj-1' }, version: 3, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new PauseProjectHandler(store).handle({ type: 'PauseProjectCommand', payload: { id: 'proj-1' } });
    expect(vi.mocked(store.append).mock.calls[0]![0][0].eventType).toBe('ProjectPaused');
    expect(result).toBe(stored);
  });
});
