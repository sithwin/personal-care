export interface SuggestFilter {
  hours?: number;
  categoryId?: string;
}

export interface SuggestedTaskView {
  id: string;
  name: string;
  category_id: string;
  status: string;
  due_date: string | null;
  estimated_duration_value: number | null;
  estimated_duration_unit: string | null;
}

export interface ISuggestQueryService {
  suggest(filter: SuggestFilter): Promise<SuggestedTaskView[]>;
}
