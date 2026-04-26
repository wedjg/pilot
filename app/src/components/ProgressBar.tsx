import type { ProgressResult } from '../utils/progress';

interface ProgressBarProps {
  progress: ProgressResult;
  compact?: boolean;
}

export default function ProgressBar({ progress, compact }: ProgressBarProps) {
  const { percentage, locked, warning, completedCount, totalCount } = progress;

  if (totalCount === 0) {
    return <span className="text-caption" style={{ color: 'var(--stone-gray)' }}>—</span>;
  }

  const barColor = locked
    ? 'var(--terracotta)'
    : warning
    ? '#d4a24e'
    : '#5a9e6f';

  return (
    <div className={compact ? '' : 'space-y-1'}>
      <div
        className={`w-full rounded-full ${locked ? 'bg-stripes' : ''}`}
        style={{
          height: compact ? 6 : 8,
          background: 'var(--warm-sand)',
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
            opacity: locked ? 0.7 : 1,
          }}
        />
      </div>
      {!compact && (
        <div className="flex items-center gap-1 text-caption" style={{ color: 'var(--olive-gray)' }}>
          <span>
            {completedCount}/{totalCount} ({percentage}%)
          </span>
          {locked && <span title="关键路径阻塞中" style={{ color: 'var(--terracotta)' }}>!</span>}
          {warning && <span title="有非关键路径阻塞" style={{ color: '#d4a24e' }}>!</span>}
        </div>
      )}
    </div>
  );
}
