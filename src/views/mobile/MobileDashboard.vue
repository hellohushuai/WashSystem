<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'
import { useRackStore } from '@/stores/rack'

const router = useRouter()
const orderStore = useOrderStore()
const rackStore = useRackStore()

const todayOrders = ref(0)
const todayIncome = ref(0)
const freeHooks = ref(0)
const loading = ref(true)

onMounted(async () => {
  try {
    const stats = await orderStore.getTodayStats()
    todayOrders.value = stats.orderCount
    todayIncome.value = stats.income
    freeHooks.value = await rackStore.getFreeCount()
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard-content">
    <!-- Hero: 今日营收卡片 -->
    <section class="mb-6">
      <div class="revenue-card">
        <div class="revenue-card-content">
          <p class="revenue-label">今日营收</p>
          <h2 class="revenue-amount">¥{{ todayIncome.toFixed(2) }}</h2>
          <div class="revenue-badge">
            <span class="revenue-badge-text">{{ todayOrders }} 笔订单</span>
          </div>
        </div>
        <div class="revenue-icon">
          <span class="material-symbols-outlined">payments</span>
        </div>
      </div>
    </section>

    <!-- Stats Grid: 两列统计卡片 -->
    <section class="grid grid-cols-2 gap-4 mb-6">
      <div class="card-mobile stat-card" @click="router.push('/mobile/orders')">
        <div class="stat-icon stat-icon-primary">
          <span class="material-symbols-outlined">local_laundry_service</span>
        </div>
        <h3 class="stat-value">{{ todayOrders }}</h3>
        <p class="stat-label">今日订单</p>
      </div>
      <div class="card-mobile stat-card">
        <div class="stat-icon stat-icon-tertiary">
          <span class="material-symbols-outlined">checkroom</span>
        </div>
        <h3 class="stat-value">{{ freeHooks }}</h3>
        <p class="stat-label">空闲挂钩</p>
      </div>
    </section>

    <!-- Quick Actions: 快速操作 -->
    <section class="action-section">
      <h3 class="section-title">快速操作</h3>
      <div class="action-list">
        <div class="card-mobile action-item" @click="router.push('/mobile/orders/create')">
          <div class="action-icon action-icon-primary">
            <span class="material-symbols-outlined">add</span>
          </div>
          <span class="action-text">新建订单</span>
          <span class="material-symbols-outlined action-arrow">chevron_right</span>
        </div>
        <div class="card-mobile action-item" @click="router.push('/mobile/customers/create')">
          <div class="action-icon action-icon-secondary">
            <span class="material-symbols-outlined">person_add</span>
          </div>
          <span class="action-text">添加客户</span>
          <span class="material-symbols-outlined action-arrow">chevron_right</span>
        </div>
        <div class="card-mobile action-item" @click="router.push('/mobile/inventory')">
          <div class="action-icon action-icon-tertiary">
            <span class="material-symbols-outlined">inventory_2</span>
          </div>
          <span class="action-text">库存管理</span>
          <span class="material-symbols-outlined action-arrow">chevron_right</span>
        </div>
        <div class="card-mobile action-item" @click="router.push('/mobile/finance')">
          <div class="action-icon action-icon-primary">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <span class="action-text">财务管理</span>
          <span class="material-symbols-outlined action-arrow">chevron_right</span>
        </div>
        <div class="card-mobile action-item" @click="router.push('/mobile/rack')">
          <div class="action-icon action-icon-secondary">
            <span class="material-symbols-outlined">checkroom</span>
          </div>
          <span class="action-text">货架管理</span>
          <span class="material-symbols-outlined action-arrow">chevron_right</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.dashboard-content {
  padding: 0;
}

/* Hero Revenue Card */
.revenue-card {
  background: linear-gradient(135deg, #006397 0%, #3498db 100%);
  border-radius: 12px;
  padding: 24px;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 99, 151, 0.3);
}

.revenue-card-content {
  position: relative;
  z-index: 1;
}

.revenue-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.8;
  margin: 0;
}

.revenue-amount {
  font-family: var(--font-headline);
  font-size: 36px;
  font-weight: 800;
  margin: 4px 0 0 0;
  letter-spacing: -0.02em;
}

.revenue-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 999px;
  margin-top: 16px;
}

.revenue-badge-text {
  font-size: 12px;
  font-weight: 600;
}

.revenue-icon {
  position: absolute;
  right: -20px;
  bottom: -20px;
  width: 100px;
  height: 100px;
  opacity: 0.15;
  pointer-events: none;
}

.revenue-icon .material-symbols-outlined {
  font-size: 100px;
  color: white;
}

/* Stat Cards */
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.stat-icon .material-symbols-outlined {
  font-size: 24px;
}

.stat-icon-primary {
  background: rgba(0, 99, 151, 0.1);
  color: var(--primary);
}

.stat-icon-tertiary {
  background: rgba(0, 109, 55, 0.1);
  color: var(--tertiary);
}

.stat-value {
  font-family: var(--font-headline);
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--on-surface);
}

.stat-label {
  font-size: 12px;
  color: var(--secondary);
  margin: 4px 0 0 0;
}

/* Action Section */
.action-section {
  margin-top: 8px;
}

.section-title {
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 700;
  color: var(--on-surface);
  margin: 0 0 16px 0;
  padding-left: 4px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-item:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon .material-symbols-outlined {
  font-size: 24px;
}

.action-icon-primary {
  background: rgba(0, 99, 151, 0.1);
  color: var(--primary);
}

.action-icon-secondary {
  background: rgba(92, 95, 97, 0.1);
  color: var(--secondary);
}

.action-icon-tertiary {
  background: rgba(0, 109, 55, 0.1);
  color: var(--tertiary);
}

.action-text {
  font-weight: 600;
  color: var(--on-surface);
  flex: 1;
}

.action-arrow {
  color: var(--on-surface-variant);
  font-size: 20px;
}
</style>