<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SidebarNav from './SidebarNav.vue'
import MobileNav from './MobileNav.vue'

const isMobile = ref(window.innerWidth < 768)

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="app-layout">
    <SidebarNav />
    <main class="main-content" :class="{ 'mobile-mode': isMobile }">
      <router-view />
    </main>
    <MobileNav />
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