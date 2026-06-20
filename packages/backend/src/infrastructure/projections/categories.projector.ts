import type { Projector } from '../../application/ports/IProjector';
import type { ICategoryViewRepository } from '../../application/ports/ICategoryViewRepository';

export function createCategoriesProjector(categoryRepo: ICategoryViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'CategoryCreated':
        await categoryRepo.insert({
          id: event.aggregateId,
          name: p.name as string,
          icon: (p.icon as string | undefined) ?? '📂',
          color: (p.color as string | undefined) ?? '#6b7280',
          isDefault: (p.isDefault as boolean | undefined) ?? false,
        });
        break;

      case 'CategoryUpdated':
        await categoryRepo.update(event.aggregateId, {
          name: (p.name as string | undefined) ?? null,
          icon: (p.icon as string | undefined) ?? null,
          color: (p.color as string | undefined) ?? null,
        });
        break;

      case 'CategoryDeleted':
        await categoryRepo.markDeleted(event.aggregateId);
        break;

      case 'TaskCreated':
        await categoryRepo.incrementTaskCount(p.categoryId as string);
        break;

      case 'ItemCreated':
        await categoryRepo.incrementItemCount(p.categoryId as string);
        break;

      default:
        break;
    }
  };
}
