<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore, type Order, type OrderItem } from '@/stores/orders'
import { useCustomerStore } from '@/stores/customers'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()

const order = ref<Order | null>(null)
const items = ref<OrderItem[]>([])
const customer = ref<any>(null)
const loading = ref(true)

const orderId = computed(() => Number(route.params.id))

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

onMounted(async () => {
  try {
    await orderStore.loadOrders()
    order.value = orderStore.orders.find(o => o.id === orderId.value) || null

    if (order.value) {
      items.value = await orderStore.getOrderItems(orderId.value)
      if (order.value.customer_id) {
        customer.value = await customerStore.getCustomer(order.value.customer_id)
      }
    }
  } catch (error) {
    console.error('Failed to load order:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mobile-page">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!order" class="empty">订单不存在</div>
    <div v-else class="order-detail">
      <!-- Header -->
      <div class="detail-header">
        <button class="back-btn" @click="router.back()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="page-title">订单详情</h2>
      </div>

      <!-- Order Info Card -->
      <div class="card">
        <div class="card-header">
          <span class="order-no">{{ order.order_no }}</span>
          <span class="status-badge" :class="getStatusClass(order.status)">{{ order.status }}</span>
        </div>

        <div class="info-row">
          <span class="label">创建时间</span>
          <span class="value">{{ formatDate(order.created_at) }}</span>
        </div>

        <div v-if="customer" class="info-row">
          <span class="label">客户</span>
          <span class="value">{{ customer.name }} ({{ customer.phone }})</span>
        </div>

        <div class="info-row">
          <span class="label">取衣时间</span>
          <span class="value">{{ formatDate(order.pickup_date) }}</span>
        </div>
      </div>

      <!-- Items -->
      <div class="card">
        <h3 class="card-title">衣物明细</h3>
        <div v-for="item in items" :key="item.id" class="item-row">
          <div class="item-info">
            <span class="item-name">{{ item.garment_name }}</span>
            <span class="item-service">{{ item.service_name }}</span>
          </div>
          <span class="item-price">{{ formatPrice(item.price) }}</span>
        </div>
      </div>

      <!-- Payment -->
      <div class="card">
        <div class="info-row">
          <span class="label">总价</span>
          <span class="value price">{{ formatPrice(order.total_amount) }}</span>
        </div>
        <div class="info-row">
          <span class="label">已付</span>
          <span class="value price-paid">{{ formatPrice(order.paid_amount) }}</span>
        </div>
        <div class="info-row" v-if="order.total_amount - order.paid_amount > 0">
          <span class="label">待付</span>
          <span class="value price-remaining">{{ formatPrice(order.total_amount - order.paid_amount) }}</span>
        </div>
        <div v-if="order.notes" class="info-row">
          <span class="label">备注</span>
          <span class="value">{{ order.notes }}</span>
        </div>
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.order-no {
  font-weight: 600;
  font-size: 16px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending { background: var(--warning-bg); color: var(--warning); }
.status-paid { background: var(--primary-container); color: var(--primary); }
.status-completed { background: var(--success-bg); color: var(--success); }

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--outline-variant);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: var(--on-surface-variant);
}

.value {
  font-weight: 500;
}

.price { color: var(--error); }
.price-paid { color: var(--success); }
.price-remaining { color: var(--warning); }

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--outline-variant);
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 500;
}

.item-service {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.item-price {
  font-weight: 600;
}
</style>