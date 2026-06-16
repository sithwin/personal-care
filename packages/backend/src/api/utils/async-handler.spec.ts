import type { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from './async-handler';

describe('asyncHandler', () => {
  it('calls next with error when fn rejects', async () => {
    const testError = new Error('Handler error');
    const asyncFn = vi.fn<[Request, Response, NextFunction], Promise<void>>().mockRejectedValue(testError);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn<[unknown], void>();

    const handler = asyncHandler(asyncFn);

    handler(req, res, next);

    // Allow promise chain to settle
    await new Promise(resolve => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(testError);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not call next when fn resolves', async () => {
    const asyncFn = vi.fn<[Request, Response, NextFunction], Promise<void>>().mockResolvedValue(undefined);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn<[unknown], void>();

    const handler = asyncHandler(asyncFn);

    handler(req, res, next);

    // Allow promise chain to settle
    await new Promise(resolve => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
  });
});
