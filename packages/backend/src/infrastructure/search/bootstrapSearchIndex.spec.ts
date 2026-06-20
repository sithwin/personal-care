import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

const mockQuery = vi.fn();
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: mockQuery })),
}));

import { bootstrapSearchIndex } from './bootstrapSearchIndex';
import { Pool } from 'pg';

describe('bootstrapSearchIndex', () => {
  let indexer: ISearchIndexer;
  let pool: Pool;

  beforeEach(() => {
    indexer = {
      ensureIndex: vi.fn(),
      upsert: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      bootstrap: vi.fn(),
      getDocumentCount: vi.fn().mockResolvedValue(0),
    };
    vi.clearAllMocks();
    vi.mocked(Pool).mockImplementation(() => ({ query: mockQuery }) as unknown as Pool);
    pool = new Pool();
    (indexer.getDocumentCount as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  });

  it('calls ensureIndex on every run', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await bootstrapSearchIndex(indexer, pool);
    expect(indexer.ensureIndex).toHaveBeenCalledOnce();
  });

  it('skips bootstrap when index already has documents', async () => {
    (indexer.getDocumentCount as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    await bootstrapSearchIndex(indexer, pool);
    expect(indexer.bootstrap).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('bulk-indexes tasks, items, and projects from PG when index is empty', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'task-1', name: 'Fix sink', description: null, category_id: 'cat-1', status: 'ready' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', name: 'Lamp', description: null, category_id: 'cat-1', status: 'to_buy' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'proj-1', name: 'Reno', description: null, category_id: 'cat-1', status: 'draft' }] });

    await bootstrapSearchIndex(indexer, pool);

    expect(indexer.bootstrap).toHaveBeenCalledWith([
      { id: 'task-task-1', entityId: 'task-1', type: 'task', name: 'Fix sink', description: null, status: 'ready', categoryId: 'cat-1' },
      { id: 'item-item-1', entityId: 'item-1', type: 'item', name: 'Lamp', description: null, status: 'to_buy', categoryId: 'cat-1' },
      { id: 'project-proj-1', entityId: 'proj-1', type: 'project', name: 'Reno', description: null, status: 'draft', categoryId: 'cat-1' },
    ]);
  });
});
