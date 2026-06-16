import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Task } from '../api/queries';
import { useTasks, useCategories } from '../api/queries';
import { dispatch } from '../api/commands';

const STATUS_TABS = ['ready', 'ongoing', 'pending', 'planned', 'done'] as const;

function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const cat = categories?.find(c => c.id === task.category_id);

  const handleComplete = async () => {
    await dispatch('CompleteTask', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTask', { id: task.id });
    await qc.invalidateQueries();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <button onClick={task.status === 'ongoing' ? handleComplete : task.status === 'ready' ? handleStart : undefined}
        className="text-gray-500 hover:text-white transition-colors text-lg">
        {task.status === 'done' ? '✅' : '☐'}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{task.name}</div>
        {task.recurrence_rule && <span className="text-xs text-gray-500">🔁 Every {task.recurrence_rule.interval} {task.recurrence_rule.unit}</span>}
      </div>
      {cat && <span className="text-xs text-gray-500">{cat.icon} {cat.name}</span>}
      {task.estimated_duration_value && (
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
          {task.estimated_duration_value}{task.estimated_duration_unit?.charAt(0)}
        </span>
      )}
      {task.due_date && (
        <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
      )}
    </div>
  );
}

export function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'ready';
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const { data: tasks, isLoading } = useTasks({ status, ...(categoryId ? { categoryId } : {}) });
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setSearchParams({ status: s })}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'}`}>
            {s}
          </button>
        ))}
        {categoryId && categories && (
          <span className="ml-2 text-sm text-gray-400 flex items-center gap-1">
            {categories.find(c => c.id === categoryId)?.icon} {categories.find(c => c.id === categoryId)?.name}
            <button onClick={() => setSearchParams({ status })} className="text-gray-600 hover:text-white ml-1">×</button>
          </span>
        )}
      </div>

      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      {!isLoading && tasks?.length === 0 && <div className="text-gray-600 text-sm">No tasks with status &quot;{status}&quot;</div>}
      <div className="flex flex-col gap-2">
        {tasks?.map(task => <TaskRow key={task.id} task={task} />)}
      </div>
    </div>
  );
}
