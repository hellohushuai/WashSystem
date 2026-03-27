# Dry Cleaning Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform (Windows + macOS) desktop management system for a single dry cleaning shop, covering orders, customers, finance, inventory, and garment rack management.

**Architecture:** Tauri 2.x desktop app with Vue 3 + TypeScript frontend, Element Plus UI, Pinia state management, and SQLite local database via tauri-plugin-sql. Rust backend handles DB operations. All data stored locally.

**Tech Stack:** Tauri 2.x, Vue 3, TypeScript, Element Plus, Pinia, SQLite, Vite

---

## File Structure

```
src-tauri/
  Cargo.toml                          # Rust dependencies (tauri, tauri-plugin-sql)
  tauri.conf.json                     # Tauri config (window, plugins)
  src/
    lib.rs                            # Tauri setup, plugin registration
    db.rs                             # Database initialization, migrations
src/
  main.ts                             # Vue app entry
  App.vue                             # Root component with layout
  router/
    index.ts                          # Vue Router setup (6 routes)
  stores/
    theme.ts                          # Theme state (Pinia)
    customers.ts                      # Customer + membership CRUD
    orders.ts                         # Order + order items CRUD, status logic
    finance.ts                        # Financial records CRUD, reports
    inventory.ts                      # Inventory CRUD
    rack.ts                           # Rack hooks CRUD, allocation logic
  db/
    index.ts                          # DB connection singleton, query helper
    schema.sql                        # All CREATE TABLE statements
  views/
    DashboardView.vue                 # Homepage: stats, pending orders, alerts
    OrderListView.vue                 # Order list with filters
    OrderDetailView.vue               # Single order: items, payment, status
    OrderCreateView.vue               # New order form
    CustomerListView.vue              # Customer list
    CustomerDetailView.vue            # Single customer: info, history
    MembershipSettingsView.vue        # Membership level CRUD
    FinanceView.vue                   # Ledger, manual entry, reports
    InventoryView.vue                 # Inventory list, in/out operations
    RackView.vue                      # Visual rack grid, settings
  components/
    AppLayout.vue                     # Sidebar + content area shell
    SidebarNav.vue                    # Collapsible sidebar navigation
    ThemeSwitcher.vue                 # Theme toggle (3 themes)
    OrderStatusBadge.vue              # Colored status tag
    StatsCard.vue                     # Dashboard stat card
    RackGrid.vue                      # Visual hook grid component
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: all project config files (package.json, Cargo.toml, tauri.conf.json, vite.config.ts, tsconfig.json)
- Create: `src/main.ts`, `src/App.vue`

- [ ] **Step 1: Create Tauri + Vue 3 project**

Run:
```bash
cd "/Users/hushuai/AI code/claude code/TestProject"
npm create tauri-app@latest . -- --template vue-ts --manager npm
```

Select defaults when prompted. This scaffolds the full project structure.

- [ ] **Step 2: Install frontend dependencies**

Run:
```bash
npm install element-plus pinia vue-router@4 @element-plus/icons-vue
npm install -D @types/node
```

- [ ] **Step 3: Add tauri-plugin-sql to Rust backend**

Edit `src-tauri/Cargo.toml` — add under `[dependencies]`:
```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

Run:
```bash
cd src-tauri && cargo update && cd ..
```

Also install the JS bindings:
```bash
npm install @tauri-apps/plugin-sql
```

- [ ] **Step 4: Register the SQL plugin in Tauri**

Replace `src-tauri/src/lib.rs` with:
```rust
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../../src/db/schema.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dry_cleaning.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Create the SQL schema file**

Create `src/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS membership_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discount REAL NOT NULL DEFAULT 1.0,
    points_threshold INTEGER NOT NULL DEFAULT 0,
    points_rate REAL NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    membership_level_id INTEGER REFERENCES membership_levels(id),
    points INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT '未开始',
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    completed_at TEXT,
    picked_up_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    garment_type TEXT NOT NULL,
    service_type TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    hook_no INTEGER,
    is_picked_up INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '其他',
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '个',
    min_quantity REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS financial_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT '其他',
    related_order_id INTEGER REFERENCES orders(id),
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS rack_hooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hook_no INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT '空闲',
    order_item_id INTEGER REFERENCES order_items(id)
);

CREATE TABLE IF NOT EXISTS rack_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_hooks INTEGER NOT NULL DEFAULT 100
);

-- Seed default data
INSERT OR IGNORE INTO rack_settings (id, total_hooks) VALUES (1, 100);

INSERT OR IGNORE INTO membership_levels (id, name, discount, points_threshold, points_rate, sort_order)
VALUES
    (1, '普通', 1.0, 0, 1.0, 0),
    (2, '银卡', 0.95, 500, 1.5, 1),
    (3, '金卡', 0.9, 2000, 2.0, 2);
```

- [ ] **Step 6: Seed rack hooks on first launch**

The 100 default hooks need to be inserted. Add to the bottom of `schema.sql`:
```sql
-- Generate 100 hooks (SQLite recursive CTE)
INSERT OR IGNORE INTO rack_hooks (hook_no, status)
WITH RECURSIVE cnt(x) AS (
    SELECT 1
    UNION ALL
    SELECT x+1 FROM cnt WHERE x < 100
)
SELECT x, '空闲' FROM cnt;
```

- [ ] **Step 7: Verify project builds**

Run:
```bash
npm run tauri dev
```
Expected: Tauri window opens showing the default Vue welcome page. Close the window.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri + Vue 3 project with SQLite schema"
```

---

### Task 2: Database Helper & Theme System

**Files:**
- Create: `src/db/index.ts`
- Create: `src/stores/theme.ts`
- Create: `src/components/ThemeSwitcher.vue`

- [ ] **Step 1: Create database connection helper**

Create `src/db/index.ts`:
```typescript
import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:dry_cleaning.db')
  }
  return db
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  bindValues?: unknown[]
): Promise<T[]> {
  const database = await getDb()
  return database.select<T[]>(sql, bindValues)
}

export async function execute(
  sql: string,
  bindValues?: unknown[]
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const database = await getDb()
  return database.execute(sql, bindValues)
}
```

- [ ] **Step 2: Create theme store**

Create `src/stores/theme.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeName = 'blue' | 'dark' | 'green'

const THEME_STORAGE_KEY = 'dc-theme'

export const useThemeStore = defineStore('theme', () => {
  const current = ref<ThemeName>(
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || 'blue'
  )

  function setTheme(theme: ThemeName) {
    current.value = theme
  }

  watch(current, (val) => {
    localStorage.setItem(THEME_STORAGE_KEY, val)
    document.documentElement.className = `theme-${val}`
  }, { immediate: true })

  return { current, setTheme }
})
```

- [ ] **Step 3: Create theme CSS variables**

Create `src/styles/themes.css`:
```css
:root,
.theme-blue {
  --sidebar-bg: #304156;
  --sidebar-hover: #3a4d63;
  --sidebar-active: #409eff;
  --content-bg: #f5f7fa;
  --card-bg: #ffffff;
  --text-primary: #303133;
  --text-secondary: #909399;
  --border-color: #e4e7ed;
  --primary-color: #409eff;
}

.theme-dark {
  --sidebar-bg: #141414;
  --sidebar-hover: #2a2a2b;
  --sidebar-active: #409eff;
  --content-bg: #1d1e1f;
  --card-bg: #2a2a2b;
  --text-primary: #cfd3dc;
  --text-secondary: #a3a6ad;
  --border-color: #414243;
  --primary-color: #409eff;
}

.theme-green {
  --sidebar-bg: #2b5a3d;
  --sidebar-hover: #3a6b4a;
  --sidebar-active: #67c23a;
  --content-bg: #f0f9eb;
  --card-bg: #ffffff;
  --text-primary: #303133;
  --text-secondary: #909399;
  --border-color: #e1f3d8;
  --primary-color: #67c23a;
}
```

- [ ] **Step 4: Create ThemeSwitcher component**

