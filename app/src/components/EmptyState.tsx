interface EmptyStateProps {
  icon?: string;
  message: string;
  cta?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📋', message, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--stone-gray)' }}>
      <span style={{ fontSize: '2.5rem', marginBottom: 12 }}>{icon}</span>
      <p className="text-body-sm mb-3" style={{ color: 'var(--olive-gray)' }}>{message}</p>
      {cta && (
        <button className="btn-primary" onClick={cta.onClick}>
          {cta.label}
        </button>
      )}
    </div>
  );
}
