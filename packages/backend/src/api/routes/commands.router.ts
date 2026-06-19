import { Router } from 'express';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { asyncHandler } from '../utils/async-handler';
import { validateCommand } from '../middleware/validate-command';
import { commandSchemas } from '../validation';

export function makeCommandsRouter(bus: ICommandBus): Router {
  const router = Router();

  router.post('/:type', validateCommand(commandSchemas), asyncHandler(async (req, res) => {
    const command = { type: req.params.type, payload: req.body as Record<string, unknown> };
    const events = await bus.dispatch(command, { requestId: req.requestId, log: req.log });
    res.status(201).json({
      events: events.map(e => ({ id: e.id, eventType: e.eventType, aggregateId: e.aggregateId })),
    });
  }));

  return router;
}