Create `src/components/ThemeSwitcher.vue`:
```vue
<script setup lang="ts">
import { useThemeStore, type ThemeName } from '@/stores/theme'

const themeStore = useThemeStore()

const themes: { name: ThemeName; label: string; color: string }[] = [
  { name: 'blue', label: '经典蓝', color: '#409eff' },
  { name: 'dark', label: '暗色', color: '#1d1e1f' },
  { name: 'green', label: '清新绿', color: '#67c23a' },
]
</script>

<template>
  <div class="theme-switcher">
    <div
      v-for="t in themes"
      :key="t.name"
      class="theme-dot"
      :class="{ active: themeStore.current === t.name }"
      :style="{ backgroundColor: t.color }"
      :title="t.label"
      @click="themeStore.setTheme(t.name)"
    />
  </div>
</template>

<style scoped>
.theme-switcher {
  display: flex;
  gap: 8px;
  padding: 8px;
  justify-content: center;
}
.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.theme-dot.active {
  border-color: #fff;
}
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/db/index.ts src/stores/theme.ts src/styles/themes.css src/components/ThemeSwitcher.vue
git commit -m "feat: add database helper and theme system with 3 themes"
```

---

### Task 3: App Layout & Router

**Files:**
- Create: `src/components/AppLayout.vue`
- Create: `src/components/SidebarNav.vue`
- Create: `src/router/index.ts`
- Modify: `src/main.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Create router**

Create `src/router/index.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '仪表盘' } },
    { path: '/orders', name: 'orders', component: () => import('@/views/OrderListView.vue'), meta: { title: '订单管理' } },
    { path: '/orders/create', name: 'order-create', component: () => import('@/views/OrderCreateView.vue'), meta: { title: '新建订单' } },
    { path: '/orders/:id', name: 'order-detail', component: () => import('@/views/OrderDetailView.vue'), meta: { title: '订单详情' } },
    { path: '/customers', name: 'customers', component: () => import('@/views/CustomerListView.vue'), meta: { title: '客户管理' } },
    { path: '/customers/:id', name: 'customer-detail', component: () => import('@/views/CustomerDetailView.vue'), meta: { title: '客户详情' } },
    { path: '/customers/membership', name: 'membership', component: () => import('@/views/MembershipSettingsView.vue'), meta: { title: '会员等级设置' } },
    { path: '/finance', name: 'finance', component: () => import('@/views/FinanceView.vue'), meta: { title: '财务管理' } },
    { path: '/inventory', name: 'inventory', component: () => import('@/views/InventoryView.vue'), meta: { title: '库存管理' } },
    { path: '/rack', name: 'rack', component: () => import('@/views/RackView.vue'), meta: { title: '货架管理' } },
  ],
})

export default router
```

- [ ] **Step 2: Create SidebarNav component**

Create `src/components/SidebarNav.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Odometer, Document, User, Money, Box, Grid,
} from '@element-plus/icons-vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

const route = useRoute()
const collapsed = ref(false)

