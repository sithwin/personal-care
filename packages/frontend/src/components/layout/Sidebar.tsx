import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCategories, useDashboard } from '../../api/queries';

const statusLinks = [
  { to: '/tasks?status=ready', label: 'Ready', icon: '⚡', key: 'ready' },
  { to: '/tasks?status=ongoing', label: 'Ongoing', icon: '▶', key: 'ongoing' },
  { to: '/tasks?status=pending', label: 'Pending', icon: '⏸', key: 'pending' },
  { to: '/tasks?status=planned', label: 'Planned', icon: '📅', key: 'planned' },
  { to: '/items?status=to_buy', label: 'To Buy', icon: '🛒', key: 'to_buy' },
  { to: '/items?status=available', label: 'Available', icon: '✅', key: 'available' },
];

export function Sidebar() {
  const { data: categories } = useCategories();
  const { data: dashboard } = useDashboard();

  const counts: Record<string, number> = {
    ready: dashboard?.counts.ready_count ?? 0,
    ongoing: dashboard?.counts.ongoing_count ?? 0,
    pending: dashboard?.counts.pending_count ?? 0,
    planned: dashboard?.counts.planned_count ?? 0,
    to_buy: dashboard?.counts.to_buy_count ?? 0,
  };

  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col p-3 gap-1">
      <NavLink to="/" className="text-lg font-bold text-white px-2 py-3 mb-2">Personal GTD</NavLink>

      <p className="text-xs uppercase text-gray-500 px-2 mb-1 mt-2">By Status</p>
      {statusLinks.map(l => (
        <NavLink key={l.key} to={l.to}
          className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
          <span>{l.icon}</span>
          <span className="flex-1">{l.label}</span>
          {counts[l.key] > 0 && <span className="text-xs text-gray-500">{counts[l.key]}</span>}
        </NavLink>
      ))}

      <p className="text-xs uppercase text-gray-500 px-2 mb-1 mt-4">By Category</p>
      {categories?.map(cat => (
        <NavLink key={cat.id} to={`/tasks?categoryId=${cat.id}`}
          className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
          <span>{cat.icon}</span>
          <span className="flex-1">{cat.name}</span>
          {cat.task_count > 0 && <span className="text-xs text-gray-500">{cat.task_count}</span>}
        </NavLink>
      ))}

      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-gray-800">
        <NavLink to="/calendar" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>📅 Calendar</NavLink>
        <NavLink to="/suggest" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>⚡ Suggest</NavLink>
        <NavLink to="/resources" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>🔗 Resources</NavLink>
        <NavLink to="/balance" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>⚖️ Balance</NavLink>
      </div>
    </aside>
  );
}
