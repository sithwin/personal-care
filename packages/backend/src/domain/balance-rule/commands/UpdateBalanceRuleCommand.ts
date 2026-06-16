import type { UUID, BalanceFrequency, DayRestriction } from '../../../types';

export interface UpdateBalanceRuleCommand {
  readonly type: 'UpdateBalanceRuleCommand';
  readonly payload: {
    readonly id: UUID;
    readonly minimumCount?: number;
    readonly frequency?: BalanceFrequency;
    readonly dayRestriction?: DayRestriction;
  };
}
