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