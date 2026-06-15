import { Router, Request, Response, NextFunction } from 'express';
import type { ICommandBus } from '../../application/ports/ICommandBus';

export function makeCommandsRouter(bus: ICommandBus): Router {
  const router = Router();

  router.post('/:type', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const command = { type: req.params.type, payload: req.body } as Parameters<typeof bus.dispatch>[0];
      const events = await bus.dispatch(command);
      res.status(201).json({ events: events.map(e => ({ id: e.id, eventType: e.eventType, aggregateId: e.aggregateId })) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
