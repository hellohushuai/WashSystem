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
    levels.value = await query<MembershipLevel>(
      'SELECT * FROM membership_levels ORDER BY sort_order'
    )
  }

  async function createLevel(level: Omit<MembershipLevel, 'id'>) {
    const result = await execute(
      'INSERT INTO membership_levels (name, discount, points_threshold, points_rate, sort_order) VALUES (?, ?, ?, ?, ?)',
      [level.name, level.discount, level.points_threshold, level.points_rate, level.sort_order]
    )
    await loadLevels()
    return result.lastInsertId
  }

  async function updateLevel(id: number, level: Partial<MembershipLevel>) {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, val] of Object.entries(level)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    values.push(id)
    await execute(`UPDATE membership_levels SET ${fields.join(', ')} WHERE id = ?`, values)
    await loadLevels()
  }

  async function deleteLevel(id: number) {
    await execute('UPDATE customers SET membership_level_id = NULL WHERE membership_level_id = ?', [id])
    await execute('DELETE FROM membership_levels WHERE id = ?', [id])
    await loadLevels()
  }

  async function loadCustomers(search?: string) {
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
  }

  async function getCustomer(id: number): Promise<Customer | undefined> {
    const rows = await query<Customer>(
      `SELECT c.*, m.name as level_name, m.discount
       FROM customers c
       LEFT JOIN membership_levels m ON c.membership_level_id = m.id
       WHERE c.id = ?`,
      [id]
    )
    return rows[0]
  }

  async function createCustomer(c: { name: string; phone: string; membership_level_id?: number; notes?: string }) {
    const result = await execute(
      'INSERT INTO customers (name, phone, membership_level_id, notes) VALUES (?, ?, ?, ?)',
      [c.name, c.phone, c.membership_level_id ?? null, c.notes ?? '']
    )
    return result.lastInsertId
  }

  async function updateCustomer(id: number, c: Partial<Customer>) {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, val] of Object.entries(c)) {
      if (!['id', 'created_at', 'level_name', 'discount'].includes(key)) {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    values.push(id)
    await execute(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  async function addPoints(customerId: number, points: number) {
    await execute('UPDATE customers SET points = points + ? WHERE id = ?', [points, customerId])
  }

  return {
    customers, levels,
    loadLevels, createLevel, updateLevel, deleteLevel,
    loadCustomers, getCustomer, createCustomer, updateCustomer, addPoints,
  }
})