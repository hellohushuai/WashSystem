<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fold, Expand, House, ShoppingCart, User, Money, Box, Grid, Setting } from '@element-plus/icons-vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

const router = useRouter()
const route = useRoute()
const isCollapsed = ref(false)

const menuItems = [
  { path: '/', name: 'dashboard', label: '仪表盘', icon: House },
  { path: '/orders', name: 'orders', label: '订单管理', icon: ShoppingCart },
  { path: '/customers', name: 'customers', label: '客户管理', icon: User },
  { path: '/finance', name: 'finance', label: '财务管理', icon: Money },
  { path: '/inventory', name: 'inventory', label: '库存管理', icon: Box },
  { path: '/rack', name: 'rack', label: '货架管理', icon: Grid },
  { path: '/settings/garment-types', name: 'garment-types', label: '衣物类型', icon: Setting },
  { path: '/settings/service-types', name: 'service-types', label: '服务类型', icon: Setting },
]

function navigateTo(path: string) {
  router.push(path)
}

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <h2 v-if="!isCollapsed">干洗店管理</h2>
      <span v-else>干洗</span>
    </div>

    <el-menu
      :default-active="route.path"
      class="sidebar-menu"
      :collapse="isCollapsed"
      :collapse-transition="false"
    >
      <el-menu-item
        v-for="item in menuItems"
        :key="item.path"
        :index="item.path"
        @click="navigateTo(item.path)"
        :class="{ active: isActive(item.path) }"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <template #title>{{ item.label }}</template>
      </el-menu-item>
    </el-menu>

    <div class="sidebar-footer">
      <ThemeSwitcher />
      <div class="collapse-btn" @click="isCollapsed = !isCollapsed">
        <el-icon :size="20">
          <Fold v-if="!isCollapsed" />
          <Expand v-else />
        </el-icon>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  background: var(--sidebar-bg);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: bold;
  font-size: 16px;
}

.sidebar.collapsed .sidebar-header {
  font-size: 14px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.sidebar-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: var(--sidebar-hover);
  color: #fff;
}

.sidebar-menu :deep(.el-menu-item.active) {
  background: var(--sidebar-active);
  color: #fff;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: var(--sidebar-active);
  color: #fff;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.collapse-btn {
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: var(--sidebar-hover);
}
</style>