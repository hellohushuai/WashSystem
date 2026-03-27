<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore, type Customer } from '@/stores/customers'
import { useOrderStore, type Order } from '@/stores/orders'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const orderStore = useOrderStore()

const customer = ref<Customer | null>(null)
const orders = ref<Order[]>([])
const editing = ref(false)
const form = ref({ name: '', phone: '', membership_level_id: undefined as number | undefined, notes: '' })

onMounted(async () => {
  await customerStore.loadLevels()
  const id = Number(route.params.id)
  const c = await customerStore.getCustomer(id)
  if (c) {
    customer.value = c
    form.value = { name: c.name, phone: c.phone, membership_level_id: c.membership_level_id ?? undefined, notes: c.notes }
  }
  await orderStore.loadOrders({ search: c?.phone })
  orders.value = orderStore.orders
})

async function handleSave() {
  if (!customer.value) return
  try {
    await customerStore.updateCustomer(customer.value.id, form.value)
    customer.value = await customerStore.getCustomer(customer.value.id) ?? null
    editing.value = false
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}
</script>

<template>
  <div v-if="customer">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>客户详情</h2>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>基本信息</span>
          <el-button v-if="!editing" size="small" @click="editing = true">编辑</el-button>
        </div>
      </template>
      <el-form v-if="editing" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="form.membership_level_id" clearable>
            <el-option v-for="l in customerStore.levels" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" /></el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存</el-button>
          <el-button @click="editing = false">取消</el-button>
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="2" border>
        <el-descriptions-item label="姓名">{{ customer.name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ customer.phone }}</el-descriptions-item>
        <el-descriptions-item label="会员等级">{{ customer.level_name || '无' }}</el-descriptions-item>
        <el-descriptions-item label="积分">{{ customer.points }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ customer.created_at }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ customer.notes || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="hover" style="background: var(--card-bg); border-color: var(--border-color);">
      <template #header>历史订单</template>
      <el-table :data="orders" stripe empty-text="暂无订单">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="status" label="状态" width="100" />
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
  </div>
</template>