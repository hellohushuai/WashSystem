<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFinanceStore, type DailyReport } from '@/stores/finance'
import { ElMessage } from 'element-plus'

const store = useFinanceStore()
const activeTab = ref('ledger')
const dateRange = ref<[string, string] | null>(null)
const typeFilter = ref('')

// Add record form
const showAddDialog = ref(false)
const form = ref({ type: '支出', amount: 0, category: '其他', description: '' })
const expenseCategories = ['耗材采购', '水电费', '房租', '其他']

// Reports
const dailyDate = ref(new Date().toISOString().split('T')[0])
const dailyReport = ref<DailyReport | null>(null)
const monthYear = ref(new Date().getFullYear())
const monthMonth = ref(new Date().getMonth() + 1)
const monthlyData = ref<DailyReport[]>([])

onMounted(() => store.loadRecords())

async function handleFilter() {
  await store.loadRecords({
    type: typeFilter.value || undefined,
    dateFrom: dateRange.value?.[0],
    dateTo: dateRange.value?.[1],
  })
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
}

async function loadDailyReport() {
  dailyReport.value = await store.getDailyReport(dailyDate.value)
}

async function loadMonthlyReport() {
  monthlyData.value = await store.getMonthlyReport(monthYear.value, monthMonth.value)
}
</script>

<template>
  <div>
    <h2 style="margin-bottom: 16px;">财务管理</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="收支流水" name="ledger">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-select v-model="typeFilter" placeholder="类型" clearable style="width: 100px;" @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="收入" value="收入" />
            <el-option label="支出" value="支出" />
          </el-select>
          <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="handleFilter" />
          <el-button type="primary" @click="showAddDialog = true">手动记账</el-button>
        </div>

        <el-table :data="store.records" stripe style="background: var(--card-bg);" empty-text="暂无记录">
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

      <el-tab-pane label="日结报表" name="daily">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-date-picker v-model="dailyDate" type="date" value-format="YYYY-MM-DD" />
          <el-button type="primary" @click="loadDailyReport">查询</el-button>
        </div>
        <el-descriptions v-if="dailyReport" :column="3" border>
          <el-descriptions-item label="日期">{{ dailyReport.date }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ dailyReport.order_count }}</el-descriptions-item>
          <el-descriptions-item label="收入">
            <span style="color: #67c23a;">¥{{ dailyReport.income.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="支出">
            <span style="color: #f56c6c;">¥{{ dailyReport.expense.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="利润">
            <span style="font-weight: bold;">¥{{ (dailyReport.income - dailyReport.expense).toFixed(2) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="月报表" name="monthly">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-input-number v-model="monthYear" :min="2020" :max="2099" />
          <el-select v-model="monthMonth" style="width: 80px;">
            <el-option v-for="m in 12" :key="m" :label="`${m}月`" :value="m" />
          </el-select>
          <el-button type="primary" @click="loadMonthlyReport">查询</el-button>
        </div>
        <el-table :data="monthlyData" stripe show-summary :summary-method="(param: any) => {
          const data = param.data as DailyReport[]
          const income = data.reduce((s, r) => s + r.income, 0)
          const expense = data.reduce((s, r) => s + r.expense, 0)
          return ['合计', '¥' + income.toFixed(2), '¥' + expense.toFixed(2), '¥' + (income - expense).toFixed(2)]
        }" empty-text="暂无数据">
          <el-table-column prop="date" label="日期" />
          <el-table-column prop="income" label="收入">
            <template #default="{ row }">¥{{ row.income.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="expense" label="支出">
            <template #default="{ row }">¥{{ row.expense.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="利润">
            <template #default="{ row }">¥{{ (row.income - row.expense).toFixed(2) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

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
  </div>
</template>