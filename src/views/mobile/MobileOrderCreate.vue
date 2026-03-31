<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orders'
import { useCustomerStore } from '@/stores/customers'
import { useTypesStore } from '@/stores/types'

const router = useRouter()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const typesStore = useTypesStore()

const customers = ref<any[]>([])
const selectedCustomer = ref<any>(null)
const items = ref<any[]>([{ garment_type: '', service_type: '', price: 0, notes: '' }])
const notes = ref('')

// Form state
const showCustomerSelect = ref(false)
const submitting = ref(false)
const customerSearchQuery = ref('')

const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value) return customers.value
  const q = customerSearchQuery.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q)
  )
})

const totalPrice = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.price || 0), 0)
})

const canSubmit = computed(() => {
  return selectedCustomer.value && items.value.length > 0 &&
    items.value.every(item => item.garment_type && item.service_type && item.price > 0)
})

onMounted(async () => {
  try {
    await customerStore.loadCustomers()
    customers.value = customerStore.customers
    await typesStore.loadGarmentTypes()
    await typesStore.loadServiceTypes()
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

function addItem() {
  items.value.push({ garment_type: '', service_type: '', price: 0, notes: '' })
}

function removeItem(index: number) {
  if (items.value.length > 1) {
    items.value.splice(index, 1)
  }
}

function selectCustomer(customer: any) {
  selectedCustomer.value = customer
  showCustomerSelect.value = false
}

function updatePrice(index: number) {
  const item = items.value[index]
  const garment = typesStore.garmentTypes.find(g => g.name === item.garment_type)
  const service = typesStore.serviceTypes.find(s => s.name === item.service_type)

  if (garment && service) {
    item.price = garment.price + service.price
  }
}

async function submitOrder() {
  if (!canSubmit.value || !selectedCustomer.value) return

  submitting.value = true
  try {
    const orderItems = items.value.map(item => ({
      garment_type: item.garment_type,
      service_type: item.service_type,
      price: item.price,
      notes: item.notes
    }))

    await orderStore.createOrder(selectedCustomer.value.id, orderItems, notes.value)
    alert('订单创建成功！')
    router.push('/mobile/orders')
  } catch (e: any) {
    alert(e.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mobile-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h2 class="page-title">新建订单</h2>
    </div>

    <div class="form-content">
      <!-- Customer Select -->
      <div class="form-section">
        <label class="form-label">选择客户 *</label>
        <div class="customer-select" @click="showCustomerSelect = true">
          <span v-if="selectedCustomer">{{ selectedCustomer.name }} - {{ selectedCustomer.phone }}</span>
          <span v-else class="placeholder">请选择客户</span>
          <span class="material-symbols-outlined">chevron_right</span>
        </div>
      </div>

      <!-- Order Items -->
      <div class="form-section">
        <div class="section-header">
          <label class="form-label">衣物明细</label>
          <button class="add-btn" @click="addItem">
            <span class="material-symbols-outlined">add</span>
            添加衣物
          </button>
        </div>

        <div v-for="(item, index) in items" :key="index" class="item-card">
          <div class="item-header">
            <span class="item-num">衣物 {{ index + 1 }}</span>
            <button v-if="items.length > 1" class="remove-btn" @click="removeItem(index)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>

          <select v-model="item.garment_type" class="input-mobile" @change="updatePrice(index)">
            <option value="">选择衣物类型</option>
            <option v-for="g in typesStore.garmentTypes" :key="g.id" :value="g.name">
              {{ g.name }} ({{ g.price }}元)
            </option>
          </select>

          <select v-model="item.service_type" class="input-mobile" @change="updatePrice(index)">
            <option value="">选择服务类型</option>
            <option v-for="s in typesStore.serviceTypes" :key="s.id" :value="s.name">
              {{ s.name }} ({{ s.price }}元)
            </option>
          </select>

          <div class="price-row">
            <span class="price-label">价格:</span>
            <span class="price-value">¥{{ item.price.toFixed(2) }}</span>
          </div>

          <input
            v-model="item.notes"
            type="text"
            class="input-mobile"
            placeholder="备注（可选）"
          />
        </div>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <label class="form-label">订单备注</label>
        <textarea v-model="notes" class="input-mobile textarea" placeholder="可选备注"></textarea>
      </div>

      <!-- Total -->
      <div class="total-card">
        <span class="total-label">合计</span>
        <span class="total-value">¥{{ totalPrice.toFixed(2) }}</span>
      </div>

      <!-- Submit -->
      <button class="submit-btn" :disabled="!canSubmit || submitting" @click="submitOrder">
        {{ submitting ? '创建中...' : '创建订单' }}
      </button>
    </div>

    <!-- Customer Select Modal -->
    <div v-if="showCustomerSelect" class="modal-overlay" @click.self="showCustomerSelect = false">
      <div class="modal-content">
        <h3 class="modal-title">选择客户</h3>

        <!-- Search -->
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            v-model="customerSearchQuery"
            type="text"
            placeholder="搜索姓名或电话..."
            class="search-input"
          />
        </div>

        <div class="customer-list">
          <div
            v-for="customer in filteredCustomers"
            :key="customer.id"
            class="customer-item"
            @click="selectCustomer(customer)"
          >
            <span class="customer-name">{{ customer.name }}</span>
            <span class="customer-phone">{{ customer.phone }}</span>
          </div>
          <p v-if="filteredCustomers.length === 0" class="empty-text">暂无客户</p>
        </div>
        <button class="btn-cancel" @click="showCustomerSelect = false">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.page-header {
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

.form-content {
  padding: 16px;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--on-surface);
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
  background: var(--primary-container);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.customer-select {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: 12px;
  cursor: pointer;
}

.customer-select .placeholder {
  color: var(--on-surface-variant);
}

.customer-select .material-symbols-outlined {
  color: var(--on-surface-variant);
}

.item-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-num {
  font-weight: 600;
  font-size: 14px;
}

.remove-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
}

.remove-btn .material-symbols-outlined {
  font-size: 20px;
  color: var(--error);
}

.item-card .input-mobile {
  margin-bottom: 10px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.price-label {
  font-size: 14px;
  color: var(--on-surface-variant);
}

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.total-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--surface);
  border-radius: 12px;
  margin-bottom: 16px;
}

.total-label {
  font-size: 16px;
  font-weight: 600;
}

.total-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.submit-btn {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:active:not(:disabled) {
  background: var(--primary-darken);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-height: 80vh;
  padding: 20px;
  overflow-y: auto;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 16px;
}

.customer-list {
  max-height: 60vh;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: var(--surface-container);
  border-radius: 10px;
}

.search-icon {
  color: var(--on-surface-variant);
  font-size: 20px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--on-surface);
}

.search-input::placeholder {
  color: var(--on-surface-variant);
}

.customer-item {
  display: flex;
  justify-content: space-between;
  padding: 14px;
  border-bottom: 1px solid var(--outline-variant);
  cursor: pointer;
}

.customer-item:active {
  background: var(--surface-container);
}

.customer-name {
  font-weight: 500;
}

.customer-phone {
  color: var(--on-surface-variant);
}

.empty-text {
  text-align: center;
  padding: 24px;
  color: var(--on-surface-variant);
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  margin-top: 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--on-surface);
  background: var(--surface-container);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}
</style>