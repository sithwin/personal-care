import { MeiliSearch } from 'meilisearch';
import type { ISearchQueryService, SearchHit, SearchResults } from '../../application/ports/ISearchQueryService';
import type { SearchDocument } from '../../application/ports/ISearchIndexer';

export class MeilisearchSearchQueryService implements ISearchQueryService {
  private readonly client: MeiliSearch;

  constructor(url: string, apiKey: string) {
    this.client = new MeiliSearch({ host: url, apiKey });
  }

  async search(q: string): Promise<SearchResults> {
    const result = await this.client.index('personal_care').search<SearchDocument>(q, { limit: 15 });
    const hits = result.hits;

    function toHit(h: SearchDocument): SearchHit {
      return { entityId: h.entityId, type: h.type, name: h.name, status: h.status, categoryId: h.categoryId };
    }

    return {
      tasks:    hits.filter(h => h.type === 'task').slice(0, 5).map(toHit),
      projects: hits.filter(h => h.type === 'project').slice(0, 5).map(toHit),
      items:    hits.filter(h => h.type === 'item').slice(0, 5).map(toHit),
    };
  }
}
