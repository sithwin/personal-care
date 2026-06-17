import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import type { Project, Task } from '../api/queries';
import { useDashboard, useProjects, useCategories } from '../api/queries';
import { dispatch } from '../api/commands';
import { CommandBar } from '../components/layout/CommandBar';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-700 text-gray-300' },
  planned:   { label: 'Planned',   color: 'bg-blue-900 text-blue-300' },
  active:    { label: 'Active',    color: 'bg-green-900 text-green-300' },
  off_track: { label: 'Off Track', color: 'bg-red-900 text-red-300' },
  at_risk:   { label: 'At Risk',   color: 'bg-amber-900 text-amber-300' },
  on_hold:   { label: 'On Hold',   color: 'bg-gray-700 text-gray-300' },
  done:      { label: 'Done',      color: 'bg-gray-800 text-gray-500' },
};

function ProjectItem({ project }: { project: Project }) {
  const status = STATUS_CONFIG[project.display_status] ?? STATUS_CONFIG.draft!;
  const progressPct = Math.round(project.progress * 100);
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-white leading-tight">{project.name}</span>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function NewTaskRow({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (!categoryId && categories?.[0]) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const handleCreate = async () => {
    await dispatch('CreateTaskCommand', { id: uuidv4(), name: name.trim(), categoryId });
    await qc.invalidateQueries();
    onDone();
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-900 border border-indigo-700 border-dashed rounded-lg">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Task name..."
        autoFocus
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500"
      />
      <select
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700"
      >
        {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-2 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || !categoryId}
          className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500"
        >
          Add task
        </button>
      </div>
    </div>
  );
}

function UpNextRow({ task }: { task: Task }) {
  const qc = useQueryClient();

  const handleAction = async () => {
    if (task.status === 'ready') {
      await dispatch('StartTaskCommand', { id: task.id });
    } else if (task.status === 'ongoing') {
      await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    }
    await qc.invalidateQueries();
  };

  const isActionable = task.status === 'ready' || task.status === 'ongoing';

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-lg text-sm">
      <button
        type="button"
        onClick={isActionable ? handleAction : undefined}
        className={isActionable ? 'text-gray-400 hover:text-white transition-colors' : 'text-gray-600 cursor-default'}
      >
        {task.status === 'done' ? '✅' : '☐'}
      </button>
      <Link
        to={`/tasks?status=${task.status}`}
        className="flex-1 text-white hover:text-indigo-300 transition-colors"
      >
        {task.name}
      </Link>
      {task.estimated_duration_value && (
        <span className="text-xs text-gray-500">{task.estimated_duration_value}{task.estimated_duration_unit?.charAt(0)}</span>
      )}
      {task.due_date && (
        <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
      )}
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { data: projects } = useProjects();
  const [addingTask, setAddingTask] = useState(false);

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  const c = data?.counts;
  const cards = [
    { label: 'Ready',   value: c?.ready_count   ?? 0, to: '/tasks?status=ready',   color: 'text-green-400'  },
    { label: 'Ongoing', value: c?.ongoing_count  ?? 0, to: '/tasks?status=ongoing', color: 'text-blue-400'   },
    { label: 'Pending', value: c?.pending_count  ?? 0, to: '/tasks?status=pending', color: 'text-yellow-400' },
    { label: 'To Buy',  value: c?.to_buy_count   ?? 0, to: '/items?status=to_buy',  color: 'text-orange-400' },
  ];

  const activeProjects = projects?.filter(p => p.display_status !== 'done') ?? [];

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-6">

      {/* Left column */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        <CommandBar />

        <div className="grid grid-cols-4 gap-4">
          {cards.map(card => (
            <Link key={card.label} to={card.to} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            </Link>
          ))}
        </div>

        {(data?.balanceStatus?.length ?? 0) > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Life Balance</h2>
            <div className="flex flex-wrap gap-2">
              {data!.balanceStatus.map(b => (
                <span key={b.rule_id} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${b.is_met ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                  {b.is_met ? '✅' : '❌'} {b.category_icon} {b.category_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Up Next</h2>
            {!addingTask && (
              <button
                type="button"
                onClick={() => setAddingTask(true)}
                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                + Add Task
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {addingTask && <NewTaskRow onDone={() => setAddingTask(false)} />}
            {(data?.upNext ?? []).map(task => <UpNextRow key={task.id} task={task} />)}
            {!addingTask && (data?.upNext?.length ?? 0) === 0 && (
              <p className="text-sm text-gray-600">No tasks up next.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right column — projects panel */}
      <div className="w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase">Projects</h2>
          <Link to="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>
        {activeProjects.length === 0 && (
          <p className="text-sm text-gray-600">No active projects.</p>
        )}
        {activeProjects.map(p => <ProjectItem key={p.id} project={p} />)}
      </div>

    </div>
  );
}
