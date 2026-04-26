import Dexie, { type Table } from 'dexie';
import { nanoid } from 'nanoid';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'dormant' | 'archived';
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: number;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: number;
  dueDate?: number;
  tags: string[];
  dependencies: string[];
  dependents: string[];
  blockedReason?: string;
  blockedAt?: number;
  progress_locked: boolean;
  scheduled_completion: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: number;
  status: 'pending' | 'achieved';
  linkedTaskIds?: string[];
  createdAt: number;
}

export interface ChangeLogEntry {
  id: string;
  entityType: 'task' | 'project' | 'milestone';
  entityId: string;
  field: string;
  from: unknown;
  to: unknown;
  reason?: string;
  timestamp: number;
}

export interface AppSettings {
  key: string;
  theme: 'light' | 'dark' | 'system';
  defaultDueTime: string;
  backupReminderInterval: number;
  trashRetentionDays: number;
}

export interface WeeklyReport {
  id: string;
  generatedAt: number;
  contentMarkdown: string;
  periodStart: number;
  periodEnd: number;
}

class PMPilotDB extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  milestones!: Table<Milestone, string>;
  changeLogs!: Table<ChangeLogEntry, string>;
  settings!: Table<AppSettings, string>;
  reports!: Table<WeeklyReport, string>;

  constructor() {
    super('PMPilotDB');
    this.version(1).stores({
      projects: 'id, status, createdAt',
      tasks: 'id, projectId, status, dueDate, [projectId+status]',
      milestones: 'id, projectId, targetDate',
      changeLogs: 'id, [entityType+entityId], timestamp',
      settings: 'key',
      reports: 'id, generatedAt',
    });
  }
}

export const db = new PMPilotDB();

export function createProject(data: Partial<Project> = {}): Project {
  const now = Date.now();
  return {
    id: nanoid(),
    name: data.name || '',
    description: data.description || '',
    status: 'active',
    color: data.color || '#3B82F6',
    createdAt: now,
    updatedAt: now,
  };
}

export function createTask(projectId: string, data: Partial<Task> = {}): Task {
  const now = Date.now();
  return {
    id: nanoid(),
    projectId,
    title: data.title || '',
    status: data.status || 'todo',
    priority: data.priority ?? 0,
    assignee: data.assignee,
    estimatedHours: data.estimatedHours,
    actualHours: data.actualHours,
    startDate: data.startDate || now,
    dueDate: data.dueDate,
    tags: data.tags || [],
    dependencies: data.dependencies || [],
    dependents: data.dependents || [],
    blockedReason: data.blockedReason,
    blockedAt: data.blockedAt,
    progress_locked: false,
    scheduled_completion: data.dueDate || now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMilestone(projectId: string, data: Partial<Milestone> = {}): Milestone {
  const now = Date.now();
  return {
    id: nanoid(),
    projectId,
    title: data.title || '',
    targetDate: data.targetDate || now,
    status: 'pending',
    linkedTaskIds: data.linkedTaskIds || [],
    createdAt: now,
  };
}

export async function addChangeLog(
  entityType: ChangeLogEntry['entityType'],
  entityId: string,
  field: string,
  from: unknown,
  to: unknown,
  reason?: string
) {
  await db.changeLogs.add({
    id: nanoid(),
    entityType,
    entityId,
    field,
    from,
    to,
    reason,
    timestamp: Date.now(),
  });
}
