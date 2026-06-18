import { Meilisearch } from 'meilisearch';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';

export class MeilisearchSearchIndexer implements ISearchIndexer {
  private readonly client: Meilisearch;
  private readonly indexName = 'personal_care';

  constructor(url: string, apiKey: string) {
    this.client = new Meilisearch({ host: url, apiKey });
  }

  async ensureIndex(): Promise<void> {
    await this.client.index(this.indexName).updateSettings({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['type', 'status', 'categoryId'],
    });
  }

  async upsert(doc: SearchDocument): Promise<void> {
    await this.client.index(this.indexName).addDocuments([doc]);
  }

  async patch(id: string, fields: Partial<Omit<SearchDocument, 'id'>>): Promise<void> {
    await this.client.index(this.indexName).updateDocuments([{ id, ...fields }]);
  }

  async delete(id: string): Promise<void> {
    await this.client.index(this.indexName).deleteDocument(id);
  }

  async bootstrap(docs: SearchDocument[]): Promise<void> {
    if (docs.length === 0) return;
    await this.client.index(this.indexName).addDocuments(docs);
  }

  async getDocumentCount(): Promise<number> {
    try {
      const stats = await this.client.index(this.indexName).getStats();
      return stats.numberOfDocuments;
    } catch {
      return 0;
    }
  }
}
