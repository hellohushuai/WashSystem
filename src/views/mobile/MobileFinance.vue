<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '@/stores/finance'

const router = useRouter()
const financeStore = useFinanceStore()

const loading = ref(true)
const todayIncome = ref(0)
const totalIncome = ref(0)
const totalExpense = ref(0)
const netProfit = ref(0)

// Format currency
const formatCurrency = (amount: number) => {
  return amount.toFixed(2)
}

// Get today's date string
const getTodayDate = () => {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

onMounted(async () => {
  try {
    // Load today's report
    const todayReport = await financeStore.getDailyReport(getTodayDate())
    todayIncome.value = todayReport.order_income + todayReport.recharge_income + todayReport.manual_income

    // Load summary
    const summary = await financeStore.getSummary()
    totalIncome.value = summary.total_order_income + summary.total_recharge_income + summary.total_manual_income
    totalExpense.value = summary.total_purchase_expense + summary.total_manual_expense
    netProfit.value = summary.net_profit
  } catch (error) {
    console.error('Failed to load finance data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="finance-page">
    <!-- 标题区域 -->
    <div class="page-header">
      <h1 class="page-title">财务管理</h1>
      <p class="page-subtitle">营收数据概览</p>
    </div>

    <!-- Hero: 今日收入卡片 -->
    <section class="mb-6">
      <div class="today-income-card">
        <div class="card-content">
          <p class="card-label">今日收入</p>
          <h2 class="card-amount">¥{{ formatCurrency(todayIncome) }}</h2>
          <div class="card-badge">
            <span class="material-symbols-outlined text-sm">trending_up</span>
            <span class="badge-text">实时数据</span>
          </div>
        </div>
        <div class="card-icon">
          <span class="material-symbols-outlined">account_balance_wallet</span>
        </div>
      </div>
    </section>

    <!-- Stats Grid: 三列统计 -->
    <section class="stats-grid mb-6">
      <div class="stat-card">
        <div class="stat-icon income">
          <span class="material-symbols-outlined">arrow_upward</span>
        </div>
        <p class="stat-label">总收入</p>
        <p class="stat-value">¥{{ formatCurrency(totalIncome) }}</p>
      </div>
      <div class="stat-card">
        <div class="stat-icon expense">
          <span class="material-symbols-outlined">arrow_downward</span>
        </div>
        <p class="stat-label">总支出</p>
        <p class="stat-value">¥{{ formatCurrency(totalExpense) }}</p>
      </div>
      <div class="stat-card">
        <div class="stat-icon profit">
          <span class="material-symbols-outlined">savings</span>
        </div>
        <p class="stat-label">净利润</p>
        <p class="stat-value" :class="{ 'text-red-500': netProfit < 0 }">¥{{ formatCurrency(netProfit) }}</p>
      </div>
    </section>

    <!-- 快捷操作 -->
    <section class="quick-actions">
      <h3 class="section-title">快捷操作</h3>
      <div class="actions-grid">
        <button class="action-card" @click="router.push('/finance')">
          <div class="action-icon">
            <span class="material-symbols-outlined">edit_note</span>
          </div>
          <span class="action-label">手工记账</span>
        </button>
        <button class="action-card" @click="router.push('/inventory')">
          <div class="action-icon purchase">
            <span class="material-symbols-outlined">shopping_cart</span>
          </div>
          <span class="action-label">采购记录</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.finance-page {
  padding: 1.5rem;
  padding-bottom: 6rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-on-surface, #191c1e);
  margin: 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-secondary, #5c5f61);
  margin-top: 0.25rem;
}

/* 今日收入卡片 - 绿色渐变 */
.today-income-card {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
}

.card-content {
  position: relative;
  z-index: 10;
}

.card-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.card-amount {
  font-family: 'Manrope', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  margin: 0;
  line-height: 1;
  letter-spacing: -0.02em;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-top: 1rem;
}

.card-badge .text-sm {
  font-size: 0.875rem;
}

.badge-text {
  font-size: 0.6875rem;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-icon {
  position: absolute;
  right: -1rem;
  bottom: -1rem;
  width: 6rem;
  height: 6rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon .material-symbols-outlined {
  font-size: 2.5rem;
  color: white;
}

/* Stats Grid - 三列 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stat-card {
  background: var(--color-surface-container-lowest, #ffffff);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.stat-icon.income {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-icon.expense {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.stat-icon.profit {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-secondary, #5c5f61);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-on-surface, #191c1e);
}

.stat-value.text-red-500 {
  color: #ef4444;
}

/* 快捷操作 */
.quick-actions {
  margin-top: 1rem;
}

.section-title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-on-surface, #191c1e);
  margin: 0 0 1rem 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.action-card {
  background: var(--color-surface-container-lowest, #ffffff);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.action-card:active {
  transform: scale(0.98);
}

.action-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.action-icon.purchase {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.action-icon .material-symbols-outlined {
  font-size: 1.5rem;
}

.action-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface, #191c1e);
}
</style>