import { Request, Response, NextFunction } from 'express';
import { childLogger } from '../../infrastructure/logger';

const log = childLogger('error-handler');

interface PgError extends Error {
  code?: string;
}

function resolveStatus(err: PgError): number {
  // PostgreSQL error codes
  if (err.code === '22P02') return 400; // invalid UUID / type input
  if (err.code === '23503') return 409; // foreign key violation

  // Domain error messages
  if (err.message.includes('not found')) return 404;
  if (err.message.includes('Concurrency')) return 409;
  if (err.message.includes('Cannot delete')) return 400;

  return 500;
}

export function errorHandler(err: PgError, req: Request, res: Response, _next: NextFunction): void {
  const status = resolveStatus(err);
  const context = { method: req.method, url: req.url, status, pgCode: err.code };

  if (status >= 500) {
    log.error({ err, ...context }, 'Unhandled server error');
  } else {
    log.warn({ err: err.message, ...context }, 'Client error');
  }

  res.status(status).json({ error: err.message });
}
