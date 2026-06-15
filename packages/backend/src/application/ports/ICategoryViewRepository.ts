export interface InsertCategoryData {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface UpdateCategoryData {
  name: string | null;
  icon: string | null;
  color: string | null;
}

export interface ICategoryViewRepository {
  insert(data: InsertCategoryData): Promise<void>;
  update(id: string, data: UpdateCategoryData): Promise<void>;
  markDeleted(id: string): Promise<void>;
  incrementTaskCount(categoryId: string): Promise<void>;
  incrementItemCount(categoryId: string): Promise<void>;
}
