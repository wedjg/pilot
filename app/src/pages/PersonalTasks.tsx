import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import TaskCard from '../components/TaskCard';
import TaskDetail from '../components/TaskDetail';
import EmptyState from '../components/EmptyState';
import type { Task } from '../db';

type Filter = 'all' | 'overdue' | 'today' | 'thisWeek' | 'blocked';

const headingStyle = {
  fontFamily: 'Georgia, serif',
  fontWeight: 500,
  fontSize: '1.6rem',
  lineHeight: 1.2,
  color: 'var(--near-black)',
};

export default function PersonalTasks() {
  const navigate = useNavigate();
  const { tasks, projects, loadAll, updateTask } = useDataStore();
  const { focusMode, setFocusMode } = useUIStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F' && e.shiftKey) {
        setFocusMode(!focusMode);
      }
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusMode, setFocusMode]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const activeProjectIds = new Set(activeProjects.map((p) => p.id));

  let filtered = tasks.filter(
    (t) => activeProjectIds.has(t.projectId) && t.status !== 'done'
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  switch (filter) {
    case 'overdue':
      filtered = filtered.filter((t) => t.dueDate && t.dueDate < today.getTime());
      break;
    case 'today':
      filtered = filtered.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= today && d < new Date(today.getTime() + 86400000);
      });
      break;
    case 'thisWeek':
      filtered = filtered.filter((t) => t.dueDate && t.dueDate < weekEnd.getTime());
      break;
    case 'blocked':
      filtered = filtered.filter((t) => t.status === 'blocked');
      break;
  }

  if (projectFilter !== 'all') {
    filtered = filtered.filter((t) => t.projectId === projectFilter);
  }

  filtered.sort((a, b) => {
    const pa = a.priority;
    const pb = b.priority;
    if (pa !== pb) return pb - pa;
    if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
    return 0;
  });

  const handleCheck = async (task: Task) => {
    await updateTask(task.id, { status: 'done' });
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'overdue', label: '已逾期' },
    { key: 'today', label: '今日' },
    { key: 'thisWeek', label: '本周' },
    { key: 'blocked', label: '阻塞中' },
  ];

  const content = (
    <div className={focusMode ? 'max-w-2xl mx-auto pt-8' : 'max-w-[1200px] mx-auto pb-8'}>
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ ...headingStyle, fontSize: focusMode ? '2rem' : '1.6rem' }}>
          个人待办桌
        </h1>
        <div className="flex items-center gap-2">
          {!focusMode && (
            <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setFocusMode(true)}>
              专注模式 Shift+F
            </button>
          )}
          {focusMode && (
            <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setFocusMode(false)}>
              退出专注 Esc
            </button>
          )}
        </div>
      </div>

      {!focusMode && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div style={{ display: 'flex', gap: 4, background: 'var(--warm-sand)', borderRadius: 8, padding: 3 }}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: filter === f.key ? 500 : 400,
                  color: filter === f.key ? 'var(--terracotta)' : 'var(--olive-gray)',
                  background: filter === f.key ? 'var(--pure-white)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: filter === f.key ? '0px 0px 0px 1px var(--ring-warm)' : undefined,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span style={{ color: 'var(--border-warm)' }}>|</span>
          <select
            className="input-field"
            style={{ width: 'auto', fontSize: '0.75rem', padding: '5px 24px 5px 10px' }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">所有项目</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="📭"
          message="没有待办，去驾驶舱看看"
          cta={{ label: '前往驾驶舱', onClick: () => navigate('/dashboard') }}
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-3 group">
              <button
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                style={{ borderColor: 'var(--border-warm)' }}
                onClick={() => handleCheck(task)}
                title="标记完成"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#5a9e6f';
                  e.currentTarget.style.background = '#edf7f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-warm)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span className="opacity-0 group-hover:opacity-100" style={{ fontSize: '0.625rem', color: '#5a9e6f' }}>
                  ✓
                </span>
              </button>
              <div className="flex-1">
                <TaskCard task={task} onClick={() => setSelectedTask(task)} compact />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );

  return content;
}
