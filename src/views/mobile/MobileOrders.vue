<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'

const router = useRouter()
const orderStore = useOrderStore()
const orders = ref<any[]>([])
const activeTab = ref('all')
const searchQuery = ref('')
const loading = ref(true)

const tabs = [
  { key: 'today', label: '今日' },
  { key: 'all', label: '全部' },
  { key: '未开始', label: '待处理' },
  { key: '已付款', label: '进行中' },
  { key: '已结束', label: '已完成' },
]

const filteredOrders = computed(() => {
  let list = orders.value

  // Filter by tab
  if (activeTab.value === 'today') {
    const today = new Date().toISOString().split('T')[0]
    list = list.filter(o => o.created_at && o.created_at.startsWith(today))
  } else if (activeTab.value !== 'all') {
    list = list.filter(o => o.status === activeTab.value)
  }

  // Filter by search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(o =>
      o.order_no.toLowerCase().includes(q) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q))
    )
  }
  return list
})

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    '未开始': 'status-pending',
    '已付款': 'status-paid',
    '已结束': 'status-completed',
  }
  return map[status] || 'status-pending'
}

onMounted(async () => {
  try {
    await orderStore.loadOrders()
    // Get item counts for each order
    const ordersWithCounts = await Promise.all(
      orderStore.orders.map(async (order) => {
        const items = await orderStore.getOrderItems(order.id)
        return {
          ...order,
          item_count: items.length
        }
      })
    )
    orders.value = ordersWithCounts
  } catch (error) {
    console.error('Failed to load orders:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="orders-content">
    <!-- 标题 -->
    <div class="mb-6">
      <h2 class="font-headline text-xl font-bold">订单管理</h2>
      <p class="text-sm text-secondary mt-1">管理所有干洗订单</p>
    </div>

    <!-- 搜索 -->
    <div class="relative mb-4">
      <span class="material-symbols-outlined search-icon">search</span>
      <input
        v-model="searchQuery"
        class="input-mobile-search"
        placeholder="搜索客户或订单号..."
      />
    </div>

    <!-- 筛选Tabs -->
    <div class="tabs-container mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="btn-capsule"
        :class="activeTab === tab.key ? 'btn-capsule-primary' : 'btn-capsule-secondary'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="text-secondary text-sm">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredOrders.length === 0" class="empty-state">
      <span class="material-symbols-outlined empty-icon">receipt_long</span>
      <p class="text-secondary">暂无订单</p>
    </div>

    <!-- 订单列表 -->
    <div v-else class="orders-list">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="card-mobile order-card"
        @click="router.push(`/mobile/orders/${order.id}`)"
      >
        <div class="order-header">
          <div>
            <span class="order-number">订单 #{{ order.order_no }}</span>
            <h3 class="order-customer">{{ order.customer_name || '未知客户' }}</h3>
          </div>
          <span class="status-badge" :class="getStatusClass(order.status)">
            {{ order.status }}
          </span>
        </div>
        <div class="order-footer">
          <span class="order-items">{{ order.item_count || 0 }} 件衣物</span>
          <span class="order-amount">¥{{ (order.total_amount || 0).toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="router.push('/mobile/orders/create')">
      <span class="material-symbols-outlined">add</span>
    </button>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.orders-content {
  padding: 0;
}

/* 搜索图标 */
.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--on-surface-variant);
  font-size: 20px;
}

/* Tabs 容器 */
.tabs-container {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--surface-container-high);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
  color: var(--on-surface-variant);
  opacity: 0.5;
}

/* 订单列表 */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 100px;
}

/* 订单卡片 */
.order-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.order-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.order-number {
  font-size: 11px;
  font-weight: 700;
  color: var(--on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.order-customer {
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 600;
  color: var(--on-surface);
  margin: 4px 0 0 0;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pending {
  background: #f3f4f6;
  color: #6b7280;
}

.status-paid {
  background: #dbeafe;
  color: #2563eb;
}

.status-completed {
  background: #d1fae5;
  color: #059669;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--surface-container);
}

.order-items {
  font-size: 13px;
  color: var(--secondary);
}

.order-amount {
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}
</style>