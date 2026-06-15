import { Router } from 'express';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { asyncHandler } from '../utils/async-handler';

export function makeCommandsRouter(bus: ICommandBus): Router {
  const router = Router();

  router.post('/:type', asyncHandler(async (req, res) => {
    const command = { type: req.params.type, payload: req.body as Record<string, unknown> };
    const events = await bus.dispatch(command);
    res.status(201).json({
      events: events.map(e => ({ id: e.id, eventType: e.eventType, aggregateId: e.aggregateId })),
    });
  }));

  return router;
}
