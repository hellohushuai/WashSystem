<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SidebarNav from './SidebarNav.vue'
import MobileNav from './MobileNav.vue'

const router = useRouter()
const route = useRoute()

const isMobile = ref(window.innerWidth < 768)

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  // 移动设备自动跳转到移动端页面（登录页面除外）
  if (isMobileDevice() && !route.path.startsWith('/mobile') && route.path !== '/login') {
    router.push('/mobile')
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="app-layout">
    <SidebarNav v-if="!isMobile" />
    <main class="main-content" :class="{ 'mobile-mode': isMobile }">
      <router-view />
    </main>
    <MobileNav v-if="isMobile" />
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