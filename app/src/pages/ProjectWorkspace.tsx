import { useEffect } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { computeHealth, computeCriticalPath } from '../utils/health';
import { computeProgress } from '../utils/progress';
import ProgressBar from '../components/ProgressBar';
import BoardView from './BoardView';
import GanttView from './GanttView';

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, tasks, milestones, loadAll } = useDataStore();
  const project = projects.find((p) => p.id === id);

  useEffect(() => { loadAll(); }, []);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--stone-gray)' }}>
        项目不存在或已删除
      </div>
    );
  }

  const ptasks = tasks.filter((t) => t.projectId === id);
  const pms = milestones.filter((m) => m.projectId === id);
  const health = computeHealth(ptasks, pms);
  const cpIds = computeCriticalPath(ptasks.filter((t) => t.status !== 'done'));
  const progress = computeProgress(ptasks, cpIds);
  const isBoard = location.pathname.includes('/board');
  const healthColor =
    health.status === 'red'
      ? 'var(--error-crimson)'
      : health.status === 'yellow'
      ? '#d4a24e'
      : '#5a9e6f';

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/projects" style={{ color: 'var(--stone-gray)', fontSize: '0.8125rem', textDecoration: 'none' }}>
          ← 项目
        </Link>
        <h1
          className="cursor-pointer"
          style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 500, color: 'var(--near-black)' }}
          onClick={() => {
            const name = prompt('编辑项目名称', project.name);
            if (name && name !== project.name) {
              useDataStore.getState().updateProject(project.id, { name });
            }
          }}
        >
          {project.name}
        </h1>
        <span
          className="rounded-full shrink-0"
          style={{ width: 10, height: 10, backgroundColor: healthColor }}
          title={health.reasons.join('; ')}
        />
        <div className="flex-1 max-w-[200px]">
          <ProgressBar progress={progress} compact />
        </div>
        <div style={{ background: 'var(--warm-sand)', borderRadius: 8, padding: 3, display: 'flex', gap: 1 }}>
          <button
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: isBoard ? 500 : 400,
              color: isBoard ? 'var(--terracotta)' : 'var(--olive-gray)',
              background: isBoard ? 'var(--pure-white)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              boxShadow: isBoard ? '0px 0px 0px 1px var(--ring-warm)' : undefined,
              fontFamily: 'system-ui, sans-serif',
            }}
            onClick={() => navigate(`/projects/${id}/board`)}
          >
            看板
          </button>
          <button
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: !isBoard ? 500 : 400,
              color: !isBoard ? 'var(--terracotta)' : 'var(--olive-gray)',
              background: !isBoard ? 'var(--pure-white)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              boxShadow: !isBoard ? '0px 0px 0px 1px var(--ring-warm)' : undefined,
              fontFamily: 'system-ui, sans-serif',
            }}
            onClick={() => navigate(`/projects/${id}/gantt`)}
          >
            甘特图
          </button>
        </div>
      </div>

      <Routes>
        <Route path="board" element={<BoardView projectId={id!} />} />
        <Route path="gantt" element={<GanttView projectId={id!} />} />
        <Route path="*" element={<Navigate to="board" replace />} />
      </Routes>
    </div>
  );
}
