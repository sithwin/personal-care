import { Meilisearch } from 'meilisearch';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';
import { childLogger } from '../logger';

const log = childLogger('search:indexer');

export class MeilisearchSearchIndexer implements ISearchIndexer {
  private readonly client: Meilisearch;
  private readonly indexName = 'personal_care';

  constructor(url: string, apiKey: string) {
    this.client = new Meilisearch({ host: url, apiKey });
  }

  async ensureIndex(): Promise<void> {
    const createTask = await this.client.createIndex(this.indexName, { primaryKey: 'id' });
    await this.client.tasks.waitForTask(createTask.taskUid);

    const task = await this.client.index(this.indexName).updateSettings({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['type', 'status', 'categoryId'],
    });
    const result = await this.client.tasks.waitForTask(task.taskUid);
    if (result.status === 'failed') {
      log.error({ error: result.error }, 'ensureIndex settings task failed');
      throw new Error(`Meilisearch ensureIndex failed: ${result.error?.message}`);
    }
  }

  async upsert(doc: SearchDocument): Promise<void> {
    const task = await this.client.index(this.indexName).addDocuments([doc], { primaryKey: 'id' });
    const result = await this.client.tasks.waitForTask(task.taskUid);
    if (result.status === 'failed') {
      log.error({ error: result.error, id: doc.id }, 'upsert task failed');
      throw new Error(`Meilisearch upsert failed for ${doc.id}: ${result.error?.message}`);
    }
  }

  async patch(id: string, fields: Partial<Omit<SearchDocument, 'id'>>): Promise<void> {
    const task = await this.client.index(this.indexName).updateDocuments([{ id, ...fields }]);
    const result = await this.client.tasks.waitForTask(task.taskUid);
    if (result.status === 'failed') {
      log.error({ error: result.error, id }, 'patch task failed');
      throw new Error(`Meilisearch patch failed for ${id}: ${result.error?.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    await this.client.index(this.indexName).deleteDocument(id);
  }

  async bootstrap(docs: SearchDocument[]): Promise<void> {
    if (docs.length === 0) return;
    const task = await this.client.index(this.indexName).addDocuments(docs, { primaryKey: 'id' });
    const result = await this.client.tasks.waitForTask(task.taskUid);
    if (result.status === 'failed') {
      log.error({ error: result.error, count: docs.length }, 'bootstrap task failed');
      throw new Error(`Meilisearch bootstrap failed: ${result.error?.message}`);
    }
    log.info({ count: docs.length }, 'bootstrap task succeeded');
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
