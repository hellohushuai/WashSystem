<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore, type Order, type OrderItem, ORDER_STATUS_PAID, ORDER_STATUS_COMPLETED } from '@/stores/orders'
import { useCustomerStore } from '@/stores/customers'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()

const order = ref<Order | null>(null)
const items = ref<OrderItem[]>([])
const customer = ref<any>(null)
const loading = ref(true)

// Payment modal
const showPaymentModal = ref(false)
const paymentAmount = ref(0)
const paymentMethod = ref('现金')
const paying = ref(false)

// Pickup modal
const showPickupModal = ref(false)
const selectedItem = ref<OrderItem | null>(null)
const pickingUp = ref(false)

const orderId = computed(() => Number(route.params.id))

const remainingAmount = computed(() => {
  if (!order.value) return 0
  return order.value.total_amount - order.value.paid_amount
})

const canPay = computed(() => order.value?.status !== ORDER_STATUS_COMPLETED && remainingAmount.value > 0)

const canComplete = computed(() => {
  if (!order.value || !items.value.length) return false
  // All items must be picked up AND fully paid
  const allPickedUp = items.value.every(item => item.is_picked_up === 1)
  return order.value.status === ORDER_STATUS_PAID && allPickedUp
})

const formatDate = (date: string | null | undefined) => {
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

// Payment functions
function openPaymentModal() {
  paymentAmount.value = remainingAmount.value
  paymentMethod.value = '现金'
  showPaymentModal.value = true
}

async function submitPayment() {
  if (!order.value || paymentAmount.value <= 0) return

  // Check balance if paying with balance
  if (paymentMethod.value === '余额' && customer.value) {
    if ((customer.value.balance || 0) < paymentAmount.value) {
      alert('余额不足！')
      return
    }
  }

  paying.value = true
  try {
    await orderStore.recordPayment(order.value.id, paymentAmount.value, paymentMethod.value)

    // If paying with balance, deduct from customer balance
    if (paymentMethod.value === '余额' && customer.value) {
      await customerStore.useBalance(customer.value.id, paymentAmount.value)
      // Reload customer to get updated balance
      customer.value = await customerStore.getCustomer(customer.value.id)
    }

    alert('付款成功！')

    // If fully paid, update status to 已付款
    if (paymentAmount.value >= remainingAmount.value) {
      await orderStore.updateStatus(order.value.id, ORDER_STATUS_PAID)
    }

    showPaymentModal.value = false
    // Reload order
    await orderStore.loadOrders()
    order.value = orderStore.orders.find(o => o.id === orderId.value) || null
    items.value = await orderStore.getOrderItems(orderId.value)
  } catch (e: any) {
    alert(e.message || '付款失败')
  } finally {
    paying.value = false
  }
}

// Pickup functions
function openPickupModal(item: OrderItem) {
  selectedItem.value = item
  showPickupModal.value = true
}

async function submitPickup() {
  if (!selectedItem.value) return

  pickingUp.value = true
  try {
    await orderStore.pickUpItem(selectedItem.value.id)
    alert('取衣成功！')
    showPickupModal.value = false
    // Reload items
    items.value = await orderStore.getOrderItems(orderId.value)
  } catch (e: any) {
    alert(e.message || '操作失败')
  } finally {
    pickingUp.value = false
  }
}

// Complete order
async function completeOrder() {
  if (!order.value) return

  try {
    await orderStore.updateStatus(order.value.id, ORDER_STATUS_COMPLETED)
    alert('订单已完成！')
    // Reload order
    await orderStore.loadOrders()
    order.value = orderStore.orders.find(o => o.id === orderId.value) || null
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}
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
            <span class="item-name">{{ item.garment_type }}</span>
            <span class="item-service">{{ item.service_type }}</span>
            <span v-if="item.hook_no" class="item-hook">挂钩: {{ item.hook_no }}</span>
          </div>
          <div class="item-actions">
            <span class="item-price">{{ formatPrice(item.price) }}</span>
            <!-- 付款前按钮禁用，付款后可点击取衣 -->
            <button
              v-if="item.is_picked_up !== 1"
              class="pickup-btn"
              :class="{ disabled: order?.status !== ORDER_STATUS_PAID }"
              :disabled="order?.status !== ORDER_STATUS_PAID"
              @click="openPickupModal(item)"
            >
              取衣
            </button>
            <span v-else class="picked-tag">已取</span>
          </div>
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

      <!-- Action Buttons -->
      <div class="action-buttons" v-if="order.status !== ORDER_STATUS_COMPLETED">
        <button v-if="canPay" class="action-btn primary" @click="openPaymentModal">
          付款
        </button>
        <button v-if="canComplete" class="action-btn success" @click="completeOrder">
          完成订单
        </button>
      </div>
    </div>

    <!-- Payment Modal -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal = false">
      <div class="modal-content">
        <h3 class="modal-title">收款</h3>
        <p class="modal-subtitle">待付金额: {{ formatPrice(remainingAmount) }}</p>
        <p v-if="customer" class="balance-info">客户余额: {{ formatPrice(customer.balance || 0) }}</p>

        <div class="form-group">
          <label class="form-label">付款金额</label>
          <input
            v-model.number="paymentAmount"
            type="number"
            class="input-mobile"
            min="0"
            :max="remainingAmount"
          />
        </div>

        <div class="form-group">
          <label class="form-label">支付方式</label>
          <div class="method-options">
            <button
              v-for="m in ['现金', '微信', '支付宝', '银行卡', '余额']"
              :key="m"
              class="method-btn"
              :class="{ active: paymentMethod === m }"
              @click="paymentMethod = m"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showPaymentModal = false">取消</button>
          <button class="btn-confirm" @click="submitPayment" :disabled="paying">
            {{ paying ? '处理中...' : '确认收款' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Pickup Modal -->
    <div v-if="showPickupModal" class="modal-overlay" @click.self="showPickupModal = false">
      <div class="modal-content">
        <h3 class="modal-title">取衣确认</h3>
        <p class="modal-subtitle" v-if="selectedItem">
          {{ selectedItem.garment_type }} - {{ selectedItem.service_type }}
        </p>

        <p class="confirm-text">确认客户已取走此衣物？</p>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showPickupModal = false">取消</button>
          <button class="btn-confirm" @click="submitPickup" :disabled="pickingUp">
            {{ pickingUp ? '处理中...' : '确认取衣' }}
          </button>
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

.item-hook {
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
}

.item-price {
  font-weight: 600;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.action-btn {
  flex: 1;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.action-btn.primary {
  background: var(--primary);
  color: white;
}

.action-btn.primary:active {
  background: var(--primary-darken);
}

.action-btn.success {
  background: var(--tertiary);
  color: white;
}

.action-btn.success:active {
  background: #004d28;
}

/* Pickup button */
.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pickup-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: var(--tertiary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.pickup-btn:active {
  background: #004d28;
}

.pickup-btn.disabled {
  background: var(--surface-container);
  color: var(--on-surface-variant);
  cursor: not-allowed;
}

.picked-tag {
  font-size: 12px;
  font-weight: 500;
  color: var(--tertiary);
  background: var(--tertiary-fixed);
  padding: 6px 12px;
  border-radius: 20px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--surface);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--on-surface);
  text-align: center;
  margin-bottom: 4px;
}

.modal-subtitle {
  font-size: 14px;
  color: var(--on-surface-variant);
  text-align: center;
  margin-bottom: 8px;
}

.balance-info {
  font-size: 14px;
  color: var(--tertiary);
  text-align: center;
  margin-bottom: 24px;
}

.confirm-text {
  text-align: center;
  color: var(--on-surface);
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface);
  margin-bottom: 8px;
}

.method-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.method-btn {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--on-surface);
  background: var(--surface-container);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.method-btn.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-container);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--on-surface);
  background: var(--surface-container);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.btn-confirm {
  flex: 1;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>