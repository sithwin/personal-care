import React from 'react';
import { useBalanceStatus, useBalanceRules } from '../api/queries';

export function BalanceRules() {
  const { data: status } = useBalanceStatus();
  const { data: rules } = useBalanceRules();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Life Balance</h1>
        <p className="text-sm text-gray-500">Track whether your life stays balanced across key areas.</p>
      </div>

      <div className="flex flex-col gap-3">
        {status?.map(b => (
          <div key={b.rule_id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${b.is_met ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-900'}`}>
            <span className="text-2xl">{b.category_icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{b.category_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {b.actual_count}/{b.target_count} {b.frequency} · {b.frequency === 'daily' ? 'today' : b.frequency === 'weekly' ? 'this week' : 'this month'}
              </div>
            </div>
            <span className={`text-sm font-medium ${b.is_met ? 'text-green-400' : 'text-red-400'}`}>
              {b.is_met ? '✅ Met' : '❌ Missing'}
            </span>
          </div>
        ))}
        {(!status || status.length === 0) && (
          <div className="text-gray-600 text-sm">No balance rules configured. Create tasks in the Study and Health categories to see your balance.</div>
        )}
      </div>

      {rules && rules.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">All Rules</h2>
          <div className="text-xs text-gray-500">
            {(rules as Array<Record<string, unknown>>).map((r, i) => (
              <div key={i} className="py-1 border-b border-gray-800 last:border-0">
                {String(r.frequency)} · min {String(r.minimum_count)} · {r.day_restriction ? String(r.day_restriction) + ' only' : 'any day'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
