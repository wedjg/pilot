# PM Pilot 架构设计文档

| 文档版本 | V1.0 | 最后更新 | 2026-04-24 |
|:---|:---|:---|:---|
| **对应产品文档** | PM Pilot V1.4 | **架构负责人** | 架构组 |

---

## 1. 架构总览与设计原则

PM Pilot 是一款**纯浏览器端单页应用（SPA）**，核心约束是零服务端依赖、本地存储、离线可用。架构必须为“可信进度”和“极速操作”这两个产品灵魂提供坚实底座。

### 1.1 第一性原理

- **本地唯一真相源**：浏览器 IndexedDB 是唯一数据存储，无任何远端同步。
- **计算在客户端**：关键路径分析、健康度判定、偏差计算均在 Web Worker 中异步执行，保证 UI 不卡顿。
- **防御性数据流**：状态变更必须通过统一事务层写入，确保撤销栈、变更日志、进度锁定状态的原子性。
- **渐进式离线**：Service Worker 缓存壳资源；IndexedDB 保障数据离线读写；首次联网加载后完全离线可用。

### 1.2 系统分层

```text
┌──────────────────────────────────────────────────────┐
│                    UI 展示层                          │
│  驾驶舱 / 项目全景 / 工作台(看板+甘特图) / 待办桌 / 档案 │
├──────────────────────────────────────────────────────┤
│                 业务逻辑层 (Hooks/Services)            │
│  进度引擎 / 健康度判定 / 关键路径 / 阻塞SLA / 撤销栈    │
├──────────────────────────────────────────────────────┤
│                 数据访问层 (DAL)                       │
│  IndexedDB 事务封装 / 变更日志 / 导入导出 / 迁移        │
├──────────────────────────────────────────────────────┤
│                 基础能力层                              │
│  Dexie.js / Service Worker / Web Worker / 全文搜索   │
└──────────────────────────────────────────────────────┘
```

---

## 2. 技术选型与理由

| 类别 | 技术选型 | 选型理由 |
|:---|:---|:---|
| **语言** | TypeScript (strict) | 复杂业务逻辑（阻塞判定、关键路径）必须类型安全，IndexedDB schema 需要类型映射。 |
| **框架** | React 18 + React Router v6 | 组件化天然匹配看板/甘特图；社区生态成熟（拖拽、虚拟滚动、图表库）。 |
| **状态管理** | Zustand + Immer | 轻量、不可变更新、内置撤销中间件友好；可轻松持久化 UI 状态到 localStorage。 |
| **数据层** | Dexie.js (IndexedDB wrapper) | 声明式 schema 定义、事务支持、可观察查询、支持 Web Worker 内使用。 |
| **UI 组件库** | Radix UI + Tailwind CSS | 无样式捆绑，无障碍性内置；深色模式通过 Tailwind 实现。 |
| **甘特图** | dhtmlx-gantt (或自定义 Canvas) | 依赖关系拖拽创建、关键路径高亮、里程碑标记等均需原生级支持。备选：Frappe Gantt 扩展。 |
| **依赖网络图** | React Flow (或 Cytoscape.js) | 节点图交互、布局算法、小地图等直接复用。 |
| **拖拽** | @dnd-kit | 天然适配看板卡片拖拽、甘特图任务顺序调整。 |
| **撤销实现** | 指令模式 Command Pattern + 栈 | 所有状态变更封装为 Command，execute/undo 配对。 |
| **Web Worker** | comlink | 让 Worker 通信像本地函数调用，类型安全。 |
| **离线缓存** | Workbox (webpack/vite 插件) | 自动生成 Service Worker，预缓存静态资源。 |
| **构建工具** | Vite | 快速 HMR，极简配置，支持 PWA 插件。 |
| **测试** | Vitest + Testing Library + Playwright | 单元、组件、E2E 分层覆盖，重点测试 IndexedDB 迁移与关键路径连锁变更。 |

---

## 3. 路由与页面拓扑

采用 React Router 6 的嵌套路由：

| 路径 | 页面组件 | 说明 |
|:---|:---|:---|
| `/` | `Dashboard` | 驾驶舱，首页 |
| `/projects` | `ProjectList` | 项目全景（进行中/休眠/归档的 Tab 筛选） |
| `/projects/:id` | `ProjectWorkspace` | 项目工作台，内部嵌套视图切换 |
| `/projects/:id/board` | `BoardView` | 看板视图（默认） |
| `/projects/:id/gantt` | `GanttView` | 甘特图视图 |
| `/tasks` | `PersonalTasks` | 个人待办桌（跨项目聚合） |
| `/archive` | `DataArchive` | 数据与档案，内部子 Tab |
| `/settings` | `Settings` | 偏好设置 |