const menuItems = [
  { path: '/', icon: Odometer, label: '仪表盘' },
  { path: '/orders', icon: Document, label: '订单管理' },
  { path: '/customers', icon: User, label: '客户管理' },
  { path: '/finance', icon: Money, label: '财务管理' },
  { path: '/inventory', icon: Box, label: '库存管理' },
  { path: '/rack', icon: Grid, label: '货架管理' },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function toggle() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span v-if="!collapsed" class="logo-text">洁衣管家</span>
      <span v-else class="logo-icon">洁</span>
    </div>

    <nav class="sidebar-menu">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="{ active: isActive(item.path) }"
      >
        <el-icon :size="20"><component :is="item.icon" /></el-icon>
        <span v-if="!collapsed" class="menu-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <ThemeSwitcher v-if="!collapsed" />
      <div class="collapse-btn" @click="toggle">
        <el-icon :size="16">
          <component :is="collapsed ? 'DArrowRight' : 'DArrowLeft'" />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 200px;
  height: 100vh;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-header {
  padding: 16px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo-icon {
  font-size: 20px;
}
.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.menu-item:hover {
  background: var(--sidebar-hover);
  color: #fff;
}
.menu-item.active {
  background: var(--sidebar-active);
  color: #fff;
}
.sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 10px;
}
.menu-label {
  white-space: nowrap;
}
.sidebar-footer {
  padding: 8px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.collapse-btn {
  display: flex;
  justify-content: center;
  padding: 8px;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
}
.collapse-btn:hover {
  color: #fff;
}
</style>
```

- [ ] **Step 3: Create AppLayout component**

Create `src/components/AppLayout.vue`:
```vue
<script setup lang="ts">
import SidebarNav from './SidebarNav.vue'
</script>

<template>
  <div class="app-layout">
    <SidebarNav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.main-content {
  flex: 1;
  background: var(--content-bg);
  overflow-y: auto;
  padding: 20px;
}
</style>
```

- [ ] **Step 4: Update main.ts**

Replace `src/main.ts` with:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './styles/themes.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
```

- [ ] **Step 5: Update App.vue**

Replace `src/App.vue` with:
```vue
<script setup lang="ts">
import AppLayout from './components/AppLayout.vue'
</script>

<template>
  <AppLayout />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
  background: var(--content-bg);
}
</style>
```

- [ ] **Step 6: Create placeholder views**

Create stub views for all 10 pages so the router works. Each one follows this pattern.

Create `src/views/DashboardView.vue`:
```vue
<template>
  <div><h2>仪表盘</h2></div>
</template>
```

Create `src/views/OrderListView.vue`:
```vue
<template>
  <div><h2>订单列表</h2></div>
</template>
```

Create `src/views/OrderCreateView.vue`:
```vue
<template>
  <div><h2>新建订单</h2></div>
</template>
```

Create `src/views/OrderDetailView.vue`:
```vue
<template>
  <div><h2>订单详情</h2></div>
</template>
```

Create `src/views/CustomerListView.vue`:
```vue
<template>
  <div><h2>客户列表</h2></div>
</template>
```

Create `src/views/CustomerDetailView.vue`:
```vue
<template>
  <div><h2>客户详情</h2></div>
</template>
```

Create `src/views/MembershipSettingsView.vue`:
```vue
<template>
  <div><h2>会员等级设置</h2></div>
</template>
```

Create `src/views/FinanceView.vue`:
```vue
<template>
  <div><h2>财务管理</h2></div>
</template>
```

Create `src/views/InventoryView.vue`:
```vue
<template>
  <div><h2>库存管理</h2></div>
</template>
```

Create `src/views/RackView.vue`:
```vue
<template>
  <div><h2>货架管理</h2></div>
</template>
```

- [ ] **Step 7: Verify layout renders**

Run:
```bash
npm run tauri dev
```
Expected: Window shows sidebar with 6 nav items. Clicking each navigates to the placeholder view. Sidebar collapses/expands. Theme switcher changes colors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add app layout with collapsible sidebar, router, and placeholder views"
```

---

### Task 4: Customer & Membership Stores

**Files:**
- Create: `src/stores/customers.ts`

- [ ] **Step 1: Create customers store**

Create `src/stores/customers.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

export interface MembershipLevel {
  id: number
  name: string
  discount: number
  points_threshold: number
  points_rate: number
  sort_order: number
}

export interface Customer {
  id: number
  name: string
  phone: string
  membership_level_id: number | null
  points: number
  notes: string
  created_at: string
  // joined from membership_levels
  level_name?: string
  discount?: number
}

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const levels = ref<MembershipLevel[]>([])

  async function loadLevels() {
    levels.value = await query<MembershipLevel>(
      'SELECT * FROM membership_levels ORDER BY sort_order'
    )
  }

  async function createLevel(level: Omit<MembershipLevel, 'id'>) {
    const result = await execute(
      'INSERT INTO membership_levels (name, discount, points_threshold, points_rate, sort_order) VALUES (?, ?, ?, ?, ?)',
      [level.name, level.discount, level.points_threshold, level.points_rate, level.sort_order]
    )
    await loadLevels()
    return result.lastInsertId
  }

  async function updateLevel(id: number, level: Partial<MembershipLevel>) {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, val] of Object.entries(level)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    values.push(id)
    await execute(`UPDATE membership_levels SET ${fields.join(', ')} WHERE id = ?`, values)
    await loadLevels()
  }

  async function deleteLevel(id: number) {
    await execute('UPDATE customers SET membership_level_id = NULL WHERE membership_level_id = ?', [id])
    await execute('DELETE FROM membership_levels WHERE id = ?', [id])
    await loadLevels()
  }

  async function loadCustomers(search?: string) {
    let sql = `
      SELECT c.*, m.name as level_name, m.discount
      FROM customers c
      LEFT JOIN membership_levels m ON c.membership_level_id = m.id
    `
    const params: unknown[] = []
    if (search) {
      sql += ' WHERE c.name LIKE ? OR c.phone LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }
    sql += ' ORDER BY c.created_at DESC'
    customers.value = await query<Customer>(sql, params)
  }

  async function getCustomer(id: number): Promise<Customer | undefined> {
    const rows = await query<Customer>(
      `SELECT c.*, m.name as level_name, m.discount
       FROM customers c
       LEFT JOIN membership_levels m ON c.membership_level_id = m.id
       WHERE c.id = ?`,
      [id]
    )
    return rows[0]
  }

  async function createCustomer(c: { name: string; phone: string; membership_level_id?: number; notes?: string }) {
    const result = await execute(
      'INSERT INTO customers (name, phone, membership_level_id, notes) VALUES (?, ?, ?, ?)',
      [c.name, c.phone, c.membership_level_id ?? null, c.notes ?? '']
    )
    return result.lastInsertId
  }

  async function updateCustomer(id: number, c: Partial<Customer>) {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, val] of Object.entries(c)) {
      if (!['id', 'created_at', 'level_name', 'discount'].includes(key)) {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    values.push(id)
    await execute(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  async function addPoints(customerId: number, points: number) {
    await execute('UPDATE customers SET points = points + ? WHERE id = ?', [points, customerId])
  }

  return {
    customers, levels,
    loadLevels, createLevel, updateLevel, deleteLevel,
    loadCustomers, getCustomer, createCustomer, updateCustomer, addPoints,
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/customers.ts
git commit -m "feat: add customer and membership level store with CRUD"
```

---

### Task 5: Rack Store

**Files:**
- Create: `src/stores/rack.ts`

- [ ] **Step 1: Create rack store**

Create `src/stores/rack.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

export interface RackHook {
  id: number
  hook_no: number
  status: string
  order_item_id: number | null
  // joined fields
  garment_type?: string
  customer_name?: string
  order_no?: string
  order_id?: number
}

export const useRackStore = defineStore('rack', () => {
  const hooks = ref<RackHook[]>([])
  const totalHooks = ref(100)

  async function loadHooks() {
    hooks.value = await query<RackHook>(`
      SELECT rh.*, oi.garment_type, c.name as customer_name, o.order_no, o.id as order_id
      FROM rack_hooks rh
      LEFT JOIN order_items oi ON rh.order_item_id = oi.id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY rh.hook_no
    `)
  }

  async function loadSettings() {
    const rows = await query<{ total_hooks: number }>('SELECT total_hooks FROM rack_settings WHERE id = 1')
    if (rows.length > 0) {
      totalHooks.value = rows[0].total_hooks
    }
  }

  async function allocateHook(orderItemId: number): Promise<number | null> {
    const free = await query<{ hook_no: number }>(
      "SELECT hook_no FROM rack_hooks WHERE status = '空闲' ORDER BY hook_no LIMIT 1"
    )
    if (free.length === 0) return null
    const hookNo = free[0].hook_no
    await execute(
      "UPDATE rack_hooks SET status = '占用', order_item_id = ? WHERE hook_no = ?",
      [orderItemId, hookNo]
    )
    return hookNo
  }

  async function releaseHook(hookNo: number) {
    await execute(
      "UPDATE rack_hooks SET status = '空闲', order_item_id = NULL WHERE hook_no = ?",
      [hookNo]
    )
  }

  async function setTotalHooks(newTotal: number) {
    const currentMax = await query<{ max_no: number }>(
      'SELECT COALESCE(MAX(hook_no), 0) as max_no FROM rack_hooks'
    )
    const maxNo = currentMax[0].max_no

    if (newTotal > maxNo) {
      // Add new hooks
      for (let i = maxNo + 1; i <= newTotal; i++) {
        await execute(
          "INSERT OR IGNORE INTO rack_hooks (hook_no, status) VALUES (?, '空闲')",
          [i]
        )
      }
    } else if (newTotal < maxNo) {
      // Only remove free hooks from the end
      const occupied = await query<{ hook_no: number }>(
        "SELECT hook_no FROM rack_hooks WHERE hook_no > ? AND status = '占用'",
        [newTotal]
      )
      if (occupied.length > 0) {
        throw new Error(`无法缩减：挂钩 ${occupied.map(h => h.hook_no).join(', ')} 正在使用中`)
      }
      await execute('DELETE FROM rack_hooks WHERE hook_no > ?', [newTotal])
    }

    await execute('UPDATE rack_settings SET total_hooks = ? WHERE id = 1', [newTotal])
    totalHooks.value = newTotal
    await loadHooks()
  }

  async function getFreeCount(): Promise<number> {
    const rows = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM rack_hooks WHERE status = '空闲'"
    )
    return rows[0].cnt
  }

  return {
    hooks, totalHooks,
    loadHooks, loadSettings, allocateHook, releaseHook, setTotalHooks, getFreeCount,
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/rack.ts
git commit -m "feat: add rack store with hook allocation and release"
```

---

### Task 6: Order Store

**Files:**
- Create: `src/stores/orders.ts`

- [ ] **Step 1: Create orders store**

Create `src/stores/orders.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'
import { useRackStore } from './rack'
import { useCustomerStore } from './customers'

export interface Order {
  id: number
  order_no: string
  customer_id: number
  status: string
  total_amount: number
  paid_amount: number
  payment_method: string
  notes: string
  created_at: string
  completed_at: string | null
  picked_up_at: string | null
  // joined
  customer_name?: string
  customer_phone?: string
  item_count?: number
}

export interface OrderItem {
  id: number
  order_id: number
  garment_type: string
  service_type: string
  price: number
  hook_no: number | null
  is_picked_up: number
  notes: string
}

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])

  async function generateOrderNo(): Promise<string> {
    const today = new Date()
    const dateStr = today.getFullYear().toString()
      + String(today.getMonth() + 1).padStart(2, '0')
      + String(today.getDate()).padStart(2, '0')
    const prefix = `DC${dateStr}`
    const rows = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM orders WHERE order_no LIKE ?",
      [`${prefix}%`]
    )
    const seq = String(rows[0].cnt + 1).padStart(3, '0')
    return `${prefix}${seq}`
  }

  async function loadOrders(filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    let sql = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (filters?.status) {
      sql += ' AND o.status = ?'
      params.push(filters.status)
    }
    if (filters?.search) {
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR o.order_no LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.dateFrom) {
      sql += ' AND o.created_at >= ?'
      params.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      sql += ' AND o.created_at <= ?'
      params.push(filters.dateTo + ' 23:59:59')
    }
    sql += ' ORDER BY o.created_at DESC'
    orders.value = await query<Order>(sql, params)
  }

  async function getOrder(id: number): Promise<Order | undefined> {
    const rows = await query<Order>(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    )
    return rows[0]
  }

  async function getOrderItems(orderId: number): Promise<OrderItem[]> {
    return query<OrderItem>('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [orderId])
  }

  async function createOrder(
    customerId: number,
    items: { garment_type: string; service_type: string; price: number; notes?: string }[],
    notes?: string
  ): Promise<number> {
    const rackStore = useRackStore()
    const customerStore = useCustomerStore()

    // Check free hooks
    const freeCount = await rackStore.getFreeCount()
    if (freeCount < items.length) {
      throw new Error(`挂钩不足：需要 ${items.length} 个，当前空闲 ${freeCount} 个`)
    }

    const orderNo = await generateOrderNo()

    // Get customer discount
    const customer = await customerStore.getCustomer(customerId)
    const discount = customer?.discount ?? 1.0

    const totalAmount = items.reduce((sum, item) => sum + item.price, 0) * discount

    const result = await execute(
      `INSERT INTO orders (order_no, customer_id, status, total_amount, notes)
       VALUES (?, ?, '未开始', ?, ?)`,
      [orderNo, customerId, totalAmount, notes ?? '']
    )
    const orderId = result.lastInsertId

    // Create items and allocate hooks
    for (const item of items) {
      const itemResult = await execute(
        'INSERT INTO order_items (order_id, garment_type, service_type, price, notes) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.garment_type, item.service_type, item.price * discount, item.notes ?? '']
      )
      const hookNo = await rackStore.allocateHook(itemResult.lastInsertId)
      if (hookNo !== null) {
        await execute('UPDATE order_items SET hook_no = ? WHERE id = ?', [hookNo, itemResult.lastInsertId])
      }
    }

    // Add points to customer
    if (customer) {
      const pointsRate = customer.discount !== undefined
        ? (await query<{ points_rate: number }>(
            'SELECT points_rate FROM membership_levels WHERE id = ?',
            [customer.membership_level_id]
          ))[0]?.points_rate ?? 1.0
        : 1.0
      const points = Math.floor(totalAmount * pointsRate)
      await customerStore.addPoints(customerId, points)
    }

    return orderId
  }

  async function updateStatus(orderId: number, newStatus: string) {
    const now = "datetime('now', 'localtime')"

    if (newStatus === '已结束') {
      // Verify: all items picked up AND fully paid
      const items = await getOrderItems(orderId)
      const allPickedUp = items.every(i => i.is_picked_up === 1)
      if (!allPickedUp) {
        throw new Error('还有衣物未取走，无法结束订单')
      }
      const order = await getOrder(orderId)
      if (order && order.paid_amount < order.total_amount) {
        throw new Error('尚未付清全部费用，无法结束订单')
      }
      await execute(
        `UPDATE orders SET status = ?, picked_up_at = datetime('now', 'localtime') WHERE id = ?`,
        [newStatus, orderId]
      )
    } else if (newStatus === '已付款') {
      const order = await getOrder(orderId)
      if (order) {
        await execute(
          `UPDATE orders SET status = ?, paid_amount = ?, completed_at = datetime('now', 'localtime') WHERE id = ?`,
          [newStatus, order.total_amount, orderId]
        )
      }
    } else {
      await execute('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId])
    }
  }

  async function recordPayment(orderId: number, amount: number, method: string) {
    await execute(
      'UPDATE orders SET paid_amount = paid_amount + ?, payment_method = ? WHERE id = ?',
      [amount, method, orderId]
    )
    // Auto-create financial record
    await execute(
      "INSERT INTO financial_records (type, amount, category, related_order_id, description) VALUES ('收入', ?, '订单收入', ?, ?)",
      [amount, orderId, `订单收款`]
    )
  }

  async function pickUpItem(itemId: number) {
    const rackStore = useRackStore()
    const items = await query<OrderItem>('SELECT * FROM order_items WHERE id = ?', [itemId])
    if (items.length === 0) return

    const item = items[0]
    await execute('UPDATE order_items SET is_picked_up = 1 WHERE id = ?', [itemId])

    // Release hook
    if (item.hook_no !== null) {
      await rackStore.releaseHook(item.hook_no)
    }
  }

  async function getTodayStats(): Promise<{ orderCount: number; income: number }> {
    const today = new Date().toISOString().split('T')[0]
    const orderRows = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ?",
      [today]
    )
    const incomeRows = await query<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = '收入' AND date(created_at) = ?",
      [today]
    )
    return {
      orderCount: orderRows[0].cnt,
      income: incomeRows[0].total,
    }
  }

  return {
    orders,
    loadOrders, getOrder, getOrderItems, createOrder,
    updateStatus, recordPayment, pickUpItem, getTodayStats,
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/orders.ts
git commit -m "feat: add order store with status flow, hook allocation, and payment"
```

---

### Task 7: Finance & Inventory Stores

**Files:**
- Create: `src/stores/finance.ts`
- Create: `src/stores/inventory.ts`

- [ ] **Step 1: Create finance store**

Create `src/stores/finance.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

export interface FinancialRecord {
  id: number
  type: string
  amount: number
  category: string
  related_order_id: number | null
  description: string
  created_at: string
}

export interface DailyReport {
  date: string
  income: number
  expense: number
  order_count: number
}

export const useFinanceStore = defineStore('finance', () => {
  const records = ref<FinancialRecord[]>([])

  async function loadRecords(filters?: { dateFrom?: string; dateTo?: string; type?: string }) {
    let sql = 'SELECT * FROM financial_records WHERE 1=1'
    const params: unknown[] = []

    if (filters?.type) {
      sql += ' AND type = ?'
      params.push(filters.type)
    }
    if (filters?.dateFrom) {
      sql += ' AND created_at >= ?'
      params.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      sql += ' AND created_at <= ?'
      params.push(filters.dateTo + ' 23:59:59')
    }
    sql += ' ORDER BY created_at DESC'
    records.value = await query<FinancialRecord>(sql, params)
  }

  async function addRecord(record: { type: string; amount: number; category: string; description: string }) {
    await execute(
      'INSERT INTO financial_records (type, amount, category, description) VALUES (?, ?, ?, ?)',
      [record.type, record.amount, record.category, record.description]
    )
    await loadRecords()
  }

  async function getDailyReport(date: string): Promise<DailyReport> {
    const incomeRows = await query<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = '收入' AND date(created_at) = ?",
      [date]
    )
    const expenseRows = await query<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = '支出' AND date(created_at) = ?",
      [date]
    )
    const orderRows = await query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ?',
      [date]
    )
    return {
      date,
      income: incomeRows[0].total,
      expense: expenseRows[0].total,
      order_count: orderRows[0].cnt,
    }
  }

  async function getMonthlyReport(year: number, month: number): Promise<DailyReport[]> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    return query<DailyReport>(`
      SELECT
        date(created_at) as date,
        SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END) as expense,
        0 as order_count
      FROM financial_records
      WHERE strftime('%Y-%m', created_at) = ?
      GROUP BY date(created_at)
      ORDER BY date
    `, [monthStr])
  }

  return { records, loadRecords, addRecord, getDailyReport, getMonthlyReport }
})
```

- [ ] **Step 2: Create inventory store**

Create `src/stores/inventory.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

export interface InventoryItem {
  id: number
  name: string
  category: string
  quantity: number
  unit: string
  min_quantity: number
  updated_at: string
}

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<InventoryItem[]>([])

  async function loadItems() {
    items.value = await query<InventoryItem>('SELECT * FROM inventory ORDER BY category, name')
  }

  async function createItem(item: { name: string; category: string; quantity: number; unit: string; min_quantity: number }) {
    await execute(
      'INSERT INTO inventory (name, category, quantity, unit, min_quantity) VALUES (?, ?, ?, ?, ?)',
      [item.name, item.category, item.quantity, item.unit, item.min_quantity]
    )
    await loadItems()
  }

  async function updateItem(id: number, item: Partial<InventoryItem>) {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, val] of Object.entries(item)) {
      if (!['id', 'updated_at'].includes(key)) {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    fields.push("updated_at = datetime('now', 'localtime')")
    values.push(id)
    await execute(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, values)
    await loadItems()
  }

  async function adjustQuantity(id: number, delta: number, reason: string) {
    await execute(
      "UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [delta, id]
    )
    // If it's a purchase (positive delta), record as expense
    if (delta > 0 && reason) {
      // No auto financial record for inventory — user adds manually via finance
    }
    await loadItems()
  }

  async function deleteItem(id: number) {
    await execute('DELETE FROM inventory WHERE id = ?', [id])
    await loadItems()
  }

  async function getLowStockItems(): Promise<InventoryItem[]> {
    return query<InventoryItem>('SELECT * FROM inventory WHERE quantity <= min_quantity ORDER BY name')
  }

  return { items, loadItems, createItem, updateItem, adjustQuantity, deleteItem, getLowStockItems }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/finance.ts src/stores/inventory.ts
git commit -m "feat: add finance and inventory stores"
```

---

### Task 8: Dashboard View

**Files:**
- Modify: `src/views/DashboardView.vue`
- Create: `src/components/StatsCard.vue`

- [ ] **Step 1: Create StatsCard component**

Create `src/components/StatsCard.vue`:
```vue
<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  color?: string
}>()
</script>

