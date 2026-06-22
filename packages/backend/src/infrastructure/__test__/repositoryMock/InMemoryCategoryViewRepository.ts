import type {
  ICategoryViewRepository,
  InsertCategoryData,
  UpdateCategoryData,
} from '../../../application/ports/ICategoryViewRepository';

interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export class InMemoryCategoryViewRepository implements ICategoryViewRepository {
  private readonly categories = new Map<string, CategoryRecord>();

  async insert(data: InsertCategoryData): Promise<void> {
    this.categories.set(data.id, { ...data });
  }

  async update(id: string, data: UpdateCategoryData): Promise<void> {
    const cat = this.categories.get(id);
    if (!cat) return;
    if (data.name !== null) cat.name = data.name;
    if (data.icon !== null) cat.icon = data.icon;
    if (data.color !== null) cat.color = data.color;
  }

  async markDeleted(id: string): Promise<void> {
    this.categories.delete(id);
  }

  async incrementTaskCount(_categoryId: string): Promise<void> {}

  async incrementItemCount(_categoryId: string): Promise<void> {}
}
