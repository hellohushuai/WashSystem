<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/', icon: 'HomeFilled', label: '首页' },
  { path: '/orders', icon: 'List', label: '订单' },
  { path: '/customers', icon: 'User', label: '客户' },
  { path: '/inventory', icon: 'Box', label: '库存' },
]

const isMobile = computed(() => window.innerWidth < 768)
</script>

<template>
  <el-footer v-if="isMobile" class="mobile-nav">
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
  border-top: 1px solid var(--border-color);
  padding: 6px 0;
  z-index: 1000;
  height: 56px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-secondary);
  gap: 2px;
  min-height: 44px;
}
.nav-item .el-icon {
  font-size: 20px;
}
.nav-item.active {
  color: var(--el-color-primary);
}
</style>