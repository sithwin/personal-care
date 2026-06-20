import { Router } from 'express';
import { z } from 'zod';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { asyncHandler } from '../utils/async-handler';
import { createBalanceRuleSchema, updateBalanceRuleSchema } from '../validation/balance-rule-commands.schema';

export function makeBalanceRulesRouter(bus: ICommandBus): Router {
  const router = Router();

  router.post('/', asyncHandler(async (req, res) => {
    const body = createBalanceRuleSchema.parse(req.body);
    const events = await bus.dispatch(
      { type: 'CreateBalanceRuleCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(201).json({ id: events[0].aggregateId });
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateBalanceRuleSchema.parse(req.body);
    await bus.dispatch(
      { type: 'UpdateBalanceRuleCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'DeleteBalanceRuleCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  return router;
}
