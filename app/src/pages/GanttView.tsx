import { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Task, Milestone } from '../db';
import TaskDetail from '../components/TaskDetail';

interface GanttViewProps {
  projectId: string;
}

export default function GanttView({ projectId }: GanttViewProps) {
  const { tasks, milestones: allMilestones, loadAll } = useDataStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => { loadAll(); }, []);

  const projectTasks = tasks.filter((t) => t.projectId === projectId).filter((t) => t.status !== 'done');
  const projectMilestones = allMilestones.filter((m) => m.projectId === projectId);

  if (projectTasks.length === 0 && projectMilestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--stone-gray)', fontSize: '0.875rem' }}>
        暂无任务数据，请先在看板中添加任务
      </div>
    );
  }

  const allDates = [
    ...projectTasks.map((t) => t.startDate || t.createdAt),
    ...projectTasks.map((t) => t.dueDate).filter(Boolean) as number[],
    ...projectMilestones.map((m) => m.targetDate),
  ];
  const minDate = Math.min(...allDates) - 7 * 86400000;
  const maxDate = Math.max(...allDates, Date.now()) + 14 * 86400000;
  const totalDays = (maxDate - minDate) / 86400000;

  const todayX = ((Date.now() - minDate) / (maxDate - minDate)) * 100;

  const getX = (ts: number) => ((ts - minDate) / (maxDate - minDate)) * 100;
  const getWidth = (start: number, end: number) => Math.max(((end - start) / (maxDate - minDate)) * 100, 2);

  const months: { label: string; x: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor.getTime() < maxDate) {
    months.push({
      label: `${cursor.getFullYear()}/${cursor.getMonth() + 1}`,
      x: getX(cursor.getTime()),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const cpIds = new Set<string>();
  const blockedTasks = projectTasks.filter((t) => t.status === 'blocked');
  for (const t of blockedTasks) {
    cpIds.add(t.id);
    for (const depId of t.dependencies) {
      cpIds.add(depId);
    }
    for (const depId of t.dependents) {
      cpIds.add(depId);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>
          共 {projectTasks.length} 个任务 | {projectMilestones.length} 个里程碑
        </div>
        <button
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            color: cpIds.size > 0 ? 'var(--error-crimson)' : 'var(--stone-gray)',
            background: cpIds.size > 0 ? '#fdf6f5' : 'var(--warm-sand)',
          }}
        >
          关键路径 ({cpIds.size}个任务)
        </button>
      </div>

      <div
        ref={containerRef}
        className="rounded-lg border overflow-auto"
        style={{
          maxHeight: 'calc(100vh - 200px)',
          background: 'var(--pure-white)',
          borderColor: 'var(--border-cream)',
        }}
      >
        <div className="min-w-[900px]">
          {/* Month header */}
          <div
            className="sticky top-0 z-10 flex h-8 border-b"
            style={{
              background: 'var(--ivory)',
              borderColor: 'var(--border-cream)',
            }}
          >
            <div className="w-48 shrink-0" style={{ borderRight: '1px solid var(--border-cream)' }} />
            <div className="flex-1 relative">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 px-1 h-full flex items-center border-l"
                  style={{
                    left: `${m.x}%`,
                    fontSize: '0.625rem',
                    color: 'var(--stone-gray)',
                    borderColor: 'var(--border-cream)',
                  }}
                >
                  {m.label}
                </div>
              ))}
              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 z-20"
                style={{ left: `${todayX}%`, width: 1, background: 'var(--error-crimson)' }}
              />
            </div>
          </div>

          {/* Tasks */}
          <div style={{ borderColor: 'var(--border-cream)' }}>
            {projectTasks.map((task) => {
              const start = task.startDate || task.createdAt;
              const end = task.dueDate || start + 7 * 86400000;
              const x = getX(start);
              const w = getWidth(start, end);
              const isBlocked = task.status === 'blocked';
              const isOnCritical = cpIds.has(task.id);

              let barColor = '#6b7db3';
              if (isBlocked) barColor = '#d4a24e';
              else if (isOnCritical) barColor = 'var(--error-crimson)';

              return (
                <div
                  key={task.id}
                  className="flex"
                  style={{ borderBottom: '1px solid var(--border-cream)' }}
                >
                  <div
                    className="w-48 shrink-0 px-3 py-1.5 flex items-center overflow-hidden"
                    style={{ borderRight: '1px solid var(--border-cream)' }}
                  >
                    <span className="text-xs truncate" style={{ color: 'var(--near-black)' }}>
                      {isBlocked && '⚠ '}
                      {isOnCritical && <span style={{ color: 'var(--error-crimson)' }}>◆ </span>}
                      {task.title || '未命名'}
                    </span>
                  </div>
                  <div className="flex-1 relative py-1.5" style={{ minHeight: 28 }}>
                    <div
                      className="absolute top-1 h-5 rounded cursor-pointer"
                      style={{
                        left: `${x}%`,
                        width: `${w}%`,
                        minWidth: 8,
                        backgroundColor: barColor,
                        opacity: isBlocked ? 0.5 : 0.85,
                      }}
                      onClick={() => setSelectedTask(task)}
                      title={`${task.title} | ${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`}
                    >
                      <span
                        className="absolute inset-0 flex items-center px-1 truncate"
                        style={{ fontSize: '0.5625rem', color: '#fff' }}
                      >
                        {task.title?.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestones */}
          {projectMilestones.length > 0 && (
            <div style={{ borderTop: '2px solid var(--border-warm)' }}>
              <div className="px-3 py-1" style={{ fontSize: '0.625rem', color: 'var(--stone-gray)' }}>
                里程碑
              </div>
              {projectMilestones.map((ms) => {
                const x = getX(ms.targetDate);
                const isOverdue = ms.targetDate < Date.now() && ms.status === 'pending';
                let dotColor = '#6b7db3';
                if (isOverdue) dotColor = 'var(--error-crimson)';
                else if (ms.status === 'achieved') dotColor = '#5a9e6f';

                return (
                  <div key={ms.id} className="flex" style={{ borderBottom: '1px solid var(--border-cream)' }}>
                    <div
                      className="w-48 shrink-0 px-3 py-1.5 flex items-center"
                      style={{ borderRight: '1px solid var(--border-cream)' }}
                    >
                      <span
                        className="text-xs truncate"
                        style={{ color: isOverdue ? 'var(--error-crimson)' : 'var(--near-black)' }}
                      >
                        {isOverdue ? '! ' : '◆ '}
                        {ms.title || '里程碑'}
                      </span>
                    </div>
                    <div className="flex-1 relative py-1.5" style={{ minHeight: 24 }}>
                      <div
                        className="absolute top-1 w-3 h-3 rotate-45 cursor-pointer"
                        style={{
                          left: `${x}%`,
                          marginLeft: -6,
                          backgroundColor: dotColor,
                        }}
                        title={`${ms.title} | ${new Date(ms.targetDate).toLocaleDateString()}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
