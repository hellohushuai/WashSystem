<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRackStore, type RackHook } from '@/stores/rack'

const router = useRouter()
const store = useRackStore()
const loading = ref(true)

const freeCount = computed(() => store.hooks.filter(h => h.status === '空闲').length)
const occupiedCount = computed(() => store.hooks.filter(h => h.status === '占用').length)
const totalHooks = computed(() => store.totalHooks)

const getHookClass = (hook: RackHook) => {
  if (hook.status === '空闲') return 'hook-free'
  if (hook.status === '占用') return 'hook-occupied'
  return 'hook-unknown'
}

const handleHookClick = (hook: RackHook) => {
  if (hook.status === '占用' && hook.order_id) {
    router.push(`/mobile/orders/${hook.order_id}`)
  }
}

onMounted(async () => {
  try {
    await store.loadSettings()
    await store.loadHooks()
  } catch (error) {
    console.error('Failed to load rack:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mobile-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">货架管理</h2>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="rack-content">
      <!-- Summary -->
      <div class="summary-row">
        <div class="summary-card">
          <span class="summary-value">{{ totalHooks }}</span>
          <span class="summary-label">总挂钩</span>
        </div>
        <div class="summary-card success">
          <span class="summary-value">{{ freeCount }}</span>
          <span class="summary-label">空闲</span>
        </div>
        <div class="summary-card primary">
          <span class="summary-value">{{ occupiedCount }}</span>
          <span class="summary-label">占用</span>
        </div>
      </div>

      <!-- Usage Bar -->
      <div class="usage-card">
        <div class="usage-header">
          <span>使用率</span>
          <span>{{ totalHooks > 0 ? Math.round((occupiedCount / totalHooks) * 100) : 0 }}%</span>
        </div>
        <div class="usage-bar">
          <div
            class="usage-fill"
            :style="{ width: totalHooks > 0 ? `${(occupiedCount / totalHooks) * 100}%` : '0%' }"
          ></div>
        </div>
      </div>

      <!-- Hook Grid -->
      <div class="rack-section">
        <h3 class="section-title">挂钩状态</h3>
        <div class="hook-grid">
          <div
            v-for="hook in store.hooks"
            :key="hook.id"
            class="hook-item"
            :class="getHookClass(hook)"
            @click="handleHookClick(hook)"
          >
            <span v-if="hook.status === '空闲'" class="material-symbols-outlined hook-icon">check_circle</span>
            <span v-else-if="hook.status === '占用'" class="material-symbols-outlined hook-icon">checkroom</span>
            <span class="hook-label">{{ hook.label || hook.id }}</span>
            <span v-if="hook.customer_name" class="hook-customer">{{ hook.customer_name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.page-header {
  padding: 16px;
  background: var(--surface);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--on-surface-variant);
}

.summary-row {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.summary-card {
  flex: 1;
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-card.success .summary-value {
  color: var(--success);
}

.summary-card.primary .summary-value {
  color: var(--primary);
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
}

.summary-label {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.usage-card {
  margin: 0 16px 16px;
  padding: 16px;
  background: var(--surface);
  border-radius: 12px;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}

.usage-bar {
  height: 8px;
  background: var(--surface-container);
  border-radius: 4px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.rack-section {
  padding: 0 16px 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.hook-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.hook-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  min-height: 80px;
}

.hook-item:active {
  opacity: 0.8;
}

.hook-free {
  background: var(--success-bg);
}

.hook-occupied {
  background: var(--primary-container);
}

.hook-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.hook-free .hook-icon {
  color: var(--success);
}

.hook-occupied .hook-icon {
  color: var(--primary);
}

.hook-label {
  font-size: 12px;
  font-weight: 500;
}

.hook-customer {
  font-size: 10px;
  color: var(--on-surface-variant);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>