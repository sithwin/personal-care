export interface DashboardCounts {
  id: number;
  ready_count: number;
  ongoing_count: number;
  pending_count: number;
  planned_count: number;
  to_buy_count: number;
  updated_at: string;
}

export interface BalanceSummary {
  rule_id: string;
  category_id: string;
  frequency: string;
  is_met: boolean;
  category_name: string | null;
  category_icon: string | null;
}

export interface UpNextTask {
  id: string;
  name: string;
  category_id: string;
  status: string;
  due_date: string | null;
}

export interface DashboardView {
  counts: DashboardCounts;
  balanceStatus: BalanceSummary[];
  upNext: UpNextTask[];
}

export interface IDashboardQueryService {
  get(): Promise<DashboardView>;
}
