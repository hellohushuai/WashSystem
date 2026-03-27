<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  color?: string
}>()
</script>

<template>
  <el-card shadow="hover" class="stats-card">
    <div class="stats-value" :style="{ color: color || 'var(--primary-color)' }">{{ value }}</div>
    <div class="stats-title">{{ title }}</div>
  </el-card>
</template>

<style scoped>
.stats-card {
  text-align: center;
  background: var(--card-bg);
  border-color: var(--border-color);
}
.stats-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 4px;
}
.stats-title {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>