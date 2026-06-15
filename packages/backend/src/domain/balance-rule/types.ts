import { type UUID, type BalanceFrequency, type DayRestriction } from '../../types';

export interface CreateBalanceRulePayload { id: UUID; categoryId: UUID; minimumCount: number; frequency: BalanceFrequency; dayRestriction: DayRestriction; }
export interface UpdateBalanceRulePayload { id: UUID; minimumCount?: number; frequency?: BalanceFrequency; dayRestriction?: DayRestriction; }
export interface DeleteBalanceRulePayload { id: UUID; }

export type BalanceRuleCommand =
  | { type: 'CreateBalanceRule'; payload: CreateBalanceRulePayload }
  | { type: 'UpdateBalanceRule'; payload: UpdateBalanceRulePayload }
  | { type: 'DeleteBalanceRule'; payload: DeleteBalanceRulePayload };
