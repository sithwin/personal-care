import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getPool } from './db';

const server = new Server(
  { name: 'personal-care-gtd', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'get_ready_tasks', description: 'Get all tasks with status = ready', inputSchema: { type: 'object', properties: {} } },
    { name: 'suggest_for_duration', description: 'Get ready tasks fitting within available hours, balance-aware', inputSchema: { type: 'object', properties: { hours: { type: 'number', description: 'Available hours' } }, required: ['hours'] } },
    { name: 'get_items_to_buy', description: 'Get all items with status = to_buy', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_upcoming_due', description: 'Get tasks due within N days', inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Number of days ahead' } }, required: ['days'] } },
    { name: 'get_category_summary', description: 'Get per-category task and item counts', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_todays_schedule', description: 'Get tasks scheduled for today with start times', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_free_slots', description: 'Get unscheduled hour gaps in a day', inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'Date in YYYY-MM-DD format' } }, required: ['date'] } },
    { name: 'get_balance_status', description: 'Get all balance rules with current period met/unmet status', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_unmet_balance_rules', description: 'Get only the balance rules not yet met for the current period', inputSchema: { type: 'object', properties: {} } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const pool = getPool();
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_ready_tasks': {
        const rows = await pool.query(
          `SELECT t.id, t.name, t.estimated_duration_value, t.estimated_duration_unit, t.due_date, c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.status = 'ready' ORDER BY t.due_date ASC NULLS LAST`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'suggest_for_duration': {
        const { hours } = z.object({ hours: z.number() }).parse(args);
        const unmet = await pool.query('SELECT category_id FROM balance_status_view WHERE is_met = false');
        const priorityIds = new Set(unmet.rows.map((r: { category_id: string }) => r.category_id));
        const rows = await pool.query(
          `SELECT t.id, t.name, t.estimated_duration_value, t.estimated_duration_unit, t.due_date,
                  t.category_id, c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.status = 'ready'
             AND (t.estimated_duration_value IS NULL
               OR (t.estimated_duration_unit = 'hour' AND t.estimated_duration_value <= $1)
               OR (t.estimated_duration_unit = 'day' AND t.estimated_duration_value * 8 <= $1))
           ORDER BY t.due_date ASC NULLS LAST`,
          [hours]
        );
        const sorted = rows.rows.sort((a: { category_id: string }, b: { category_id: string }) => {
          return (priorityIds.has(a.category_id) ? 0 : 1) - (priorityIds.has(b.category_id) ? 0 : 1);
        });
        return { content: [{ type: 'text', text: JSON.stringify(sorted, null, 2) }] };
      }

      case 'get_items_to_buy': {
        const rows = await pool.query(
          `SELECT i.id, i.name, i.quantity, i.price, c.name as category_name, c.icon as category_icon
           FROM items_view i LEFT JOIN categories_view c ON c.id = i.category_id
           WHERE i.status = 'to_buy' ORDER BY c.name, i.name`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_upcoming_due': {
        const { days } = z.object({ days: z.number() }).parse(args);
        const rows = await pool.query(
          `SELECT t.id, t.name, t.due_date, t.status, c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '${Math.floor(days)} days'
             AND t.status != 'done'
           ORDER BY t.due_date ASC`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_category_summary': {
        const rows = await pool.query(
          'SELECT id, name, icon, color, task_count, item_count FROM categories_view WHERE deleted = false ORDER BY name'
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_todays_schedule': {
        const rows = await pool.query(
          `SELECT t.id, t.name, t.scheduled_date, t.scheduled_start_time,
                  t.estimated_duration_value, t.estimated_duration_unit,
                  c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.scheduled_date = CURRENT_DATE
           ORDER BY t.scheduled_start_time ASC NULLS LAST`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_free_slots': {
        const { date } = z.object({ date: z.string() }).parse(args);
        const scheduled = await pool.query(
          `SELECT scheduled_start_time, estimated_duration_value, estimated_duration_unit
           FROM tasks_view WHERE scheduled_date = $1 AND scheduled_start_time IS NOT NULL
           ORDER BY scheduled_start_time`,
          [date]
        );
        const busySlots = scheduled.rows.map((r: { scheduled_start_time: string; estimated_duration_value: number; estimated_duration_unit: string }) => {
          const [h, m] = r.scheduled_start_time.split(':').map(Number);
          const startHour = h + m / 60;
          const durationHours = r.estimated_duration_unit === 'hour' ? (r.estimated_duration_value ?? 1) : 8;
          return { start: startHour, end: startHour + durationHours };
        });

        const freeSlots: Array<{ from: string; to: string; hours: number }> = [];
        const workStart = 8; const workEnd = 22;
        let cursor = workStart;
        for (const slot of busySlots) {
          if (cursor < slot.start) {
            const hours = slot.start - cursor;
            freeSlots.push({ from: `${Math.floor(cursor)}:${String((cursor % 1) * 60).padStart(2, '0')}`, to: `${Math.floor(slot.start)}:${String((slot.start % 1) * 60).padStart(2, '0')}`, hours });
          }
          cursor = Math.max(cursor, slot.end);
        }
        if (cursor < workEnd) freeSlots.push({ from: `${Math.floor(cursor)}:00`, to: `${workEnd}:00`, hours: workEnd - cursor });

        return { content: [{ type: 'text', text: JSON.stringify({ date, freeSlots }, null, 2) }] };
      }

      case 'get_balance_status': {
        const rows = await pool.query(
          `SELECT bs.*, c.name as category_name, c.icon as category_icon
           FROM balance_status_view bs LEFT JOIN categories_view c ON c.id = bs.category_id
           ORDER BY bs.frequency`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_unmet_balance_rules': {
        const rows = await pool.query(
          `SELECT bs.*, c.name as category_name, c.icon as category_icon
           FROM balance_status_view bs LEFT JOIN categories_view c ON c.id = bs.category_id
           WHERE bs.is_met = false ORDER BY bs.frequency`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GTD MCP server running');
}

main().catch(console.error);
