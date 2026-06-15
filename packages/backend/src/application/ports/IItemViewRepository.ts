export interface InsertItemData {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  quantity: number | null;
  price: number | null;
  notes: string | null;
}

export interface IItemViewRepository {
  insert(data: InsertItemData): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  findStatus(id: string): Promise<string | null>;
}
