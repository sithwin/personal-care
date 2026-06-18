import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProjectsSearchProjector } from './projects-search.projector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import type { StoredEvent } from '../../types';

const PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const CAT_ID     = '00000000-0000-0000-0000-000000000002';

function makeEvent(eventType: string, payload: Record<string, unknown>): StoredEvent {
  return { id: 1, aggregateId: PROJECT_ID, aggregateType: 'project', eventType, payload, version: 1, createdAt: new Date() };
}

describe('projects-search projector', () => {
  let indexer: ISearchIndexer;
  let projector: ReturnType<typeof createProjectsSearchProjector>;

  beforeEach(() => {
    indexer = { ensureIndex: vi.fn(), upsert: vi.fn(), patch: vi.fn(), delete: vi.fn(), bootstrap: vi.fn(), getDocumentCount: vi.fn() };
    projector = createProjectsSearchProjector(indexer);
  });

  it('ProjectCreated upserts a project document', async () => {
    await projector(makeEvent('ProjectCreated', { id: PROJECT_ID, name: 'Home Reno', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `project-${PROJECT_ID}`,
      entityId: PROJECT_ID,
      type: 'project',
      name: 'Home Reno',
      description: null,
      status: 'draft',
      categoryId: CAT_ID,
    });
  });

  it('ProjectUpdated patches name and description', async () => {
    await projector(makeEvent('ProjectUpdated', { id: PROJECT_ID, name: 'Home Renovation', description: 'Full reno' }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { name: 'Home Renovation', description: 'Full reno' });
  });

  it('ProjectStarted patches status to active', async () => {
    await projector(makeEvent('ProjectStarted', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'active' });
  });

  it('ProjectPaused patches status to on_hold', async () => {
    await projector(makeEvent('ProjectPaused', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'on_hold' });
  });

  it('ProjectResumed patches status to active', async () => {
    await projector(makeEvent('ProjectResumed', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'active' });
  });

  it('ProjectCompleted patches status to done', async () => {
    await projector(makeEvent('ProjectCompleted', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'done' });
  });
});
