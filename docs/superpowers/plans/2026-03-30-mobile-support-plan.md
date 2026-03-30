# 移动端支持实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将干洗店管理系统从本地 SQLite 迁移到 Supabase 云数据库，添加登录功能，支持 Android 移动端

**Architecture:** 单代码库策略，替换数据层为 Supabase，UI 层响应式适配移动端

**Tech Stack:** Tauri 2.x + Vue 3 + Supabase + Element Plus

---

## 文件结构

```
src/
├── lib/
│   └── supabase.ts          # 新增：Supabase 客户端
├── views/
│   └── LoginView.vue        # 新增：登录页面
├── router/
│   └── index.ts             # 修改：添加登录路由
├── App.vue                  # 修改：添加认证守卫
├── stores/
│   ├── customers.ts         # 修改：Supabase 替代 SQLite
│   ├── orders.ts            # 修改：Supabase 替代 SQLite
│   ├── inventory.ts         # 修改：Supabase 替代 SQLite
│   ├── finance.ts           # 修改：Supabase 替代 SQLite
│   ├── rack.ts              # 修改：Supabase 替代 SQLite
│   └── types.ts             # 修改：Supabase 替代 SQLite
├── db/
│   └── schema.sql           # 保留：数据库结构参考
.env.example                 # 新增：环境变量示例
```

---

## Task 1: 创建 Supabase 客户端

**Files:**
- Create: `src/lib/supabase.ts`
- Reference: `docs/superpowers/specs/2026-03-30-mobile-support-design.md`

- [ ] **Step 1: 安装 Supabase SDK**

```bash
cd /Users/hushuai/AI code/claude code/TestProject/.worktrees/implementation
npm install @supabase/supabase-js
```

- [ ] **Step 2: 创建环境变量示例文件**

Create: `.env.example`
```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- [ ] **Step 3: 创建 Supabase 客户端**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 认证相关函数
export const auth = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}
```

- [ ] **Step 4: 提交代码**

```bash
git add src/lib/supabase.ts .env.example
git commit -m "feat: 添加 Supabase 客户端

- 安装 @supabase/supabase-js
- 创建 supabase.ts 客户端
- 添加 .env.example 环境变量示例"
```

---

## Task 2: 修改 customers store 适配 Supabase

**Files:**
- Modify: `src/stores/customers.ts:1-50`
- Reference: `src/stores/customers.ts`

- [ ] **Step 1: 查看现有 store 结构**

```bash
head -100 /Users/hushuai/AI code/claude code/TestProject/.worktrees/implementation/src/stores/customers.ts
```

- [ ] **Step 2: 修改 imports 和初始化**

```typescript
// src/stores/customers.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface Customer {
  id: number
  name: string
  phone: string
  membership_level_id: number | null
  level_name?: string
  discount?: number
  points: number
  balance?: number
  notes: string
  created_at: string
}

// ... existing code until loadCustomers function
```

- [ ] **Step 3: 修改 loadCustomers 函数**

替换原有的 `query()` 调用为 Supabase：

```typescript
// 原有
const result = await query<Customer[]>('SELECT c.*, m.name as level_name, m.discount FROM customers c LEFT JOIN membership_levels m ON c.membership_level_id = m.id ORDER BY c.created_at DESC')

// 改为
const { data: customers, error } = await supabase
  .from('customers')
  .select(`
    *,
    membership_levels (name, discount)
  `)
  .order('created_at', { ascending: false })

if (error) throw error

return customers?.map(c => ({
  ...c,
  level_name: c.membership_levels?.name,
  discount: c.membership_levels?.discount,
})) || []
```

- [ ] **Step 4: 修改 createCustomer 函数**

```typescript
async function createCustomer(customer: { name: string; phone: string; membership_level_id?: number; notes?: string }) {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single()

  if (error) throw error
  return data
}
```

- [ ] **Step 5: 修改其他 CRUD 函数**

- `updateCustomer` - 使用 `supabase.from('customers').update().eq()`
- `deleteCustomer` - 使用 `supabase.from('customers').delete().eq()`
- `getCustomer` - 使用 `supabase.from('customers').select().eq().single()`
- `addPoints` - 更新 points 字段
- `addBalance` / `useBalance` - 更新 balance 字段

- [ ] **Step 6: 提交代码**

```bash
git add src/stores/customers.ts
git commit -m "refactor: customers store 适配 Supabase"
```

---

## Task 3: 修改 orders store 适配 Supabase

**Files:**
- Modify: `src/stores/orders.ts`
- Reference: `src/stores/orders.ts`

- [ ] **Step 1: 修改 imports**

```typescript
// src/stores/orders.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
// ... 其他 imports
```

- [ ] **Step 2: 修改 loadOrders 函数**

```typescript
async function loadOrders(filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customers (name, phone)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo + ' 23:59:59')
  }

  const { data: orders, error } = await query
  if (error) throw error

  return orders?.map(o => ({
    ...o,
    customer_name: o.customers?.name,
    customer_phone: o.customers?.phone,
  })) || []
}
```

- [ ] **Step 3: 修改 createOrder, getOrder, getOrderItems 等函数**

- [ ] **Step 4: 修改 recordPayment, updateStatus 等写入函数**

- [ ] **Step 5: 提交代码**

```bash
git add src/stores/orders.ts
git commit -m "refactor: orders store 适配 Supabase"
```

