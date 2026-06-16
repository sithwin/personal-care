import type { UUID, BalanceFrequency, DayRestriction } from '../../../types';

export interface CreateBalanceRuleCommand {
  readonly type: 'CreateBalanceRuleCommand';
  readonly payload: {
    readonly id: UUID;
    readonly categoryId: UUID;
    readonly minimumCount: number;
    readonly frequency: BalanceFrequency;
    readonly dayRestriction: DayRestriction;
  };
}
