import { describe, it, expect, vi } from 'vitest';
import type { StoredEvent } from '../../types';
import type { Projector } from '../../application/ports/IProjector';
import { createProjectorRunner } from './runner';

describe('createProjectorRunner', () => {
  it('calls each projector once per event with correct event instances', async () => {
    const projector1 = vi.fn().mockResolvedValue(undefined) as unknown as Projector;
    const projector2 = vi.fn().mockResolvedValue(undefined) as unknown as Projector;

    const runner = createProjectorRunner([projector1, projector2]);

    const event0: StoredEvent = {
      id: 1,
      aggregateId: '00000000-0000-0000-0000-000000000001',
      aggregateType: 'test',
      eventType: 'TestEvent',
      payload: { test: 'data0' },
      version: 1,
      createdAt: new Date(),
    };

    const event1: StoredEvent = {
      id: 2,
      aggregateId: '00000000-0000-0000-0000-000000000001',
      aggregateType: 'test',
      eventType: 'TestEvent',
      payload: { test: 'data1' },
      version: 2,
      createdAt: new Date(),
    };

    await runner([event0, event1]);

    expect(projector1).toHaveBeenCalledTimes(2);
    expect(projector2).toHaveBeenCalledTimes(2);
    expect(projector1).toHaveBeenNthCalledWith(1, event0);
    expect(projector1).toHaveBeenNthCalledWith(2, event1);
    expect(projector2).toHaveBeenNthCalledWith(1, event0);
    expect(projector2).toHaveBeenNthCalledWith(2, event1);
  });

  it('processes events and projectors in sequential order: event-then-projector', async () => {
    const callLog: string[] = [];

    const projector1 = vi
      .fn()
      .mockImplementation(async (event: StoredEvent) => {
        callLog.push(`projector1:event${event.id - 1}`);
      }) as unknown as Projector;

    const projector2 = vi
      .fn()
      .mockImplementation(async (event: StoredEvent) => {
        callLog.push(`projector2:event${event.id - 1}`);
      }) as unknown as Projector;

    const runner = createProjectorRunner([projector1, projector2]);

    const event0: StoredEvent = {
      id: 1,
      aggregateId: '00000000-0000-0000-0000-000000000001',
      aggregateType: 'test',
      eventType: 'TestEvent',
      payload: {},
      version: 1,
      createdAt: new Date(),
    };

    const event1: StoredEvent = {
      id: 2,
      aggregateId: '00000000-0000-0000-0000-000000000001',
      aggregateType: 'test',
      eventType: 'TestEvent',
      payload: {},
      version: 2,
      createdAt: new Date(),
    };

    await runner([event0, event1]);

    expect(callLog).toEqual([
      'projector1:event0',
      'projector2:event0',
      'projector1:event1',
      'projector2:event1',
    ]);
  });
});
