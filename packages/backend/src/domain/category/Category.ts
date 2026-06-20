import type { StoredEvent, UUID } from '../../types';
import type { CreateCategoryCommand } from './commands/CreateCategoryCommand';
import type { UpdateCategoryCommand } from './commands/UpdateCategoryCommand';
import type { DeleteCategoryCommand } from './commands/DeleteCategoryCommand';
import { CategoryCreated } from './events/CategoryCreated';
import { CategoryUpdated } from './events/CategoryUpdated';
import { CategoryDeleted } from './events/CategoryDeleted';

interface CategoryState {
  readonly id: UUID;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly isDefault: boolean;
  readonly deleted: boolean;
}

export class Category {
  private constructor(private readonly state: CategoryState) {}

  static reconstruct(history: StoredEvent[]): Category | null {
    let state: CategoryState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'CategoryCreated') {
        state = {
          id: event.aggregateId as UUID,
          name: payload.name as string,
          icon: payload.icon as string,
          color: payload.color as string,
          isDefault: payload.isDefault as boolean,
          deleted: false,
        };
      } else if (state !== null && event.eventType === 'CategoryUpdated') {
        state = {
          ...(state as CategoryState),
          name: (payload.name as string) ?? state.name,
          icon: (payload.icon as string) ?? state.icon,
          color: (payload.color as string) ?? state.color,
        };
      } else if (state !== null && event.eventType === 'CategoryDeleted') {
        state = { ...(state as CategoryState), deleted: true };
      }
    }
    return state !== null ? new Category(state) : null;
  }

  static create(cmd: CreateCategoryCommand): CategoryCreated {
    return new CategoryCreated(crypto.randomUUID() as UUID, cmd.payload);
  }

  update(cmd: UpdateCategoryCommand): CategoryUpdated {
    if (this.state.deleted) throw new Error('Category not found');
    return new CategoryUpdated(cmd.payload);
  }

  delete(cmd: DeleteCategoryCommand): CategoryDeleted {
    if (this.state.deleted) throw new Error('Category not found');
    if (this.state.isDefault) throw new Error('Cannot delete built-in category');
    return new CategoryDeleted(cmd.payload);
  }
}
