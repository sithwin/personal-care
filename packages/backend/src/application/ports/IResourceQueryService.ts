export interface ResourceFilter {
  type?: string;
  categoryId?: string;
  q?: string;
}

export interface ResourceView {
  id: string;
  title: string;
  type: string;
  url: string | null;
  notes: string | null;
  category_id: string | null;
  task_ids: string[];
  created_at: string;
}

export interface IResourceQueryService {
  getAll(filter: ResourceFilter): Promise<ResourceView[]>;
  getById(id: string): Promise<ResourceView | null>;
}
