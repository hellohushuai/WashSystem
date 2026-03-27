import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

// Financial record type constants
export const FINANCIAL_TYPE_INCOME = '收入'
export const FINANCIAL_TYPE_EXPENSE = '支出'

// Validation constants
const MAX_AMOUNT = 1000000
const MIN_AMOUNT = 0

export interface FinancialRecord {
  id: number
  type: string
  amount: number
  category: string
  related_order_id: number | null
  description: string
  created_at: string
}

export interface DailyReport {
  date: string
  income: number
  expense: number
  order_count: number
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

  async function addRecord(record: { type: string; amount: number; category: string; description: string }) {
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
        'INSERT INTO financial_records (type, amount, category, description) VALUES (?, ?, ?, ?)',
        [record.type, record.amount, record.category, record.description || '']
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

      const incomeRows = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = ? AND date(created_at) = ?',
        [FINANCIAL_TYPE_INCOME, date]
      )
      const expenseRows = await query<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = ? AND date(created_at) = ?',
        [FINANCIAL_TYPE_EXPENSE, date]
      )
      const orderRows = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ?',
        [date]
      )
      return {
        date,
        income: incomeRows[0].total,
        expense: expenseRows[0].total,
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
          SUM(CASE WHEN type = ? THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = ? THEN amount ELSE 0 END) as expense,
          0 as order_count
        FROM financial_records
        WHERE strftime('%Y-%m', created_at) = ?
        GROUP BY date(created_at)
        ORDER BY date
      `, [FINANCIAL_TYPE_INCOME, FINANCIAL_TYPE_EXPENSE, monthStr])
    } catch (error) {
      console.error('Failed to get monthly report:', error)
      throw error
    }
  }

  return { records, loadRecords, addRecord, getDailyReport, getMonthlyReport }
})