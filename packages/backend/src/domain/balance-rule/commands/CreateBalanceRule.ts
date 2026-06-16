import type { UUID, BalanceFrequency, DayRestriction } from '../../../types';

export interface CreateBalanceRule {
  readonly type: 'CreateBalanceRule';
  readonly payload: {
    readonly id: UUID;
    readonly categoryId: UUID;
    readonly minimumCount: number;
    readonly frequency: BalanceFrequency;
    readonly dayRestriction: DayRestriction;
  };
}
