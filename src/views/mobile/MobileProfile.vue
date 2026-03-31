<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCustomerStore } from '@/stores/customers'

const customerStore = useCustomerStore()

const loading = ref(false)
const customers = ref<any[]>([])
const showRechargeModal = ref(false)
const selectedCustomer = ref<any>(null)
const rechargeAmount = ref<number>(100)
const rechargeMethod = ref('现金')
const rechargeLoading = ref(false)

const methods = ['现金', '微信', '支付宝', '银行卡']

onMounted(async () => {
  await loadCustomers()
})

async function loadCustomers() {
  loading.value = true
  try {
    await customerStore.loadCustomers()
    customers.value = customerStore.customers.slice(0, 20) // 限制显示前20个客户
  } catch (e) {
    console.error('Failed to load customers:', e)
  } finally {
    loading.value = false
  }
}

function openRecharge(customer: any) {
  selectedCustomer.value = customer
  rechargeAmount.value = 100
  rechargeMethod.value = '现金'
  showRechargeModal.value = true
}

async function submitRecharge() {
  if (!selectedCustomer.value || rechargeAmount.value <= 0 || rechargeLoading.value) return

  rechargeLoading.value = true
  try {
    await customerStore.recharge(selectedCustomer.value.id, rechargeAmount.value, rechargeMethod.value)
    alert('充值成功！')
    showRechargeModal.value = false
    await loadCustomers()
  } catch (e: any) {
    alert(e.message || '充值失败')
  } finally {
    rechargeLoading.value = false
  }
}
</script>

<template>
  <div class="mobile-page">
    <div class="profile-header">
      <div class="avatar">
        <span class="material-symbols-outlined">person</span>
      </div>
      <h2 class="profile-title">客户管理</h2>
      <p class="profile-subtitle">选择客户进行充值</p>
    </div>

    <div class="customer-list">
      <div
        v-for="customer in customers"
        :key="customer.id"
        class="card-mobile customer-card"
      >
        <div class="customer-info">
          <div class="customer-avatar">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="customer-details">
            <h3 class="customer-name">{{ customer.name }}</h3>
            <p class="customer-phone">{{ customer.phone }}</p>
            <p class="customer-balance">余额: ¥{{ (customer.balance || 0).toFixed(2) }}</p>
          </div>
        </div>
        <button class="btn-recharge" @click="openRecharge(customer)">
          充值
        </button>
      </div>

      <p v-if="customers.length === 0 && !loading" class="empty-text">
        暂无客户数据
      </p>
    </div>

    <!-- 充值弹窗 -->
    <div v-if="showRechargeModal" class="modal-overlay" @click.self="showRechargeModal = false">
      <div class="modal-content">
        <h3 class="modal-title">充值</h3>
        <p v-if="selectedCustomer" class="modal-subtitle">
          {{ selectedCustomer.name }} - 当前余额: ¥{{ (selectedCustomer.balance || 0).toFixed(2) }}
        </p>

        <div class="form-group">
          <label class="form-label">充值金额</label>
          <input
            v-model.number="rechargeAmount"
            type="number"
            class="input-mobile"
            placeholder="请输入充值金额"
            min="1"
          />
        </div>

        <div class="form-group">
          <label class="form-label">支付方式</label>
          <div class="method-options">
            <button
              v-for="m in methods"
              :key="m"
              class="method-btn"
              :class="{ active: rechargeMethod === m }"
              @click="rechargeMethod = m"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showRechargeModal = false">取消</button>
          <button class="btn-confirm" @click="submitRecharge" :disabled="rechargeLoading">
            {{ rechargeLoading ? '充值中...' : '确认充值' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.profile-header {
  text-align: center;
  padding: 24px 16px;
  margin-bottom: 16px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--surface-container);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.avatar .material-symbols-outlined {
  font-size: 40px;
  color: var(--primary);
}

.profile-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--on-surface);
  margin-bottom: 4px;
}

.profile-subtitle {
  font-size: 14px;
  color: var(--on-surface-variant);
}

.customer-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-container);
  display: flex;
  align-items: center;
  justify-content: center;
}

.customer-avatar .material-symbols-outlined {
  font-size: 24px;
  color: var(--on-surface-variant);
}

.customer-details {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--on-surface);
}

.customer-phone {
  font-size: 13px;
  color: var(--on-surface-variant);
}

.customer-balance {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
  margin-top: 2px;
}

.btn-recharge {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.btn-recharge:active {
  background: var(--primary-darken);
}

.empty-text {
  text-align: center;
  color: var(--on-surface-variant);
  padding: 40px;
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

.btn-confirm:active {
  background: var(--primary-darken);
}
</style>