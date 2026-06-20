import type { StoredEvent, UUID, BalanceFrequency, DayRestriction } from '../../types';
import type { CreateBalanceRuleCommand } from './commands/CreateBalanceRuleCommand';
import type { UpdateBalanceRuleCommand } from './commands/UpdateBalanceRuleCommand';
import type { DeleteBalanceRuleCommand } from './commands/DeleteBalanceRuleCommand';
import { BalanceRuleCreated } from './events/BalanceRuleCreated';
import { BalanceRuleUpdated } from './events/BalanceRuleUpdated';
import { BalanceRuleDeleted } from './events/BalanceRuleDeleted';

interface BalanceRuleState {
  readonly id: UUID;
  readonly categoryId: UUID;
  readonly minimumCount: number;
  readonly frequency: BalanceFrequency;
  readonly dayRestriction: DayRestriction;
  readonly deleted: boolean;
}

export class BalanceRule {
  private constructor(private readonly state: BalanceRuleState) {}

  static reconstruct(history: StoredEvent[]): BalanceRule | null {
    let state: BalanceRuleState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'BalanceRuleCreated') {
        state = {
          id: event.aggregateId as UUID,
          categoryId: payload.categoryId as UUID,
          minimumCount: payload.minimumCount as number,
          frequency: payload.frequency as BalanceFrequency,
          dayRestriction: payload.dayRestriction as DayRestriction,
          deleted: false,
        };
      } else if (state !== null && event.eventType === 'BalanceRuleUpdated') {
        state = {
          ...(state as BalanceRuleState),
          minimumCount: (payload.minimumCount as number) ?? state.minimumCount,
          frequency: (payload.frequency as BalanceFrequency) ?? state.frequency,
          dayRestriction: (payload.dayRestriction as DayRestriction) ?? state.dayRestriction,
        };
      } else if (state !== null && event.eventType === 'BalanceRuleDeleted') {
        state = { ...(state as BalanceRuleState), deleted: true };
      }
    }
    return state !== null ? new BalanceRule(state) : null;
  }

  static create(cmd: CreateBalanceRuleCommand): BalanceRuleCreated {
    return new BalanceRuleCreated(crypto.randomUUID() as UUID, cmd.payload);
  }

  update(cmd: UpdateBalanceRuleCommand): BalanceRuleUpdated {
    if (this.state.deleted) throw new Error('BalanceRule not found');
    return new BalanceRuleUpdated(cmd.payload);
  }

  delete(cmd: DeleteBalanceRuleCommand): BalanceRuleDeleted {
    if (this.state.deleted) throw new Error('BalanceRule not found');
    return new BalanceRuleDeleted(cmd.payload);
  }
}
