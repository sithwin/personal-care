import type { IItemViewRepository, InsertItemData } from '../../../application/ports/IItemViewRepository';

interface ItemRecord {
  id: string;
  status: string;
}

export class InMemoryItemViewRepository implements IItemViewRepository {
  private readonly items = new Map<string, ItemRecord>();

  async insert(data: InsertItemData): Promise<void> {
    this.items.set(data.id, { id: data.id, status: 'to_buy' });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const item = this.items.get(id);
    if (!item) return;
    item.status = status;
  }

  async findStatus(id: string): Promise<string | null> {
    return this.items.get(id)?.status ?? null;
  }

  // Test-only read method
  getItem(id: string): ItemRecord | undefined {
    return this.items.get(id);
  }
}
