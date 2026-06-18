import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { makeSearchRouter } from './search.router';
import type { ISearchQueryService } from '../../application/ports/ISearchQueryService';

const mockSearch = vi.fn();
const queryService: ISearchQueryService = { search: mockSearch };

const app = express();
app.use(express.json());
app.use('/search', makeSearchRouter(queryService));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  const message = (err as Error).message ?? 'Internal server error';
  res.status(status).json({ error: message });
});

describe('GET /search', () => {
  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/search');
    expect(res.status).toBe(400);
  });

  it('returns 400 when q is 1 character', async () => {
    const res = await request(app).get('/search?q=a');
    expect(res.status).toBe(400);
  });

  it('returns 200 with search results for valid q', async () => {
    mockSearch.mockResolvedValueOnce({ tasks: [], projects: [], items: [] });
    const res = await request(app).get('/search?q=fix');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [], projects: [], items: [] });
    expect(mockSearch).toHaveBeenCalledWith('fix');
  });
});