<template>
  <el-card shadow="hover" class="stats-card">
    <div class="stats-value" :style="{ color: color || 'var(--primary-color)' }">{{ value }}</div>
    <div class="stats-title">{{ title }}</div>
  </el-card>
</template>

<style scoped>
.stats-card {
  text-align: center;
  background: var(--card-bg);
  border-color: var(--border-color);
}
.stats-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 4px;
}
.stats-title {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 2: Implement DashboardView**

Replace `src/views/DashboardView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StatsCard from '@/components/StatsCard.vue'
import { useOrderStore, type Order } from '@/stores/orders'
import { useRackStore } from '@/stores/rack'
import { useInventoryStore, type InventoryItem } from '@/stores/inventory'

const router = useRouter()
const orderStore = useOrderStore()
const rackStore = useRackStore()
const inventoryStore = useInventoryStore()

const todayOrders = ref(0)
const todayIncome = ref(0)
const freeHooks = ref(0)
const pendingOrders = ref<Order[]>([])
const lowStockItems = ref<InventoryItem[]>([])

onMounted(async () => {
  const stats = await orderStore.getTodayStats()
  todayOrders.value = stats.orderCount
  todayIncome.value = stats.income
  freeHooks.value = await rackStore.getFreeCount()

  await orderStore.loadOrders({ status: '未开始' })
  pendingOrders.value = orderStore.orders.slice(0, 10)

  lowStockItems.value = await inventoryStore.getLowStockItems()
})
</script>

<template>
  <div class="dashboard">
    <h2>仪表盘</h2>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="8">
        <StatsCard title="今日订单" :value="todayOrders" color="#409eff" />
      </el-col>
      <el-col :span="8">
        <StatsCard title="今日收入" :value="'¥' + todayIncome.toFixed(2)" color="#67c23a" />
      </el-col>
      <el-col :span="8">
        <StatsCard title="空闲挂钩" :value="freeHooks" color="#e6a23c" />
      </el-col>
    </el-row>

    <el-card shadow="hover" style="margin-top: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>待处理订单</span>
          <el-button type="primary" size="small" @click="router.push('/orders/create')">新建订单</el-button>
        </div>
      </template>
      <el-table :data="pendingOrders" stripe style="width: 100%" empty-text="暂无待处理订单">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="customer_name" label="客户" width="120" />
        <el-table-column prop="item_count" label="衣物数" width="80" />
        <el-table-column prop="total_amount" label="金额" width="100">
          <template #default="{ row }">¥{{ row.total_amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="router.push(`/orders/${row.id}`)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card
      v-if="lowStockItems.length > 0"
      shadow="hover"
      style="margin-top: 16px; background: var(--card-bg); border-color: var(--border-color);"
    >
      <template #header>
        <span style="color: #f56c6c;">库存不足预警</span>
      </template>
      <el-table :data="lowStockItems" stripe style="width: 100%">
        <el-table-column prop="name" label="物品" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="当前/最低" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c;">{{ row.quantity }}</span> / {{ row.min_quantity }} {{ row.unit }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
```

- [ ] **Step 3: Verify dashboard renders**

Run:
```bash
npm run tauri dev
```
Expected: Dashboard shows 3 stat cards (all zeros), empty pending orders table, no low stock alert. New order button navigates to /orders/create.

- [ ] **Step 4: Commit**

```bash
git add src/views/DashboardView.vue src/components/StatsCard.vue
git commit -m "feat: implement dashboard with stats, pending orders, and stock alerts"
```

---

### Task 9: Customer Management Views

**Files:**
- Modify: `src/views/CustomerListView.vue`
- Modify: `src/views/CustomerDetailView.vue`
- Modify: `src/views/MembershipSettingsView.vue`

- [ ] **Step 1: Implement CustomerListView**

Replace `src/views/CustomerListView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const store = useCustomerStore()
const search = ref('')
const showAddDialog = ref(false)
const form = ref({ name: '', phone: '', membership_level_id: undefined as number | undefined, notes: '' })

onMounted(async () => {
  await store.loadLevels()
  await store.loadCustomers()
})

async function handleSearch() {
  await store.loadCustomers(search.value || undefined)
}

async function handleAdd() {
  if (!form.value.name || !form.value.phone) {
    ElMessage.warning('请填写姓名和手机号')
    return
  }
  try {
    await store.createCustomer(form.value)
    ElMessage.success('客户添加成功')
    showAddDialog.value = false
    form.value = { name: '', phone: '', membership_level_id: undefined, notes: '' }
    await store.loadCustomers()
  } catch (e: any) {
    ElMessage.error(e.message || '添加失败')
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>客户管理</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="router.push('/customers/membership')">会员等级设置</el-button>
        <el-button type="primary" @click="showAddDialog = true">添加客户</el-button>
      </div>
    </div>

    <el-input
      v-model="search"
      placeholder="搜索姓名或手机号"
      clearable
      style="margin-bottom: 16px; max-width: 300px;"
      @input="handleSearch"
      @clear="handleSearch"
    />

    <el-table :data="store.customers" stripe style="width: 100%; background: var(--card-bg);" empty-text="暂无客户">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="level_name" label="会员等级" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.level_name" size="small">{{ row.level_name }}</el-tag>
          <span v-else style="color: var(--text-secondary);">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="100" />
      <el-table-column prop="created_at" label="注册时间" />
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="router.push(`/customers/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showAddDialog" title="添加客户" width="420px">
      <el-form label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="客户姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="form.membership_level_id" placeholder="选择等级" clearable>
            <el-option v-for="l in store.levels" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

- [ ] **Step 2: Implement CustomerDetailView**

Replace `src/views/CustomerDetailView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore, type Customer } from '@/stores/customers'
import { useOrderStore, type Order } from '@/stores/orders'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const orderStore = useOrderStore()

const customer = ref<Customer | null>(null)
const orders = ref<Order[]>([])
const editing = ref(false)
const form = ref({ name: '', phone: '', membership_level_id: undefined as number | undefined, notes: '' })

onMounted(async () => {
  await customerStore.loadLevels()
  const id = Number(route.params.id)
  const c = await customerStore.getCustomer(id)
  if (c) {
    customer.value = c
    form.value = { name: c.name, phone: c.phone, membership_level_id: c.membership_level_id ?? undefined, notes: c.notes }
  }
  await orderStore.loadOrders({ search: c?.phone })
  orders.value = orderStore.orders
})

async function handleSave() {
  if (!customer.value) return
  try {
    await customerStore.updateCustomer(customer.value.id, form.value)
    customer.value = await customerStore.getCustomer(customer.value.id) ?? null
    editing.value = false
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}
</script>

<template>
  <div v-if="customer">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>客户详情</h2>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>基本信息</span>
          <el-button v-if="!editing" size="small" @click="editing = true">编辑</el-button>
        </div>
      </template>
      <el-form v-if="editing" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="form.membership_level_id" clearable>
            <el-option v-for="l in customerStore.levels" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" /></el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存</el-button>
          <el-button @click="editing = false">取消</el-button>
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="2" border>
        <el-descriptions-item label="姓名">{{ customer.name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ customer.phone }}</el-descriptions-item>
        <el-descriptions-item label="会员等级">{{ customer.level_name || '无' }}</el-descriptions-item>
        <el-descriptions-item label="积分">{{ customer.points }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ customer.created_at }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ customer.notes || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="hover" style="background: var(--card-bg); border-color: var(--border-color);">
      <template #header>历史订单</template>
      <el-table :data="orders" stripe empty-text="暂无订单">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="total_amount" label="金额" width="100">
          <template #default="{ row }">¥{{ row.total_amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="router.push(`/orders/${row.id}`)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
```

- [ ] **Step 3: Implement MembershipSettingsView**

Replace `src/views/MembershipSettingsView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore, type MembershipLevel } from '@/stores/customers'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const store = useCustomerStore()
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ name: '', discount: 1.0, points_threshold: 0, points_rate: 1.0, sort_order: 0 })

onMounted(() => store.loadLevels())

function openAdd() {
  editingId.value = null
  form.value = { name: '', discount: 1.0, points_threshold: 0, points_rate: 1.0, sort_order: 0 }
  showDialog.value = true
}

function openEdit(level: MembershipLevel) {
  editingId.value = level.id
  form.value = { name: level.name, discount: level.discount, points_threshold: level.points_threshold, points_rate: level.points_rate, sort_order: level.sort_order }
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请填写等级名称')
    return
  }
  if (editingId.value) {
    await store.updateLevel(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await store.createLevel(form.value)
    ElMessage.success('添加成功')
  }
  showDialog.value = false
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('删除此等级后，关联的客户将变为无等级。确认删除？', '确认')
  await store.deleteLevel(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>会员等级设置</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="router.back()">返回</el-button>
        <el-button type="primary" @click="openAdd">添加等级</el-button>
      </div>
    </div>

    <el-table :data="store.levels" stripe style="width: 100%; background: var(--card-bg);" empty-text="暂无等级">
      <el-table-column prop="name" label="等级名称" width="120" />
      <el-table-column prop="discount" label="折扣" width="100">
        <template #default="{ row }">{{ (row.discount * 10).toFixed(1) }}折</template>
      </el-table-column>
      <el-table-column prop="points_threshold" label="升级积分" width="120" />
      <el-table-column prop="points_rate" label="积分倍率" width="120">
        <template #default="{ row }">×{{ row.points_rate }}</template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingId ? '编辑等级' : '添加等级'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="折扣">
          <el-input-number v-model="form.discount" :min="0.1" :max="1.0" :step="0.05" :precision="2" />
          <span style="margin-left: 8px; color: var(--text-secondary);">{{ (form.discount * 10).toFixed(1) }}折</span>
        </el-form-item>
        <el-form-item label="升级积分"><el-input-number v-model="form.points_threshold" :min="0" /></el-form-item>
        <el-form-item label="积分倍率"><el-input-number v-model="form.points_rate" :min="0.1" :step="0.5" :precision="1" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

- [ ] **Step 4: Verify customer management works**

Run:
```bash
npm run tauri dev
```
Expected: Navigate to customer management. See 3 default membership levels. Can add a customer, view details, edit info. Membership settings page allows CRUD on levels.

- [ ] **Step 5: Commit**

```bash
git add src/views/CustomerListView.vue src/views/CustomerDetailView.vue src/views/MembershipSettingsView.vue
git commit -m "feat: implement customer management and membership settings views"
```

---

### Task 10: Order Management Views

**Files:**
- Modify: `src/views/OrderListView.vue`
- Modify: `src/views/OrderCreateView.vue`
- Modify: `src/views/OrderDetailView.vue`
- Create: `src/components/OrderStatusBadge.vue`

- [ ] **Step 1: Create OrderStatusBadge component**

Create `src/components/OrderStatusBadge.vue`:
```vue
<script setup lang="ts">
defineProps<{ status: string }>()

const typeMap: Record<string, string> = {
  '未开始': 'info',
  '进行中': 'warning',
  '已付款': 'success',
  '已结束': '',
}
</script>

<template>
  <el-tag :type="(typeMap[status] as any) || 'info'" size="small">{{ status }}</el-tag>
</template>
```

- [ ] **Step 2: Implement OrderListView**

Replace `src/views/OrderListView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'

const router = useRouter()
const store = useOrderStore()
const statusFilter = ref('')
const search = ref('')

const statuses = ['', '未开始', '进行中', '已付款', '已结束']

onMounted(() => store.loadOrders())

async function handleFilter() {
  await store.loadOrders({
    status: statusFilter.value || undefined,
    search: search.value || undefined,
  })
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>订单管理</h2>
      <el-button type="primary" @click="router.push('/orders/create')">新建订单</el-button>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 140px;" @change="handleFilter">
        <el-option v-for="s in statuses" :key="s" :label="s || '全部'" :value="s" />
      </el-select>
      <el-input v-model="search" placeholder="搜索订单号/客户" clearable style="max-width: 250px;" @input="handleFilter" @clear="handleFilter" />
    </div>

    <el-table :data="store.orders" stripe style="width: 100%; background: var(--card-bg);" empty-text="暂无订单">
      <el-table-column prop="order_no" label="订单号" width="180" />
      <el-table-column prop="customer_name" label="客户" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }"><OrderStatusBadge :status="row.status" /></template>
      </el-table-column>
      <el-table-column prop="item_count" label="衣物数" width="80" />
      <el-table-column prop="total_amount" label="金额" width="100">
        <template #default="{ row }">¥{{ row.total_amount.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="下单时间" />
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="router.push(`/orders/${row.id}`)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
```

- [ ] **Step 3: Implement OrderCreateView**

Replace `src/views/OrderCreateView.vue` with:
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'
import { useOrderStore } from '@/stores/orders'
import { useRackStore } from '@/stores/rack'
import { ElMessage } from 'element-plus'

const router = useRouter()
const customerStore = useCustomerStore()
const orderStore = useOrderStore()
const rackStore = useRackStore()

const customerId = ref<number | undefined>()
const notes = ref('')
const items = ref<{ garment_type: string; service_type: string; price: number; notes: string }[]>([])
const freeHooks = ref(0)

const garmentTypes = ['衬衫', '外套', '裤子', '裙子', '大衣', '羽绒服', '西装', '其他']
const serviceTypes = ['普洗', '干洗', '去渍', '熨烫']

onMounted(async () => {
  await customerStore.loadCustomers()
  await customerStore.loadLevels()
  freeHooks.value = await rackStore.getFreeCount()
})

function addItem() {
  items.value.push({ garment_type: '衬衫', service_type: '普洗', price: 0, notes: '' })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

const selectedCustomer = computed(() => {
  return customerStore.customers.find(c => c.id === customerId.value)
})

const discount = computed(() => selectedCustomer.value?.discount ?? 1.0)

const totalBeforeDiscount = computed(() => items.value.reduce((s, i) => s + i.price, 0))
const totalAfterDiscount = computed(() => totalBeforeDiscount.value * discount.value)

async function handleSubmit() {
  if (!customerId.value) {
    ElMessage.warning('请选择客户')
    return
  }
  if (items.value.length === 0) {
    ElMessage.warning('请添加衣物')
    return
  }
  if (items.value.some(i => i.price <= 0)) {
    ElMessage.warning('请填写正确的价格')
    return
  }
  try {
    const orderId = await orderStore.createOrder(customerId.value, items.value, notes.value)
    ElMessage.success('订单创建成功')
    router.push(`/orders/${orderId}`)
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败')
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>新建订单</h2>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <el-form label-width="80px">
        <el-form-item label="客户">
          <el-select v-model="customerId" filterable placeholder="搜索客户" style="width: 300px;">
            <el-option
              v-for="c in customerStore.customers"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
          </el-select>
          <span v-if="discount < 1" style="margin-left: 12px; color: #67c23a;">
            会员折扣: {{ (discount * 10).toFixed(1) }}折
          </span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="notes" type="textarea" placeholder="订单备注（可选）" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>衣物明细（空闲挂钩: {{ freeHooks }}）</span>
          <el-button type="primary" size="small" @click="addItem">添加衣物</el-button>
        </div>
      </template>

      <div v-if="items.length === 0" style="text-align: center; color: var(--text-secondary); padding: 20px;">
        请点击"添加衣物"按钮
      </div>

      <div v-for="(item, index) in items" :key="index" style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
        <el-select v-model="item.garment_type" placeholder="衣物类型" style="width: 120px;">
          <el-option v-for="t in garmentTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="item.service_type" placeholder="服务类型" style="width: 100px;">
          <el-option v-for="t in serviceTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-input-number v-model="item.price" :min="0" :precision="2" placeholder="单价" style="width: 140px;" />
        <el-input v-model="item.notes" placeholder="备注" style="width: 150px;" />
        <el-button type="danger" link @click="removeItem(index)">删除</el-button>
      </div>
    </el-card>

    <el-card shadow="hover" style="background: var(--card-bg); border-color: var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span>衣物件数: {{ items.length }}</span>
          <span v-if="discount < 1" style="margin-left: 16px;">原价: ¥{{ totalBeforeDiscount.toFixed(2) }}</span>
          <span style="margin-left: 16px; font-size: 18px; font-weight: bold; color: var(--primary-color);">
            合计: ¥{{ totalAfterDiscount.toFixed(2) }}
          </span>
        </div>
        <el-button type="primary" size="large" @click="handleSubmit">提交订单</el-button>
      </div>
    </el-card>
  </div>
</template>
```

- [ ] **Step 4: Implement OrderDetailView**

Replace `src/views/OrderDetailView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore, type Order, type OrderItem } from '@/stores/orders'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useOrderStore()

const order = ref<Order | null>(null)
const items = ref<OrderItem[]>([])
const payAmount = ref(0)
const payMethod = ref('现金')

const allPickedUp = computed(() => items.value.every(i => i.is_picked_up === 1))
const fullyPaid = computed(() => order.value ? order.value.paid_amount >= order.value.total_amount : false)

async function reload() {
  const id = Number(route.params.id)
  order.value = (await store.getOrder(id)) ?? null
  items.value = await store.getOrderItems(id)
  if (order.value) {
    payAmount.value = Math.max(0, order.value.total_amount - order.value.paid_amount)
  }
}

onMounted(reload)

const nextStatus = computed(() => {
  if (!order.value) return null
  const map: Record<string, string> = {
    '未开始': '进行中',
    '进行中': '已付款',
    '已付款': '已结束',
  }
  return map[order.value.status] ?? null
})

async function handleStatusChange() {
  if (!order.value || !nextStatus.value) return
  try {
    await store.updateStatus(order.value.id, nextStatus.value)
    ElMessage.success(`订单已更新为"${nextStatus.value}"`)
    await reload()
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

async function handlePickUp(itemId: number) {
  await store.pickUpItem(itemId)
  ElMessage.success('已标记取衣')
  await reload()
}

async function handlePayment() {
  if (!order.value || payAmount.value <= 0) return
  await store.recordPayment(order.value.id, payAmount.value, payMethod.value)
  ElMessage.success('收款成功')
  await reload()
}
</script>

<template>
  <div v-if="order">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>订单详情 - {{ order.order_no }}</h2>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单号">{{ order.order_no }}</el-descriptions-item>
        <el-descriptions-item label="状态"><OrderStatusBadge :status="order.status" /></el-descriptions-item>
        <el-descriptions-item label="客户">{{ order.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ order.customer_phone }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ order.total_amount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="已付">¥{{ order.paid_amount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ order.created_at }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ order.notes || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 16px; display: flex; gap: 12px; align-items: center;">
        <el-button
          v-if="nextStatus && order.status !== '已结束'"
          type="primary"
          @click="handleStatusChange"
        >
          更新为"{{ nextStatus }}"
        </el-button>

        <template v-if="!fullyPaid && order.status !== '已结束'">
          <el-input-number v-model="payAmount" :min="0.01" :precision="2" style="width: 140px;" />
          <el-select v-model="payMethod" style="width: 100px;">
            <el-option label="现金" value="现金" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="其他" value="其他" />
          </el-select>
          <el-button type="success" @click="handlePayment">收款</el-button>
        </template>
      </div>
    </el-card>

    <el-card shadow="hover" style="background: var(--card-bg); border-color: var(--border-color);">
      <template #header>衣物明细</template>
      <el-table :data="items" stripe>
        <el-table-column prop="garment_type" label="衣物类型" width="120" />
        <el-table-column prop="service_type" label="服务类型" width="100" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="hook_no" label="挂钩号" width="80">
          <template #default="{ row }">
            <span v-if="row.hook_no">{{ row.hook_no }}</span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column label="取衣状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.is_picked_up" type="success" size="small">已取</el-tag>
            <el-button
              v-else
              type="warning"
              size="small"
              @click="handlePickUp(row.id)"
            >标记取衣</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" />
      </el-table>
    </el-card>
  </div>
</template>
```

- [ ] **Step 5: Verify order flow works end-to-end**

Run:
```bash
npm run tauri dev
```
Expected: Create a customer, create an order with items, see hooks allocated. Navigate order through status flow. Pick up items. Record payment. Close order when both conditions met.

- [ ] **Step 6: Commit**

```bash
git add src/views/OrderListView.vue src/views/OrderCreateView.vue src/views/OrderDetailView.vue src/components/OrderStatusBadge.vue
git commit -m "feat: implement order management with create, detail, status flow, and pickup"
```

---

### Task 11: Finance View

**Files:**
- Modify: `src/views/FinanceView.vue`

- [ ] **Step 1: Implement FinanceView**

Replace `src/views/FinanceView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFinanceStore, type DailyReport } from '@/stores/finance'
import { ElMessage } from 'element-plus'

const store = useFinanceStore()
const activeTab = ref('ledger')
const dateRange = ref<[string, string] | null>(null)
const typeFilter = ref('')

// Add record form
const showAddDialog = ref(false)
const form = ref({ type: '支出', amount: 0, category: '其他', description: '' })
const expenseCategories = ['耗材采购', '水电费', '房租', '其他']

// Reports
const dailyDate = ref(new Date().toISOString().split('T')[0])
const dailyReport = ref<DailyReport | null>(null)
const monthYear = ref(new Date().getFullYear())
const monthMonth = ref(new Date().getMonth() + 1)
const monthlyData = ref<DailyReport[]>([])

onMounted(() => store.loadRecords())

async function handleFilter() {
  await store.loadRecords({
    type: typeFilter.value || undefined,
    dateFrom: dateRange.value?.[0],
    dateTo: dateRange.value?.[1],
  })
}

async function handleAddRecord() {
  if (form.value.amount <= 0) {
    ElMessage.warning('请填写金额')
    return
  }
  await store.addRecord(form.value)
  ElMessage.success('记录添加成功')
  showAddDialog.value = false
  form.value = { type: '支出', amount: 0, category: '其他', description: '' }
}

async function loadDailyReport() {
  dailyReport.value = await store.getDailyReport(dailyDate.value)
}

async function loadMonthlyReport() {
  monthlyData.value = await store.getMonthlyReport(monthYear.value, monthMonth.value)
}
</script>

<template>
  <div>
    <h2 style="margin-bottom: 16px;">财务管理</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="收支流水" name="ledger">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-select v-model="typeFilter" placeholder="类型" clearable style="width: 100px;" @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="收入" value="收入" />
            <el-option label="支出" value="支出" />
          </el-select>
          <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="handleFilter" />
          <el-button type="primary" @click="showAddDialog = true">手动记账</el-button>
        </div>

        <el-table :data="store.records" stripe style="background: var(--card-bg);" empty-text="暂无记录">
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === '收入' ? 'success' : 'danger'" size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">
              <span :style="{ color: row.type === '收入' ? '#67c23a' : '#f56c6c' }">
                {{ row.type === '收入' ? '+' : '-' }}¥{{ row.amount.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="created_at" label="时间" width="180" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="日结报表" name="daily">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-date-picker v-model="dailyDate" type="date" value-format="YYYY-MM-DD" />
          <el-button type="primary" @click="loadDailyReport">查询</el-button>
        </div>
        <el-descriptions v-if="dailyReport" :column="3" border>
          <el-descriptions-item label="日期">{{ dailyReport.date }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ dailyReport.order_count }}</el-descriptions-item>
          <el-descriptions-item label="收入">
            <span style="color: #67c23a;">¥{{ dailyReport.income.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="支出">
            <span style="color: #f56c6c;">¥{{ dailyReport.expense.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="利润">
            <span style="font-weight: bold;">¥{{ (dailyReport.income - dailyReport.expense).toFixed(2) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="月报表" name="monthly">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-input-number v-model="monthYear" :min="2020" :max="2099" />
          <el-select v-model="monthMonth" style="width: 80px;">
            <el-option v-for="m in 12" :key="m" :label="`${m}月`" :value="m" />
          </el-select>
          <el-button type="primary" @click="loadMonthlyReport">查询</el-button>
        </div>
        <el-table :data="monthlyData" stripe show-summary :summary-method="({ data }) => {
          const income = data.reduce((s, r) => s + r.income, 0)
          const expense = data.reduce((s, r) => s + r.expense, 0)
          return ['合计', '¥' + income.toFixed(2), '¥' + expense.toFixed(2), '¥' + (income - expense).toFixed(2)]
        }" empty-text="暂无数据">
          <el-table-column prop="date" label="日期" />
          <el-table-column prop="income" label="收入">
            <template #default="{ row }">¥{{ row.income.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="expense" label="支出">
            <template #default="{ row }">¥{{ row.expense.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="利润">
            <template #default="{ row }">¥{{ (row.income - row.expense).toFixed(2) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showAddDialog" title="手动记账" width="420px">
      <el-form label-width="60px">
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="收入">收入</el-radio>
            <el-radio value="支出">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="c in expenseCategories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddRecord">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/FinanceView.vue
git commit -m "feat: implement finance view with ledger, daily and monthly reports"
```

---

### Task 12: Inventory View

**Files:**
- Modify: `src/views/InventoryView.vue`

- [ ] **Step 1: Implement InventoryView**

Replace `src/views/InventoryView.vue` with:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useInventoryStore, type InventoryItem } from '@/stores/inventory'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useInventoryStore()
const showDialog = ref(false)
const showAdjustDialog = ref(false)
const editingId = ref<number | null>(null)
const adjustId = ref<number | null>(null)
const form = ref({ name: '', category: '洗涤剂', quantity: 0, unit: '瓶', min_quantity: 0 })
const adjustForm = ref({ delta: 0, reason: '' })

