<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/mobile', icon: 'dashboard', label: '首页' },
  { path: '/mobile/orders', icon: 'local_laundry_service', label: '订单' },
  { path: '/mobile/customers', icon: 'group', label: '客户' },
  { path: '/mobile/inventory', icon: 'inventory_2', label: '库存' },
  { path: '/mobile/rack', icon: 'checkroom', label: '货架' },
]

const isActive = (path: string) => {
  if (path === '/mobile') return route.path === '/mobile'
  return route.path.startsWith(path)
}

const navigate = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="mobile-layout">
    <!-- Top App Bar -->
    <header class="app-header">
      <h1 class="app-header-title">干洗店管理</h1>
      <button class="notification-btn" aria-label="通知">
        <span class="material-symbols-outlined">notifications</span>
      </button>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <router-view></router-view>
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.path"
        class="bottom-nav-item"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
      >
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        <span class="bottom-nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.mobile-layout {
  min-height: 100dvh;
  background: var(--surface);
}

.notification-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.notification-btn:active {
  background: var(--surface-container);
}

.notification-btn .material-symbols-outlined {
  font-size: 24px;
  color: var(--on-surface-variant);
}

.bottom-nav-label {
  font-size: 12px;
  font-weight: 500;
}
</style>