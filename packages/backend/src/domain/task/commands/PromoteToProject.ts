import type { UUID } from '../../../types';

export interface PromoteToProject {
  readonly type: 'PromoteToProject';
  readonly payload: { readonly taskId: UUID; readonly projectId: UUID };
}
