import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useInventoryStore } from './inventory'

// Financial record type constants
export const FINANCIAL_TYPE_INCOME = '收入'
export const FINANCIAL_TYPE_EXPENSE = '支出'

// Source constants
export const FINANCIAL_SOURCE_ORDER = 'order'
export const FINANCIAL_SOURCE_RECHARGE = 'recharge'
export const FINANCIAL_SOURCE_PURCHASE = 'purchase'
export const FINANCIAL_SOURCE_MANUAL = 'manual'

// Validation constants
const MAX_AMOUNT = 1000000
const MIN_AMOUNT = 0

export interface FinancialRecord {
  id: number
  type: string
  amount: number
  category: string
  source: string
  related_order_id: number | null
  related_customer_id: number | null
  description: string
  created_at: string
}

export interface RechargeRecord {
  id: number
  customer_id: number
  customer_name?: string
  amount: number
  payment_method: string
  description: string
  created_at: string
}

export interface PurchaseRecord {
  id: number
  item_name: string
  quantity: number
  unit_price: number
  total_amount?: number
  supplier: string
  notes: string
  created_at: string
}

export interface DailyReport {
  date: string
  order_income: number
  recharge_income: number
  purchase_expense: number
  manual_income: number
  manual_expense: number
  order_count: number
}

export interface FinanceSummary {
  total_order_income: number
  total_recharge_income: number
  total_purchase_expense: number
  total_manual_income: number
  total_manual_expense: number
  net_profit: number
}

