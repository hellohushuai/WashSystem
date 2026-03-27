<script setup lang="ts">
import type { RackHook } from '@/stores/rack'

defineProps<{ hooks: RackHook[] }>()
defineEmits<{ (e: 'click-hook', hook: RackHook): void }>()
</script>

<template>
  <div class="rack-grid">
    <div
      v-for="hook in hooks"
      :key="hook.hook_no"
      class="hook"
      :class="{ occupied: hook.status === '占用' }"
      :title="hook.status === '占用' ? `${hook.garment_type} - ${hook.customer_name}` : '空闲'"
      @click="$emit('click-hook', hook)"
    >
      <div class="hook-no">{{ hook.hook_no }}</div>
      <div v-if="hook.status === '占用'" class="hook-info">
        <div class="hook-garment">{{ hook.garment_type }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.hook {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  cursor: pointer;
  background: var(--card-bg);
  transition: all 0.2s;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.hook:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.hook.occupied {
  background: #fef0f0;
  border-color: #f56c6c;
}
.hook-no {
  font-weight: bold;
  font-size: 16px;
  color: var(--text-primary);
}
.hook.occupied .hook-no {
  color: #f56c6c;
}
.hook-info {
  margin-top: 2px;
}
.hook-garment {
  font-size: 10px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60px;
}
</style>