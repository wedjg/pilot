import { NavLink } from 'react-router-dom';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-w-[1024px]" style={{ background: 'var(--parchment)' }}>
      <nav
        className="fixed top-0 left-0 right-0 h-12 flex items-center px-6 gap-1 z-50"
        style={{
          background: 'var(--ivory)',
          borderBottom: '1px solid var(--border-cream)',
          boxShadow: 'rgba(0,0,0,0.03) 0px 1px 3px',
        }}
      >
        <span
          className="mr-5 text-sm"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 500,
            color: 'var(--terracotta)',
            letterSpacing: '-0.01em',
          }}
        >
          PM Pilot
        </span>
        {[
          ['/dashboard', '驾驶舱'],
          ['/projects', '项目'],
          ['/tasks', '待办'],
          ['/archive', '档案'],
          ['/settings', '设置'],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm transition-colors ${
                isActive
                  ? 'font-medium'
                  : 'hover:bg-[var(--warm-sand)]'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--terracotta)' : 'var(--olive-gray)',
              background: isActive ? 'var(--warm-sand)' : undefined,
              fontFamily: 'system-ui, sans-serif',
              borderRadius: '6px',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="pt-12 px-6">{children}</main>
    </div>
  );
}
