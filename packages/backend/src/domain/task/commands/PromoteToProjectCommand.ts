import type { UUID } from '../../../types';

export interface PromoteToProjectCommand {
  readonly type: 'PromoteToProjectCommand';
  readonly payload: { readonly taskId: UUID; readonly projectId: UUID };
}