export const useFinanceStore = defineStore('finance', () => {
  const records = ref<FinancialRecord[]>([])

  async function loadRecords(filters?: { dateFrom?: string; dateTo?: string; type?: string }) {
    try {
      let query = supabase
        .from('financial_records')
        .select('*')

      if (filters?.type) {
        // Validate type
        if (filters.type !== FINANCIAL_TYPE_INCOME && filters.type !== FINANCIAL_TYPE_EXPENSE) {
          throw new Error(`无效的财务类型: ${filters.type}`)
        }
        query = query.eq('type', filters.type)
      }
      if (filters?.dateFrom) {
        // Validate date format (simple check)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
          throw new Error('无效的开始日期格式，应为 YYYY-MM-DD')
        }
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
          throw new Error('无效的结束日期格式，应为 YYYY-MM-DD')
        }
        query = query.lte('created_at', filters.dateTo + ' 23:59:59')
      }
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      records.value = data || []
    } catch (error) {
      console.error('Failed to load financial records:', error)
      throw error
    }
  }

  async function addRecord(record: { type: string; amount: number; category: string; description: string; source?: string }) {
    try {
      // Validate type
      if (!record.type || record.type.trim() === '') {
        throw new Error('财务类型不能为空')
      }
      if (record.type !== FINANCIAL_TYPE_INCOME && record.type !== FINANCIAL_TYPE_EXPENSE) {
        throw new Error(`无效的财务类型: ${record.type}，必须是 "${FINANCIAL_TYPE_INCOME}" 或 "${FINANCIAL_TYPE_EXPENSE}"`)
      }

      // Validate amount
      if (typeof record.amount !== 'number') {
        throw new Error('金额必须是数字')
      }
      if (record.amount < MIN_AMOUNT) {
        throw new Error('金额不能为负数')
      }
      if (record.amount > MAX_AMOUNT) {
        throw new Error(`金额不能超过 ${MAX_AMOUNT}`)
      }

      // Validate category
      if (!record.category || record.category.trim() === '') {
        throw new Error('分类不能为空')
      }

      // Validate description (optional, but if provided must be string)
      if (record.description !== undefined && typeof record.description !== 'string') {
        throw new Error('描述必须是字符串')
      }

      const { error } = await supabase
        .from('financial_records')
        .insert([{
          type: record.type,
          amount: record.amount,
          category: record.category,
          source: record.source || FINANCIAL_SOURCE_MANUAL,
          description: record.description || ''
        }])
      if (error) throw error
      await loadRecords()
    } catch (error) {
      console.error('Failed to add financial record:', error)
      throw error
    }
  }

  async function getDailyReport(date: string): Promise<DailyReport> {
    try {
      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('无效的日期格式，应为 YYYY-MM-DD')
      }

      const startOfDay = `${date}T00:00:00`
      const endOfDay = `${date}T23:59:59`

      // Get breakdown by source
      const { data: orderIncomeData } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('source', FINANCIAL_SOURCE_ORDER)
        .eq('type', FINANCIAL_TYPE_INCOME)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
      const orderIncome = orderIncomeData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      const { data: rechargeIncomeData } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('source', FINANCIAL_SOURCE_RECHARGE)
        .eq('type', FINANCIAL_TYPE_INCOME)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
      const rechargeIncome = rechargeIncomeData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      const { data: purchaseExpenseData } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('source', FINANCIAL_SOURCE_PURCHASE)
        .eq('type', FINANCIAL_TYPE_EXPENSE)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
      const purchaseExpense = purchaseExpenseData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      const { data: manualIncomeData } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('source', FINANCIAL_SOURCE_MANUAL)
        .eq('type', FINANCIAL_TYPE_INCOME)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
      const manualIncome = manualIncomeData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      const { data: manualExpenseData } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('source', FINANCIAL_SOURCE_MANUAL)
        .eq('type', FINANCIAL_TYPE_EXPENSE)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
      const manualExpense = manualExpenseData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      const { data: orderData } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
      const orderCount = orderData?.length ?? 0

      return {
        date,
        order_income: orderIncome,
        recharge_income: rechargeIncome,
        purchase_expense: purchaseExpense,
        manual_income: manualIncome,
        manual_expense: manualExpense,
        order_count: orderCount,
      }
    } catch (error) {
      console.error('Failed to get daily report:', error)
      throw error
    }
  }

  async function getMonthlyReport(year: number, month: number): Promise<DailyReport[]> {
    try {
      // Validate year and month
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new Error(`无效的年份: ${year}`)
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error(`无效的月份: ${month}，必须是 1-12`)
      }

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`

      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
      if (error) throw error

      // Group by date
      const dateMap = new Map<string, DailyReport>()
      const allDates: string[] = []
      let current = new Date(startDate)
      const end = new Date(endDate)
      while (current < end) {
        const dateStr = current.toISOString().split('T')[0]
        dateMap.set(dateStr, {
          date: dateStr,
          order_income: 0,
          recharge_income: 0,
          purchase_expense: 0,
          manual_income: 0,
          manual_expense: 0,
          order_count: 0
        })
        allDates.push(dateStr)
        current.setDate(current.getDate() + 1)
      }

      // Fill in data
      for (const record of data || []) {
        const dateStr = record.created_at.split('T')[0]
        const report = dateMap.get(dateStr)
        if (!report) continue

        if (record.source === 'order' && record.type === '收入') {
          report.order_income += record.amount || 0
        } else if (record.source === 'recharge' && record.type === '收入') {
          report.recharge_income += record.amount || 0
        } else if (record.source === 'purchase' && record.type === '支出') {
          report.purchase_expense += record.amount || 0
        } else if (record.source === 'manual' && record.type === '收入') {
          report.manual_income += record.amount || 0
        } else if (record.source === 'manual' && record.type === '支出') {
          report.manual_expense += record.amount || 0
        }
      }

      return allDates.map(d => dateMap.get(d)!)
    } catch (error) {
      console.error('Failed to get monthly report:', error)
      throw error
    }
  }

  // Purchase records
  async function addPurchaseRecord(record: { item_name: string; quantity: number; unit_price: number; supplier?: string; notes?: string }) {
    try {
      const totalAmount = record.quantity * record.unit_price
      // Insert purchase record
      const { error: purchaseError } = await supabase
        .from('purchase_records')
        .insert([{
          item_name: record.item_name,
          quantity: record.quantity,
          unit_price: record.unit_price,
          supplier: record.supplier || '',
          notes: record.notes || ''
        }])
      if (purchaseError) throw purchaseError

      // Create expense record
      const { error: expenseError } = await supabase
        .from('financial_records')
        .insert([{
          type: FINANCIAL_TYPE_EXPENSE,
          amount: totalAmount,
          category: '耗材采购',
          source: FINANCIAL_SOURCE_PURCHASE,
          description: `${record.item_name} x${record.quantity}`
        }])
      if (expenseError) throw expenseError

      // Sync to inventory: check if item exists, then create or add quantity
      const inventoryStore = useInventoryStore()
      await inventoryStore.loadItems()
      const existingItem = inventoryStore.items.find(i => i.name === record.item_name)

      if (existingItem) {
        // Item exists, add quantity
        await inventoryStore.adjustQuantity(existingItem.id, record.quantity, `采购入库: ${record.item_name} x${record.quantity}`)
      } else {
        // Create new inventory item (default category: 耗材, min_quantity: 1)
        await inventoryStore.createItem({
          name: record.item_name,
          category: '耗材',
          quantity: record.quantity,
          unit: '件',
          min_quantity: 1
        })
      }

      await loadRecords()
    } catch (error) {
      console.error('Failed to add purchase record:', error)
      throw error
    }
  }

  async function loadPurchaseRecords(filters?: { dateFrom?: string; dateTo?: string }) {
    try {
      let query = supabase
        .from('purchase_records')
        .select('*')

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + ' 23:59:59')
      }
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      // Add computed total_amount field
      return (data || []).map(item => ({
        ...item,
        total_amount: item.quantity * item.unit_price
      }))
    } catch (error) {
      console.error('Failed to load purchase records:', error)
      throw error
    }
  }

  // Recharge records
  async function addRechargeRecord(record: { customer_id: number; amount: number; payment_method: string; description?: string }) {
    try {
      // Insert recharge record
      const { error: rechargeError } = await supabase
        .from('recharge_records')
        .insert([{
          customer_id: record.customer_id,
          amount: record.amount,
          payment_method: record.payment_method,
          description: record.description || ''
        }])
      if (rechargeError) throw rechargeError

      // Create income record
      const { error: incomeError } = await supabase
        .from('financial_records')
        .insert([{
          type: FINANCIAL_TYPE_INCOME,
          amount: record.amount,
          category: '会员充值',
          source: FINANCIAL_SOURCE_RECHARGE,
          related_customer_id: record.customer_id,
          description: record.description || '会员充值'
        }])
      if (incomeError) throw incomeError

      await loadRecords()
    } catch (error) {
      console.error('Failed to add recharge record:', error)
      throw error
    }
  }

  async function loadRechargeRecords(filters?: { dateFrom?: string; dateTo?: string; customer_id?: number }) {
    try {
      let query = supabase
        .from('recharge_records')
        .select(`
          *,
          customers (name)
        `)

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + ' 23:59:59')
      }
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      // Transform data to flatten customer name
      return (data || []).map((record: any) => ({
        ...record,
        customer_name: record.customers?.name
      }))
    } catch (error) {
      console.error('Failed to load recharge records:', error)
      throw error
    }
  }

  // Summary
  async function getSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<FinanceSummary> {
    try {
      let query = supabase
        .from('financial_records')
        .select('source, type, amount')

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + ' 23:59:59')
      }

      const { data, error } = await query
      if (error) throw error

      let orderIncome = 0
      let rechargeIncome = 0
      let purchaseExpense = 0
      let manualIncome = 0
      let manualExpense = 0

      for (const record of data || []) {
        const amount = record.amount || 0
        if (record.source === FINANCIAL_SOURCE_ORDER && record.type === FINANCIAL_TYPE_INCOME) {
          orderIncome += amount
        } else if (record.source === FINANCIAL_SOURCE_RECHARGE && record.type === FINANCIAL_TYPE_INCOME) {
          rechargeIncome += amount
        } else if (record.source === FINANCIAL_SOURCE_PURCHASE && record.type === FINANCIAL_TYPE_EXPENSE) {
          purchaseExpense += amount
        } else if (record.source === FINANCIAL_SOURCE_MANUAL && record.type === FINANCIAL_TYPE_INCOME) {
          manualIncome += amount
        } else if (record.source === FINANCIAL_SOURCE_MANUAL && record.type === FINANCIAL_TYPE_EXPENSE) {
          manualExpense += amount
        }
      }

      const totalIncome = orderIncome + rechargeIncome + manualIncome
      const totalExpense = purchaseExpense + manualExpense

      return {
        total_order_income: orderIncome,
        total_recharge_income: rechargeIncome,
        total_purchase_expense: purchaseExpense,
        total_manual_income: manualIncome,
        total_manual_expense: manualExpense,
        net_profit: totalIncome - totalExpense,
      }
    } catch (error) {
      console.error('Failed to get summary:', error)
      throw error
    }
  }

  return { records, loadRecords, addRecord, getDailyReport, getMonthlyReport, addPurchaseRecord, addRechargeRecord, getSummary, loadRechargeRecords, loadPurchaseRecords }
})