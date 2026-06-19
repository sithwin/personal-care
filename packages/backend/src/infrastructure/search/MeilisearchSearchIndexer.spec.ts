import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
const mockUpdateDocuments = vi.fn().mockResolvedValue({ taskUid: 2 });
const mockDeleteDocument = vi.fn().mockResolvedValue({});
const mockUpdateSettings = vi.fn().mockResolvedValue({ taskUid: 3 });
const mockGetStats = vi.fn().mockResolvedValue({ numberOfDocuments: 0 });
const mockWaitForTask = vi.fn().mockResolvedValue({ status: 'succeeded' });
const mockCreateIndex = vi.fn().mockResolvedValue({ taskUid: 0 });
const mockIndex = vi.fn().mockReturnValue({
  addDocuments: mockAddDocuments,
  updateDocuments: mockUpdateDocuments,
  deleteDocument: mockDeleteDocument,
  updateSettings: mockUpdateSettings,
  getStats: mockGetStats,
});

vi.mock('meilisearch', () => ({
  Meilisearch: vi.fn().mockImplementation(() => ({
    index: mockIndex,
    createIndex: mockCreateIndex,
    tasks: { waitForTask: mockWaitForTask },
  })),
}));

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
    vi.clearAllMocks();
    mockAddDocuments.mockResolvedValue({ taskUid: 1 });
    mockUpdateDocuments.mockResolvedValue({ taskUid: 2 });
    mockUpdateSettings.mockResolvedValue({ taskUid: 3 });
    mockCreateIndex.mockResolvedValue({ taskUid: 0 });
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockGetStats.mockResolvedValue({ numberOfDocuments: 0 });
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
