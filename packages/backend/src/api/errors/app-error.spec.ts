import { describe, it, expect } from 'vitest';
import { AppError } from './app-error';

describe('AppError', () => {
  it('should construct with message and statusCode', () => {
    const message = 'Test error message';
    const statusCode = 400;
    const error = new AppError(message, statusCode);

    expect(error).toBeDefined();
  });

  it('should have name property equal to "AppError"', () => {
    const error = new AppError('Test error', 400);

    expect(error.name).toBe('AppError');
  });

  it('should expose statusCode property matching constructor argument', () => {
    const statusCode = 404;
    const error = new AppError('Not found', statusCode);

    expect(error.statusCode).toBe(statusCode);
  });

  it('should expose message property matching constructor argument', () => {
    const message = 'Something went wrong';
    const error = new AppError(message, 500);

    expect(error.message).toBe(message);
  });

  it('should be an instance of AppError', () => {
    const error = new AppError('Test error', 400);

    expect(error instanceof AppError).toBe(true);
  });

  it('should be an instance of Error', () => {
    const error = new AppError('Test error', 400);

    expect(error instanceof Error).toBe(true);
  });
});
