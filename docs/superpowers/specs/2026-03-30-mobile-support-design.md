# 干洗店管理系统 - 移动端支持设计方案

## 概述

在现有桌面端基础上添加移动端支持，实现数据云同步和多平台使用。采用单代码库策略，Tauri 2.x 一套代码支持桌面端和 Android 移动端。

**目标：**
- 数据存储从本地 SQLite 迁移到 Supabase 云数据库
- 添加管理员登录认证功能
- 支持 Android 移动端安装包

**目标用户：**
- 桌面端：店主/收银员，在店内使用
- 移动端：店员外出接单、店内快速操作

---

## 技术架构

### 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 移动框架 | Tauri 2.x | 桌面/移动端统一代码库 |
| 前端 | Vue 3 + TypeScript | 组合式 API |
| UI 组件库 | Element Plus | 移动端使用响应式布局 |
| 云数据库 | Supabase | PostgreSQL + 实时同步 |
| 认证 | Supabase Auth | 邮箱/密码登录 |

### 系统架构图

```
┌─────────────────────────────────────────────┐
│                 Supabase                     │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ 数据库   │  │  认证    │  │  实时同步    │ │
│  │(PostgreSQL)│ │  Auth   │  │ (Realtime)  │ │
│  └─────────┘  └──────────┘  └─────────────┘ │
└──────────┬──────────┬──────────┬────────────┘
           │          │          │
    ┌──────┴───┐ ┌───┴────┐ ┌───┴─────┐
    │ 桌面端    │ │ Android │ │  iOS   │
    │ Windows  │ │  App   │ │  App   │
    │ macOS   │ │        │ │        │
    └──────────┘ └────────┘ └─────────┘
```

---

## 数据模型

### 现有表（迁移到 Supabase）

保持原有表结构不变，迁移到 Supabase PostgreSQL：

- `customers` - 客户表
- `membership_levels` - 会员等级表
- `orders` - 订单表
- `order_items` - 订单明细表
- `inventory` - 库存表
- `financial_records` - 财务流水表
- `recharge_records` - 充值记录表
- `purchase_records` - 采购记录表
- `garment_types` - 衣物类型表
- `service_types` - 服务类型表
- `rack_hooks` - 货架挂钩表

### 新增表

#### administrators（管理员表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | Supabase Auth 用户 ID |
| email | TEXT | 邮箱（登录账号） |
| name | TEXT | 显示名称 |
| role | TEXT | admin / staff |
| created_at | TIMESTAMP | 创建时间 |

> 注：实际使用 Supabase Auth 内置用户表，此表仅存储扩展信息。

---

## 功能设计

### 1. 登录功能

**流程：**
1. 打开应用 → 显示登录页面
2. 输入邮箱/密码
3. Supabase Auth 验证
4. 登录成功 → 进入首页

**页面：**
- 登录页：`/login`
- 首页（仪表盘）：`/`

**权限：**
- 所有登录用户为管理员，完整权限
- 后续可扩展员工角色

### 2. 数据层改造

**改造点：**
- 移除 `tauri-plugin-sql`
- 安装 `@supabase/supabase-js`
- 创建 `src/lib/supabase.ts` 客户端
- stores 层改为调用 Supabase

**数据操作示例：**

```typescript
// 原有 SQLite
const customers = await query('SELECT * FROM customers')

// 改为 Supabase
const { data: customers, error } = await supabase.from('customers').select('*')
```

### 3. 移动端适配

**UI 适配：**
- 侧边栏改为底部导航栏
- 表格列减少，响应式布局
- 触摸优化（按钮尺寸 ≥ 44px）

**功能裁剪（移动端）：**
- 仪表盘：简化显示
- 订单管理：创建/查看/付款
- 客户管理：查看/新增

**保留桌面端完整功能：**
- 财务管理
- 库存管理
- 货架管理
- 基础数据管理

### 4. 构建配置

**Android 构建：**
- 目标 SDK：34
- 最小 SDK：23
- 输出：`.apk` 安装包

**iOS 构建（预留）：**
- 目标版本：13.0
- 输出：`.ipa` 安装包

---

## 实施步骤

### 第一阶段：数据库迁移

1. 创建 Supabase 项目
2. 初始化数据库表结构
3. 配置 RLS 策略
4. 导入初始数据（如有）

### 第二阶段：代码改造

1. 安装 Supabase SDK
2. 创建 Supabase 客户端
3. 改造 stores 层
4. 添加登录页面

### 第三阶段：移动端适配

1. 响应式布局适配
2. 底部导航栏实现
3. Android 构建配置

### 第四阶段：测试发布

1. 本地测试
2. 构建 Android APK
3. GitHub Actions 自动化构建

---

## 文件改动清单

| 文件 | 改动说明 |
|------|---------|
| `src/lib/supabase.ts` | 新增：Supabase 客户端 |
| `src/stores/*.ts` | 改造：数据操作改为 Supabase |
| `src/views/LoginView.vue` | 新增：登录页面 |
| `src/App.vue` | 改造：添加路由守卫 |
| `src/router/index.ts` | 改造：添加登录路由 |
| `src/components/SidebarNav.vue` | 改造：移动端适配 |
| `src-tauri/tauri.conf.json` | 改造：添加 Android 配置 |
| `.env.example` | 新增：环境变量示例 |
| `README.md` | 更新：技术文档 |

---

## 待确认事项

- [ ] Supabase 项目由用户提供（或协助创建）
- [ ] 确认移动端功能范围（订单+客户）
- [ ] 是否需要保留离线能力（后续功能）

---

## 风险与限制

1. **网络依赖** - 需要联网使用，无网络时无法操作
2. **离线支持** - 首版不包含离线功能，后续可添加
3. **iOS 构建** - 需要 macOS + Xcode，当前 Windows CI 无法构建

---

## 附录：Supabase 简介

**官网：** https://supabase.com

**免费额度：**
- 500MB 数据库
- 10,000 月活跃用户
- 实时订阅 100 并发

**适合场景：**
- 小型干洗店（客户 < 10000）
- 日均订单 < 100
