# PM Pilot — 单人项目驾驶舱

**PM Pilot** 是一款纯浏览器端的单人项目管理工具。不是另一个 Jira 或 Excel，而是一个聚焦风险、信任进度、极速操作的外置大脑。

所有数据存储在浏览器 IndexedDB 中，无服务端、无追踪、隐私绝对可控。

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

启动后浏览器打开 `http://localhost:5173/`，首次访问会显示隐私引导，点击「开始使用」进入驾驶舱。

## 技术栈

| 类别 | 技术 |
|:---|:---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router 7 |
| 状态管理 | Zustand |
| 数据层 | Dexie.js (IndexedDB) |
| 拖拽 | @dnd-kit |
| ID 生成 | nanoid |

## 功能概览

### 驾驶舱
打开即见风险。五大区域自上而下排列：
- **风险雷达** — 阻塞/逾期任务，阻塞超 48 小时自动置顶
- **今日必做** — 今日截止、已逾期的待办/进行中任务
- **项目健康度矩阵** — 红黄绿灯实时监控所有进行中项目
- **即将到来的里程碑** — 未来 14 天关键节点
- **最近完成** — 点击即可恢复为待办

### 项目全景
- 三态 Tab：进行中 / 休眠 / 归档
- 项目卡片：健康颜色条 + 防欺骗进度 + 阻塞计数
- Ctrl/Shift 多选 + 批量休眠/归档/删除

### 项目工作台
- **看板视图**：四列拖拽（待办 → 进行中 → 阻塞 → 完成），支持内联创建
- **甘特图视图**：时间轴 + 任务条 + 里程碑菱形 + 关键路径高亮
- **快速指令栏**：`/` 键聚焦，自然语言创建任务
  - 语法：`任务标题 #标签 @负责人 ~截止日期 !优先级`
- **任务详情**：侧边栏编辑，支持 Markdown 描述、标签、前置依赖管理

### 个人待办桌
- 跨项目聚合所有待办
- 筛选：全部 / 已逾期 / 今日 / 本周 / 阻塞中
- 快速勾选完成（带划掉动画）
- 专注模式（`Shift+F` / `ESC` 退出）

### 数据与档案
- **回收站** — 软删除恢复，到期自动清理
- **周报** — 一键生成 Markdown 并复制
- **复盘中心** — 延期档案 + 估算偏差分析
- **导入/导出** — 全量 JSON 备份

### 全局
- 深色/浅色/跟随系统 三主题
- `Ctrl+Z` / `Ctrl+Y` 撤销重做（20 步历史）
- 数据完全离线可用
- 首次使用隐私引导

## 健康度判定规则

| 信号 | 条件 |
|:---|:---|
| 🔴 红灯 | 存在逾期任务 或 关键路径上有阻塞任务 或 存在逾期里程碑 |
| 🟡 黄灯 | 存在非关键路径阻塞 或 关键路径完成率偏差 > 10% |
| 🟢 绿灯 | 无上述情况 |

## 防欺骗进度

当关键路径上存在阻塞任务时，进度条变为琥珀色条纹 + 🔒 图标，但百分比数字始终真实——绝不造假，风险高亮。

进度计算规则：已完成数 / 总任务数 × 100%（仅在关键路径阻塞时视觉锁定，数字不扭曲）。

## 项目结构

```
src/
├── main.tsx              # 入口
├── App.tsx               # 路由配置
├── index.css             # 全局样式
├── db/index.ts           # Dexie.js Schema（6张表）
├── store/
│   ├── uiStore.ts        # 主题、专注模式、Toast
│   └── dataStore.ts      # 数据 CRUD + 撤销栈
├── utils/
│   ├── health.ts         # 健康度判定 + 关键路径 CPM
│   ├── progress.ts       # 防欺骗进度计算
│   └── commands.ts       # Command Pattern 撤销/重做
├── components/
│   ├── AppShell.tsx       # 顶部导航
│   ├── TaskCard.tsx       # 任务卡片
│   ├── TaskDetail.tsx     # 任务详情侧边栏
│   ├── ProgressBar.tsx    # 进度条组件
│   ├── EmptyState.tsx     # 空状态
│   └── PrivacyIntro.tsx   # 隐私引导
└── pages/
    ├── Dashboard.tsx      # 驾驶舱
    ├── ProjectList.tsx    # 项目全景
    ├── ProjectWorkspace.tsx # 项目工作台
    ├── BoardView.tsx      # 看板视图
    ├── GanttView.tsx      # 甘特图视图
    ├── PersonalTasks.tsx  # 个人待办桌
    ├── DataArchive.tsx    # 数据与档案
    └── Settings.tsx       # 偏好设置
```

## 数据模型

| 表 | 说明 | 关键索引 |
|:---|:---|:---|
| `projects` | 项目（active/dormant/archived） | `status`, `createdAt` |
| `tasks` | 任务（todo/in_progress/blocked/done） | `projectId`, `[projectId+status]`, `dueDate` |
| `milestones` | 里程碑（pending/achieved） | `projectId`, `targetDate` |
| `changeLogs` | 通用变更记录 | `[entityType+entityId]`, `timestamp` |
| `settings` | 应用设置（单例） | `key` |
| `reports` | 周报历史（最近3次） | `generatedAt` |

## 浏览器兼容

支持所有现代浏览器（Chrome、Firefox、Safari、Edge），建议屏幕宽度 ≥ 1440px。

---

**PM Pilot V1.4** — 让 PM 的大脑从记忆进度中解放出来，专注于判断与决策。