全局布局组件 `AppShell` 提供顶部导航 + 侧边栏（项目工作台内可能有次级导航），个人待办桌的“专注模式”通过 CSS 隐藏壳层实现，无需路由切换。

---

## 4. 核心模块与组件树

### 4.1 驾驶舱 Dashboard

```
DashboardPage
├── RiskRadar (风险雷达)
│   ├── BlockedTaskCard (按SLA排序，>48h置顶高亮)
│   └── TaskDetailPopover (浮层)
├── TodaysTasks (今日必做)
│   └── TaskCardCompact (带跳转)
├── HealthMatrix (项目健康度 2×N)
│   └── ProjectHealthDot (红/黄/绿，hover摘要)
├── UpcomingMilestones (未来14天里程碑列表)
└── RecentCompleted (最近10条完成，可点击恢复)
```

### 4.2 项目工作台 ProjectWorkspace

```
ProjectWorkspace
├── ProjectHeader (项目名、进度条锁定态、健康信号灯)
├── QuickCommandBar (快速指令栏，带连续创建开关)
├── ViewSwitcher (看板 / 甘特图)
└── (根据视图)
    ├── BoardView
    │   └── KanbanColumns (待办/进行中/阻塞/完成)
    │       └── TaskCard (可拖拽，阻塞列强化样式)
    └── GanttView
        ├── GanttChart (dhtmlx-gantt / Canvas)
        ├── CriticalPathToggle + 变化指示器
        └── TaskDetailPanel (侧栏/浮层)
            ├── TaskForm
            ├── DependencyEditor (搜索添加前置依赖)
            └── DependencyGraph (React Flow 小型节点图)
```

### 4.3 数据与档案 DataArchive

```
DataArchive
├── ArchiveTabs (回收站 / 周报 / 复盘中心)
├── TrashList (回收站，自动清理倒计时)
├── ReportGenerator (周报 Markdown 一键复制，历史记录)
└── Retrospective (延期档案 & 估算偏差分析)
```

---

## 5. 数据流与状态管理

### 5.1 全局状态划分

| 状态类别 | 存储位置 | 说明 |
|:---|:---|:---|
| **领域数据** (Project/Task/Milestone) | IndexedDB (Dexie) + Zustand 内存缓存 | 所有变更通过 `commandExecutor` 写入，缓存层订阅变更通知。 |
| **UI 状态** (当前视图、选中的任务、过滤器) | Zustand (persist 到 localStorage) | 不含业务数据，仅用户界面偏好。 |
| **计算派生状态** (进度百分比、健康度、关键路径) | Web Worker 计算结果 + Zustand 缓存 | 当依赖的任务/项目变更时，触发 Worker 重算。 |
| **撤销栈** | Zustand 的 temporal 中间件 (内存) | 最多保存 20 步 Command，页面刷新不持久化（避免混淆）。 |

### 5.2 数据写入流（关键）

所有修改操作（创建、更新、删除、状态变更）必须走统一入口，确保撤销、变更日志、Worker 触发一致：

```text
用户操作 → Command.execute()
              ├── 1. 乐观更新 UI (Zustand)
              ├── 2. 写入 IndexedDB（Dexie 事务）
              │      └── 同时追加 ChangeLog 记录
              ├── 3. 推入 Temporal 撤销栈
              └── 4. 消息通知 Web Worker：重新计算受影响的进度/关键路径/健康度
```

**Command 接口定义**：

```typescript
interface Command<T = any> {
  execute(): Promise<T>;
  undo(): Promise<void>;
  description: string; // 用于 Toast “已撤销 XXX”
}
```

典型 Command：`CreateTaskCommand`, `MoveTaskCommand`, `UpdateStatusCommand`, `DeleteTaskCommand`, `AddDependencyCommand`。

### 5.3 Web Worker 计算任务

- **关键路径**：基于任务依赖图，采用 CPM（关键路径法），考虑依赖、估算工时、阻塞状态。
- **进度锁定**：识别所有阻塞任务，分析其是否在关键路径上，返回进度条的 `locked` 状态和真实百分比。
- **健康度判定**：根据产品文档 3.1.2 规则，输出每个项目的红黄绿灯及原因摘要。
- **偏差计算**：比较 `scheduled_completion` 与实际完成/当前日期，产出偏差数据供复盘中心。

Worker 通过 `comlink` 暴露 API，主线程调用后更新派生状态。

---

## 6. 数据模型与 IndexedDB Schema

使用 Dexie.js 声明式定义表结构，版本化管理。

### 6.1 数据库版本策略

