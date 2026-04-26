import type { Task } from '../db';

export interface ProgressResult {
  percentage: number;
  locked: boolean;
  warning: boolean;
  completedCount: number;
  totalCount: number;
}

export function computeProgress(tasks: Task[], criticalPathIds: Set<string>): ProgressResult {
  const total = tasks.length;
  if (total === 0) return { percentage: 0, locked: false, warning: false, completedCount: 0, totalCount: 0 };

  const completed = tasks.filter((t) => t.status === 'done').length;
  const blocked = tasks.filter((t) => t.status === 'blocked');

  const blockedOnCritical = blocked.some((t) => criticalPathIds.has(t.id));
  const blockedOffCritical = blocked.some((t) => !criticalPathIds.has(t.id));

  if (blockedOnCritical) {
    return {
      percentage: Math.round((completed / total) * 100),
      locked: true,
      warning: false,
      completedCount: completed,
      totalCount: total,
    };
  }

  if (blockedOffCritical) {
    return {
      percentage: Math.round((completed / total) * 100),
      locked: false,
      warning: true,
      completedCount: completed,
      totalCount: total,
    };
  }

  return {
    percentage: Math.round((completed / total) * 100),
    locked: false,
    warning: false,
    completedCount: completed,
    totalCount: total,
  };
}
