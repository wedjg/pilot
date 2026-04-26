import type { Task } from '../db';
import { useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

export default function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { updateTask, deleteTask, projects, tasks: allTasks } = useDataStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
  const [assignee, setAssignee] = useState(task.assignee || '');
  const [blockedReason, setBlockedReason] = useState(task.blockedReason || '');
  const [depInput, setDepInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const projectTasks = allTasks.filter((t) => t.projectId === task.projectId && t.id !== task.id);
  const project = projects.find((p) => p.id === task.projectId);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setAssignee(task.assignee || '');
    setBlockedReason(task.blockedReason || '');
  }, [task]);

  const save = (field: string, value: unknown) => {
    updateTask(task.id, { [field]: value } as Partial<Task>);
  };

  const handleAddDep = (depId: string) => {
    const newDeps = [...task.dependencies, depId];
    updateTask(task.id, { dependencies: newDeps });
    const other = allTasks.find((t) => t.id === depId);
    if (other) {
      updateTask(depId, { dependents: [...other.dependents, task.id] });
    }
    setDepInput('');
  };

  const handleRemoveDep = (depId: string) => {
    updateTask(task.id, { dependencies: task.dependencies.filter((d) => d !== depId) });
    const other = allTasks.find((t) => t.id === depId);
    if (other) {
      updateTask(depId, { dependents: other.dependents.filter((d) => d !== task.id) });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !task.tags.includes(tagInput.trim())) {
      const newTags = [...task.tags, tagInput.trim()];
      updateTask(task.id, { tags: newTags });
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div
        className="relative w-[480px] h-full overflow-y-auto shadow-xl border-l"
        style={{ background: 'var(--ivory)', borderColor: 'var(--border-cream)' }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-3 border-b z-10"
          style={{ background: 'var(--ivory)', borderColor: 'var(--border-cream)' }}
        >
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--near-black)' }}>
            任务详情
          </h3>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              style={{ color: 'var(--error-crimson)', fontSize: '0.75rem' }}
              onClick={() => {
                if (confirm('确认删除此任务？')) deleteTask(task.id);
                onClose();
              }}
            >
              删除
            </button>
            <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>标题</label>
            <input
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save('title', title)}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>状态</label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as Task['status']);
                  save('status', e.target.value);
                }}
              >
                <option value="todo">待办</option>
                <option value="in_progress">进行中</option>
                <option value="blocked">阻塞</option>
                <option value="done">完成</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>优先级</label>
              <select
                className="input-field"
                value={priority}
                onChange={(e) => {
                  setPriority(Number(e.target.value));
                  save('priority', Number(e.target.value));
                }}
              >
                <option value={0}>低</option>
                <option value={1}>中</option>
                <option value={2}>高</option>
              </select>
            </div>
          </div>

          {/* Blocked reason */}
          {status === 'blocked' && (
            <div>
              <label className="block mb-1 text-overline" style={{ color: 'var(--error-crimson)' }}>阻塞原因</label>
              <input
                className="input-field"
                style={{ borderColor: 'var(--error-crimson)' }}
                placeholder="什么导致了阻塞？"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                onBlur={() => save('blockedReason', blockedReason)}
              />
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>截止日期</label>
            <input
              type="date"
              className="input-field"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                save('dueDate', e.target.value ? new Date(e.target.value).getTime() : null);
              }}
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>负责人</label>
            <input
              className="input-field"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              onBlur={() => save('assignee', assignee)}
            />
          </div>

          {/* Project */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>所属项目</label>
            <p style={{ fontSize: '0.8125rem', color: 'var(--olive-gray)' }}>{project?.name || '—'}</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>标签</label>
            <div className="flex gap-1 flex-wrap mb-1">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) })}
                  className="cursor-pointer"
                  style={{
                    fontSize: '0.625rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--warm-sand)',
                    color: 'var(--terracotta)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--error-crimson)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--warm-sand)')}
                >
                  {tag} ×
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                className="input-field flex-1"
                style={{ fontSize: '0.75rem' }}
                placeholder="添加标签..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 10px' }} onClick={handleAddTag}>+</button>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>前置依赖</label>
            <div className="space-y-1 mb-2">
              {task.dependencies.map((depId) => {
                const dep = allTasks.find((t) => t.id === depId);
                return dep ? (
                  <div
                    key={depId}
                    className="flex items-center justify-between rounded px-2 py-1"
                    style={{ fontSize: '0.75rem', background: 'var(--warm-sand)', color: 'var(--charcoal-warm)' }}
                  >
                    <span>{dep.title || '未命名'}</span>
                    <button
                      style={{ color: 'var(--error-crimson)', cursor: 'pointer' }}
                      onClick={() => handleRemoveDep(depId)}
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex gap-1">
              <select
                className="input-field flex-1"
                style={{ fontSize: '0.75rem' }}
                value={depInput}
                onChange={(e) => {
                  setDepInput(e.target.value);
                  if (e.target.value) handleAddDep(e.target.value);
                }}
              >
                <option value="">添加依赖...</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || '未命名任务'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1 text-overline" style={{ color: 'var(--stone-gray)' }}>描述 (Markdown)</label>
            <textarea
              className="input-field"
              style={{ minHeight: 80 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => save('description', description)}
              placeholder="支持 Markdown 格式..."
            />
          </div>

          {/* Meta */}
          <div
            className="space-y-0.5 pt-3"
            style={{ fontSize: '0.625rem', color: 'var(--stone-gray)', borderTop: '1px solid var(--border-cream)' }}
          >
            <p>创建: {new Date(task.createdAt).toLocaleString('zh-CN')}</p>
            <p>更新: {new Date(task.updatedAt).toLocaleString('zh-CN')}</p>
            {task.completedAt && <p>完成: {new Date(task.completedAt).toLocaleString('zh-CN')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