---

## Task 4: 修改其他 stores 适配 Supabase

**Files:**
- Modify: `src/stores/inventory.ts`
- Modify: `src/stores/finance.ts`
- Modify: `src/stores/rack.ts`
- Modify: `src/stores/types.ts`

- [ ] **Step 1: 修改 inventory store**

- [ ] **Step 2: 修改 finance store**

- [ ] **Step 3: 修改 rack store**

- [ ] **Step 4: 修改 types store**

- [ ] **Step 5: 提交代码**

```bash
git add src/stores/inventory.ts src/stores/finance.ts src/stores/rack.ts src/stores/types.ts
git commit -m "refactor: 其他 stores 适配 Supabase"
```

---

## Task 5: 创建登录页面

**Files:**
- Create: `src/views/LoginView.vue`
- Create: `src/router/guards.ts`

- [ ] **Step 1: 创建登录页面**

```vue
<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/lib/supabase'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const form = ref({
  email: '',
  password: '',
})

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    ElMessage.warning('请输入邮箱和密码')
    return
  }

  loading.value = true
  try {
    const { data, error } = await auth.signIn(form.value.email, form.value.password)
    if (error) throw error
    router.push('/')
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>干洗店管理系统</h2>
      </template>
      <el-form @submit.prevent="handleLogin">
        <el-form-item label="邮箱">
          <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%;">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--bg-color, #f5f7fa);
}
.login-card {
  width: 400px;
}
</style>
```

- [ ] **Step 2: 添加路由**

```typescript
// src/router/index.ts 添加
{
  path: '/login',
  name: 'Login',
  component: () => import('@/views/LoginView.vue'),
},
```

- [ ] **Step 3: 添加认证守卫**

```typescript
// src/router/guards.ts
import { auth } from '@/lib/supabase'

export async function requireAuth() {
  const { session, error } = await auth.getSession()
  if (!session) {
    return false
  }
  return true
}
```

- [ ] **Step 4: 修改 App.vue 添加认证检查**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/lib/supabase'

const router = useRouter()
const loading = ref(true)

onMounted(async () => {
  const { session } = await auth.getSession()
  if (!session && router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
  loading.value = false
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <router-view v-else />
</template>
```

- [ ] **Step 5: 提交代码**

```bash
git add src/views/LoginView.vue src/router/index.ts src/App.vue
git commit -m "feat: 添加登录页面和认证"
```

---

## Task 6: 移动端适配

**Files:**
- Modify: `src/components/SidebarNav.vue`
- Modify: `src/views/DashboardView.vue`
- Modify: `src/views/OrderListView.vue`
- Modify: `src/views/CustomerListView.vue`

- [ ] **Step 1: 创建移动端底部导航栏**

```vue
<!-- src/components/MobileNav.vue -->
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/', icon: 'HomeFilled', label: '首页' },
  { path: '/orders', icon: 'List', label: '订单' },
  { path: '/customers', icon: 'User', label: '客户' },
  { path: '/inventory', icon: 'Box', label: '库存' },
]

const isMobile = () => window.innerWidth < 768
</script>

<template>
  <el-footer v-if="isMobile()" class="mobile-nav">
    <div
      v-for="item in navItems"
      :key="item.path"
      class="nav-item"
      :class="{ active: route.path === item.path }"
      @click="router.push(item.path)"
    >
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </div>
  </el-footer>
</template>

<style scoped>
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  border-top: 1px solid #eee;
  padding: 8px 0;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
}
.nav-item.active {
  color: #409eff;
}
</style>
```

- [ ] **Step 2: 修改 SidebarNav 移动端隐藏**

- [ ] **Step 3: 响应式表格适配**

- [ ] **Step 4: 提交代码**

```bash
git add src/components/MobileNav.vue src/components/SidebarNav.vue src/views/*.vue
git commit -m "feat: 移动端适配"
```

---

## Task 7: 配置 Android 构建

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: 确认 Android 配置**

```json
{
  "bundle": {
    "active": true,
    "targets": ["apk"],
    "android": {
      "minSdkVersion": 23,
      "targetSdkVersion": 34
    }
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: 添加 Android 构建配置"
```

---

## Task 8: 本地测试

- [ ] **Step 1: 创建本地 .env 文件**

```bash
cp .env.example .env
# 编辑 .env 填入 Supabase 项目地址和 Key
```

- [ ] **Step 2: 运行开发服务器**

```bash
npm run tauri dev
```

- [ ] **Step 3: 测试登录功能**

- [ ] **Step 4: 测试数据 CRUD**

- [ ] **Step 5: 提交测试代码**

---

## Task 9: 构建 Android APK

- [ ] **Step 1: 安装 Android SDK（如果未安装）**

- [ ] **Step 2: 构建 Android**

```bash
npm run tauri build -- --target aarch64-linux-android
```

- [ ] **Step 3: 验证 APK 生成**

```bash
ls -la src-tauri/target/aarch64-linux-android/release/bundle/android/
```

- [ ] **Step 4: 提交构建产物**

---

## 执行方式

**Plan complete and saved to `docs/superpowers/plans/2026-03-30-mobile-support-plan.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - 我调度子任务代理逐个任务执行，快速迭代
2. **Inline Execution** - 在当前会话中执行任务，批量执行带检查点

**选择哪种方式？**