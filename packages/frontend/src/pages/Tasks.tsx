import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Task, Project } from '../api/queries';
import { useTasks, useCategories, useProjects } from '../api/queries';
import { dispatch } from '../api/commands';

const STATUS_TABS = ['ready', 'ongoing', 'pending', 'planned', 'done'] as const;

function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const cat = categories?.find(c => c.id === task.category_id);

  const handleComplete = async () => {
    await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTaskCommand', { id: task.id });
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
      {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>}
      <Link to={`/tasks/${task.id}`}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
        Edit
      </Link>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',      color: 'bg-gray-700 text-gray-300' },
  planned:   { label: 'Planned',    color: 'bg-blue-900 text-blue-300' },
  active:    { label: 'Active',     color: 'bg-green-900 text-green-300' },
  off_track: { label: 'Off Track',  color: 'bg-red-900 text-red-300' },
  at_risk:   { label: 'At Risk',    color: 'bg-amber-900 text-amber-300' },
  on_hold:   { label: 'On Hold',    color: 'bg-gray-700 text-gray-300' },
  done:      { label: 'Done',       color: 'bg-gray-800 text-gray-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: '▲ High',   color: 'text-red-400' },
  medium: { label: '▶ Medium', color: 'text-amber-400' },
  low:    { label: '▼ Low',    color: 'text-gray-400' },
};

function ProjectCard({ project }: { project: Project }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const cat = categories?.find(c => c.id === project.category_id);
  const status = STATUS_CONFIG[project.display_status] ?? STATUS_CONFIG.draft!;
  const priority = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.medium!;
  const progressPct = Math.round(project.progress * 100);

  const handlePlan = async () => {
    const startDate = window.prompt('Start date (YYYY-MM-DD):');
    if (!startDate) return;
    const endDate = window.prompt('End date (YYYY-MM-DD):');
    if (!endDate) return;
    await dispatch('PlanProjectCommand', { id: project.id, startDate, endDate });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    let endDate: string | undefined;
    if (!project.due_date) {
      const input = window.prompt('End date (YYYY-MM-DD):');
      if (!input) return;
      endDate = input;
    }
    await dispatch('StartProjectCommand', { id: project.id, endDate });
    await qc.invalidateQueries();
  };

  const handlePause = async () => {
    await dispatch('PauseProjectCommand', { id: project.id });
    await qc.invalidateQueries();
  };

  const handleResume = async () => {
    await dispatch('ResumeProjectCommand', { id: project.id });
    await qc.invalidateQueries();
  };

  const handleComplete = async () => {
    await dispatch('CompleteProjectCommand', { id: project.id });
    await qc.invalidateQueries();
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
      <div>
        <div className="text-sm font-semibold text-white">
          {cat?.icon} {project.name}
        </div>
        {project.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</div>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
        <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
      </div>

      {(project.start_date || project.due_date) && (
        <div className="text-xs text-gray-500">
          {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–'}
          {' → '}
          {project.due_date ? new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–'}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {project.display_status !== 'done' && (
        <div className="flex gap-1.5 flex-wrap mt-auto">
          {(project.display_status === 'draft') && (
            <>
              <button type="button" onClick={handlePlan}
                className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600">Plan</button>
              <button type="button" onClick={handleStart}
                className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">Start</button>
            </>
          )}
          {(project.display_status === 'planned' || project.display_status === 'off_track') && (
            <button type="button" onClick={handleStart}
              className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">Start</button>
          )}
          {(project.display_status === 'active' || project.display_status === 'at_risk') && (
            <button type="button" onClick={handlePause}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">On Hold</button>
          )}
          {project.display_status === 'on_hold' && (
            <button type="button" onClick={handleResume}
              className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">Resume</button>
          )}
          <button type="button" onClick={handleComplete}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500">Done</button>
        </div>
      )}
    </div>
  );
}

function NewProjectRow({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!categoryId && categories?.[0]) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const handleCreate = async () => {
    const id = uuidv4();
    await dispatch('CreateProjectCommand', { id, name: name.trim(), categoryId, description: description || undefined });
    if (priority !== 'medium') {
      await dispatch('UpdateProjectCommand', { id, priority });
    }
    await qc.invalidateQueries();
    onDone();
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-900 border border-indigo-700 border-dashed rounded-xl">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name..." autoFocus
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
        {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      <select value={priority} onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
        <option value="high">▲ High</option>
        <option value="medium">▶ Medium</option>
        <option value="low">▼ Low</option>
      </select>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 resize-none" />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-2 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
        <button type="button" onClick={handleCreate} disabled={!name.trim() || !categoryId}
          className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
          Create
        </button>
      </div>
    </div>
  );
}

export function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'ready';
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const { data: tasks, isLoading: tasksLoading } = useTasks({ status, ...(categoryId ? { categoryId } : {}) });
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: categories } = useCategories();
  const [addingProject, setAddingProject] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-8">

      {/* Tasks section */}
      <section className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-white mb-3">Tasks</h2>
        <div className="flex gap-1 flex-wrap mb-4">
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

        {tasksLoading && <div className="text-gray-500 text-sm">Loading...</div>}
        {!tasksLoading && tasks?.length === 0 && (
          <div className="text-gray-600 text-sm">No tasks with status &quot;{status}&quot;</div>
        )}
        <div className="flex flex-col gap-2 max-w-2xl">
          {tasks?.map(task => <TaskRow key={task.id} task={task} />)}
        </div>
      </section>

      {/* Projects section */}
      <section className="w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-3">Projects</h2>
        {projectsLoading && <div className="text-gray-500 text-sm">Loading...</div>}
        <div className="flex flex-col gap-3">
          {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
          {addingProject && <NewProjectRow onDone={() => setAddingProject(false)} />}
        </div>
        {!addingProject && (
          <button type="button" onClick={() => setAddingProject(true)}
            className="mt-3 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">
            + New Project
          </button>
        )}
      </section>

    </div>
  );
}
