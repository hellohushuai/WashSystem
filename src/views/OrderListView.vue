<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const store = useOrderStore()

// Filter state
const statusFilter = ref<string>('')
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')

// Export function
function exportToCSV() {
  const headers = ['订单号', '客户姓名', '手机号', '状态', '衣物数', '订单金额', '已付金额', '支付方式', '创建时间']
  const rows = store.orders.map(o => [
    o.order_no,
    o.customer_name,
    o.customer_phone,
    o.status,
    o.item_count?.toString() || '0',
    o.total_amount.toString(),
    o.paid_amount?.toString() || '0',
    o.payment_method || '',
    o.created_at
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell || ''}"`).join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  // Include filter info in filename
  let filename = '订单列表'
  if (dateFrom.value || dateTo.value) {
    filename += `_${dateFrom.value || '开始'}_${dateTo.value || '结束'}`
  }
  if (search.value) {
    filename += `_${search.value}`
  }
  filename += `_${new Date().toISOString().split('T')[0]}`

  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// Computed
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '未开始', value: '未开始' },
  { label: '已付款', value: '已付款' },
  { label: '已结束', value: '已结束' },
]

// Load data
onMounted(async () => {
  await store.loadOrders()
})

// Actions
async function handleSearch() {
  await store.loadOrders({
    status: statusFilter.value || undefined,
    search: search.value || undefined,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  })
}

async function handleReset() {
  statusFilter.value = ''
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  await store.loadOrders()
}

function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

function formatDate(date: string): string {
  if (!date) return '-'
  return date.replace('T', ' ').substring(0, 19)
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>订单管理</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="exportToCSV">导出</el-button>
        <el-button type="primary" @click="router.push('/orders/create')">新建订单</el-button>
      </div>
    </div>

    <!-- Filters -->
    <el-card style="margin-bottom: 16px;">
      <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
        <el-select v-model="statusFilter" placeholder="订单状态" clearable style="width: 140px;" @change="handleSearch">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-date-picker
          v-model="dateFrom"
          type="date"
          placeholder="开始日期"
          value-format="YYYY-MM-DD"
          style="width: 150px;"
          @change="handleSearch"
        />
        <span style="color: var(--text-secondary);">至</span>
        <el-date-picker
          v-model="dateTo"
          type="date"
          placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 150px;"
          @change="handleSearch"
        />
        <el-input
          v-model="search"
          placeholder="搜索订单号/客户姓名/手机号"
          clearable
          style="width: 240px;"
          @input="handleSearch"
          @clear="handleSearch"
        />
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-card>

    <!-- Order Table -->
    <el-table
      :data="store.orders"
      stripe
      style="width: 100%; background: var(--card-bg);"
      empty-text="暂无订单"
    >
      <el-table-column prop="order_no" label="订单号" width="140" />
      <el-table-column prop="customer_name" label="客户" width="120">
        <template #default="{ row }">
          <div>{{ row.customer_name }}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">{{ row.customer_phone }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <OrderStatusBadge :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="item_count" label="衣物数" width="80" align="center" />
      <el-table-column label="金额" width="120" align="right">
        <template #default="{ row }">
          <div style="font-weight: 500;">{{ formatPrice(row.total_amount) }}</div>
          <div v-if="row.paid_amount > 0" style="font-size: 12px; color: var(--text-secondary);">
            已付: {{ formatPrice(row.paid_amount) }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="router.push(`/orders/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>