- **V1**：初始 Schema。
- **V2+**：通过 `db.version().stores()` 链式定义，Dexie 自动处理升级迁移。每次产品迭代可能涉及 migration，必须在 E2E 测试中覆盖。

### 6.2 核心表

```typescript
// Projects 表
interface Project {
  id: string;            // nanoid
  name: string;
  description?: string;
  status: 'active' | 'dormant' | 'archived';
  color?: string;
  createdAt: number;     // timestamp
  updatedAt: number;
}

// Tasks 表
interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;   // 富文本 (Markdown)
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: number;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: number;
  dueDate?: number;
  tags: string[];
  // 依赖
  dependencies: string[];   // 前置任务 ID 列表
  dependents: string[];     // 后置任务 ID 列表 (冗余，方便查询；增删依赖时必须在同一 Dexie 事务中双向更新以保证一致性)
  // 阻塞与进度
  blockedReason?: string;
  blockedAt?: number;       // 阻塞开始时间戳
  progress_locked: boolean; // 是否处于阻塞导致进度不可信
  scheduled_completion: number; // 每次变更重算的预计完成日
  completedAt?: number;
  // 审计
  createdAt: number;
  updatedAt: number;
}

// Milestones 表
interface Milestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: number;
  status: 'pending' | 'achieved';
  linkedTaskIds?: string[];
  createdAt: number;
}

// ChangeLog 表 (通用变更记录)
interface ChangeLogEntry {
  id: string;
  entityType: 'task' | 'project' | 'milestone';
  entityId: string;
  field: string;
  from: any;
  to: any;
  reason?: string;
  timestamp: number;
}

// Settings 表 (单例存储)
interface AppSettings {
  key: string; // 'app_settings'
  theme: 'light' | 'dark' | 'system';
  defaultDueTime: string; // '17:00'
  backupReminderInterval: number; // 天
  // ...
}

// Report 表 (存储最近3次周报)
interface WeeklyReport {
  id: string;
  generatedAt: number;
  contentMarkdown: string;
  periodStart: number;
  periodEnd: number;
}
```

> **索引设计重点**：Task 表按 `projectId`、`status`、`dueDate`、`[projectId+status]` 建索引；Milestone 按 `projectId`、`targetDate` 建索引；ChangeLog 按 `[entityType+entityId]`、`timestamp` 建索引，以支持复盘查询。

### 6.3 预估完成日 scheduled_completion 的重算

每次任务变更（状态、依赖、估算工时）都会触发 Worker 重算，基于当前日期 + 剩余依赖链路中最长路径的估算工时，输出预计完成日并写入 Task。

---

## 7. 关键算法设计

### 7.1 防欺骗进度计算

**输入**：项目下所有非 `done` 任务及其依赖图、阻塞状态。
**输出**：真实完成百分比 + 锁定标识。

```text
算法：
1. 统计总任务数 N，完成数为 C。
2. 完成百分比 = C / N。
3. 遍历所有阻塞任务，标记其所在路径是否为关键路径。
4. 若存在至少一个“关键路径上的阻塞任务”：
      进度条 = 琥珀色条纹样式，百分比数字后加 🔒。
   else if 存在非关键路径阻塞：
      百分比后加 ⚠️。
   else：
      正常蓝/绿进度条。
5. 任何情况下，数字均显示真实 C/N，绝不扭曲。
```

关键路径计算使用标准 CPM，但将阻塞任务的剩余工期替换为一个足够大的哨兵值（如 `Number.MAX_SAFE_INTEGER / 2`），从而使该路径在 CPM 中自然成为最长路径（或显著延长），这会影响健康度红灯判定。避免使用字面”无限大”以规避数值溢出风险。

### 7.2 健康度判定

实现产品文档 3.1.2 的规则，利用 Worker 预计算每个项目的健康状态对象：

```typescript
type HealthStatus = 'red' | 'yellow' | 'green';
interface ProjectHealth {
  status: HealthStatus;
  reasons: string[];
}
```

判定逻辑：

- 红灯：`逾期任务 > 0` OR `关键路径上有阻塞任务` OR `有逾期里程碑`。
- 黄灯：`非关键路径阻塞 > 0` OR `(关键路径完成率偏差 > 10%)`。偏差 = 关键路径已消耗工期占比 - 关键路径已完成任务数占比（分母为关键路径上所有非 done 任务数）。
- 绿灯：其余。

### 7.3 阻塞 SLA 与置顶逻辑

每次驾驶舱加载或 Worker 更新时，计算各阻塞任务的阻挡时长 `now - blockedAt`：

- 若 > 48小时：任务标记 `escalated: true`，在风险雷达中置顶排序，标题前缀“⚠️ 急需介入”，显示等待天数。
- 否则：只显示“阻塞中”。

