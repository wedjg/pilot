import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { applyTheme, useUIStore } from './store/uiStore';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectWorkspace from './pages/ProjectWorkspace';
import PersonalTasks from './pages/PersonalTasks';
import DataArchive from './pages/DataArchive';
import Settings from './pages/Settings';
import PrivacyIntro from './components/PrivacyIntro';

export default function App() {
  const theme = useUIStore((s) => s.theme);
  const focusMode = useUIStore((s) => s.focusMode);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    // Check if first visit
    const visited = localStorage.getItem('pmpilot-visited');
    if (!visited) {
      setShowIntro(true);
    }
  }, [theme]);

  const handleIntroClose = () => {
    localStorage.setItem('pmpilot-visited', '1');
    setShowIntro(false);
  };

  useEffect(() => {
    // Listen for undo/redo toasts from child components
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) {
        useUIStore.getState().showToast({ message: detail.message, type: 'info' });
      }
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  return (
    <>
      {showIntro && <PrivacyIntro onClose={handleIntroClose} />}
      {!focusMode && <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id/*" element={<ProjectWorkspace />} />
          <Route path="/tasks" element={<PersonalTasks />} />
          <Route path="/archive" element={<DataArchive />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>}
      {focusMode && <PersonalTasks />}

      {/* Global Toast */}
      <Toast />
    </>
  );
}

function Toast() {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);

  if (!toast) return null;

  const colors: Record<string, { bg: string; text: string }> = {
    success: { bg: '#5a9e6f', text: '#ffffff' },
    warning: { bg: '#d4a24e', text: '#141413' },
    error: { bg: 'var(--error-crimson)', text: 'var(--ivory)' },
    info: { bg: 'var(--terracotta)', text: 'var(--ivory)' },
  };

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div
        className="px-4 py-2 shadow-lg text-sm flex items-center gap-3"
        style={{
          background: colors[toast.type].bg,
          color: colors[toast.type].text,
          borderRadius: '12px',
          boxShadow: 'rgba(0,0,0,0.12) 0px 8px 24px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span>{toast.message}</span>
        {toast.action && (
          <button className="underline font-medium" onClick={toast.action.onClick}>
            {toast.action.label}
          </button>
        )}
        <button className="ml-2 opacity-60 hover:opacity-100 transition-opacity" onClick={clearToast}>
          ✕
        </button>
      </div>
    </div>
  );
}
