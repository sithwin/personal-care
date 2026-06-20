import type { Projector } from '../../application/ports/IProjector';
import type { IBalanceViewRepository, BalanceRuleRow } from '../../application/ports/IBalanceViewRepository';

function getPeriodBounds(frequency: string, dayRestriction: string | null): { start: Date; end: Date } | null {
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  if (frequency === 'daily') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (frequency === 'weekly') {
    if (dayRestriction === 'weekend' && !isWeekend) return null;
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (frequency === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

async function refreshBalanceStatus(balanceRepo: IBalanceViewRepository): Promise<void> {
  const rules = await balanceRepo.getAllRules();
  for (const rule of rules) {
    const bounds = getPeriodBounds(rule.frequency, rule.dayRestriction);
    const now = new Date();
    if (!bounds) {
      await balanceRepo.upsertStatus({
        ruleId: rule.id,
        categoryId: rule.categoryId,
        frequency: rule.frequency,
        targetCount: rule.minimumCount,
        actualCount: 0,
        isMet: false,
        periodStart: now,
        periodEnd: now,
      });
      continue;
    }
    const actualCount = await balanceRepo.countCompletedTasksInPeriod(rule.categoryId, bounds.start, bounds.end);
    await balanceRepo.upsertStatus({
      ruleId: rule.id,
      categoryId: rule.categoryId,
      frequency: rule.frequency,
      targetCount: rule.minimumCount,
      actualCount,
      isMet: actualCount >= rule.minimumCount,
      periodStart: bounds.start,
      periodEnd: bounds.end,
    });
  }
}

export function createBalanceProjector(balanceRepo: IBalanceViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'BalanceRuleCreated':
        await balanceRepo.insertRule({
          id: event.aggregateId,
          categoryId: p.categoryId as string,
          minimumCount: p.minimumCount as number,
          frequency: p.frequency as string,
          dayRestriction: (p.dayRestriction as string | undefined) ?? null,
        });
        await refreshBalanceStatus(balanceRepo);
        break;

      case 'BalanceRuleUpdated':
        await balanceRepo.updateRule(event.aggregateId, {
          minimumCount: (p.minimumCount as number | undefined) ?? null,
          frequency: (p.frequency as string | undefined) ?? null,
          dayRestriction: (p.dayRestriction as string | undefined) ?? null,
        });
        await refreshBalanceStatus(balanceRepo);
        break;

      case 'BalanceRuleDeleted':
        await balanceRepo.deleteRule(event.aggregateId);
        await balanceRepo.deleteStatusForRule(event.aggregateId);
        break;

      case 'TaskCompleted':
        await refreshBalanceStatus(balanceRepo);
        break;

      default:
        break;
    }
  };
}

export type { BalanceRuleRow };
