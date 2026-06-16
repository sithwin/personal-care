import { fetchJSON } from './client';

interface CommandResult { events: Array<{ id: number; eventType: string; aggregateId: string }>; }

export async function dispatch(type: string, payload: Record<string, unknown>): Promise<CommandResult> {
  return fetchJSON<CommandResult>(`/commands/${type}`, { method: 'POST', body: JSON.stringify(payload) });
}
