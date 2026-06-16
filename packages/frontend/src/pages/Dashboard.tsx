import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../api/queries';
import { CommandBar } from '../components/layout/CommandBar';

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  const c = data?.counts;
  const cards = [
    { label: 'Ready', value: c?.ready_count ?? 0, to: '/tasks?status=ready', color: 'text-green-400' },
    { label: 'Ongoing', value: c?.ongoing_count ?? 0, to: '/tasks?status=ongoing', color: 'text-blue-400' },
    { label: 'Pending', value: c?.pending_count ?? 0, to: '/tasks?status=pending', color: 'text-yellow-400' },
    { label: 'To Buy', value: c?.to_buy_count ?? 0, to: '/items?status=to_buy', color: 'text-orange-400' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
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

      {(data?.upNext?.length ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Up Next</h2>
          <div className="flex flex-col gap-2">
            {data!.upNext.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-400">☐</span>
                <span className="flex-1 text-white">{task.name}</span>
                {task.estimated_duration_value && (
                  <span className="text-xs text-gray-500">{task.estimated_duration_value}{task.estimated_duration_unit?.charAt(0)}</span>
                )}
                {task.due_date && (
                  <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
