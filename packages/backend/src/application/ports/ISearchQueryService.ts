export interface SearchHit {
  entityId: string;
  type: 'task' | 'project' | 'item';
  name: string;
  status: string | null;
  categoryId: string | null;
}

export interface SearchResults {
  tasks: SearchHit[];
  projects: SearchHit[];
  items: SearchHit[];
}

export interface ISearchQueryService {
  search(q: string): Promise<SearchResults>;
}
