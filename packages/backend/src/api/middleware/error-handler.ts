import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { childLogger } from '../../infrastructure/logger';

const log = childLogger('error-handler');

interface PgError extends Error {
  code?: string;
}

function isPgError(err: unknown): err is PgError {
  return err instanceof Error && 'code' in err;
}

function resolveStatus(err: unknown): number {
  if (err instanceof AppError) return err.statusCode;
  if (err instanceof ZodError) return 400;

  if (isPgError(err)) {
    if (err.code === '22P02') return 400; // invalid UUID / type input
    if (err.code === '23503') return 409; // foreign key violation
  }

  if (err instanceof Error) {
    if (err.message.includes('not found')) return 404;
    if (err.message.includes('Concurrency')) return 409;
    if (err.message.includes('Cannot delete')) return 400;
  }

  return 500;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const status = resolveStatus(err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const pgCode = isPgError(err) ? err.code : undefined;
  const context = { requestId: req.requestId, method: req.method, url: req.url, status, pgCode };

  if (status >= 500) {
    log.error({ err, ...context }, 'Unhandled server error');
  } else {
    log.warn({ err: message, ...context }, 'Client error');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    message,
    ...(isProduction || !(err instanceof Error) ? {} : { stack: err.stack }),
  });
}
