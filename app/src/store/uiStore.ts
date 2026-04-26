import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toast: { message: string; type: 'success' | 'warning' | 'error' | 'info'; action?: { label: string; onClick: () => void } } | null;
  showToast: (toast: UIState['toast']) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: (localStorage.getItem('pmpilot-theme') as Theme) || 'system',
  setTheme: (theme) => {
    localStorage.setItem('pmpilot-theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  focusMode: false,
  setFocusMode: (focusMode) => set({ focusMode }),
  toast: null,
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: null }), toast?.action ? 5000 : 2500);
  },
  clearToast: () => set({ toast: null }),
}));

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
