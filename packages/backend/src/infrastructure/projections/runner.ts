import type { StoredEvent } from '../../types';
import type { Projector } from '../../application/ports/IProjector';

export function createProjectorRunner(projectors: Projector[]): (events: StoredEvent[]) => Promise<void> {
  return async (events) => {
    for (const event of events) {
      for (const projector of projectors) {
        await projector(event);
      }
    }
  };
}
