import { create } from 'zustand';
import { db, type Project, type Task, type Milestone, createProject, createTask, createMilestone, addChangeLog } from '../db';
import { pushCommand } from '../utils/commands';

interface DataState {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  loading: boolean;
  loadAll: () => Promise<void>;
  addProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addMilestone: (projectId: string, data: Partial<Milestone>) => Promise<Milestone>;
  updateMilestone: (id: string, data: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  getProjectTasks: (projectId: string) => Task[];
  getProjectMilestones: (projectId: string) => Milestone[];
}

export const useDataStore = create<DataState>((set, get) => ({
  projects: [],
  tasks: [],
  milestones: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const [projects, tasks, milestones] = await Promise.all([
      db.projects.toArray(),
      db.tasks.toArray(),
      db.milestones.toArray(),
    ]);
    set({ projects, tasks, milestones, loading: false });
  },

  addProject: async (data) => {
    const project = createProject(data);
    await db.projects.add(project);
    await addChangeLog('project', project.id, 'create', null, project.name);
    pushCommand(
      '创建项目',
      async () => {
        await db.projects.delete(project.id);
        set((s) => ({ projects: s.projects.filter((p) => p.id !== project.id) }));
      },
      async () => {
        await db.projects.add(project);
        set((s) => ({ projects: [...s.projects, project] }));
      }
    );
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: async (id, data) => {
    const old = get().projects.find((p) => p.id === id);
    if (!old) return;
    const updated = { ...old, ...data, updatedAt: Date.now() };
    await db.projects.update(id, data);
    await addChangeLog('project', id, 'update', old, updated);
    pushCommand(
      '更新项目',
      async () => {
        await db.projects.update(id, old);
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? old : p)) }));
      },
      async () => {
        await db.projects.update(id, updated);
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }));
      }
    );
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }));
  },

  deleteProject: async (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;
    const tasks = get().tasks.filter((t) => t.projectId === id);
    await db.projects.delete(id);
    await db.tasks.bulkDelete(tasks.map((t) => t.id));
    pushCommand(
      '删除项目',
      async () => {
        await db.projects.add(project);
        await db.tasks.bulkAdd(tasks);
        set((s) => ({ projects: [...s.projects, project], tasks: [...s.tasks, ...tasks] }));
      },
      async () => {
        await db.projects.delete(id);
        await db.tasks.bulkDelete(tasks.map((t) => t.id));
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.filter((t) => t.projectId !== id),
        }));
      }
    );
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
    }));
  },

  addTask: async (projectId, data) => {
    const task = createTask(projectId, data);
    await db.tasks.add(task);
    await addChangeLog('task', task.id, 'create', null, task.title);
    pushCommand(
      '创建任务',
      async () => {
        await db.tasks.delete(task.id);
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) }));
      },
      async () => {
        await db.tasks.add(task);
        set((s) => ({ tasks: [...s.tasks, task] }));
      }
    );
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    const old = get().tasks.find((t) => t.id === id);
    if (!old) return;
    let updated: Task;
    if (data.status === 'blocked' && old.status !== 'blocked') {
      updated = { ...old, ...data, blockedAt: Date.now(), updatedAt: Date.now() };
    } else if (data.status && data.status !== 'blocked' && old.status === 'blocked') {
      updated = { ...old, ...data, blockedReason: undefined, blockedAt: undefined, updatedAt: Date.now() };
    } else if (data.status === 'done' && old.status !== 'done') {
      updated = { ...old, ...data, completedAt: Date.now(), updatedAt: Date.now() };
    } else {
      updated = { ...old, ...data, updatedAt: Date.now() };
    }
    await db.tasks.update(id, updated);
    await addChangeLog('task', id, 'update', old, updated);
    pushCommand(
      '更新任务',
      async () => {
        await db.tasks.update(id, old);
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? old : t)) }));
      },
      async () => {
        await db.tasks.update(id, updated);
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      }
    );
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
  },

  deleteTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    await db.tasks.delete(id);
    pushCommand(
      '删除任务',
      async () => {
        await db.tasks.add(task);
        set((s) => ({ tasks: [...s.tasks, task] }));
      },
      async () => {
        await db.tasks.delete(id);
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      }
    );
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  addMilestone: async (projectId, data) => {
    const milestone = createMilestone(projectId, data);
    await db.milestones.add(milestone);
    pushCommand(
      '创建里程碑',
      async () => {
        await db.milestones.delete(milestone.id);
        set((s) => ({ milestones: s.milestones.filter((m) => m.id !== milestone.id) }));
      },
      async () => {
        await db.milestones.add(milestone);
        set((s) => ({ milestones: [...s.milestones, milestone] }));
      }
    );
    set((s) => ({ milestones: [...s.milestones, milestone] }));
    return milestone;
  },

  updateMilestone: async (id, data) => {
    const old = get().milestones.find((m) => m.id === id);
    if (!old) return;
    const updated = { ...old, ...data };
    await db.milestones.update(id, updated);
    pushCommand(
      '更新里程碑',
      async () => {
        await db.milestones.update(id, old);
        set((s) => ({ milestones: s.milestones.map((m) => (m.id === id ? old : m)) }));
      },
      async () => {
        await db.milestones.update(id, updated);
        set((s) => ({ milestones: s.milestones.map((m) => (m.id === id ? updated : m)) }));
      }
    );
    set((s) => ({ milestones: s.milestones.map((m) => (m.id === id ? updated : m)) }));
  },

  deleteMilestone: async (id) => {
    const ms = get().milestones.find((m) => m.id === id);
    if (!ms) return;
    await db.milestones.delete(id);
    pushCommand(
      '删除里程碑',
      async () => {
        await db.milestones.add(ms);
        set((s) => ({ milestones: [...s.milestones, ms] }));
      },
      async () => {
        await db.milestones.delete(id);
        set((s) => ({ milestones: s.milestones.filter((m) => m.id !== id) }));
      }
    );
    set((s) => ({ milestones: s.milestones.filter((m) => m.id !== id) }));
  },

  getProjectTasks: (projectId) => get().tasks.filter((t) => t.projectId === projectId),
  getProjectMilestones: (projectId) => get().milestones.filter((m) => m.projectId === projectId),
}));
