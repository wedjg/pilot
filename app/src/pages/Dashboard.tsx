import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import { computeHealth, computeCriticalPath } from '../utils/health';
import { computeProgress } from '../utils/progress';
import type { Task, Project } from '../db';
import TaskCard from '../components/TaskCard';
import TaskDetail from '../components/TaskDetail';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';

const headingStyle = {
  fontFamily: 'Georgia, serif',
  fontWeight: 500,
  fontSize: '1.6rem',
  lineHeight: 1.2,
  color: 'var(--near-black)',
};

const sectionLabelStyle = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--stone-gray)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, tasks, milestones, loadAll, updateTask, loading } = useDataStore();
  const { focusMode } = useUIStore();

  useEffect(() => { loadAll(); }, []);

  const activeProjects = projects.filter((p) => p.status === 'active');

  const activeProjectIds = new Set(activeProjects.map((p) => p.id));
  const blockedTasks = tasks.filter((t) => activeProjectIds.has(t.projectId) && t.status === 'blocked');
  const overdueTasks = tasks.filter(
    (t) => activeProjectIds.has(t.projectId) && t.dueDate && t.dueDate < Date.now() && t.status !== 'done'
  );
  const riskTasks = [...blockedTasks, ...overdueTasks].sort((a, b) => {
    const aEsc = a.status === 'blocked' && a.blockedAt && Date.now() - a.blockedAt > 48 * 3600 * 1000;
    const bEsc = b.status === 'blocked' && b.blockedAt && Date.now() - b.blockedAt > 48 * 3600 * 1000;
    if (aEsc && !bEsc) return -1;
    if (!aEsc && bEsc) return 1;
    return (b.dueDate || 0) - (a.dueDate || 0);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todaysTasks = tasks.filter(
    (t) =>
      activeProjectIds.has(t.projectId) &&
      t.status !== 'done' &&
      t.dueDate &&
      t.dueDate < tomorrow.getTime()
  );

  const recentCompleted = tasks
    .filter((t) => t.status === 'done' && activeProjectIds.has(t.projectId))
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 10);

  const fourteenDays = Date.now() + 14 * 86400000;
  const upcomingMilestones = milestones
    .filter((m) => activeProjectIds.has(m.projectId) && m.status === 'pending' && m.targetDate <= fourteenDays)
    .sort((a, b) => a.targetDate - b.targetDate);

  const projectHealths = activeProjects.map((p) => {
    const ptasks = tasks.filter((t) => t.projectId === p.id);
    const pms = milestones.filter((m) => m.projectId === p.id);
    return { project: p, health: computeHealth(ptasks, pms) };
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const handleRestore = async (task: Task) => {
    await updateTask(task.id, { status: 'todo', completedAt: undefined });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--stone-gray)' }}>
      加载中...
    </div>
  );

  if (focusMode) return null;

  return (
    <div className="max-w-[1400px] mx-auto pb-8" style={{ '--spacing': '24px' } as React.CSSProperties}>
      <h1 style={{ ...headingStyle, fontSize: '1.8rem', marginBottom: 32 }}>驾驶舱</h1>

      {/* A. Risk Radar */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ ...sectionLabelStyle, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          风险雷达
          {riskTasks.length > 0 && (
            <span
              style={{
                fontSize: '0.625rem',
                padding: '2px 8px',
                borderRadius: '100px',
                background: 'var(--error-crimson)',
                color: 'var(--ivory)',
                fontWeight: 500,
              }}
            >
              {riskTasks.length}
            </span>
          )}
        </h2>
        {riskTasks.length === 0 ? (
          <EmptyState icon="✅" message="一切尽在掌握，所有项目均按计划推进" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {riskTasks.slice(0, 6).map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        )}
      </section>

      {/* B. Today's Tasks */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ ...sectionLabelStyle, marginBottom: 12 }}>今日必做</h2>
        {todaysTasks.length === 0 ? (
          <EmptyState icon="☕" message="今日无待办" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {todaysTasks.slice(0, 6).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/projects/${task.projectId}/board`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* C + D: Health Matrix + Upcoming Milestones */}
      <div className="grid grid-cols-2 gap-6">
        {/* C. Health Matrix */}
        <section>
          <h2 style={{ ...sectionLabelStyle, marginBottom: 12 }}>项目健康度</h2>
          {projectHealths.length === 0 ? (
            <EmptyState icon="📁" message="暂无活跃项目" cta={{ label: '创建项目', onClick: () => navigate('/projects') }} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {projectHealths.map(({ project, health }) => {
                const ptasks = tasks.filter((t) => t.projectId === project.id);
                const cpIds = computeCriticalPath(ptasks.filter((t) => t.status !== 'done'));
                const progress = computeProgress(ptasks, cpIds);
                const healthColor =
                  health.status === 'red'
                    ? 'var(--error-crimson)'
                    : health.status === 'yellow'
                    ? '#d4a24e'
                    : '#5a9e6f';
                return (
                  <div
                    key={project.id}
                    className="card-interactive"
                    onClick={() => navigate(`/projects/${project.id}/board`)}
                    title={health.reasons.join('; ')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="rounded-full shrink-0"
                        style={{ width: 10, height: 10, backgroundColor: healthColor }}
                      />
                      <span
                        className="truncate"
                        style={{ fontSize: '0.8125rem', fontWeight: 500, fontFamily: 'Georgia, serif' }}
                      >
                        {project.name}
                      </span>
                    </div>
                    <ProgressBar progress={progress} compact />
                    {health.blockedCount > 0 && (
                      <div className="mt-1.5" style={{ fontSize: '0.625rem', color: 'var(--error-crimson)' }}>
                        有 {health.blockedCount} 个阻塞
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* D. Upcoming Milestones */}
        <section>
          <h2 style={{ ...sectionLabelStyle, marginBottom: 12 }}>即将到来的里程碑</h2>
          {upcomingMilestones.length === 0 ? (
            <EmptyState icon="🗓️" message="未来14天无里程碑" />
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.slice(0, 8).map((ms) => {
                const daysLeft = Math.ceil((ms.targetDate - Date.now()) / 86400000);
                const isUrgent = daysLeft <= 3;
                const proj = projects.find((p) => p.id === ms.projectId);
                const urgencyColor = ms.targetDate < Date.now()
                  ? 'var(--error-crimson)'
                  : isUrgent ? '#d4a24e' : 'var(--coral)';
                return (
                  <div
                    key={ms.id}
                    className="card-interactive flex items-center gap-3"
                    onClick={() => navigate(`/projects/${ms.projectId}/gantt`)}
                  >
                    <span className="shrink-0" style={{ color: urgencyColor }}>
                      {ms.targetDate < Date.now() ? '!' : isUrgent ? '●' : '◆'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '0.8125rem', fontWeight: 500 }} className="truncate">{ms.title}</p>
                      <p style={{ fontSize: '0.625rem', color: 'var(--stone-gray)' }}>{proj?.name}</p>
                    </div>
                    <span
                      className="shrink-0"
                      style={{
                        fontSize: '0.625rem',
                        fontFamily: "'Courier New', monospace",
                        color: ms.targetDate < Date.now()
                          ? 'var(--error-crimson)'
                          : isUrgent ? '#d4a24e' : 'var(--stone-gray)',
                      }}
                    >
                      {ms.targetDate < Date.now() ? '已逾期' : `${daysLeft}天后`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* E. Recent Completed */}
      {recentCompleted.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ ...sectionLabelStyle, marginBottom: 12 }}>最近完成</h2>
          <div className="grid grid-cols-3 gap-3">
            {recentCompleted.map((task) => (
              <div
                key={task.id}
                className="task-card opacity-60 hover:opacity-100 cursor-pointer"
                onClick={() => handleRestore(task)}
                title="点击恢复为待办"
              >
                <span className="text-sm line-through" style={{ color: 'var(--stone-gray)' }}>
                  {task.title}
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--stone-gray)', marginLeft: 8 }}>
                  {task.completedAt ? new Date(task.completedAt).toLocaleDateString('zh-CN') : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
