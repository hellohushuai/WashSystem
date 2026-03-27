<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StatsCard from '@/components/StatsCard.vue'
import { useOrderStore, type Order } from '@/stores/orders'
import { useRackStore } from '@/stores/rack'
import { useInventoryStore, type InventoryItem } from '@/stores/inventory'

const router = useRouter()
const orderStore = useOrderStore()
const rackStore = useRackStore()
const inventoryStore = useInventoryStore()

const todayOrders = ref(0)
const todayIncome = ref(0)
const freeHooks = ref(0)
const pendingOrders = ref<Order[]>([])
const lowStockItems = ref<InventoryItem[]>([])

onMounted(async () => {
  const stats = await orderStore.getTodayStats()
  todayOrders.value = stats.orderCount
  todayIncome.value = stats.income
  freeHooks.value = await rackStore.getFreeCount()

  await orderStore.loadOrders({ status: '未开始' })
  pendingOrders.value = orderStore.orders.slice(0, 10)

  lowStockItems.value = await inventoryStore.getLowStockItems()
})
</script>

<template>
  <div class="dashboard">
    <h2>仪表盘</h2>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="8">
        <StatsCard title="今日订单" :value="todayOrders" color="#409eff" />
      </el-col>
      <el-col :span="8">
        <StatsCard title="今日收入" :value="'¥' + todayIncome.toFixed(2)" color="#67c23a" />
      </el-col>
      <el-col :span="8">
        <StatsCard title="空闲挂钩" :value="freeHooks" color="#e6a23c" />
      </el-col>
    </el-row>

    <el-card shadow="hover" style="margin-top: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>待处理订单</span>
          <el-button type="primary" size="small" @click="router.push('/orders/create')">新建订单</el-button>
        </div>
      </template>
      <el-table :data="pendingOrders" stripe style="width: 100%" empty-text="暂无待处理订单">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="customer_name" label="客户" width="120" />
        <el-table-column prop="item_count" label="衣物数" width="80" />
        <el-table-column prop="total_amount" label="金额" width="100">
          <template #default="{ row }">¥{{ row.total_amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="router.push(`/orders/${row.id}`)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card
      v-if="lowStockItems.length > 0"
      shadow="hover"
      style="margin-top: 16px; background: var(--card-bg); border-color: var(--border-color);"
    >
      <template #header>
        <span style="color: #f56c6c;">库存不足预警</span>
      </template>
      <el-table :data="lowStockItems" stripe style="width: 100%">
        <el-table-column prop="name" label="物品" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="当前/最低" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c;">{{ row.quantity }}</span> / {{ row.min_quantity }} {{ row.unit }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>