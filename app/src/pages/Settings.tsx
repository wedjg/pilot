import { useState } from 'react';
import { useUIStore, type Theme } from '../store/uiStore';
import { db } from '../db';

const headingStyle = {
  fontFamily: 'Georgia, serif',
  fontWeight: 500,
  fontSize: '1.6rem',
  lineHeight: 1.2,
  color: 'var(--near-black)',
};

export default function Settings() {
  const { theme, setTheme } = useUIStore();
  const [defaultDueTime, setDefaultDueTime] = useState('17:00');
  const [backupDays, setBackupDays] = useState(7);
  const [trashDays, setTrashDays] = useState(30);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleClearAll = async () => {
    if (deleteConfirm !== '删除') return;
    await db.projects.clear();
    await db.tasks.clear();
    await db.milestones.clear();
    await db.changeLogs.clear();
    window.location.reload();
  };

  return (
    <div className="max-w-[600px] mx-auto pb-8">
      <h1 style={{ ...headingStyle, marginBottom: 32 }}>偏好设置</h1>

      <div className="space-y-4">
        {/* Theme */}
        <div className="card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 12 }}>主题</h3>
          <div className="flex gap-1" style={{ background: 'var(--warm-sand)', borderRadius: 8, padding: 3, display: 'inline-flex' }}>
            {[
              { key: 'light' as Theme, label: '浅色' },
              { key: 'dark' as Theme, label: '深色' },
              { key: 'system' as Theme, label: '跟随系统' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: theme === t.key ? 500 : 400,
                  color: theme === t.key ? 'var(--terracotta)' : 'var(--olive-gray)',
                  background: theme === t.key ? 'var(--pure-white)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: theme === t.key ? '0px 0px 0px 1px var(--ring-warm)' : undefined,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default due time */}
        <div className="card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 4 }}>默认截止时间</h3>
          <p className="mb-3" style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>新建任务时自动填充的截止时间</p>
          <input
            type="time"
            className="input-field"
            style={{ width: 128 }}
            value={defaultDueTime}
            onChange={(e) => setDefaultDueTime(e.target.value)}
          />
        </div>

        {/* Backup reminder */}
        <div className="card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 4 }}>备份提醒间隔</h3>
          <p className="mb-3" style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>超过此天数未导出数据时，驾驶舱将显示提醒</p>
          <select
            className="input-field"
            style={{ width: 128 }}
            value={backupDays}
            onChange={(e) => setBackupDays(Number(e.target.value))}
          >
            <option value={3}>3 天</option>
            <option value={7}>7 天</option>
            <option value={14}>14 天</option>
            <option value={30}>30 天</option>
          </select>
        </div>

        {/* Trash retention */}
        <div className="card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 4 }}>回收站清理周期</h3>
          <p className="mb-3" style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>到期自动永久删除</p>
          <select
            className="input-field"
            style={{ width: 128 }}
            value={trashDays}
            onChange={(e) => setTrashDays(Number(e.target.value))}
          >
            <option value={14}>14 天</option>
            <option value={30}>30 天</option>
            <option value={60}>60 天</option>
            <option value={90}>90 天</option>
          </select>
        </div>

        {/* Storage info */}
        <div className="card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 4 }}>存储空间</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>
            IndexedDB 已就绪。数据完全存储于本浏览器中。
          </p>
        </div>

        {/* Danger zone */}
        <div
          className="rounded-lg p-4"
          style={{ background: '#fdf6f5', border: '1px solid #f0d4d4' }}
        >
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--error-crimson)', marginBottom: 8 }}>
            忘记所有数据
          </h3>
          <p className="mb-3" style={{ fontSize: '0.75rem', color: 'var(--error-crimson)', opacity: 0.8 }}>
            此操作不可逆。将清空所有项目、任务、里程碑和变更日志。
          </p>
          <div className="flex items-center gap-2">
            <input
              className="input-field"
              style={{ width: 192, fontSize: '0.75rem', borderColor: 'var(--error-crimson)' }}
              placeholder='输入"删除"确认'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <button
              className="btn-danger"
              style={{ fontSize: '0.75rem' }}
              disabled={deleteConfirm !== '删除'}
              onClick={handleClearAll}
            >
              清除所有数据
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 4 }}>关于</h3>
          <div className="space-y-1" style={{ fontSize: '0.75rem', color: 'var(--stone-gray)' }}>
            <p>PM Pilot V1.4 — 单人项目驾驶舱</p>
            <p>数据仅存储于本浏览器，绝不外传。</p>
            <p>Tech: React 18 + TypeScript + Tailwind CSS + Dexie.js</p>
          </div>
        </div>
      </div>
    </div>
  );
}
