import { describe, it, expect } from 'vitest';
import { Resource } from './Resource';
import { ResourceCreated } from './events/ResourceCreated';
import { ResourceUpdated } from './events/ResourceUpdated';
import { ResourceDeleted } from './events/ResourceDeleted';
import type { StoredEvent } from '../../types';

function toStoredEvent(event: ResourceCreated | ResourceUpdated | ResourceDeleted, id: number): StoredEvent {
  return {
    id,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    eventType: event.eventType,
    payload: event.payload,
    version: id,
    createdAt: new Date(),
  };
}

describe('Resource', () => {
  describe('reconstruct', () => {
    it('returns null for empty history', () => {
      expect(Resource.reconstruct([])).toBeNull();
    });

    it('builds state from history', () => {
      const created = new ResourceCreated({ id: 'r1', title: 'GTD Book', type: 'link', url: 'https://example.com' });
      const resource = Resource.reconstruct([toStoredEvent(created, 1)]);

      expect(resource).not.toBeNull();
    });
  });

  describe('create', () => {
    it('creates a ResourceCreated event', () => {
      const event = Resource.create({
        type: 'CreateResource',
        payload: { id: 'r1', title: 'GTD Book', type: 'link', url: 'https://example.com' },
      });

      expect(event).toBeInstanceOf(ResourceCreated);
      expect(event.payload).toEqual({ id: 'r1', title: 'GTD Book', type: 'link', url: 'https://example.com' });
    });
  });

  describe('update', () => {
    it('updates an existing resource', () => {
      const created = new ResourceCreated({ id: 'r1', title: 'GTD Book', type: 'link' });
      const resource = Resource.reconstruct([toStoredEvent(created, 1)]);

      const event = resource?.update({ type: 'UpdateResource', payload: { id: 'r1', title: 'GTD Book v2' } });

      expect(event).toBeInstanceOf(ResourceUpdated);
      expect(event?.payload).toEqual({ id: 'r1', title: 'GTD Book v2' });
    });
  });

  describe('delete', () => {
    it('deletes an existing resource', () => {
      const created = new ResourceCreated({ id: 'r1', title: 'GTD Book', type: 'link' });
      const resource = Resource.reconstruct([toStoredEvent(created, 1)]);

      const event = resource?.delete({ type: 'DeleteResource', payload: { id: 'r1' } });

      expect(event).toBeInstanceOf(ResourceDeleted);
    });
  });
});
