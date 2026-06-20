import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDocuments = vi.fn();
const mockUpdateDocuments = vi.fn();
const mockDeleteDocument = vi.fn();
const mockUpdateSettings = vi.fn();
const mockGetStats = vi.fn();
const mockWaitForTask = vi.fn();
const mockCreateIndex = vi.fn();
const mockIndex = vi.fn();

vi.mock('meilisearch', () => ({
  Meilisearch: vi.fn(),
}));

import { Meilisearch } from 'meilisearch';
import { MeilisearchSearchIndexer } from './MeilisearchSearchIndexer';
import type { SearchDocument } from '../../application/ports/ISearchIndexer';

const doc: SearchDocument = {
  id: 'task-abc-123',
  entityId: 'abc-123',
  type: 'task',
  name: 'Fix the sink',
  description: null,
  status: 'ready',
  categoryId: 'cat-1',
};

describe('MeilisearchSearchIndexer', () => {
  let indexer: MeilisearchSearchIndexer;

  beforeEach(() => {
    mockAddDocuments.mockResolvedValue({ taskUid: 1 });
    mockUpdateDocuments.mockResolvedValue({ taskUid: 2 });
    mockDeleteDocument.mockResolvedValue({});
    mockUpdateSettings.mockResolvedValue({ taskUid: 3 });
    mockGetStats.mockResolvedValue({ numberOfDocuments: 0 });
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockCreateIndex.mockResolvedValue({ taskUid: 0 });
    mockIndex.mockReturnValue({
      addDocuments: mockAddDocuments,
      updateDocuments: mockUpdateDocuments,
      deleteDocument: mockDeleteDocument,
      updateSettings: mockUpdateSettings,
      getStats: mockGetStats,
    });
    vi.mocked(Meilisearch).mockImplementation(() => ({
      index: mockIndex,
      createIndex: mockCreateIndex,
      tasks: { waitForTask: mockWaitForTask },
    }) as unknown as Meilisearch);
    indexer = new MeilisearchSearchIndexer('http://localhost:7700', 'test_key');
  });

  it('ensureIndex calls updateSettings on the personal_care index', async () => {
    await indexer.ensureIndex();
    expect(mockIndex).toHaveBeenCalledWith('personal_care');
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['type', 'status', 'categoryId'],
    });
  });

  it('upsert calls addDocuments with the document', async () => {
    await indexer.upsert(doc);
    expect(mockAddDocuments).toHaveBeenCalledWith([doc], { primaryKey: 'id' });
  });

  it('patch calls updateDocuments with id and fields', async () => {
    await indexer.patch('task-abc-123', { status: 'ongoing' });
    expect(mockUpdateDocuments).toHaveBeenCalledWith([{ id: 'task-abc-123', status: 'ongoing' }]);
  });

  it('delete calls deleteDocument with the id', async () => {
    await indexer.delete('task-abc-123');
    expect(mockDeleteDocument).toHaveBeenCalledWith('task-abc-123');
  });

  it('bootstrap calls addDocuments with all docs', async () => {
    await indexer.bootstrap([doc]);
    expect(mockAddDocuments).toHaveBeenCalledWith([doc], { primaryKey: 'id' });
  });

  it('bootstrap is a no-op when docs array is empty', async () => {
    await indexer.bootstrap([]);
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  it('getDocumentCount returns numberOfDocuments from stats', async () => {
    mockGetStats.mockResolvedValueOnce({ numberOfDocuments: 42 });
    const count = await indexer.getDocumentCount();
    expect(count).toBe(42);
  });

  it('getDocumentCount returns 0 when index does not exist', async () => {
    mockGetStats.mockRejectedValueOnce(new Error('index not found'));
    const count = await indexer.getDocumentCount();
    expect(count).toBe(0);
  });
});
