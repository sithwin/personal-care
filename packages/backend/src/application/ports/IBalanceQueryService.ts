export interface BalanceRuleView {
  id: string;
  category_id: string;
  minimum_count: number;
  frequency: string;
  day_restriction: string | null;
}

export interface BalanceStatusView {
  rule_id: string;
  category_id: string;
  frequency: string;
  target_count: number;
  actual_count: number;
  is_met: boolean;
  period_start: string;
  period_end: string;
  category_name: string | null;
  category_icon: string | null;
}

export interface IBalanceQueryService {
  getRules(): Promise<BalanceRuleView[]>;
  getStatus(): Promise<BalanceStatusView[]>;
  getUnmetStatus(): Promise<BalanceStatusView[]>;
}
