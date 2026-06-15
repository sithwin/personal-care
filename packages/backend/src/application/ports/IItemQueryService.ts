export interface ItemFilter {
  status?: string;
  categoryId?: string;
}

export interface ItemView {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  status: string;
  quantity: number | null;
  price: number | null;
  notes: string | null;
  created_at: string;
}

export interface IItemQueryService {
  getAll(filter: ItemFilter): Promise<ItemView[]>;
  getById(id: string): Promise<ItemView | null>;
}
