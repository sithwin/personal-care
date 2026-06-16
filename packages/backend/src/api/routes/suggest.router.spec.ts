import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ISuggestQueryService, SuggestedTaskView } from '../../application/ports/ISuggestQueryService';
import { makeSuggestRouter } from './suggest.router';
import { errorHandler } from '../middleware/error-handler';

function makeSuggestedTaskView(overrides: Partial<SuggestedTaskView> = {}): SuggestedTaskView {
  return {
    id: 'task-1',
    name: 'Buy milk',
    category_id: 'cat-1',
    status: 'ready',
    due_date: null,
    estimated_duration_value: null,
    estimated_duration_unit: null,
    ...overrides,
  };
}

describe('suggest router', () => {
  let queryService: ISuggestQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { suggest: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/suggest', makeSuggestRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('parses hours as a float and passes the filter through', async () => {
    const suggestions = [makeSuggestedTaskView()];
    vi.mocked(queryService.suggest).mockResolvedValue(suggestions);

    const res = await fetch(`${baseUrl}/suggest?hours=1.5&categoryId=cat-1`);
    const body = await res.json();

    expect(queryService.suggest).toHaveBeenCalledWith({ hours: 1.5, categoryId: 'cat-1' });
    expect(res.status).toBe(200);
    expect(body).toEqual(suggestions);
  });

  it('leaves hours undefined when no hours query param is given', async () => {
    vi.mocked(queryService.suggest).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/suggest`);

    expect(queryService.suggest).toHaveBeenCalledWith({ hours: undefined, categoryId: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
