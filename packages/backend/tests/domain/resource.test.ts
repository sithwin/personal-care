import { describe, it, expect } from 'vitest';
import { handleResourceCommand } from '../../src/domain/resource/aggregate';

describe('Resource aggregate', () => {
  it('CreateResource emits ResourceCreated', () => {
    const events = handleResourceCommand({ type: 'CreateResource', payload: { id: 'r-1', title: 'GTD Book', type: 'link', url: 'https://example.com' } }, []);
    expect(events[0].eventType).toBe('ResourceCreated');
  });

  it('DeleteResource emits ResourceDeleted', () => {
    const history = [{ eventType: 'ResourceCreated', payload: { id: 'r-1', title: 'GTD Book', type: 'link' } }];
    const events = handleResourceCommand({ type: 'DeleteResource', payload: { id: 'r-1' } }, history);
    expect(events[0].eventType).toBe('ResourceDeleted');
  });
});
