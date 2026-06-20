import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearch = vi.fn();
const mockIndex = vi.fn();

vi.mock('meilisearch', () => ({
  Meilisearch: vi.fn(),
}));

import { Meilisearch } from 'meilisearch';
import { MeilisearchSearchQueryService } from './MeilisearchSearchQueryService';

describe('MeilisearchSearchQueryService', () => {
  let service: MeilisearchSearchQueryService;

  beforeEach(() => {
    mockSearch.mockResolvedValue({ hits: [] });
    mockIndex.mockReturnValue({ search: mockSearch });
    vi.mocked(Meilisearch).mockImplementation(() => ({
      index: mockIndex,
    }) as unknown as Meilisearch);
    service = new MeilisearchSearchQueryService('http://localhost:7700', 'test_key');
  });

  it('returns hits grouped into tasks, projects, items', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { id: 'task-1', entityId: '1', type: 'task', name: 'Fix sink', status: 'ready', categoryId: 'cat-1' },
        { id: 'project-2', entityId: '2', type: 'project', name: 'Reno', status: 'draft', categoryId: 'cat-1' },
        { id: 'item-3', entityId: '3', type: 'item', name: 'Lamp', status: 'to_buy', categoryId: 'cat-1' },
      ],
    });

    const result = await service.search('fix');

    expect(mockSearch).toHaveBeenCalledWith('fix', { limit: 15 });
    expect(result.tasks).toEqual([{ entityId: '1', type: 'task', name: 'Fix sink', status: 'ready', categoryId: 'cat-1' }]);
    expect(result.projects).toEqual([{ entityId: '2', type: 'project', name: 'Reno', status: 'draft', categoryId: 'cat-1' }]);
    expect(result.items).toEqual([{ entityId: '3', type: 'item', name: 'Lamp', status: 'to_buy', categoryId: 'cat-1' }]);
  });

  it('caps each type at 5 results', async () => {
    const manyTasks = Array.from({ length: 8 }, (_, i) => ({
      id: `task-${i}`, entityId: `${i}`, type: 'task' as const, name: `Task ${i}`, status: 'ready', categoryId: 'cat-1',
    }));
    mockSearch.mockResolvedValueOnce({ hits: manyTasks });

    const result = await service.search('task');
    expect(result.tasks).toHaveLength(5);
  });

  it('returns empty arrays when no results match', async () => {
    mockSearch.mockResolvedValueOnce({ hits: [] });
    const result = await service.search('xyz');
    expect(result).toEqual({ tasks: [], projects: [], items: [] });
  });
});
