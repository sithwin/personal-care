export interface SearchDocument {
  id: string;
  entityId: string;
  type: 'task' | 'project' | 'item';
  name: string;
  description: string | null;
  status: string | null;
  categoryId: string | null;
}

export interface ISearchIndexer {
  ensureIndex(): Promise<void>;
  upsert(doc: SearchDocument): Promise<void>;
  patch(id: string, fields: Partial<Omit<SearchDocument, 'id'>>): Promise<void>;
  delete(id: string): Promise<void>;
  bootstrap(docs: SearchDocument[]): Promise<void>;
  getDocumentCount(): Promise<number>;
}
