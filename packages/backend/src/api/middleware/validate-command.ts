import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../errors/app-error';

export function validateCommand(schemas: Record<string, ZodSchema>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = schemas[req.params.type];
    if (!schema) throw new AppError(`Unknown command type: ${req.params.type}`, 400);

    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    req.body = result.data;
    next();
  };
}
