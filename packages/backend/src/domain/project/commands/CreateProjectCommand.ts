import type { UUID } from '../../../types';

export interface CreateProjectCommand {
  readonly type: 'CreateProjectCommand';
  readonly payload: {
    readonly name: string;
    readonly categoryId: UUID;
    readonly description?: string;
    readonly dueDate?: string;
  };
}
