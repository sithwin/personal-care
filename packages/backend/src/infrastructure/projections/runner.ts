import type { StoredEvent } from '../../types';
import type { Projector } from '../../application/ports/IProjector';
import type { RequestContext } from '../../application/ports/RequestContext';

export function createProjectorRunner(
  projectors: Projector[],
): (events: StoredEvent[], ctx: RequestContext) => Promise<void> {
  return async (events, ctx) => {
    for (const event of events) {
      for (const projector of projectors) {
        await projector(event, ctx);
      }
    }
  };
}
