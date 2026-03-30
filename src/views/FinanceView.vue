<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFinanceStore, type DailyReport, type FinanceSummary, type RechargeRecord, type PurchaseRecord } from '@/stores/finance'
import { ElMessage } from 'element-plus'

const store = useFinanceStore()
const activeTab = ref('summary')
const dateRange = ref<[string, string] | null>(null)

// Summary data
const summary = ref<FinanceSummary | null>(null)

// Add record form
const showAddDialog = ref(false)
const showPurchaseDialog = ref(false)
const form = ref({ type: '支出', amount: 0, category: '其他', description: '' })
const purchaseForm = ref({ item_name: '', quantity: 1, unit_price: 0, supplier: '', notes: '' })
const expenseCategories = ['耗材采购', '水电费', '房租', '其他']

// Reports
const dailyDate = ref(new Date().toISOString().split('T')[0])
const dailyReport = ref<DailyReport | null>(null)
const monthYear = ref(new Date().getFullYear())
const monthMonth = ref(new Date().getMonth() + 1)
const monthlyData = ref<DailyReport[]>([])

// Recharges and purchases
const rechargeRecords = ref<RechargeRecord[]>([])
const purchaseRecords = ref<PurchaseRecord[]>([])

onMounted(async () => {
  await loadSummary()
})

async function loadSummary() {
  const filters = dateRange.value ? { dateFrom: dateRange.value[0], dateTo: dateRange.value[1] } : undefined
  summary.value = await store.getSummary(filters)
}

async function loadDailyReport() {
  dailyReport.value = await store.getDailyReport(dailyDate.value)
}

async function loadMonthlyReport() {
  monthlyData.value = await store.getMonthlyReport(monthYear.value, monthMonth.value)
}

async function loadRechargeRecords() {
  const filters = dateRange.value ? { dateFrom: dateRange.value[0], dateTo: dateRange.value[1] } : undefined
  rechargeRecords.value = await store.loadRechargeRecords(filters)
}

async function loadPurchaseRecords() {
  const filters = dateRange.value ? { dateFrom: dateRange.value[0], dateTo: dateRange.value[1] } : undefined
  purchaseRecords.value = await store.loadPurchaseRecords(filters)
}

async function handleFilter() {
  await loadSummary()
  if (activeTab.value === 'recharges') {
    await loadRechargeRecords()
  } else if (activeTab.value === 'purchases') {
    await loadPurchaseRecords()
  }
}

async function handleAddRecord() {
  if (form.value.amount <= 0) {
    ElMessage.warning('请填写金额')
    return
  }
  await store.addRecord(form.value)
  ElMessage.success('记录添加成功')
  showAddDialog.value = false
  form.value = { type: '支出', amount: 0, category: '其他', description: '' }
  await loadSummary()
}

async function handleAddPurchase() {
  if (!purchaseForm.value.item_name || purchaseForm.value.quantity <= 0) {
    ElMessage.warning('请填写完整的采购信息')
    return
  }
  await store.addPurchaseRecord(purchaseForm.value)
  ElMessage.success('采购记录添加成功')
  showPurchaseDialog.value = false
  purchaseForm.value = { item_name: '', quantity: 1, unit_price: 0, supplier: '', notes: '' }
  await loadSummary()
}

// Switch tab handler
async function handleTabChange(tab: string) {
  if (tab === 'recharges') {
    await loadRechargeRecords()
  } else if (tab === 'purchases') {
    await loadPurchaseRecords()
  }
}
</script>

