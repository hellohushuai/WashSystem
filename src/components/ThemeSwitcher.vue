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