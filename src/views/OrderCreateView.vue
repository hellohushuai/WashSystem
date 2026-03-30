<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'
import { useCustomerStore, type Customer } from '@/stores/customers'
import { useRackStore } from '@/stores/rack'
import { useTypesStore } from '@/stores/types'
import { ElMessage } from 'element-plus'

const router = useRouter()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const rackStore = useRackStore()
const typesStore = useTypesStore()

// Form state
const selectedCustomerId = ref<number | null>(null)
const items = ref<{ id: number; garment_type: string; service_type: string; price: number; notes: string }[]>([])
const notes = ref('')

// UI state
const showCustomerSelect = ref(false)
const customerSearch = ref('')
const freeHookCount = ref(0)

// Computed
const selectedCustomer = computed(() => {
  if (!selectedCustomerId.value) return null
  return customerStore.customers.find(c => c.id === selectedCustomerId.value) || null
})

const discount = computed(() => {
  return selectedCustomer.value?.discount ?? 1.0
})

const discountRate = computed(() => {
  return discount.value * 100
})

const subtotal = computed(() => {
  return items.value.reduce((sum, item) => sum + item.price, 0)
})

const totalAmount = computed(() => {
  return subtotal.value * discount.value
})

const canSubmit = computed(() => {
  return selectedCustomerId.value !== null && items.value.length > 0
})

// Get garment types and service types from store
const garmentTypes = computed(() => {
  return typesStore.garmentTypes.filter(t => t.is_active).map(t => ({ name: t.name, price: t.price }))
})

const serviceTypes = computed(() => {
  return typesStore.serviceTypes.filter(t => t.is_active).map(t => ({ name: t.name, price: t.price }))
})

// Auto-calculate price when garment_type or service_type changes
function calculatePrice(item: { garment_type: string; service_type: string }): number {
  const garment = garmentTypes.value.find(g => g.name === item.garment_type)
  const service = serviceTypes.value.find(s => s.name === item.service_type)
  return (garment?.price || 0) + (service?.price || 0)
}

function updatePrice(item: { id: number; garment_type: string; service_type: string; price: number; notes: string }) {
  const idx = items.value.findIndex(i => i.id === item.id)
  if (idx > -1) {
    items.value[idx].price = calculatePrice(item)
  }
}

// Load data
onMounted(async () => {
  await Promise.all([
    customerStore.loadCustomers(),
    typesStore.loadGarmentTypes(),
    typesStore.loadServiceTypes()
  ])
  freeHookCount.value = await rackStore.getFreeCount()
})

// Actions
function addItem() {
  items.value.push({
    id: Date.now(),
    garment_type: '',
    service_type: '',
    price: 0,
    notes: '',
  })
}

function removeItem(id: number) {
  const index = items.value.findIndex(i => i.id === id)
  if (index > -1) {
    items.value.splice(index, 1)
  }
}

async function handleSelectCustomer(customer: Customer) {
  selectedCustomerId.value = customer.id
  showCustomerSelect.value = false
  customerSearch.value = ''
}

function handleCustomerSearch() {
  customerStore.loadCustomers(customerSearch.value || undefined)
}

async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请选择客户并添加至少一件衣物')
    return
  }

  // Validate items
  for (let i = 0; i < items.value.length; i++) {
    const item = items.value[i]
    if (!item.garment_type || !item.service_type) {
      ElMessage.warning(`第 ${i + 1} 件衣物：请选择衣物类型和服务类型`)
      return
    }
    if (item.price <= 0) {
      ElMessage.warning(`第 ${i + 1} 件衣物：请输入有效的价格`)
      return
    }
  }

  try {
    const validItems = items.value.map(item => ({
      garment_type: item.garment_type,
      service_type: item.service_type,
      price: item.price,
      notes: item.notes,
    }))

    const orderId = await orderStore.createOrder(
      selectedCustomerId.value!,
      validItems,
      notes.value
    )

    ElMessage.success('订单创建成功')
    router.push(`/orders/${orderId}`)
  } catch (e: any) {
    ElMessage.error(e.message || '创建订单失败')
  }
}

function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

