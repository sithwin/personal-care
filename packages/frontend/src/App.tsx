import React from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { TaskDetail } from './pages/TaskDetail';
import { NewTask } from './pages/NewTask';
import { Items } from './pages/Items';
import { Calendar } from './pages/Calendar';
import { Suggest } from './pages/Suggest';
import { Resources } from './pages/Resources';
import { BalanceRules } from './pages/BalanceRules';
import { Categories } from './pages/Categories';

export function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
        <Link to="/" className="w-56 shrink-0 text-lg font-bold text-white">Personal GTD</Link>
        <div className="flex-1 flex justify-center">
          <TopBar />
        </div>
        <div className="w-56 shrink-0" />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<NewTask />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/items" element={<Items />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/suggest" element={<Suggest />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/balance" element={<BalanceRules />} />
            <Route path="/categories" element={<Categories />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
