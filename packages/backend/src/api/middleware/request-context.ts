import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.requestId = randomUUID();
  req.log = req.log.child({ requestId: req.requestId });
  next();
}