function goBack() {
  router.back()
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-button @click="goBack">返回</el-button>
        <h2>新建订单</h2>
      </div>
      <div style="color: var(--text-secondary);">
        空闲挂钩: {{ freeHookCount }}
      </div>
    </div>

    <el-row :gutter="20">
      <!-- Left: Customer & Items -->
      <el-col :span="16">
        <!-- Customer Selection -->
        <el-card style="margin-bottom: 16px;">
          <template #header>
            <span>客户信息</span>
          </template>
          <div v-if="selectedCustomer" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 16px; font-weight: 500;">{{ selectedCustomer.name }}</div>
              <div style="color: var(--text-secondary);">{{ selectedCustomer.phone }}</div>
            </div>
            <div style="text-align: right;">
              <el-tag v-if="selectedCustomer.level_name" size="small">{{ selectedCustomer.level_name }}</el-tag>
              <div v-if="discount < 1" style="color: var(--el-color-success); margin-top: 4px;">
                折扣: {{ discountRate }}%
              </div>
              <div style="color: var(--text-secondary); font-size: 12px;">
                积分: {{ selectedCustomer.points }}
              </div>
            </div>
            <el-button type="primary" link @click="showCustomerSelect = true">更换客户</el-button>
          </div>
          <div v-else>
            <el-button type="primary" @click="showCustomerSelect = true">选择客户</el-button>
          </div>
        </el-card>

        <!-- Items -->
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>衣物明细</span>
              <el-button size="small" type="primary" @click="addItem" :disabled="items.length >= 50">
                + 添加衣物
              </el-button>
            </div>
          </template>

          <el-table :data="items" empty-text="请点击上方添加衣物" style="width: 100%;">
            <el-table-column label="衣物类型" width="140">
              <template #default="{ row }">
                <el-select v-model="row.garment_type" placeholder="选择类型" filterable @change="updatePrice(row)">
                  <el-option v-for="t in garmentTypes" :key="t.name" :label="t.name" :value="t.name" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="服务类型" width="140">
              <template #default="{ row }">
                <el-select v-model="row.service_type" placeholder="选择服务" filterable @change="updatePrice(row)">
                  <el-option v-for="t in serviceTypes" :key="t.name" :label="t.name" :value="t.name" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="价格" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" :step="1" controls-position="right" style="width: 100%;" />
              </template>
            </el-table-column>
            <el-table-column label="备注">
              <template #default="{ row }">
                <el-input v-model="row.notes" placeholder="可选备注" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="danger" link @click="removeItem(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- Right: Summary -->
      <el-col :span="8">
        <el-card style="position: sticky; top: 20px;">
          <template #header>
            <span>订单汇总</span>
          </template>

          <div style="margin-bottom: 16px;">
            <el-input
              v-model="notes"
              type="textarea"
              placeholder="订单备注（可选）"
              :rows="3"
            />
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: var(--text-secondary);">衣物数量:</span>
              <span>{{ items.length }} 件</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: var(--text-secondary);">原价:</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </div>
            <div v-if="discount < 1" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: var(--text-secondary);">折扣:</span>
              <span style="color: var(--el-color-success);">{{ discountRate }}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin: 16px 0; padding-top: 16px; border-top: 1px solid var(--border-color);">
              <span>合计:</span>
              <span style="color: var(--el-color-danger);">{{ formatPrice(totalAmount) }}</span>
            </div>
          </div>

          <el-button
            type="primary"
            size="large"
            style="width: 100%;"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            创建订单
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- Customer Select Dialog -->
    <el-dialog v-model="showCustomerSelect" title="选择客户" width="500px">
      <el-input
        v-model="customerSearch"
        placeholder="搜索姓名或手机号"
        clearable
        style="margin-bottom: 16px;"
        @input="handleCustomerSearch"
        @clear="handleCustomerSearch"
      />
      <el-table
        :data="customerStore.customers"
        style="width: 100%; max-height: 400px; overflow-y: auto;"
        @row-click="(row: Customer) => handleSelectCustomer(row)"
      >
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="level_name" label="等级" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.level_name" size="small">{{ row.level_name }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" />
      </el-table>
    </el-dialog>
  </div>
</template>