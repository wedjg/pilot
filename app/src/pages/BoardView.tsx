import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDataStore } from '../store/dataStore';
import type { Task } from '../db';
import TaskCard from '../components/TaskCard';
import TaskDetail from '../components/TaskDetail';
import ProgressBar from '../components/ProgressBar';
import { computeProgress } from '../utils/progress';
import { computeCriticalPath } from '../utils/health';
import { undo, redo } from '../utils/commands';

const columns = [
  { id: 'todo', label: '待办' },
  { id: 'in_progress', label: '进行中' },
  { id: 'blocked', label: '阻塞' },
  { id: 'done', label: '完成' },
];

interface BoardViewProps {
  projectId: string;
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

export default function BoardView({ projectId }: BoardViewProps) {
  const { tasks, addTask, updateTask } = useDataStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [activeDrag, setActiveDrag] = useState<Task | null>(null);

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const cpIds = computeCriticalPath(projectTasks.filter((t) => t.status !== 'done'));
  const progress = computeProgress(projectTasks, cpIds);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: { active: { id: string } }) => {
    const task = projectTasks.find((t) => t.id === event.active.id);
    if (task) setActiveDrag(task);
  };

  const handleDragEnd = async (event: { active: { id: string }; over: { id: string } | null }) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const targetCol = columns.find((c) => c.id === overId);
    const overTask = projectTasks.find((t) => t.id === overId);

    let newStatus: Task['status'] | null = null;
    if (targetCol) {
      newStatus = targetCol.id as Task['status'];
    } else if (overTask) {
      newStatus = overTask.status;
    }

    if (newStatus) {
      await updateTask(activeId, { status: newStatus });
    }
  };

  const handleAddTask = async (status: string) => {
    const title = newTaskInputs[status]?.trim();
    if (!title) return;
    await addTask(projectId, { title, status: status as Task['status'] });
    setNewTaskInputs((prev) => ({ ...prev, [status]: '' }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo().then((desc) => {
        if (desc) window.dispatchEvent(new CustomEvent('toast', { detail: { message: `已撤销 ${desc}` } }));
      });
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo().then((desc) => {
        if (desc) window.dispatchEvent(new CustomEvent('toast', { detail: { message: `已重做 ${desc}` } }));
      });
    }
  };

  return (
    <div tabIndex={-1} onKeyDown={handleKeyDown} className="outline-none">
      <div className="mb-4">
        <ProgressBar progress={progress} />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-3" style={{ minHeight: 500 }}>
          {columns.map((col) => {
            const colTasks = projectTasks.filter((t) => t.status === col.id);
            return (
              <SortableContext key={col.id} items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="kanban-column">
                  <div className="kanban-column-header">
                    <span>{col.label}</span>
                    <span style={{ marginLeft: 6, fontSize: '0.6875rem', color: 'var(--stone-gray)' }}>({colTasks.length})</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                    {colTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                    <div
                      id={col.id}
                      className="h-12 rounded-lg border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: 'var(--border-cream)', color: 'var(--stone-gray)', fontSize: '0.75rem' }}
                    >
                      拖放到此列
                    </div>
                  </div>
                  <div className="p-2" style={{ borderTop: '1px solid var(--border-cream)' }}>
                    <input
                      className="w-full bg-transparent border-none outline-none rounded px-2 py-1.5"
                      style={{ fontSize: '0.75rem', color: 'var(--near-black)' }}
                      placeholder="+ 添加任务..."
                      value={newTaskInputs[col.id] || ''}
                      onChange={(e) => setNewTaskInputs((prev) => ({ ...prev, [col.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(col.id);
                      }}
                      onFocus={(e) => (e.target.style.background = 'var(--warm-sand)')}
                      onBlur={(e) => (e.target.style.background = 'transparent')}
                    />
                  </div>
                </div>
              </SortableContext>
            );
          })}
        </div>
        <DragOverlay>
          {activeDrag ? (
            <div className="rotate-2 opacity-90">
              <TaskCard task={activeDrag} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Quick Command Bar */}
      <div className="card mt-4" style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>快速指令栏 (按 / 聚焦)</span>
          <QuickCommandInput projectId={projectId} />
        </div>
      </div>

      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}

function QuickCommandInput({ projectId }: { projectId: string }) {
  const { addTask } = useDataStore();
  const [input, setInput] = useState('');
  const [continuous, setContinuous] = useState(false);

  const parse = (text: string) => {
    const result: Partial<Task> = { title: text };
    const tagMatch = text.match(/#(\S+)/g);
    if (tagMatch) {
      result.tags = tagMatch.map((t) => t.slice(1));
      result.title = result.title!.replace(/#\S+/g, '').trim();
    }
    const assigneeMatch = text.match(/@(\S+)/);
    if (assigneeMatch) {
      result.assignee = assigneeMatch[1];
      result.title = result.title!.replace(/@\S+/, '').trim();
    }
    const dateMatch = text.match(/~(\S+)/);
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) result.dueDate = d.getTime();
      result.title = result.title!.replace(/~\S+/, '').trim();
    }
    const priorityMatch = text.match(/!(\S+)/);
    if (priorityMatch) {
      const p = priorityMatch[1];
      result.priority = p === '高' || p === 'high' ? 2 : p === '中' || p === 'mid' ? 1 : 0;
      result.title = result.title!.replace(/!\S+/, '').trim();
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const data = parse(input);
    await addTask(projectId, { ...data, title: data.title || input });
    setInput('');
  };

  const preview = parse(input);

  return (
    <div className="flex-1 relative">
      <input
        className="input-field flex-1"
        placeholder="任务标题 #标签 @负责人 ~截止日期 !优先级"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
      />
      {input && (
        <div
          className="absolute left-0 -top-14 rounded-lg p-2 shadow-lg w-full"
          style={{
            background: 'var(--pure-white)',
            border: '1px solid var(--border-cream)',
            fontSize: '0.75rem',
            boxShadow: 'rgba(0,0,0,0.08) 0px 8px 24px',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--stone-gray)' }}>预览:</span>
            <span style={{ fontWeight: 500 }}>{preview.title || input}</span>
            {preview.tags?.map((t) => (
              <span key={t} style={{ padding: '0 6px', borderRadius: 4, background: 'var(--warm-sand)', color: 'var(--terracotta)', fontSize: '0.625rem' }}>
                #{t}
              </span>
            ))}
            {preview.assignee && <span style={{ color: '#5a9e6f' }}>@{preview.assignee}</span>}
            {preview.dueDate && <span style={{ color: '#d4a24e' }}>~{new Date(preview.dueDate).toLocaleDateString('zh-CN')}</span>}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer" style={{ color: 'var(--stone-gray)', fontSize: '0.6875rem' }}>
              <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} className="w-3 h-3" />
              连续创建
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
