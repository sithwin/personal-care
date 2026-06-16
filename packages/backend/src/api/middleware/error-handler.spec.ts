import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from './error-handler';
import { AppError } from '../errors/app-error';

describe('errorHandler middleware', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    mockReq = {} as Request;
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    mockNext = vi.fn() as NextFunction;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should use AppError statusCode when err is an AppError instance', () => {
    const error = new AppError('Not authorized', 403);
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not authorized',
      stack: expect.any(String),
    });
  });

  it('should map Postgres error code 22P02 to 400', () => {
    const error = new Error('Invalid input');
    (error as unknown as { code: string }).code = '22P02';
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid input',
      }),
    );
  });

  it('should map Postgres error code 23503 to 409', () => {
    const error = new Error('Foreign key violation');
    (error as unknown as { code: string }).code = '23503';
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Foreign key violation',
      }),
    );
  });

  it('should return 404 for Error with "not found" in message (case-insensitive)', () => {
    const error = new Error('Resource not found');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Resource not found',
      }),
    );
  });

  it('should NOT return 404 for "NOT FOUND" in uppercase (case-sensitive)', () => {
    const error = new Error('Item NOT FOUND in database');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should return 409 for Error with "Concurrency" in message', () => {
    const error = new Error('Concurrency conflict detected');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Concurrency conflict detected',
      }),
    );
  });

  it('should return 400 for Error with "Cannot delete" in message', () => {
    const error = new Error('Cannot delete resource with dependencies');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Cannot delete resource with dependencies',
      }),
    );
  });

  it('should return 500 for unknown/generic errors', () => {
    const error = new Error('Something went wrong');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Something went wrong',
      }),
    );
  });

  it('should include stack trace in response when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Test error');
    errorHandler(error, mockReq, mockRes, mockNext);

    const jsonCall = (mockRes.json as unknown as { mock: { calls: Array<[unknown]> } }).mock.calls[0][0] as { stack?: string };
    expect(jsonCall.stack).toBeDefined();
    expect(typeof jsonCall.stack).toBe('string');
  });

  it('should NOT include stack trace in response when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Test error');
    errorHandler(error, mockReq, mockRes, mockNext);

    const jsonCall = (mockRes.json as unknown as { mock: { calls: Array<[unknown]> } }).mock.calls[0][0] as { stack?: string };
    expect(jsonCall.stack).toBeUndefined();
  });

  it('should use "Internal Server Error" message for non-Error objects', () => {
    const error = { some: 'object' };
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal Server Error',
      }),
    );
  });
});
