import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateProjectCommand } from '../../../domain/project/commands/CreateProjectCommand';
import { Project } from '../../../domain/project/Project';

export class CreateProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateProjectCommand): Promise<StoredEvent[]> {
    const event = Project.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
