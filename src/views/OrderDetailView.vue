<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore, type Order, type OrderItem, ORDER_STATUS_PENDING, ORDER_STATUS_PAID, ORDER_STATUS_COMPLETED } from '@/stores/orders'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useOrderStore()

// Data
const order = ref<Order | null>(null)
const items = ref<OrderItem[]>([])
const loading = ref(false)

// Payment dialog
const showPaymentDialog = ref(false)
const paymentAmount = ref(0)
const paymentMethod = ref('现金')
const paymentMethods = ['现金', '微信', '支付宝', '银行卡', '会员卡']

// Computed
const orderId = computed(() => Number(route.params.id))

const remainingAmount = computed(() => {
  if (!order.value) return 0
  return order.value.total_amount - order.value.paid_amount
})

const canPay = computed(() => {
  return order.value && order.value.status !== ORDER_STATUS_COMPLETED && remainingAmount.value > 0
})

const canPickUp = computed(() => {
  return order.value && order.value.status !== ORDER_STATUS_COMPLETED && items.value.some(i => i.is_picked_up === 0)
})

const canComplete = computed(() => {
  if (!order.value) return false
  const allPickedUp = items.value.every(i => i.is_picked_up === 1)
  const allPaid = order.value.paid_amount >= order.value.total_amount
  return order.value.status === ORDER_STATUS_PAID && allPickedUp && allPaid
})

const statusSteps = [
  { status: ORDER_STATUS_PENDING, title: '未开始', description: '订单已创建' },
  { status: ORDER_STATUS_PAID, title: '已付款', description: '已完成支付' },
  { status: ORDER_STATUS_COMPLETED, title: '已结束', description: '订单已完成' },
]

const currentStepIndex = computed(() => {
  if (!order.value) return 0
  return statusSteps.findIndex(s => s.status === order.value!.status)
})

// Load data
onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    order.value = await store.getOrder(orderId.value) || null
    if (order.value) {
      items.value = await store.getOrderItems(orderId.value)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '加载订单失败')
  } finally {
    loading.value = false
  }
}

// Actions
async function handlePayment() {
  if (paymentAmount.value <= 0) {
    ElMessage.warning('请输入有效金额')
    return
  }
  if (paymentAmount.value > remainingAmount.value) {
    ElMessage.warning('付款金额不能超过待付金额')
    return
  }

  try {
    await store.recordPayment(orderId.value, paymentAmount.value, paymentMethod.value)
    ElMessage.success('付款成功')
    showPaymentDialog.value = false
    paymentAmount.value = 0
    paymentMethod.value = '现金'
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '付款失败')
  }
}

async function handlePayFull() {
  try {
    await ElMessageBox.confirm(
      `确定要将订单状态改为"已付款"并自动付清全部费用吗？`,
      '确认付款',
      { type: 'warning' }
    )
    await store.updateStatus(orderId.value, ORDER_STATUS_PAID)
    ElMessage.success('状态已更新为已付款')
    await loadData()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '操作失败')
    }
  }
}

async function handlePickUp(item: OrderItem) {
  try {
    await store.pickUpItem(item.id)
    ElMessage.success('取衣成功')
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleComplete() {
  try {
    await ElMessageBox.confirm(
      '确定要完成此订单吗？所有衣物已取走且费用已付清。',
      '确认完成',
      { type: 'warning' }
    )
    await store.updateStatus(orderId.value, ORDER_STATUS_COMPLETED)
    ElMessage.success('订单已完成')
    await loadData()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '操作失败')
    }
  }
}

function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return date.replace('T', ' ').substring(0, 19)
}

function goBack() {
  router.back()
}
</script>

