# 移动端 UI 重新设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 Material Design 3 风格重新设计移动端 UI，采用与样例相同的现代化设计语言

**Architecture:** 创建独立的移动端页面组件，使用 Tailwind CSS 样式，通过路由控制移动端显示

**Tech Stack:** Vue 3, Tailwind CSS, Element Plus (部分组件), TypeScript

---

## 文件结构规划

需要创建/修改的文件：

### 新建文件
- `src/views/mobile/MobileLayout.vue` - 移动端主布局（顶部导航 + 底部Tab）
- `src/views/mobile/MobileDashboard.vue` - 移动端仪表盘
- `src/views/mobile/MobileOrders.vue` - 移动端订单列表
- `src/views/mobile/MobileOrderDetail.vue` - 移动端订单详情
- `src/views/mobile/MobileCustomers.vue` - 移动端客户列表
- `src/views/mobile/MobileCustomerDetail.vue` - 移动端客户详情
- `src/views/mobile/MobileFinance.vue` - 移动端财务页面
- `src/views/mobile/MobileInventory.vue` - 移动端库存页面
- `src/views/mobile/MobileRack.vue` - 移动端货架页面
- `src/styles/mobile.css` - 移动端全局样式（Tailwind 配置）
- `src/router/mobile.ts` - 移动端路由配置

### 修改文件
- `src/router/index.ts` - 添加移动端路由
- `src/components/MobileNav.vue` - 替换为新设计
- `src/views/LoginView.vue` - 适配新设计风格

---

### Task 1: 创建移动端全局样式和 Tailwind 配置

**Files:**
- Create: `src/styles/mobile.css`

- [ ] **Step 1: 创建移动端样式文件**

```css
/* 移动端全局样式 - Material Design 3 风格 */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #006397;
  --primary-container: #3498db;
  --on-primary: #ffffff;
  --secondary: #5c5f61;
  --tertiary: #006d37;
  --tertiary-container: #00a757;
  --surface: #f7f9fb;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f2f4f6;
  --surface-container: #eceef0;
  --surface-container-high: #e6e8ea;
  --surface-variant: #e0e3e5;
  --on-surface: #191c1e;
  --on-surface-variant: #3f4850;
  --outline: #707881;
  --error: #ba1a1a;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--surface);
  color: var(--on-surface);
  min-height: 100dvh;
  padding-bottom: 80px;
}

/* 字体 */
.font-headline {
  font-family: 'Manrope', sans-serif;
}

/* 胶囊按钮 */
.btn-capsule {
  @apply px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap;
}

.btn-capsule-primary {
  @apply bg-primary text-on-primary;
}

.btn-capsule-secondary {
  @apply bg-surface-container-high text-on-surface-variant;
}

/* 卡片 */
.card-mobile {
  @apply bg-surface-container-lowest p-5 rounded-xl shadow-sm;
}

/* 输入框 */
.input-mobile {
  @apply w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20;
}

/* 底部导航 */
.bottom-nav {
  @apply fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-6 bg-white rounded-t-[1.5rem] shadow-lg z-50;
}

.bottom-nav-item {
  @apply flex flex-col items-center justify-center text-secondary transition-all duration-300;
}

.bottom-nav-item.active {
  @apply text-primary bg-primary/10 rounded-xl px-3 py-1;
}
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la src/styles/mobile.css`

- [ ] **Step 3: Commit**

```bash
git add src/styles/mobile.css
git commit -m "feat: add mobile styles with MD3 design system"
```

---

### Task 2: 创建移动端主布局组件

**Files:**
- Create: `src/views/mobile/MobileLayout.vue`

- [ ] **Step 1: 创建移动端布局组件**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/mobile', icon: 'dashboard', label: '首页' },
  { path: '/mobile/orders', icon: 'local_laundry_service', label: '订单' },
  { path: '/mobile/customers', icon: 'group', label: '客户' },
  { path: '/mobile/finance', icon: 'payments', label: '财务' },
  { path: '/mobile/more', icon: 'more_horiz', label: '更多' },
]

