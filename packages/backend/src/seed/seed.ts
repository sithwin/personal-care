import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type { ICommandBus } from '../application/ports/ICommandBus';
import { childLogger } from '../infrastructure/logger';

const log = childLogger('seed');

export async function seed(bus: ICommandBus, pool: Pool): Promise<void> {
  const existing = await pool.query(`SELECT id FROM categories_view WHERE name IN ('Health', 'Study') AND is_default = true`);
  if (existing.rows.length >= 2) {
    log.debug('Seed skipped — built-in categories already exist');
    return;
  }

  const healthId = uuidv4();
  const studyId = uuidv4();

  await bus.dispatch({ type: 'CreateCategory', payload: { id: healthId, name: 'Health', icon: '💪', color: '#ef4444', isDefault: true } });
  await bus.dispatch({ type: 'CreateCategory', payload: { id: studyId, name: 'Study', icon: '📚', color: '#8b5cf6', isDefault: true } });

  await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: healthId, minimumCount: 1, frequency: 'daily', dayRestriction: null } });
  await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: studyId, minimumCount: 1, frequency: 'daily', dayRestriction: null } });

  const userCats = await pool.query(`SELECT id, name FROM categories_view WHERE name IN ('Home', 'Cars') AND is_default = false`);
  for (const cat of userCats.rows) {
    const existingRule = await pool.query('SELECT id FROM balance_rules_view WHERE category_id = $1', [cat.id]);
    if (existingRule.rows.length > 0) continue;

    if (cat.name === 'Home') {
      await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: cat.id, minimumCount: 1, frequency: 'weekly', dayRestriction: 'weekend' } });
    } else if (cat.name === 'Cars') {
      await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: cat.id, minimumCount: 1, frequency: 'monthly', dayRestriction: null } });
    }
  }

  log.info('Seed complete: Health and Study categories + balance rules created');
}
