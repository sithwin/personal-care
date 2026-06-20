import { describe, it, expect, vi } from 'vitest';
import { Resource } from './Resource';
import { ResourceCreated } from './events/ResourceCreated';
import { ResourceUpdated } from './events/ResourceUpdated';
import { ResourceDeleted } from './events/ResourceDeleted';
import type { StoredEvent } from '../../types';

const TEST_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

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
      const created = new ResourceCreated('r1', { title: 'GTD Book', type: 'link', url: 'https://example.com' });
      const resource = Resource.reconstruct([toStoredEvent(created, 1)]);

      expect(resource).not.toBeNull();
    });
  });

  describe('create', () => {
    it('emits ResourceCreated with aggregateId from randomUUID', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(TEST_UUID as ReturnType<typeof crypto.randomUUID>);
      const cmd = { type: 'CreateResourceCommand' as const, payload: { title: 'GTD Book', type: 'link' as const, url: 'https://example.com' } };
      const event = Resource.create(cmd);
      expect(event.eventType).toBe('ResourceCreated');
      expect(event.aggregateId).toBe(TEST_UUID);
      expect(event.payload).toEqual({ title: 'GTD Book', type: 'link', url: 'https://example.com' });
    });
  });

  describe('update', () => {
    it('updates an existing resource', () => {
      const created = new ResourceCreated('r1', { title: 'GTD Book', type: 'link' });
      const resource = Resource.reconstruct([toStoredEvent(created, 1)]);

      const event = resource?.update({ type: 'UpdateResourceCommand', payload: { id: 'r1', title: 'GTD Book v2' } });

      expect(event).toBeInstanceOf(ResourceUpdated);
      expect(event?.payload).toEqual({ id: 'r1', title: 'GTD Book v2' });
    });
  });

  describe('delete', () => {
    it('deletes an existing resource', () => {
      const created = new ResourceCreated('r1', { title: 'GTD Book', type: 'link' });
      const resource = Resource.reconstruct([toStoredEvent(created, 1)]);

      const event = resource?.delete({ type: 'DeleteResourceCommand', payload: { id: 'r1' } });

      expect(event).toBeInstanceOf(ResourceDeleted);
    });
  });
});