<template>
  <div>
    <h2 style="margin-bottom: 16px;">财务管理</h2>

    <!-- Date filter -->
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        @change="handleFilter"
      />
      <el-button type="primary" @click="dateRange = null; handleFilter()">清除筛选</el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- Summary -->
      <el-tab-pane label="财务概览" name="summary">
        <div v-if="summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <el-card shadow="hover">
            <template #header>
              <span style="color: var(--text-secondary);">收入合计</span>
            </template>
            <div style="font-size: 28px; font-weight: bold; color: #67c23a;">
              ¥{{ (summary.total_order_income + summary.total_recharge_income + summary.total_manual_income).toFixed(2) }}
            </div>
          </el-card>
          <el-card shadow="hover">
            <template #header>
              <span style="color: var(--text-secondary);">支出合计</span>
            </template>
            <div style="font-size: 28px; font-weight: bold; color: #f56c6c;">
              ¥{{ (summary.total_purchase_expense + summary.total_manual_expense).toFixed(2) }}
            </div>
          </el-card>
          <el-card shadow="hover">
            <template #header>
              <span style="color: var(--text-secondary);">净利润</span>
            </template>
            <div style="font-size: 28px; font-weight: bold;" :style="{ color: summary.net_profit >= 0 ? '#67c23a' : '#f56c6c' }">
              ¥{{ summary.net_profit.toFixed(2) }}
            </div>
          </el-card>
        </div>

        <!-- Breakdown -->
        <div v-if="summary" style="margin-top: 24px;">
          <h3 style="margin-bottom: 12px;">收入明细</h3>
          <el-table :data="[
            { name: '订单收入', amount: summary.total_order_income },
            { name: '充值收入', amount: summary.total_recharge_income },
            { name: '其他收入', amount: summary.total_manual_income },
          ]" stripe style="background: var(--card-bg);" show-summary>
            <el-table-column prop="name" label="项目" />
            <el-table-column prop="amount" label="金额">
              <template #default="{ row }">
                <span style="color: #67c23a;">¥{{ row.amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <h3 style="margin: 24px 0 12px;">支出明细</h3>
          <el-table :data="[
            { name: '采购支出', amount: summary.total_purchase_expense },
            { name: '其他支出', amount: summary.total_manual_expense },
          ]" stripe style="background: var(--card-bg);" show-summary>
            <el-table-column prop="name" label="项目" />
            <el-table-column prop="amount" label="金额">
              <template #default="{ row }">
                <span style="color: #f56c6c;">¥{{ row.amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Recharges -->
      <el-tab-pane label="充值记录" name="recharges">
        <el-table :data="rechargeRecords" stripe style="background: var(--card-bg);" empty-text="暂无记录">
          <el-table-column prop="customer_name" label="客户" width="120" />
          <el-table-column prop="amount" label="充值金额" width="120">
            <template #default="{ row }">
              <span style="color: #67c23a;">+¥{{ row.amount.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式" width="100" />
          <el-table-column prop="description" label="备注" />
          <el-table-column prop="created_at" label="时间" width="180" />
        </el-table>
      </el-tab-pane>

      <!-- Purchases -->
      <el-tab-pane label="采购记录" name="purchases">
        <div style="margin-bottom: 16px;">
          <el-button type="primary" @click="showPurchaseDialog = true">添加采购</el-button>
        </div>
        <el-table :data="purchaseRecords" stripe style="background: var(--card-bg);" empty-text="暂无记录">
          <el-table-column prop="item_name" label="物品" width="150" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit_price" label="单价" width="100">
            <template #default="{ row }">¥{{ row.unit_price.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="total_amount" label="总价" width="100">
            <template #default="{ row }">
              <span style="color: #f56c6c;">¥{{ (row.total_amount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="supplier" label="供应商" width="120" />
          <el-table-column prop="notes" label="备注" />
          <el-table-column prop="created_at" label="时间" width="180" />
        </el-table>
      </el-tab-pane>

      <!-- Daily Report -->
      <el-tab-pane label="日结报表" name="daily">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-date-picker v-model="dailyDate" type="date" value-format="YYYY-MM-DD" />
          <el-button type="primary" @click="loadDailyReport">查询</el-button>
        </div>
        <el-descriptions v-if="dailyReport" :column="3" border>
          <el-descriptions-item label="日期">{{ dailyReport.date }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ dailyReport.order_count }}</el-descriptions-item>
          <el-descriptions-item label="订单收入">
            <span style="color: #67c23a;">¥{{ dailyReport.order_income.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="充值收入">
            <span style="color: #67c23a;">¥{{ dailyReport.recharge_income.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="采购支出">
            <span style="color: #f56c6c;">¥{{ dailyReport.purchase_expense.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="其他收支">
            <span :style="{ color: (dailyReport.manual_income - dailyReport.manual_expense) >= 0 ? '#67c23a' : '#f56c6c' }">
              ¥{{ (dailyReport.manual_income - dailyReport.manual_expense).toFixed(2) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <!-- Monthly Report -->
      <el-tab-pane label="月报表" name="monthly">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-input-number v-model="monthYear" :min="2020" :max="2099" />
          <el-select v-model="monthMonth" style="width: 80px;">
            <el-option v-for="m in 12" :key="m" :label="`${m}月`" :value="m" />
          </el-select>
          <el-button type="primary" @click="loadMonthlyReport">查询</el-button>
        </div>
        <el-table :data="monthlyData" stripe empty-text="暂无数据">
          <el-table-column prop="date" label="日期" />
          <el-table-column label="订单收入">
            <template #default="{ row }">¥{{ (row.order_income || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="充值收入">
            <template #default="{ row }">¥{{ (row.recharge_income || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="采购支出">
            <template #default="{ row }">¥{{ (row.purchase_expense || 0).toFixed(2) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Manual Records -->
      <el-tab-pane label="手工记账" name="manual">
        <div style="margin-bottom: 16px;">
          <el-button type="primary" @click="showAddDialog = true">手动记账</el-button>
        </div>
        <el-table :data="store.records.filter(r => r.source === 'manual')" stripe style="background: var(--card-bg);" empty-text="暂无记录">
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === '收入' ? 'success' : 'danger'" size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">
              <span :style="{ color: row.type === '收入' ? '#67c23a' : '#f56c6c' }">
                {{ row.type === '收入' ? '+' : '-' }}¥{{ row.amount.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="created_at" label="时间" width="180" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- Add Manual Record Dialog -->
    <el-dialog v-model="showAddDialog" title="手动记账" width="420px">
      <el-form label-width="60px">
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="收入">收入</el-radio>
            <el-radio value="支出">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="c in expenseCategories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddRecord">确认</el-button>
      </template>
    </el-dialog>

    <!-- Add Purchase Dialog -->
    <el-dialog v-model="showPurchaseDialog" title="添加采购" width="420px">
      <el-form label-width="70px">
        <el-form-item label="物品名称">
          <el-input v-model="purchaseForm.item_name" placeholder="如：洗涤剂、衣架" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="purchaseForm.quantity" :min="1" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="purchaseForm.unit_price" :min="0" :precision="2" />
          <span style="margin-left: 8px;">元</span>
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="purchaseForm.supplier" placeholder="可选" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="purchaseForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPurchaseDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddPurchase">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>