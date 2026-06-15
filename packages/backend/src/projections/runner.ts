import { type Pool } from 'pg';
import { type StoredEvent } from '../types';
import { tasksProjector } from './tasks.projector';
import { itemsProjector } from './items.projector';
import { categoriesProjector } from './categories.projector';
import { projectsProjector } from './projects.projector';
import { resourcesProjector } from './resources.projector';
import { balanceProjector } from './balance.projector';
import { dashboardProjector } from './dashboard.projector';

const PROJECTORS = [
  categoriesProjector,
  itemsProjector,
  tasksProjector,
  projectsProjector,
  resourcesProjector,
  balanceProjector,
  dashboardProjector,
];

export async function runProjectors(events: StoredEvent[], pool: Pool): Promise<void> {
  for (const event of events) {
    for (const projector of PROJECTORS) {
      await projector(event, pool);
    }
  }
}
