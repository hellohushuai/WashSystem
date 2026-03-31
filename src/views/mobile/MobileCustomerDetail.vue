<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore, type Customer } from '@/stores/customers'
import { useOrderStore, type Order } from '@/stores/orders'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const orderStore = useOrderStore()

const customer = ref<Customer | null>(null)
const orders = ref<Order[]>([])
const loading = ref(true)

const customerId = computed(() => Number(route.params.id))

const formatDate = (date: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const formatPrice = (price: number) => {
  return `¥${price.toFixed(2)}`
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    '未开始': 'status-pending',
    '已付款': 'status-paid',
    '已结束': 'status-completed',
  }
  return map[status] || 'status-pending'
}

import { computed } from 'vue'

onMounted(async () => {
  try {
    await customerStore.loadLevels()
    const id = Number(route.params.id)
    customer.value = await customerStore.getCustomer(id) || null

    if (customer.value) {
      await orderStore.loadOrders({ search: customer.value.phone })
      orders.value = orderStore.orders
    }
  } catch (error) {
    console.error('Failed to load customer:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mobile-page">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!customer" class="empty">客户不存在</div>
    <div v-else class="customer-detail">
      <!-- Header -->
      <div class="detail-header">
        <button class="back-btn" @click="router.back()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="page-title">客户详情</h2>
      </div>

      <!-- Customer Info Card -->
      <div class="card">
        <div class="customer-avatar">
          <span class="material-symbols-outlined">person</span>
        </div>
        <h3 class="customer-name">{{ customer.name }}</h3>
        <p class="customer-phone">{{ customer.phone }}</p>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">会员等级</span>
            <span class="info-value">{{ customer.membership_level?.name || '普通会员' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">账户余额</span>
            <span class="info-value balance">{{ formatPrice(customer.balance || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">累计消费</span>
            <span class="info-value">{{ formatPrice(customer.total_spent || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">注册时间</span>
            <span class="info-value">{{ formatDate(customer.created_at) }}</span>
          </div>
        </div>

        <div v-if="customer.notes" class="notes">
          <span class="notes-label">备注</span>
          <p class="notes-content">{{ customer.notes }}</p>
        </div>
      </div>

      <!-- Orders -->
      <div class="card">
        <h3 class="card-title">历史订单 ({{ orders.length }})</h3>
        <div v-if="orders.length === 0" class="empty-orders">暂无订单</div>
        <div v-else class="order-list">
          <div
            v-for="order in orders.slice(0, 10)"
            :key="order.id"
            class="order-item"
            @click="router.push(`/mobile/orders/${order.id}`)"
          >
            <div class="order-info">
              <span class="order-no">{{ order.order_no }}</span>
              <span class="order-date">{{ formatDate(order.created_at) }}</span>
            </div>
            <div class="order-right">
              <span class="order-amount">{{ formatPrice(order.total_amount) }}</span>
              <span class="status-badge" :class="getStatusClass(order.status)">{{ order.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="action-btn primary" @click="router.push(`/mobile/orders/create?customer=${customer.id}`)">
          <span class="material-symbols-outlined">add</span>
          新建订单
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.loading, .empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--on-surface-variant);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--surface);
}

.back-btn {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
}

.back-btn:active {
  background: var(--surface-container);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.card {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin: 16px;
}

.customer-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.customer-avatar .material-symbols-outlined {
  font-size: 32px;
  color: var(--primary);
}

.customer-name {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.customer-phone {
  text-align: center;
  color: var(--on-surface-variant);
  margin: 0 0 16px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--surface-container);
  border-radius: 8px;
}

.info-label {
  font-size: 12px;
  color: var(--on-surface-variant);
  margin-bottom: 4px;
}

.info-value {
  font-weight: 600;
  font-size: 14px;
}

.balance {
  color: var(--primary);
}

.notes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--outline-variant);
}

.notes-label {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.notes-content {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.empty-orders {
  text-align: center;
  padding: 24px;
  color: var(--on-surface-variant);
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--surface-container);
  border-radius: 8px;
  cursor: pointer;
}

.order-item:active {
  background: var(--surface-container-high);
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-no {
  font-weight: 500;
}

.order-date {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.order-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-amount {
  font-weight: 600;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-pending { background: var(--warning-bg); color: var(--warning); }
.status-paid { background: var(--primary-container); color: var(--primary); }
.status-completed { background: var(--success-bg); color: var(--success); }

.actions {
  padding: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.action-btn.primary {
  background: var(--primary);
  color: var(--on-primary);
}

.action-btn.primary:active {
  opacity: 0.9;
}
</style>