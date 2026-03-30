import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

export interface MembershipLevel {
  id: number
  name: string
  discount: number
  points_threshold: number
  points_rate: number
  sort_order: number
}

export interface Customer {
  id: number
  name: string
  phone: string
  membership_level_id: number | null
  points: number
  balance: number
  notes: string
  created_at: string
  // joined from membership_levels
  level_name?: string
  discount?: number
}

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const levels = ref<MembershipLevel[]>([])

  async function loadLevels() {
    try {
      levels.value = await query<MembershipLevel>(
        'SELECT * FROM membership_levels ORDER BY sort_order'
      )
    } catch (error) {
      console.error('Failed to load levels:', error)
      throw error
    }
  }

  async function createLevel(level: Omit<MembershipLevel, 'id'>) {
    console.log('Creating level with data:', JSON.stringify(level))
    try {
      const result = await execute(
        'INSERT INTO membership_levels (name, discount, points_threshold, points_rate, sort_order) VALUES (?, ?, ?, ?, ?)',
        [level.name, level.discount, level.points_threshold, level.points_rate, level.sort_order]
      )
      console.log('Insert result:', result)
      await loadLevels()
      return result.lastInsertId
    } catch (error) {
      console.error('Failed to create level:', error)
      throw error
    }
  }

  async function updateLevel(id: number, level: Partial<MembershipLevel>) {
    try {
      const allowedFields = ['name', 'discount', 'points_threshold', 'points_rate', 'sort_order']
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, val] of Object.entries(level)) {
        if (key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          values.push(val)
        }
      }
      if (fields.length === 0) return
      values.push(id)
      await execute(`UPDATE membership_levels SET ${fields.join(', ')} WHERE id = ?`, values)
      await loadLevels()
    } catch (error) {
      console.error('Failed to update level:', error)
      throw error
    }
  }

  async function deleteLevel(id: number) {
    try {
      await execute('UPDATE customers SET membership_level_id = NULL WHERE membership_level_id = ?', [id])
      await execute('DELETE FROM membership_levels WHERE id = ?', [id])
      await loadLevels()
    } catch (error) {
      console.error('Failed to delete level:', error)
      throw error
    }
  }

  async function loadCustomers(search?: string) {
    try {
      let sql = `
        SELECT c.*, m.name as level_name, m.discount
        FROM customers c
        LEFT JOIN membership_levels m ON c.membership_level_id = m.id
      `
      const params: unknown[] = []
      if (search) {
        sql += ' WHERE c.name LIKE ? OR c.phone LIKE ?'
        params.push(`%${search}%`, `%${search}%`)
      }
      sql += ' ORDER BY c.created_at DESC'
      customers.value = await query<Customer>(sql, params)
    } catch (error) {
      console.error('Failed to load customers:', error)
      throw error
    }
  }

  async function getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const rows = await query<Customer>(
        `SELECT c.*, m.name as level_name, m.discount
         FROM customers c
         LEFT JOIN membership_levels m ON c.membership_level_id = m.id
         WHERE c.id = ?`,
        [id]
      )
      return rows[0]
    } catch (error) {
      console.error('Failed to get customer:', error)
      throw error
    }
  }

  async function createCustomer(c: { name: string; phone: string; membership_level_id?: number; notes?: string }) {
    try {
      const result = await execute(
        'INSERT INTO customers (name, phone, membership_level_id, notes) VALUES (?, ?, ?, ?)',
        [c.name, c.phone, c.membership_level_id ?? null, c.notes ?? '']
      )
      return result.lastInsertId
    } catch (error) {
      console.error('Failed to create customer:', error)
      throw error
    }
  }

  async function updateCustomer(id: number, c: Partial<Customer>) {
    try {
      const allowedFields = ['name', 'phone', 'membership_level_id', 'points', 'balance', 'notes']
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, val] of Object.entries(c)) {
        if (key !== 'id' && key !== 'created_at' && key !== 'level_name' && key !== 'discount' && allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          values.push(val)
        }
      }
      if (fields.length === 0) return
      values.push(id)
      await execute(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values)
    } catch (error) {
      console.error('Failed to update customer:', error)
      throw error
    }
  }

  async function addPoints(customerId: number, points: number): Promise<number> {
    try {
      await execute('UPDATE customers SET points = points + ? WHERE id = ?', [points, customerId])
      const customers = await query<{ points: number }>('SELECT points FROM customers WHERE id = ?', [customerId])
      return customers[0]?.points ?? 0
    } catch (error) {
      console.error('Failed to add points:', error)
      throw error
    }
  }

  async function recharge(customerId: number, amount: number, paymentMethod: string = '现金'): Promise<number> {
    try {
      await execute('UPDATE customers SET balance = balance + ? WHERE id = ?', [amount, customerId])
      // Record recharge
      await execute(
        'INSERT INTO recharge_records (customer_id, amount, payment_method) VALUES (?, ?, ?)',
        [customerId, amount, paymentMethod]
      )
      // Create financial record
      await execute(
        'INSERT INTO financial_records (type, amount, category, source, related_customer_id, description) VALUES (?, ?, ?, ?, ?, ?)',
        ['收入', amount, '会员充值', 'recharge', customerId, '会员充值']
      )
      const customers = await query<{ balance: number }>('SELECT balance FROM customers WHERE id = ?', [customerId])
      return customers[0]?.balance ?? 0
    } catch (error) {
      console.error('Failed to recharge:', error)
      throw error
    }
  }

  async function useBalance(customerId: number, amount: number): Promise<boolean> {
    try {
      const result = await execute('UPDATE customers SET balance = balance - ? WHERE id = ? AND balance >= ?', [amount, customerId, amount])
      return result.rowsAffected > 0
    } catch (error) {
      console.error('Failed to use balance:', error)
      throw error
    }
  }

  return {
    customers, levels,
    loadLevels, createLevel, updateLevel, deleteLevel,
    loadCustomers, getCustomer, createCustomer, updateCustomer, addPoints,
    recharge, useBalance,
  }
})