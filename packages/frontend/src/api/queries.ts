import { useQuery } from '@tanstack/react-query';
import { fetchJSON } from './client';

export interface Task {
  id: string; name: string; description?: string; category_id: string; project_id?: string;
  status: 'ready' | 'ongoing' | 'pending' | 'planned' | 'done';
  estimated_duration_value?: number; estimated_duration_unit?: string;
  due_date?: string; scheduled_date?: string; scheduled_start_time?: string;
  recurrence_rule?: { interval: number; unit: string };
  completion_count: number; required_items?: unknown[]; resources?: unknown[];
}

export interface Item {
  id: string; name: string; description?: string; category_id: string;
  status: 'to_buy' | 'available' | 'consumed'; quantity?: number; price?: number; notes?: string;
}

export interface Category {
  id: string; name: string; icon: string; color: string; is_default: boolean;
  task_count: number; item_count: number;
}

export interface Project {
  id: string; name: string; description?: string; category_id: string;
  status: 'active' | 'on_hold' | 'done'; due_date?: string; task_ids: string[];
}

export interface Resource {
  id: string; title: string; type: string; url?: string; notes?: string;
  category_id?: string; task_ids: string[];
}

export interface BalanceStatus {
  rule_id: string; category_id: string; frequency: string;
  target_count: number; actual_count: number; is_met: boolean;
  category_name: string; category_icon: string;
}

export interface Dashboard {
  counts: { ready_count: number; ongoing_count: number; pending_count: number; planned_count: number; to_buy_count: number };
  balanceStatus: BalanceStatus[];
  upNext: Task[];
}

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => fetchJSON<Dashboard>('/dashboard') });
export const useTasks = (params?: Record<string, string>) => useQuery({ queryKey: ['tasks', params], queryFn: () => fetchJSON<Task[]>(`/tasks?${new URLSearchParams(params)}`) });
export const useTask = (id: string) => useQuery({ queryKey: ['tasks', id], queryFn: () => fetchJSON<Task>(`/tasks/${id}`) });
export const useItems = (params?: Record<string, string>) => useQuery({ queryKey: ['items', params], queryFn: () => fetchJSON<Item[]>(`/items?${new URLSearchParams(params)}`) });
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => fetchJSON<Category[]>('/categories') });
export const useProjects = (params?: Record<string, string>) => useQuery({ queryKey: ['projects', params], queryFn: () => fetchJSON<Project[]>(`/projects?${new URLSearchParams(params)}`) });
export const useResources = (params?: Record<string, string>) => useQuery({ queryKey: ['resources', params], queryFn: () => fetchJSON<Resource[]>(`/resources?${new URLSearchParams(params)}`) });
export const useBalanceStatus = () => useQuery({ queryKey: ['balance', 'status'], queryFn: () => fetchJSON<BalanceStatus[]>('/balance/status') });
export const useBalanceRules = () => useQuery({ queryKey: ['balance', 'rules'], queryFn: () => fetchJSON<unknown[]>('/balance/rules') });
export const useSuggestions = (hours: number, categoryId?: string) => useQuery({
  queryKey: ['suggest', hours, categoryId],
  queryFn: () => {
    const p = new URLSearchParams({ hours: String(hours) });
    if (categoryId) p.set('categoryId', categoryId);
    return fetchJSON<Task[]>(`/suggest?${p}`);
  },
  enabled: hours > 0,
});
