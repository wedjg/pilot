import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { computeHealth, computeCriticalPath } from '../utils/health';
import { computeProgress } from '../utils/progress';
import type { Project } from '../db';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';

type Tab = 'active' | 'dormant' | 'archived';

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

export default function ProjectList() {
  const navigate = useNavigate();
  const { projects, tasks, milestones, loadAll, addProject, deleteProject, updateProject } = useDataStore();
  const [tab, setTab] = useState<Tab>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { loadAll(); }, []);

  const filtered = projects.filter((p) => p.status === tab);
  const colors = ['#c96442', '#5a9e6f', '#d4a24e', '#6b7db3', '#8b6b9e', '#b56b7d', '#4a8c8c', '#7a8c5e'];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const p = await addProject({ name: newName.trim(), color });
    setNewName('');
    setShowCreate(false);
    navigate(`/projects/${p.id}/board`);
  };

  const handleToggle = (id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } else {
      navigate(`/projects/${id}/board`);
    }
  };

  const handleBulkAction = async (action: 'dormant' | 'archived' | 'delete') => {
    for (const id of selected) {
      if (action === 'delete') {
        await deleteProject(id);
      } else {
        await updateProject(id, { status: action });
      }
    }
    setSelected(new Set());
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: '进行中' },
    { key: 'dormant', label: '休眠' },
    { key: 'archived', label: '归档' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1" style={{ background: 'var(--warm-sand)', borderRadius: 8, padding: 3 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(new Set()); }}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: tab === t.key ? 500 : 400,
                color: tab === t.key ? 'var(--terracotta)' : 'var(--olive-gray)',
                background: tab === t.key ? 'var(--pure-white)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                boxShadow: tab === t.key ? '0px 0px 0px 1px var(--ring-warm)' : undefined,
                fontFamily: 'system-ui, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn-primary" style={{ fontSize: '0.8125rem' }} onClick={() => setShowCreate(true)}>
          + 新建项目
        </button>
      </div>

      {selected.size > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-4 py-2"
          style={{ background: 'var(--warm-sand)' }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--terracotta)', fontWeight: 500 }}>
            已选 {selected.size} 项
          </span>
          <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => handleBulkAction('dormant')}>批量休眠</button>
          <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => handleBulkAction('archived')}>批量归档</button>
          <button
            className="btn-ghost"
            style={{ fontSize: '0.75rem', color: 'var(--error-crimson)' }}
            onClick={() => { if (confirm('确认删除？')) handleBulkAction('delete'); }}
          >
            批量删除
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="📁"
          message={tab === 'active' ? '暂无进行中项目，去创建吧' : `暂无${tab === 'dormant' ? '休眠' : '归档'}项目`}
          cta={tab === 'active' ? { label: '创建项目', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((project) => {
            const ptasks = tasks.filter((t) => t.projectId === project.id);
            const pms = milestones.filter((m) => m.projectId === project.id);
            const health = computeHealth(ptasks, pms);
            const cpIds = computeCriticalPath(ptasks.filter((t) => t.status !== 'done'));
            const progress = computeProgress(ptasks, cpIds);
            const blockedCount = ptasks.filter((t) => t.status === 'blocked').length;
            const isSelected = selected.has(project.id);
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
                style={{
                  borderColor: isSelected ? 'var(--terracotta)' : 'var(--border-cream)',
                  borderWidth: isSelected ? 2 : 1,
                  padding: 0,
                  overflow: 'hidden',
                }}
                onClick={(e) => handleToggle(project.id, e)}
              >
                <div style={{ backgroundColor: project.color, height: 4 }} />
                <div style={{ padding: '16px 20px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500 }}>
                      {project.name}
                    </h3>
                    <span
                      className="rounded-full shrink-0"
                      style={{ width: 8, height: 8, backgroundColor: healthColor }}
                      title={health.reasons.join('; ')}
                    />
                  </div>
                  <ProgressBar progress={progress} compact />
                  <div className="mt-2 flex items-center gap-3" style={{ fontSize: '0.625rem', color: 'var(--stone-gray)' }}>
                    {blockedCount > 0 && <span style={{ color: 'var(--error-crimson)' }}>⚠ {blockedCount}阻塞</span>}
                    <span>任务: {ptasks.length}</span>
                    <span>更新: {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={() => setShowCreate(false)} />
          <div
            className="relative shadow-xl p-6 w-[400px]"
            style={{ background: 'var(--ivory)', borderRadius: 16 }}
          >
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 500, marginBottom: 16, color: 'var(--near-black)' }}>
              新建项目
            </h3>
            <input
              className="input-field mb-4"
              placeholder="项目名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn-primary" disabled={!newName.trim()} onClick={handleCreate}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