---

## 8. 离线能力与 Service Worker

### 8.1 缓存策略

使用 Workbox 的 `InjectManifest` 模式自定义 Service Worker：

- **壳资源**：HTML/CSS/JS 预缓存，版本变更时自动更新。
- **数据**：完全由 IndexedDB 处理，SW 不缓存 API（无 API）。
- **外部 CDN 资源**：如字体、图标，使用 Stale-While-Revalidate。

### 8.2 离线启动保障

- Vite PWA 插件生成 Manifest 和 SW。
- `index.html` 内联最小化离线提示脚本：首次加载后，任何情况均可离线打开。
- IndexedDB 数据在页面加载时从本地读取，无网络依赖。

---

## 9. 撤销/重做体系

采用 **Command Pattern + Temporal Store**：

- Zustand 集成 `zundo`（或自定义 temporal 中间件），限制 20 条历史。
- 所有修改通过 `commandExecutor` 派发，每个 Command 必须提供 `undo` 逻辑。
- 撤销触发时，`undo()` 会逆写 IndexedDB 和 UI 缓存，同时推进历史指针。
- `Ctrl+Z` / `Ctrl+Shift+Z` 全局监听，显示 Toast “已撤销 [操作名]”。

> **设计重点**：复合操作（如更改任务状态时同时更新 `scheduled_completion` 和写下 ChangeLog）应封装为一个 Command，保证原子性撤销。

---

## 10. 安全性、隐私与兼容性

- **隐私**：首次加载展示“你的数据只在你手中”引导层，明确告知无网络传输，同意后关闭。
- **数据导入导出**：全量 JSON 序列化/反序列化，支持文件选择器和拖拽导入，导出时生成时间戳文件名。校验 JSON Schema 合法性后再导入。
- **IndexedDB 存储限制**：监控 `navigator.storage.estimate()`，当用量超过 80% 时在设置页提示导出建议。
- **浏览器兼容**：支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。最低屏幕宽度适配 1440px，对更小屏幕可在布局上降级为垂直滚动而非隐藏内容。

---

## 11. 测试与质量保障

### 11.1 测试层级

| 层级 | 工具 | 覆盖重点 |
|:---|:---|:---|
| **单元测试** | Vitest | 进度计算函数、健康度判定、关键路径算法、Command 的 undo/redo 逻辑，纯函数 100% 覆盖。 |
| **组件测试** | Testing Library + MSW(无网络) | 驾驶舱卡片渲染、看板拖拽状态变更、浮层交互、空状态与错误边界。 |
| **集成测试** | Vitest + 虚拟 IndexedDB (fake-indexeddb) | 数据事务、变更日志写入、Worker 通信、撤销栈对 DB 的影响。 |
| **E2E** | Playwright | 核心用户旅程：创建项目→添加任务→设置依赖→阻塞→驾驶舱告警→恢复→周报生成。重点验证 IndexedDB 迁移脚本。 |

### 11.2 关键测试用例（P0）

- **关键路径连锁变更**：解除一个阻塞 → 关键路径重新计算 → 驾驶舱红灯变黄灯。
- **阻塞 > 48h SLA 升级**：模拟时间推进，确认任务置顶与红点提示。
- **进度锁定显示**：有关键路径阻塞时，进度条为琥珀色并显示 🔒，但百分比真实。
- **撤销删除风险任务**：`Ctrl+Z` 恢复后，任务重新出现在驾驶舱雷达。

---

## 12. 部署与交付

- **构建产物**：纯静态文件 (HTML + JS + CSS + SW.js)，可部署至 GitHub Pages、Netlify、Vercel，或打包成 ZIP 供本地双击 `index.html` 打开。
- **环境变量**：无需，所有动态配置通过设置页面存于 IndexedDB。
- **版本与更新**：Service Worker 检测到新版本壳资源时，提示用户“新版本已就绪，点击刷新”，避免正在操作丢失。

---

## 附录 A：技术债务与未来演进考量

- **协作化**：当前单体架构若未来需多 PM 协同，可在 DAL 层下方引入 CRDT 同步层（如 Yjs），与 IndexedDB 并存，UI 无感。
- **跨设备同步**：无服务端，可通过 WebDAV 或本地文件系统 API 读取/写入 JSON 文件，依赖用户手动同步。
- **甘特图性能**：任务数 > 500 时，dhtmlx-gantt 可能出现性能瓶颈，届时可迁移至自研 Canvas 渲染器或使用虚拟滚动时间轴。

---

*本架构文档与产品设计文档 V1.4 同步生效，后续需求变更需同时更新两份文档。*