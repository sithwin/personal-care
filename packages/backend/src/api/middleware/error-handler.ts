import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.message);
  const status = err.message.includes('not found') ? 404
    : err.message.includes('Concurrency') ? 409
    : err.message.includes('Cannot delete') ? 400
    : 500;
  res.status(status).json({ error: err.message });
}
