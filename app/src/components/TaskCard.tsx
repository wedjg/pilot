import type { Task, Project } from '../db';
import { useDataStore } from '../store/dataStore';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onClick?: () => void;
  compact?: boolean;
}

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  blocked: '阻塞',
  done: '完成',
};

const priorityConfig: Record<number, { label: string; color: string }> = {
  0: { label: '低', color: 'var(--stone-gray)' },
  1: { label: '中', color: 'var(--terracotta)' },
  2: { label: '高', color: 'var(--error-crimson)' },
};

export default function TaskCard({ task, project, onClick, compact }: TaskCardProps) {
  const projects = useDataStore((s) => s.projects);
  const proj = project || projects.find((p) => p.id === task.projectId);
  const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
  const isEscalated =
    task.status === 'blocked' && task.blockedAt && Date.now() - task.blockedAt > 48 * 3600 * 1000;

  return (
    <div
      onClick={onClick}
      className={`task-card group ${isEscalated ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: task.status === 'done' ? 'var(--stone-gray)' : 'var(--near-black)',
            textDecoration: task.status === 'done' ? 'line-through' : undefined,
            flex: 1,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {isEscalated && <span style={{ color: 'var(--error-crimson)', marginRight: 4 }}>!</span>}
          {task.title || '未命名任务'}
        </span>
        <span
          style={{
            fontSize: '0.625rem',
            padding: '2px 6px',
            borderRadius: '4px',
            color: priorityConfig[task.priority]?.color || 'var(--stone-gray)',
            background: 'var(--warm-sand)',
            fontWeight: 500,
            letterSpacing: '0.03em',
          }}
        >
          {priorityConfig[task.priority]?.label || '低'}
        </span>
      </div>
      {!compact && (
        <div className="mt-2 flex items-center gap-2" style={{ fontSize: '0.6875rem', color: 'var(--stone-gray)' }}>
          {proj && <span style={{ color: proj.color }}>● {proj.name}</span>}
          {task.dueDate && (
            <span style={{ color: isOverdue ? 'var(--error-crimson)' : undefined, fontWeight: isOverdue ? 500 : undefined }}>
              {isOverdue ? '已逾期 ' : ''}
              {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span
            className="ml-auto"
            style={{
              fontSize: '0.625rem',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--warm-sand)',
              color: 'var(--charcoal-warm)',
              letterSpacing: '0.03em',
            }}
          >
            {statusLabels[task.status]}
          </span>
        </div>
      )}
      {task.tags.length > 0 && !compact && (
        <div className="mt-1.5 flex gap-1 flex-wrap">
          {task.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.625rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--warm-sand)',
                color: 'var(--terracotta)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
