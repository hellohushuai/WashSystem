<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore, type Customer } from '@/stores/customers'

const router = useRouter()
const customerStore = useCustomerStore()
const customers = ref<Customer[]>([])
const searchQuery = ref('')
const loading = ref(true)

const filteredCustomers = computed(() => {
  if (!searchQuery.value) {
    return customers.value
  }
  const q = searchQuery.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.toLowerCase().includes(q)
  )
})

// Get avatar initials from customer name
const getAvatarInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

onMounted(async () => {
  try {
    await customerStore.loadCustomers()
    customers.value = customerStore.customers
  } catch (error) {
    console.error('Failed to load customers:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="customers-content">
    <!-- 标题 -->
    <div class="page-header">
      <h2 class="font-headline text-xl font-bold">客户管理</h2>
      <p class="text-sm text-secondary mt-1">管理您的尊贵会员</p>
    </div>

    <!-- 搜索 -->
    <div class="relative mb-4">
      <span class="material-symbols-outlined search-icon">search</span>
      <input
        v-model="searchQuery"
        class="input-mobile-search"
        placeholder="搜索姓名或电话..."
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="text-secondary text-sm">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredCustomers.length === 0" class="empty-state">
      <span class="material-symbols-outlined empty-icon">group</span>
      <p class="text-secondary">暂无客户</p>
      <p v-if="searchQuery" class="text-secondary text-sm">试试其他搜索词</p>
    </div>

    <!-- 客户列表 -->
    <div v-else class="customers-list">
      <div
        v-for="customer in filteredCustomers"
        :key="customer.id"
        class="card-mobile customer-card"
        @click="router.push(`/mobile/customers/${customer.id}`)"
      >
        <div class="customer-avatar">
          <span class="avatar-initials">{{ getAvatarInitials(customer.name) }}</span>
        </div>
        <div class="customer-info">
          <h3 class="customer-name">{{ customer.name }}</h3>
          <p class="customer-phone">{{ customer.phone }}</p>
        </div>
        <div class="customer-balance">
          <span class="balance-label">余额</span>
          <span class="balance-amount">¥{{ (customer.balance || 0).toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="router.push('/mobile/customers/create')">
      <span class="material-symbols-outlined">add</span>
    </button>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.customers-content {
  padding: 0;
}

/* 搜索图标 */
.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--on-surface-variant);
  font-size: 20px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--surface-container-high);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
  color: var(--on-surface-variant);
  opacity: 0.5;
}

/* 客户列表 */
.customers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 100px;
}

/* 客户卡片 */
.customer-card {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.customer-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* 客户头像 */
.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-fixed);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-initials {
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

/* 客户信息 */
.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-name {
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 600;
  color: var(--on-surface);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.customer-phone {
  font-size: 13px;
  color: var(--on-surface-variant);
  margin: 4px 0 0 0;
}

/* 客户余额 */
.customer-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.balance-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.balance-amount {
  font-family: var(--font-headline);
  font-size: 15px;
  font-weight: 700;
  color: var(--tertiary);
  margin-top: 2px;
}
</style>