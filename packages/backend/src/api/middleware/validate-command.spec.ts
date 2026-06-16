import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validateCommand } from './validate-command';
import { AppError } from '../errors/app-error';

function makeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('validateCommand', () => {
  const schemas = {
    CreateTaskCommand: z.object({ id: z.string().uuid(), name: z.string().min(1) }),
  };

  it('throws an AppError(400) when the command type has no registered schema', () => {
    const middleware = validateCommand(schemas);
    const req = { params: { type: 'UnknownCommand' }, body: {} } as unknown as Request;
    const next = vi.fn() as NextFunction;

    expect(() => middleware(req, makeRes(), next)).toThrow(AppError);
    try {
      middleware(req, makeRes(), next);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).message).toBe('Unknown command type: UnknownCommand');
    }
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 with validation details when the payload fails schema parsing', () => {
    const middleware = validateCommand(schemas);
    const req = { params: { type: 'CreateTaskCommand' }, body: { id: 'not-a-uuid' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation failed' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('replaces req.body with the parsed data and calls next when the payload is valid', () => {
    const middleware = validateCommand(schemas);
    const req = { params: { type: 'CreateTaskCommand' }, body: { id: '11111111-1111-1111-1111-111111111111', name: 'Buy milk' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(req.body).toEqual({ id: '11111111-1111-1111-1111-111111111111', name: 'Buy milk' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
