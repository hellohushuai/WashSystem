<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNav from './SidebarNav.vue'
import MobileNav from './MobileNav.vue'

const route = useRoute()

// 检测是否为 Android/Capacitor 平台
const isAndroidPlatform = () => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform()
    if (platform === 'android') return true
  }
  if (/Android/i.test(navigator.userAgent)) {
    return true
  }
  return false
}

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768 || isAndroidPlatform()
}

// 检查是否在移动端路由下（移动端页面有自己的底部导航）
const isMobileRoute = computed(() => route.path.startsWith('/mobile'))

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if ((window as any).Capacitor) {
    (window as any).Capacitor.addListener('resume', checkMobile)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="app-layout">
    <SidebarNav v-if="!isMobile" />
    <main class="main-content" :class="{ 'mobile-mode': isMobile }">
      <router-view />
    </main>
    <!-- 移动端路由有自己底部导航，不再显示AppLayout的MobileNav -->
    <MobileNav v-if="isMobile && !isMobileRoute" />
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
.main-content.mobile-mode {
  padding-bottom: 70px;
}
</style>