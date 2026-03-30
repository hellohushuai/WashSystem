import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'
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
      let sql = 'SELECT * FROM financial_records WHERE 1=1'
      const params: unknown[] = []

      if (filters?.type) {
        // Validate type
        if (filters.type !== FINANCIAL_TYPE_INCOME && filters.type !== FINANCIAL_TYPE_EXPENSE) {
          throw new Error(`无效的财务类型: ${filters.type}`)
        }
        sql += ' AND type = ?'
        params.push(filters.type)
      }
      if (filters?.dateFrom) {
        // Validate date format (simple check)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
          throw new Error('无效的开始日期格式，应为 YYYY-MM-DD')
        }
        sql += ' AND created_at >= ?'
        params.push(filters.dateFrom)
      }
      if (filters?.dateTo) {
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
          throw new Error('无效的结束日期格式，应为 YYYY-MM-DD')
        }
        sql += ' AND created_at <= ?'
        params.push(filters.dateTo + ' 23:59:59')
      }
      sql += ' ORDER BY created_at DESC'
      records.value = await query<FinancialRecord>(sql, params)
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

      await execute(
        'INSERT INTO financial_records (type, amount, category, source, description) VALUES (?, ?, ?, ?, ?)',
        [record.type, record.amount, record.category, record.source || FINANCIAL_SOURCE_MANUAL, record.description || '']
      )
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

      // Get breakdown by source
      const orderIncome = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? AND date(created_at) = ?',
        [FINANCIAL_SOURCE_ORDER, FINANCIAL_TYPE_INCOME, date]
      )
      const rechargeIncome = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? AND date(created_at) = ?',
        [FINANCIAL_SOURCE_RECHARGE, FINANCIAL_TYPE_INCOME, date]
      )
      const purchaseExpense = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? AND date(created_at) = ?',
        [FINANCIAL_SOURCE_PURCHASE, FINANCIAL_TYPE_EXPENSE, date]
      )
      const manualIncome = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? AND date(created_at) = ?',
        [FINANCIAL_SOURCE_MANUAL, FINANCIAL_TYPE_INCOME, date]
      )
      const manualExpense = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? AND date(created_at) = ?',
        [FINANCIAL_SOURCE_MANUAL, FINANCIAL_TYPE_EXPENSE, date]
      )
      const orderRows = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ?',
        [date]
      )
      return {
        date,
        order_income: orderIncome[0].total,
        recharge_income: rechargeIncome[0].total,
        purchase_expense: purchaseExpense[0].total,
        manual_income: manualIncome[0].total,
        manual_expense: manualExpense[0].total,
        order_count: orderRows[0].cnt,
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

      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      return query<DailyReport>(`
        SELECT
          date(created_at) as date,
          SUM(CASE WHEN source = 'order' AND type = '收入' THEN amount ELSE 0 END) as order_income,
          SUM(CASE WHEN source = 'recharge' AND type = '收入' THEN amount ELSE 0 END) as recharge_income,
          SUM(CASE WHEN source = 'purchase' AND type = '支出' THEN amount ELSE 0 END) as purchase_expense,
          SUM(CASE WHEN source = 'manual' AND type = '收入' THEN amount ELSE 0 END) as manual_income,
          SUM(CASE WHEN source = 'manual' AND type = '支出' THEN amount ELSE 0 END) as manual_expense,
          0 as order_count
        FROM financial_records
        WHERE strftime('%Y-%m', created_at) = ?
        GROUP BY date(created_at)
        ORDER BY date
      `, [monthStr])
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
      await execute(
        'INSERT INTO purchase_records (item_name, quantity, unit_price, supplier, notes) VALUES (?, ?, ?, ?, ?)',
        [record.item_name, record.quantity, record.unit_price, record.supplier || '', record.notes || '']
      )
      // Create expense record
      await execute(
        'INSERT INTO financial_records (type, amount, category, source, description) VALUES (?, ?, ?, ?, ?)',
        [FINANCIAL_TYPE_EXPENSE, totalAmount, '耗材采购', FINANCIAL_SOURCE_PURCHASE, `${record.item_name} x${record.quantity}`]
      )

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
      let sql = 'SELECT *, (quantity * unit_price) as total_amount FROM purchase_records WHERE 1=1'
      const params: unknown[] = []

      if (filters?.dateFrom) {
        sql += ' AND created_at >= ?'
        params.push(filters.dateFrom)
      }
      if (filters?.dateTo) {
        sql += ' AND created_at <= ?'
        params.push(filters.dateTo + ' 23:59:59')
      }
      sql += ' ORDER BY created_at DESC'
      return await query<PurchaseRecord>(sql, params)
    } catch (error) {
      console.error('Failed to load purchase records:', error)
      throw error
    }
  }

  // Recharge records
  async function addRechargeRecord(record: { customer_id: number; amount: number; payment_method: string; description?: string }) {
    try {
      // Insert recharge record
      await execute(
        'INSERT INTO recharge_records (customer_id, amount, payment_method, description) VALUES (?, ?, ?, ?)',
        [record.customer_id, record.amount, record.payment_method, record.description || '']
      )
      // Create income record
      await execute(
        'INSERT INTO financial_records (type, amount, category, source, related_customer_id, description) VALUES (?, ?, ?, ?, ?, ?)',
        [FINANCIAL_TYPE_INCOME, record.amount, '会员充值', FINANCIAL_SOURCE_RECHARGE, record.customer_id, record.description || '会员充值']
      )
      await loadRecords()
    } catch (error) {
      console.error('Failed to add recharge record:', error)
      throw error
    }
  }

  async function loadRechargeRecords(filters?: { dateFrom?: string; dateTo?: string; customer_id?: number }) {
    try {
      let sql = `
        SELECT r.*, c.name as customer_name
        FROM recharge_records r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE 1=1
      `
      const params: unknown[] = []

      if (filters?.customer_id) {
        sql += ' AND r.customer_id = ?'
        params.push(filters.customer_id)
      }
      if (filters?.dateFrom) {
        sql += ' AND r.created_at >= ?'
        params.push(filters.dateFrom)
      }
      if (filters?.dateTo) {
        sql += ' AND r.created_at <= ?'
        params.push(filters.dateTo + ' 23:59:59')
      }
      sql += ' ORDER BY r.created_at DESC'
      return await query<RechargeRecord>(sql, params)
    } catch (error) {
      console.error('Failed to load recharge records:', error)
      throw error
    }
  }

  // Summary
  async function getSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<FinanceSummary> {
    try {
      let dateFilter = ''
      const params: unknown[] = []

      if (filters?.dateFrom) {
        dateFilter += ' AND created_at >= ?'
        params.push(filters.dateFrom)
      }
      if (filters?.dateTo) {
        dateFilter += ' AND created_at <= ?'
        params.push(filters.dateTo + ' 23:59:59')
      }

      const orderIncome = await query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? ${dateFilter}`,
        [FINANCIAL_SOURCE_ORDER, FINANCIAL_TYPE_INCOME, ...params]
      )
      const rechargeIncome = await query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? ${dateFilter}`,
        [FINANCIAL_SOURCE_RECHARGE, FINANCIAL_TYPE_INCOME, ...params]
      )
      const purchaseExpense = await query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? ${dateFilter}`,
        [FINANCIAL_SOURCE_PURCHASE, FINANCIAL_TYPE_EXPENSE, ...params]
      )
      const manualIncome = await query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? ${dateFilter}`,
        [FINANCIAL_SOURCE_MANUAL, FINANCIAL_TYPE_INCOME, ...params]
      )
      const manualExpense = await query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE source = ? AND type = ? ${dateFilter}`,
        [FINANCIAL_SOURCE_MANUAL, FINANCIAL_TYPE_EXPENSE, ...params]
      )

      const totalIncome = orderIncome[0].total + rechargeIncome[0].total + manualIncome[0].total
      const totalExpense = purchaseExpense[0].total + manualExpense[0].total

      return {
        total_order_income: orderIncome[0].total,
        total_recharge_income: rechargeIncome[0].total,
        total_purchase_expense: purchaseExpense[0].total,
        total_manual_income: manualIncome[0].total,
        total_manual_expense: manualExpense[0].total,
        net_profit: totalIncome - totalExpense,
      }
    } catch (error) {
      console.error('Failed to get summary:', error)
      throw error
    }
  }

  return { records, loadRecords, addRecord, getDailyReport, getMonthlyReport, addPurchaseRecord, addRechargeRecord, getSummary, loadRechargeRecords, loadPurchaseRecords }
})