const categories = ['洗涤剂', '包装材料', '其他']

onMounted(() => store.loadItems())

function openAdd() {
  editingId.value = null
  form.value = { name: '', category: '洗涤剂', quantity: 0, unit: '瓶', min_quantity: 0 }
  showDialog.value = true
}

function openEdit(item: InventoryItem) {
  editingId.value = item.id
  form.value = { name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, min_quantity: item.min_quantity }
  showDialog.value = true
}

function openAdjust(item: InventoryItem) {
  adjustId.value = item.id
  adjustForm.value = { delta: 0, reason: '' }
  showAdjustDialog.value = true
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请填写物品名称')
    return
  }
  if (editingId.value) {
    await store.updateItem(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await store.createItem(form.value)
    ElMessage.success('添加成功')
  }
  showDialog.value = false
}

async function handleAdjust() {
  if (!adjustId.value || adjustForm.value.delta === 0) return
  await store.adjustQuantity(adjustId.value, adjustForm.value.delta, adjustForm.value.reason)
  ElMessage.success(adjustForm.value.delta > 0 ? '入库成功' : '出库成功')
  showAdjustDialog.value = false
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确认删除此库存物品？', '确认')
  await store.deleteItem(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>库存管理</h2>
      <el-button type="primary" @click="openAdd">添加物品</el-button>
    </div>

    <el-table :data="store.items" stripe style="background: var(--card-bg);" empty-text="暂无库存">
      <el-table-column prop="name" label="物品名称" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column label="库存量" width="140">
        <template #default="{ row }">
          <span :style="{ color: row.quantity <= row.min_quantity ? '#f56c6c' : 'inherit', fontWeight: row.quantity <= row.min_quantity ? 'bold' : 'normal' }">
            {{ row.quantity }} {{ row.unit }}
          </span>
          <el-tag v-if="row.quantity <= row.min_quantity" type="danger" size="small" style="margin-left: 4px;">不足</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="min_quantity" label="最低库存" width="100">
        <template #default="{ row }">{{ row.min_quantity }} {{ row.unit }}</template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openAdjust(row)">出入库</el-button>
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingId ? '编辑物品' : '添加物品'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始库存"><el-input-number v-model="form.quantity" :min="0" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="form.unit" style="width: 100px;" /></el-form-item>
        <el-form-item label="最低库存"><el-input-number v-model="form.min_quantity" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAdjustDialog" title="出入库操作" width="380px">
      <el-form label-width="60px">
        <el-form-item label="数量">
          <el-input-number v-model="adjustForm.delta" />
          <span style="margin-left: 8px; color: var(--text-secondary);">正数入库，负数出库</span>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="adjustForm.reason" placeholder="出入库原因（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdjustDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdjust">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/InventoryView.vue
git commit -m "feat: implement inventory management with CRUD and stock adjustment"
```

---

### Task 13: Rack View

**Files:**
- Modify: `src/views/RackView.vue`
- Create: `src/components/RackGrid.vue`

- [ ] **Step 1: Create RackGrid component**

Create `src/components/RackGrid.vue`:
```vue
<script setup lang="ts">
import type { RackHook } from '@/stores/rack'

defineProps<{ hooks: RackHook[] }>()
defineEmits<{ (e: 'click-hook', hook: RackHook): void }>()
</script>

<template>
  <div class="rack-grid">
    <div
      v-for="hook in hooks"
      :key="hook.hook_no"
      class="hook"
      :class="{ occupied: hook.status === '占用' }"
      :title="hook.status === '占用' ? `${hook.garment_type} - ${hook.customer_name}` : '空闲'"
      @click="$emit('click-hook', hook)"
    >
      <div class="hook-no">{{ hook.hook_no }}</div>
      <div v-if="hook.status === '占用'" class="hook-info">
        <div class="hook-garment">{{ hook.garment_type }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.hook {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  cursor: pointer;
  background: var(--card-bg);
  transition: all 0.2s;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.hook:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.hook.occupied {
  background: #fef0f0;
  border-color: #f56c6c;
}
.hook-no {
  font-weight: bold;
  font-size: 16px;
  color: var(--text-primary);
}
.hook.occupied .hook-no {
  color: #f56c6c;
}
.hook-info {
  margin-top: 2px;
}
.hook-garment {
  font-size: 10px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60px;
}
</style>
```

- [ ] **Step 2: Implement RackView**

Replace `src/views/RackView.vue` with:
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRackStore, type RackHook } from '@/stores/rack'
import RackGrid from '@/components/RackGrid.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const store = useRackStore()
const newTotal = ref(100)

const freeCount = computed(() => store.hooks.filter(h => h.status === '空闲').length)
const occupiedCount = computed(() => store.hooks.filter(h => h.status === '占用').length)

onMounted(async () => {
  await store.loadSettings()
  await store.loadHooks()
  newTotal.value = store.totalHooks
})

function handleHookClick(hook: RackHook) {
  if (hook.status === '占用' && hook.order_id) {
    router.push(`/orders/${hook.order_id}`)
  }
}

async function handleResize() {
  if (newTotal.value < 1) {
    ElMessage.warning('至少需要1个挂钩')
    return
  }
  try {
    await store.setTotalHooks(newTotal.value)
    ElMessage.success(`挂钩总数已调整为 ${newTotal.value}`)
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>货架管理</h2>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="color: var(--text-secondary);">
          空闲: <b style="color: #67c23a;">{{ freeCount }}</b> |
          占用: <b style="color: #f56c6c;">{{ occupiedCount }}</b> |
          总计: <b>{{ store.hooks.length }}</b>
        </span>
      </div>
    </div>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>挂钩设置</template>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span>挂钩总数:</span>
        <el-input-number v-model="newTotal" :min="1" :max="999" />
        <el-button type="primary" @click="handleResize">调整</el-button>
        <span style="color: var(--text-secondary); font-size: 12px;">（只能删除空闲挂钩）</span>
      </div>
    </el-card>

    <el-card shadow="hover" style="background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <span>挂钩状态（点击占用的挂钩可跳转到订单）</span>
      </template>
      <RackGrid :hooks="store.hooks" @click-hook="handleHookClick" />
    </el-card>
  </div>
</template>
```

- [ ] **Step 3: Verify rack view works**

Run:
```bash
npm run tauri dev
```
Expected: Rack page shows 100 hooks in a grid. All green/empty. After creating an order, hooks turn red/occupied. Clicking occupied hook navigates to order. Adjust total hooks works.

- [ ] **Step 4: Commit**

```bash
git add src/views/RackView.vue src/components/RackGrid.vue
git commit -m "feat: implement rack management with visual grid and hook settings"
```

---

### Task 14: Dark Theme Integration with Element Plus

**Files:**
- Modify: `src/stores/theme.ts`
- Modify: `src/styles/themes.css`

- [ ] **Step 1: Add Element Plus dark mode toggle**

Edit `src/stores/theme.ts` — update the `watch` to toggle Element Plus dark class:
```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeName = 'blue' | 'dark' | 'green'

const THEME_STORAGE_KEY = 'dc-theme'

export const useThemeStore = defineStore('theme', () => {
  const current = ref<ThemeName>(
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || 'blue'
  )

  function setTheme(theme: ThemeName) {
    current.value = theme
  }

  watch(current, (val) => {
    localStorage.setItem(THEME_STORAGE_KEY, val)
    const html = document.documentElement
    html.className = `theme-${val}`
    if (val === 'dark') {
      html.classList.add('dark')
    }
  }, { immediate: true })

  return { current, setTheme }
})
```

- [ ] **Step 2: Import Element Plus dark CSS**

Edit `src/main.ts` — add the dark CSS import after the main Element Plus import:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/themes.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
```

- [ ] **Step 3: Verify all 3 themes work**

Run:
```bash
npm run tauri dev
```
Expected: Switching themes changes sidebar color, content background, and Element Plus component styling. Dark mode properly darkens all components.

- [ ] **Step 4: Commit**

```bash
git add src/stores/theme.ts src/main.ts
git commit -m "feat: integrate Element Plus dark mode with theme system"
```

---

### Task 15: Configure Vite Path Alias & Final Polish

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Add path alias to Vite config**

Edit `vite.config.ts` to add the `@` alias:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  clearScreen: false,
  server: {
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari15'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
```

- [ ] **Step 2: Add path alias to tsconfig**

Edit `tsconfig.json` — add under `compilerOptions`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Merge this with whatever the scaffolded tsconfig already has — do not overwrite other settings.

- [ ] **Step 3: Full build test**

Run:
```bash
npm run tauri build
```
Expected: Builds successfully. Produces a `.dmg` (macOS) or `.msi` (Windows) installer in `src-tauri/target/release/bundle/`.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts tsconfig.json
git commit -m "feat: configure path aliases and finalize build settings"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Orders: create, list, filter, detail, status flow (Task 6, 10)
- [x] Customers: CRUD, search, detail with history (Task 4, 9)
- [x] Membership levels: CRUD, discount, points (Task 4, 9)
- [x] Finance: ledger, manual entry, daily/monthly reports (Task 7, 11)
- [x] Inventory: CRUD, in/out, low stock alerts (Task 7, 12)
- [x] Rack: visual grid, allocation, release, settings (Task 5, 13)
- [x] Dashboard: stats, pending orders, stock alerts (Task 8)
- [x] Collapsible sidebar (Task 3)
- [x] 3 themes with switcher (Task 2, 14)
- [x] SQLite local storage (Task 1)
- [x] Chinese UI (Task 3 — Element Plus zh-cn locale)

**Placeholder scan:** No TBD/TODO found.

**Type consistency:** `RackHook`, `Order`, `OrderItem`, `Customer`, `MembershipLevel`, `InventoryItem`, `FinancialRecord` — all used consistently across stores and views.