const isActive = (path: string) => {
  if (path === '/mobile') return route.path === '/mobile'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="mobile-layout">
    <!-- Top App Bar -->
    <header class="fixed top-0 left-0 w-full z-40 bg-surface flex justify-between items-center px-6 py-4">
      <div class="flex items-center gap-3">
        <h1 class="font-headline text-xl tracking-tight font-bold text-primary">干洗店管理</h1>
      </div>
      <div class="flex items-center gap-4">
        <span class="material-symbols-outlined text-primary cursor-pointer">notifications</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-20 pb-32 px-6">
      <router-view />
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="bottom-nav-item"
        :class="{ active: isActive(item.path) }"
        @click="router.push(item.path)"
      >
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        <span class="text-[0.6875rem] font-bold mt-1">{{ item.label }}</span>
      </div>
    </nav>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
```

- [ ] **Step 2: 验证组件创建**

Run: `ls -la src/views/mobile/`

- [ ] **Step 3: Commit**

```bash
git add src/views/mobile/MobileLayout.vue
git commit -f feat: add mobile layout with MD3 design
```

---

### Task 3: 创建移动端仪表盘页面

**Files:**
- Create: `src/views/mobile/MobileDashboard.vue`

- [ ] **Step 1: 创建移动端仪表盘**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'
import { useRackStore } from '@/stores/rack'
import { useInventoryStore } from '@/stores/inventory'

const router = useRouter()
const orderStore = useOrderStore()
const rackStore = useRackStore()
const inventoryStore = useInventoryStore()

const todayOrders = ref(0)
const todayIncome = ref(0)
const freeHooks = ref(0)
const pendingCount = ref(0)

onMounted(async () => {
  const stats = await orderStore.getTodayStats()
  todayOrders.value = stats.orderCount
  todayIncome.value = stats.income
  freeHooks.value = await rackStore.getFreeCount()

  await orderStore.loadOrders()
  pendingCount.value = orderStore.orders.filter(o => o.status !== '已结束').length
})
</script>

<template>
  <div class="mobile-dashboard">
    <!-- Hero: 今日营收 -->
    <section class="mt-4 mb-6">
      <div class="bg-gradient-to-br from-primary to-primary-container rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div class="relative z-10">
          <p class="text-xs uppercase tracking-wider opacity-80">今日营收</p>
          <h2 class="font-headline text-4xl font-extrabold mt-1">¥{{ todayIncome.toFixed(2) }}</h2>
          <div class="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">trending_up</span>
            <span class="text-xs font-semibold">{{ todayOrders }} 笔订单</span>
          </div>
        </div>
        <div class="absolute -right-10 -bottom-10 w-40 h-40 opacity-20 pointer-events-none">
          <span class="material-symbols-outlined text-[10rem]">payments</span>
        </div>
      </div>
    </section>

    <!-- Stats Grid -->
    <section class="grid grid-cols-2 gap-4 mb-6">
      <div class="card-mobile flex flex-col justify-between h-28">
        <div class="flex justify-between items-start">
          <span class="material-symbols-outlined text-primary">local_laundry_service</span>
        </div>
        <div>
          <h3 class="font-headline text-2xl font-bold">{{ pendingCount }}</h3>
          <p class="text-xs text-secondary">进行中订单</p>
        </div>
      </div>
      <div class="card-mobile flex flex-col justify-between h-28">
        <div class="flex justify-between items-start">
          <span class="material-symbols-outlined text-tertiary">checkroom</span>
        </div>
        <div>
          <h3 class="font-headline text-2xl font-bold">{{ freeHooks }}</h3>
          <p class="text-xs text-secondary">空闲挂钩</p>
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="space-y-4">
      <div
        class="card-mobile flex items-center gap-4"
        @click="router.push('/mobile/orders/create')"
      >
        <div class="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-lg">
          <span class="material-symbols-outlined text-primary">add</span>
        </div>
        <div class="flex-1">
          <p class="font-semibold">新建订单</p>
          <p class="text-xs text-secondary">创建新的干洗订单</p>
        </div>
        <span class="material-symbols-outlined text-secondary">chevron_right</span>
      </div>

      <div
        class="card-mobile flex items-center gap-4"
        @click="router.push('/mobile/customers')"
      >
        <div class="w-12 h-12 bg-tertiary/10 flex items-center justify-center rounded-lg">
          <span class="material-symbols-outlined text-tertiary">person_add</span>
        </div>
        <div class="flex-1">
          <p class="font-semibold">添加客户</p>
          <p class="text-xs text-secondary">录入新客户信息</p>
        </div>
        <span class="material-symbols-outlined text-secondary">chevron_right</span>
      </div>

      <div
        class="card-mobile flex items-center gap-4"
        @click="router.push('/mobile/inventory')"
      >
        <div class="w-12 h-12 bg-orange-100 flex items-center justify-center rounded-lg">
          <span class="material-symbols-outlined text-orange-600">inventory</span>
        </div>
        <div class="flex-1">
          <p class="font-semibold">库存管理</p>
          <p class="text-xs text-secondary">查看和管理库存</p>
        </div>
        <span class="material-symbols-outlined text-secondary">chevron_right</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.font-headline {
  font-family: 'Manrope', sans-serif;
}
</style>
```

- [ ] **Step 2: 验证组件创建**

Run: `ls src/views/mobile/MobileDashboard.vue`

- [ ] **Step 3: Commit**

```bash
git add src/views/mobile/MobileDashboard.vue
git commit -m "feat: add mobile dashboard with MD3 design"
```

---

### Task 4: 创建移动端订单列表页面

**Files:**
- Create: `src/views/mobile/MobileOrders.vue`

- [ ] **Step 1: 创建移动端订单列表**

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'

const router = useRouter()
const orderStore = useOrderStore()

const orders = ref<any[]>([])
const activeTab = ref('all')
const searchQuery = ref('')

const tabs = [
  { key: 'all', label: '全部' },
  { key: '未开始', label: '待处理' },
  { key: '已付款', label: '进行中' },
  { key: '已结束', label: '已完成' },
]

const filteredOrders = computed(() => {
  let list = orders.value
  if (activeTab.value !== 'all') {
    list = list.filter(o => o.status === activeTab.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(o =>
      o.order_no.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q)
    )
  }
  return list
})

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    '未开始': 'bg-gray-100 text-gray-600',
    '已付款': 'bg-blue-100 text-blue-600',
    '已结束': 'bg-green-100 text-green-600',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

onMounted(async () => {
  await orderStore.loadOrders()
  orders.value = orderStore.orders
})
</script>

<template>
  <div class="mobile-orders">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="font-headline text-xl font-bold">订单管理</h2>
      <p class="text-sm text-secondary mt-1">管理所有干洗订单</p>
    </div>

    <!-- Search -->
    <div class="relative mb-4">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
      <input
        v-model="searchQuery"
        class="input-mobile pl-12"
        placeholder="搜索客户或订单号..."
        type="text"
      />
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 overflow-x-auto mb-6 pb-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="btn-capsule"
        :class="activeTab === tab.key ? 'btn-capsule-primary' : 'btn-capsule-secondary'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Orders List -->
    <div class="space-y-4">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="card-mobile cursor-pointer"
        @click="router.push(`/mobile/orders/${order.id}`)"
      >
        <div class="flex justify-between items-start mb-3">
          <div>
            <span class="text-xs font-bold text-gray-400 uppercase">订单 #{{ order.order_no }}</span>
            <h3 class="font-semibold mt-1">{{ order.customer_name }}</h3>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold uppercase" :class="getStatusClass(order.status)">
            {{ order.status }}
          </span>
        </div>
        <div class="flex justify-between items-center text-sm text-secondary">
          <span>{{ order.item_count || 0 }} 件衣物</span>
          <span class="font-semibold text-primary">¥{{ (order.total_amount || 0).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredOrders.length === 0" class="text-center py-12">
        <span class="material-symbols-outlined text-4xl text-gray-300">inbox</span>
        <p class="text-secondary mt-2">暂无订单</p>
      </div>
    </div>

    <!-- FAB: 新建订单 -->
    <button
      class="fixed right-6 bottom-24 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center"
      @click="router.push('/mobile/orders/create')"
    >
      <span class="material-symbols-outlined text-2xl">add</span>
    </button>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.font-headline {
  font-family: 'Manrope', sans-serif;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
```

- [ ] **Step 2: 验证组件创建**

- [ ] **Step 3: Commit**

```bash
git add src/views/mobile/MobileOrders.vue
git commit -m "feat: add mobile orders list page"
```

---

### Task 5: 创建移动端客户列表页面

**Files:**
- Create: `src/views/mobile/MobileCustomers.vue`

- [ ] **Step 1: 创建移动端客户列表**

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'

const router = useRouter()
const customerStore = useCustomerStore()

const customers = ref<any[]>([])
const searchQuery = ref('')

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value
  const q = searchQuery.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q)
  )
})

onMounted(async () => {
  await customerStore.loadCustomers()
  customers.value = customerStore.customers
})
</script>

<template>
  <div class="mobile-customers">
    <!-- Header -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h2 class="font-headline text-xl font-bold">客户管理</h2>
        <p class="text-sm text-secondary mt-1">管理客户信息</p>
      </div>
      <button
        class="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center"
        @click="router.push('/mobile/customers/create')"
      >
        <span class="material-symbols-outlined">person_add</span>
      </button>
    </div>

    <!-- Search -->
    <div class="relative mb-4">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
      <input
        v-model="searchQuery"
        class="input-mobile pl-12"
        placeholder="搜索姓名或电话..."
        type="text"
      />
    </div>

    <!-- Customers List -->
    <div class="space-y-3">
      <div
        v-for="customer in filteredCustomers"
        :key="customer.id"
        class="card-mobile flex items-center gap-4 cursor-pointer"
        @click="router.push(`/mobile/customers/${customer.id}`)"
      >
        <div class="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full">
          <span class="material-symbols-outlined text-primary">person</span>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold">{{ customer.name }}</h3>
          <p class="text-sm text-secondary">{{ customer.phone }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-primary">¥{{ (customer.balance || 0).toFixed(2) }}</p>
          <p class="text-xs text-secondary">余额</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式类似上面 */
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/mobile/MobileCustomers.vue
git commit -m "feat: add mobile customers list page"
```

---

### Task 6: 创建移动端财务页面

**Files:**
- Create: `src/views/mobile/MobileFinance.vue`

- [ ] **Step 1: 创建移动端财务页面**

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'

const financeStore = useFinanceStore()

const summary = ref({
  totalIncome: 0,
  totalExpense: 0,
  profit: 0
})

const todayStats = ref({
  income: 0,
  expense: 0
})

onMounted(async () => {
  const stats = await financeStore.getSummary()
  summary.value = stats

  const today = await financeStore.getTodayStats()
  todayStats.value = today
})
</script>

<template>
  <div class="mobile-finance">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="font-headline text-xl font-bold">财务管理</h2>
      <p class="text-sm text-secondary mt-1">营收数据概览</p>
    </div>

    <!-- Hero: 今日营收 -->
    <section class="mb-6">
      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <p class="text-xs uppercase tracking-wider opacity-80">今日收入</p>
        <h2 class="font-headline text-4xl font-extrabold mt-1">¥{{ todayStats.income.toFixed(2) }}</h2>
        <div class="mt-3 text-sm opacity-80">
          支出: ¥{{ todayStats.expense.toFixed(2) }}
        </div>
      </div>
    </section>

    <!-- Stats Cards -->
    <section class="grid grid-cols-3 gap-3 mb-6">
      <div class="card-mobile text-center">
        <p class="text-xs text-secondary">总收入</p>
        <p class="font-headline text-lg font-bold text-green-600">¥{{ summary.totalIncome.toFixed(2) }}</p>
      </div>
      <div class="card-mobile text-center">
        <p class="text-xs text-secondary">总支出</p>
        <p class="font-headline text-lg font-bold text-red-500">¥{{ summary.totalExpense.toFixed(2) }}</p>
      </div>
      <div class="card-mobile text-center">
        <p class="text-xs text-secondary">净利润</p>
        <p class="font-headline text-lg font-bold text-primary">¥{{ summary.profit.toFixed(2) }}</p>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="space-y-3">
      <div class="card-mobile flex items-center gap-4">
        <div class="w-10 h-10 bg-green-100 flex items-center justify-center rounded-lg">
          <span class="material-symbols-outlined text-green-600">add_circle</span>
        </div>
        <span class="font-semibold">手工记账</span>
      </div>
      <div class="card-mobile flex items-center gap-4">
        <div class="w-10 h-10 bg-blue-100 flex items-center justify-center rounded-lg">
          <span class="material-symbols-outlined text-blue-600">shopping_cart</span>
        </div>
        <span class="font-semibold">采购记录</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 样式 */
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/mobile/MobileFinance.vue
git commit -m "feat: add mobile finance page"
```

---

### Task 7: 创建移动端路由配置

**Files:**
- Create: `src/router/mobile.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: 创建移动端路由文件**

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/mobile',
    component: () => import('@/views/mobile/MobileLayout.vue'),
    children: [
      {
        path: '',
        name: 'mobile-dashboard',
        component: () => import('@/views/mobile/MobileDashboard.vue'),
      },
      {
        path: 'orders',
        name: 'mobile-orders',
        component: () => import('@/views/mobile/MobileOrders.vue'),
      },
      {
        path: 'orders/create',
        name: 'mobile-order-create',
        component: () => import('@/views/mobile/MobileOrderCreate.vue'),
      },
      {
        path: 'orders/:id',
        name: 'mobile-order-detail',
        component: () => import('@/views/mobile/MobileOrderDetail.vue'),
      },
      {
        path: 'customers',
        name: 'mobile-customers',
        component: () => import('@/views/mobile/MobileCustomers.vue'),
      },
      {
        path: 'customers/:id',
        name: 'mobile-customer-detail',
        component: () => import('@/views/mobile/MobileCustomerDetail.vue'),
      },
      {
        path: 'finance',
        name: 'mobile-finance',
        component: () => import('@/views/mobile/MobileFinance.vue'),
      },
      {
        path: 'inventory',
        name: 'mobile-inventory',
        component: () => import('@/views/mobile/MobileInventory.vue'),
      },
      {
        path: 'rack',
        name: 'mobile-rack',
        component: () => import('@/views/mobile/MobileRack.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

- [ ] **Step 2: 修改主路由文件添加移动端路由**

Run: 读取 src/router/index.ts 并添加移动端路由

- [ ] **Step 3: Commit**

```bash
git add src/router/mobile.ts src/router/index.ts
git commit -m "feat: add mobile routes"
```

---

### Task 8: 创建其他移动端页面（库存、货架）

**Files:**
- Create: `src/views/mobile/MobileInventory.vue`
- Create: `src/views/mobile/MobileRack.vue`

- [ ] **Step 1: 创建库存和货架页面**

实现简化版的库存和货架管理页面，参考上面的模式

- [ ] **Step 2: Commit**

```bash
git add src/views/mobile/MobileInventory.vue src/views/mobile/MobileRack.vue
git commit -m "feat: add mobile inventory and rack pages"
```

---

### Task 9: 修改 AppLayout 自动切换移动端/桌面端

**Files:**
- Modify: `src/components/AppLayout.vue`

- [ ] **Step 1: 添加移动端路由跳转逻辑**

```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// 检测是否为移动设备
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 在 mounted 时检查
onMounted(() => {
  if (isMobileDevice() && !route.path.startsWith('/mobile')) {
    router.push('/mobile')
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppLayout.vue
git commit -m "feat: add auto-redirect to mobile for mobile devices"
```

---

### Task 10: 构建和测试

**Files:**
- N/A

- [ ] **Step 1: 安装 Tailwind CSS**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 Tailwind**

更新 tailwind.config.js 添加移动端样式

- [ ] **Step 3: 构建测试**

```bash
npm run build
```

- [ ] **Step 4: 同步到 Android**

```bash
npx cap sync android
```

- [ ] **Step 5: 构建 APK**

```bash
cd android && ./gradlew assembleRelease
```

---

## 执行选项

**Plan complete. Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**