<template>
  <div v-loading="loading">
    <div v-if="order" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-button @click="goBack">返回</el-button>
        <h2>订单详情</h2>
      </div>
      <OrderStatusBadge :status="order.status" />
    </div>

    <div v-if="order">
      <el-row :gutter="20">
        <!-- Left: Order Info -->
        <el-col :span="16">
          <!-- Status Flow -->
          <el-card style="margin-bottom: 16px;">
            <template #header>
              <span>订单状态</span>
            </template>
            <el-steps :active="currentStepIndex" finish-status="success" align-center>
              <el-step v-for="step in statusSteps" :key="step.status" :title="step.title" :description="step.description" />
            </el-steps>
          </el-card>

          <!-- Items -->
          <el-card>
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>衣物明细</span>
                <el-tag size="small">{{ items.length }} 件</el-tag>
              </div>
            </template>
            <el-table :data="items" style="width: 100%;">
              <el-table-column label="挂钩号" width="80">
                <template #default="{ row }">
                  <el-tag v-if="row.hook_no" size="small" type="info">{{ row.hook_no }}</el-tag>
                  <span v-else style="color: var(--text-secondary);">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="garment_type" label="衣物类型" width="120" />
              <el-table-column prop="service_type" label="服务类型" width="100" />
              <el-table-column prop="price" label="价格" width="100" align="right">
                <template #default="{ row }">
                  {{ formatPrice(row.price) }}
                </template>
              </el-table-column>
              <el-table-column prop="notes" label="备注" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.is_picked_up === 1" type="success" size="small">已取走</el-tag>
                  <el-button v-else type="primary" link size="small" @click="handlePickUp(row)">取衣</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- Right: Summary & Actions -->
        <el-col :span="8">
          <!-- Order Summary -->
          <el-card style="margin-bottom: 16px;">
            <template #header>
              <span>订单信息</span>
            </template>
            <div style="space-y: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">订单号:</span>
                <span style="font-weight: 500;">{{ order.order_no }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">客户:</span>
                <span>{{ order.customer_name }} ({{ order.customer_phone }})</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">创建时间:</span>
                <span>{{ formatDate(order.created_at) }}</span>
              </div>
              <div v-if="order.completed_at" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">付款时间:</span>
                <span>{{ formatDate(order.completed_at) }}</span>
              </div>
              <div v-if="order.picked_up_at" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">完成时间:</span>
                <span>{{ formatDate(order.picked_up_at) }}</span>
              </div>
              <div v-if="order.notes" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <div style="color: var(--text-secondary); margin-bottom: 4px;">备注:</div>
                <div>{{ order.notes }}</div>
              </div>
            </div>
          </el-card>

          <!-- Payment Summary -->
          <el-card style="margin-bottom: 16px;">
            <template #header>
              <span>费用明细</span>
            </template>
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">订单总额:</span>
                <span style="font-size: 18px; font-weight: 600;">{{ formatPrice(order.total_amount) }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--text-secondary);">已付金额:</span>
                <span style="color: var(--el-color-success);">{{ formatPrice(order.paid_amount) }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--bg-secondary); border-radius: 4px;">
                <span style="font-weight: 500;">待付金额:</span>
                <span style="font-size: 18px; font-weight: 600; color: var(--el-color-danger);">{{ formatPrice(remainingAmount) }}</span>
              </div>
              <div v-if="order.payment_method" style="margin-top: 12px; color: var(--text-secondary); font-size: 12px;">
                付款方式: {{ order.payment_method }}
              </div>
            </div>
          </el-card>

          <!-- Actions -->
          <el-card>
            <template #header>
              <span>操作</span>
            </template>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <el-button
                v-if="order.status === ORDER_STATUS_PENDING"
                type="primary"
                style="width: 100%;"
                @click="handlePayFull"
              >
                确认付款（全额）
              </el-button>
              <el-button
                v-if="canPay"
                type="warning"
                style="width: 100%;"
                @click="showPaymentDialog = true"
              >
                部分付款
              </el-button>
              <el-button
                v-if="canComplete"
                type="success"
                style="width: 100%;"
                @click="handleComplete"
              >
                完成订单
              </el-button>
              <el-button
                v-if="!canPickUp && order.status !== ORDER_STATUS_COMPLETED"
                disabled
                style="width: 100%;"
              >
                所有衣物已取走
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Payment Dialog -->
    <el-dialog v-model="showPaymentDialog" title="部分付款" width="400px">
      <el-form label-width="80px">
        <el-form-item label="待付金额">
          <div style="font-size: 18px; font-weight: 600; color: var(--el-color-danger);">
            {{ formatPrice(remainingAmount) }}
          </div>
        </el-form-item>
        <el-form-item label="付款金额">
          <el-input-number v-model="paymentAmount" :min="0.01" :max="remainingAmount" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="付款方式">
          <el-select v-model="paymentMethod" style="width: 100%;">
            <el-option v-for="m in paymentMethods" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPaymentDialog = false">取消</el-button>
        <el-button type="primary" @click="handlePayment">确认付款</el-button>
      </template>
    </el-dialog>
  </div>
</template>