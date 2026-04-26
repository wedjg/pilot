import type { Task, Project, Milestone } from '../db';

export type HealthStatus = 'red' | 'yellow' | 'green';

export interface ProjectHealth {
  status: HealthStatus;
  reasons: string[];
  blockedOnCritical: boolean;
  blockedCount: number;
  overdueCount: number;
}

export function computeHealth(
  tasks: Task[],
  milestones: Milestone[]
): ProjectHealth {
  const reasons: string[] = [];
  let blockedOnCritical = false;

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const blockedTasks = activeTasks.filter((t) => t.status === 'blocked');
  const overdueTasks = activeTasks.filter(
    (t) => t.dueDate && t.dueDate < Date.now()
  );
  const overdueMilestones = milestones.filter(
    (m) => m.status === 'pending' && m.targetDate < Date.now()
  );

  // Check red conditions
  if (overdueTasks.length > 0) {
    reasons.push(`${overdueTasks.length}个任务逾期`);
  }
  if (overdueMilestones.length > 0) {
    reasons.push(`${overdueMilestones.length}个里程碑逾期`);
  }

  // Check critical path blockage
  const criticalPathIds = computeCriticalPath(activeTasks);
  const blockedOnCriticalPath = blockedTasks.some((t) => criticalPathIds.has(t.id));

  if (blockedOnCriticalPath) {
    blockedOnCritical = true;
    reasons.push('关键路径上有阻塞任务');
  }

  // Build dependency graph for critical path check
  const depGraph = new Map<string, string[]>();
  for (const t of tasks) {
    depGraph.set(t.id, t.dependencies || []);
  }

  // Red判定
  if (reasons.length > 0) {
    return {
      status: 'red',
      reasons,
      blockedOnCritical,
      blockedCount: blockedTasks.length,
      overdueCount: overdueTasks.length,
    };
  }

  // Yellow判定: non-critical blockage OR critical path deviation > 10%
  const nonCriticalBlocked = blockedTasks.filter(
    (t) => !criticalPathIds.has(t.id)
  );
  if (nonCriticalBlocked.length > 0) {
    reasons.push(`${nonCriticalBlocked.length}个非关键路径阻塞`);

    // Check critical path deviation
    const cpActiveTasks = activeTasks.filter((t) => criticalPathIds.has(t.id));
    if (cpActiveTasks.length > 0) {
      const elapsedRatio =
        cpActiveTasks.filter((t) => {
          const consumed = (Date.now() - (t.startDate || t.createdAt)) /
            (t.estimatedHours || 24) / 3600000;
          return consumed > 0.5;
        }).length / cpActiveTasks.length;
      const completedRatio =
        doneTasks.filter((t) => criticalPathIds.has(t.id)).length /
        cpActiveTasks.length;
      if (elapsedRatio - completedRatio > 0.1) {
        reasons.push('关键路径进度偏差>10%');
        return {
          status: 'yellow',
          reasons,
          blockedOnCritical: false,
          blockedCount: blockedTasks.length,
          overdueCount: overdueTasks.length,
        };
      }
    }

    return {
      status: 'yellow',
      reasons,
      blockedOnCritical: false,
      blockedCount: blockedTasks.length,
      overdueCount: overdueTasks.length,
    };
  }

  if (reasons.length > 0) {
    return {
      status: 'yellow',
      reasons,
      blockedOnCritical: false,
      blockedCount: blockedTasks.length,
      overdueCount: overdueTasks.length,
    };
  }

  return {
    status: 'green',
    reasons: [],
    blockedOnCritical: false,
    blockedCount: 0,
    overdueCount: 0,
  };
}

function computeCriticalPath(tasks: Task[]): Set<string> {
  const active = tasks.filter((t) => t.status !== 'done');
  if (active.length === 0) return new Set();

  // Build adjacency list
  const graph = new Map<string, { next: string[]; weight: number }>();
  for (const t of active) {
    graph.set(t.id, {
      next: (t.dependencies || []).filter((d) =>
        active.some((a) => a.id === d && a.status !== 'done')
      ),
      weight: t.estimatedHours || 8,
    });
  }

  // Find all nodes that are dependencies (predecessors)
  const allPreds = new Set<string>();
  for (const [, v] of graph) {
    for (const n of v.next) {
      allPreds.add(n);
    }
  }

  // Source nodes: not in allPreds and in graph
  const sources = [...graph.keys()].filter((k) => !allPreds.has(k));

  // DFS-based longest path (DP on DAG)
  const dist = new Map<string, number>();
  const parent = new Map<string, string>();

  function dfs(u: string, visited: Set<string>) {
    if (visited.has(u)) return;
    visited.add(u);
    const node = graph.get(u);
    if (!node) return;
    for (const v of node.next) {
      dfs(v, visited);
      const w = (graph.get(v)?.weight || 8) + (dist.get(v) || 0);
      if (w > (dist.get(u) || 0)) {
        dist.set(u, w);
        parent.set(u, v);
      }
    }
  }

  const visited = new Set<string>();
  for (const s of sources) {
    dfs(s, visited);
  }

  // Find the longest path endpoint
  let maxDist = 0;
  let endNode = '';
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endNode = id;
    }
  }

  // Backtrack to get critical path nodes
  const path = new Set<string>();
  let curr = endNode;
  while (curr) {
    path.add(curr);
    const p = parent.get(curr);
    if (p && path.has(p)) break; // cycle guard
    curr = p || '';
  }

  // Also include sources
  for (const s of sources) {
    path.add(s);
  }

  return path;
}

export { computeCriticalPath };
