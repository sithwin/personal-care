import type { UUID, BalanceFrequency, DayRestriction } from '../../../types';

export interface UpdateBalanceRule {
  readonly type: 'UpdateBalanceRule';
  readonly payload: {
    readonly id: UUID;
    readonly minimumCount?: number;
    readonly frequency?: BalanceFrequency;
    readonly dayRestriction?: DayRestriction;
  };
}
