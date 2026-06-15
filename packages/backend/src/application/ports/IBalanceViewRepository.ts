export interface BalanceRuleRow {
  id: string;
  categoryId: string;
  frequency: string;
  minimumCount: number;
  dayRestriction: string | null;
}

export interface InsertBalanceRuleData {
  id: string;
  categoryId: string;
  minimumCount: number;
  frequency: string;
  dayRestriction: string | null;
}

export interface UpdateBalanceRuleData {
  minimumCount: number | null;
  frequency: string | null;
  dayRestriction: string | null;
}

export interface UpsertBalanceStatusData {
  ruleId: string;
  categoryId: string;
  frequency: string;
  targetCount: number;
  actualCount: number;
  isMet: boolean;
  periodStart: Date;
  periodEnd: Date;
}

export interface IBalanceViewRepository {
  insertRule(data: InsertBalanceRuleData): Promise<void>;
  updateRule(id: string, data: UpdateBalanceRuleData): Promise<void>;
  deleteRule(id: string): Promise<void>;
  deleteStatusForRule(ruleId: string): Promise<void>;
  getAllRules(): Promise<BalanceRuleRow[]>;
  countCompletedTasksInPeriod(categoryId: string, start: Date, end: Date): Promise<number>;
  upsertStatus(data: UpsertBalanceStatusData): Promise<void>;
}
