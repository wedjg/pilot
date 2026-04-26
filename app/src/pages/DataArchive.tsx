import { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { db } from '../db';
import EmptyState from '../components/EmptyState';

type ArchiveTab = 'trash' | 'report' | 'retro';

const headingStyle = {
  fontFamily: 'Georgia, serif',
  fontWeight: 500,
  fontSize: '1.6rem',
  lineHeight: 1.2,
  color: 'var(--near-black)',
};

export default function DataArchive() {
  const { loadAll } = useDataStore();
  const [tab, setTab] = useState<ArchiveTab>('trash');

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="max-w-[1200px] mx-auto pb-8">
      <h1 style={{ ...headingStyle, marginBottom: 24 }}>数据与档案</h1>

      <div className="flex items-center gap-1 mb-6" style={{ background: 'var(--warm-sand)', borderRadius: 8, padding: 3 }}>
        {[
          { key: 'trash' as ArchiveTab, label: '回收站' },
          { key: 'report' as ArchiveTab, label: '周报' },
          { key: 'retro' as ArchiveTab, label: '复盘中心' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      {tab === 'trash' && <TrashTab />}
      {tab === 'report' && <ReportTab />}
      {tab === 'retro' && <RetroTab />}
    </div>
  );
}

function TrashTab() {
  return (
    <div>
      <div
        className="rounded-lg px-4 py-2 mb-4"
        style={{
          fontSize: '0.75rem',
          color: '#8b6914',
          background: '#fdf6e3',
          border: '1px solid #e8dca0',
        }}
      >
        回收站将在 30 天后自动清理历史记录
      </div>
      <EmptyState icon="🗑️" message="回收站为空" />
    </div>
  );
}

function ReportTab() {
  const { tasks, projects, milestones } = useDataStore();
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const recentCompleted = tasks.filter((t) => t.status === 'done' && (t.completedAt || 0) > sevenDaysAgo);
  const recentCreated = tasks.filter((t) => t.createdAt > sevenDaysAgo);
  const achievedMilestones = milestones.filter(
    (m) => m.status === 'achieved' && m.targetDate > sevenDaysAgo
  );

  const byProject = new Map<string, { completed: Task[]; created: Task[] }>();
  for (const t of recentCompleted) {
    const entry = byProject.get(t.projectId) || { completed: [], created: [] };
    entry.completed.push(t);
    byProject.set(t.projectId, entry);
  }
  for (const t of recentCreated) {
    const entry = byProject.get(t.projectId) || { completed: [], created: [] };
    entry.created.push(t);
    byProject.set(t.projectId, entry);
  }

  let md = `# PM Pilot 周报\n\n`;
  md += `**周期**: ${new Date(sevenDaysAgo).toLocaleDateString('zh-CN')} — ${new Date().toLocaleDateString('zh-CN')}\n\n`;
  md += `## 关键指标\n\n`;
  md += `- 完成任务: ${recentCompleted.length}\n`;
  md += `- 新建任务: ${recentCreated.length}\n`;
  md += `- 达成里程碑: ${achievedMilestones.length}\n\n`;

  md += `## 按项目\n\n`;
  for (const [pid, data] of byProject) {
    const proj = projects.find((p) => p.id === pid);
    if (!proj) continue;
    md += `### ${proj.name}\n`;
    md += `- 完成: ${data.completed.length} 个任务\n`;
    md += `- 新建: ${data.created.length} 个任务\n`;
    if (data.completed.length > 0) {
      md += `  - ${data.completed.map((t) => t.title).join(', ')}\n`;
    }
    md += '\n';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(md).then(() => {
      alert('已复制到剪贴板');
    });
  };

  return (
    <div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500 }}>周报预览</h3>
          <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={handleCopy}>
            复制 Markdown
          </button>
        </div>
        <pre
          className="whitespace-pre-wrap rounded p-3 max-h-96 overflow-y-auto"
          style={{
            fontSize: '0.75rem',
            color: 'var(--olive-gray)',
            fontFamily: "'Courier New', monospace",
            background: 'var(--parchment)',
          }}
        >
          {md}
        </pre>
      </div>
    </div>
  );
}

import type { Task } from '../db';

function RetroTab() {
  const { tasks, projects } = useDataStore();

  const overdueCompleted = tasks.filter(
    (t) => t.status === 'done' && t.dueDate && t.completedAt && t.completedAt > t.dueDate
  );

  const byProject = new Map<string, { count: number; totalDelay: number }>();
  for (const t of overdueCompleted) {
    const entry = byProject.get(t.projectId) || { count: 0, totalDelay: 0 };
    entry.count++;
    entry.totalDelay += Math.ceil(((t.completedAt || 0) - (t.dueDate || 0)) / 86400000);
    byProject.set(t.projectId, entry);
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 500, marginBottom: 12 }}>延期档案</h3>
      {overdueCompleted.length === 0 ? (
        <EmptyState icon="📊" message="无延期记录，太棒了！" />
      ) : (
        <div className="space-y-2 mb-6">
          {overdueCompleted.map((t) => {
            const delay = t.completedAt && t.dueDate ? Math.ceil((t.completedAt - t.dueDate) / 86400000) : 0;
            const proj = projects.find((p) => p.id === t.projectId);
            return (
              <div key={t.id} className="card-interactive flex items-center gap-3" style={{ fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--error-crimson)', fontFamily: "'Courier New', monospace" }}>+{delay}天</span>
                <span className="flex-1">{t.title}</span>
                <span style={{ color: 'var(--stone-gray)' }}>{proj?.name}</span>
                <span style={{ color: 'var(--stone-gray)' }}>
                  {t.dueDate && new Date(t.dueDate).toLocaleDateString('zh-CN')} → {t.completedAt && new Date(t.completedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 500, marginBottom: 12 }}>按项目延期分析</h3>
      {byProject.size === 0 ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>暂无足够数据</p>
      ) : (
        <div className="space-y-2">
          {[...byProject.entries()].map(([pid, data]) => {
            const proj = projects.find((p) => p.id === pid);
            return (
              <div key={pid} className="card-interactive" style={{ fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 500 }}>{proj?.name}</span>
                <span style={{ marginLeft: 16, color: 'var(--stone-gray)' }}>延期 {data.count} 次</span>
                <span style={{ marginLeft: 8, color: 'var(--stone-gray)' }}>
                  平均 +{(data.totalDelay / data.count).toFixed(1)} 天
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 500, marginBottom: 12 }}>导入 / 导出</h3>
        <div className="flex gap-2">
          <button
            className="btn-primary"
            style={{ fontSize: '0.75rem' }}
            onClick={async () => {
              const data = {
                projects: await db.projects.toArray(),
                tasks: await db.tasks.toArray(),
                milestones: await db.milestones.toArray(),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pmpilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            导出 JSON
          </button>
          <label className="btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
            导入 JSON
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!confirm('导入将覆盖现有数据，确认继续？')) return;
                const text = await file.text();
                try {
                  const data = JSON.parse(text);
                  await db.projects.clear();
                  await db.tasks.clear();
                  await db.milestones.clear();
                  if (data.projects) await db.projects.bulkAdd(data.projects);
                  if (data.tasks) await db.tasks.bulkAdd(data.tasks);
                  if (data.milestones) await db.milestones.bulkAdd(data.milestones);
                  window.location.reload();
                } catch {
                  alert('JSON 格式无效，导入失败');
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
