import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

// Status constants
const HOOK_STATUS_FREE = '空闲'
const HOOK_STATUS_OCCUPIED = '占用'

// Validation constants
const MIN_HOOKS = 1
const MAX_HOOKS = 1000

export interface RackHook {
  id: number
  hook_no: number
  status: string
  order_item_id: number | null
  // joined fields
  garment_type?: string
  customer_name?: string
  order_no?: string
  order_id?: number
}

export const useRackStore = defineStore('rack', () => {
  const hooks = ref<RackHook[]>([])
  const totalHooks = ref(100)

  async function loadHooks() {
    try {
      hooks.value = await query<RackHook>(`
        SELECT rh.*, oi.garment_type, c.name as customer_name, o.order_no, o.id as order_id
        FROM rack_hooks rh
        LEFT JOIN order_items oi ON rh.order_item_id = oi.id
        LEFT JOIN orders o ON oi.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY rh.hook_no
      `)
    } catch (error) {
      console.error('Failed to load hooks:', error)
      throw error
    }
  }

  async function loadSettings() {
    try {
      const rows = await query<{ total_hooks: number }>('SELECT total_hooks FROM rack_settings WHERE id = 1')
      if (rows.length > 0) {
        totalHooks.value = rows[0].total_hooks
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      throw error
    }
  }

  async function allocateHook(orderItemId: number): Promise<number | null> {
    try {
      const free = await query<{ hook_no: number }>(
        `SELECT hook_no FROM rack_hooks WHERE status = '${HOOK_STATUS_FREE}' ORDER BY hook_no LIMIT 1`
      )
      if (free.length === 0) return null
      const hookNo = free[0].hook_no
      await execute(
        `UPDATE rack_hooks SET status = '${HOOK_STATUS_OCCUPIED}', order_item_id = ? WHERE hook_no = ?`,
        [orderItemId, hookNo]
      )
      return hookNo
    } catch (error) {
      console.error('Failed to allocate hook:', error)
      throw error
    }
  }

  async function releaseHook(hookNo: number) {
    try {
      // Check if hook exists
      const existing = await query<{ id: number }>(
        'SELECT id FROM rack_hooks WHERE hook_no = ?',
        [hookNo]
      )
      if (existing.length === 0) {
        throw new Error(`挂钩 ${hookNo} 不存在`)
      }
      await execute(
        `UPDATE rack_hooks SET status = '${HOOK_STATUS_FREE}', order_item_id = NULL WHERE hook_no = ?`,
        [hookNo]
      )
    } catch (error) {
      console.error('Failed to release hook:', error)
      throw error
    }
  }

  async function setTotalHooks(newTotal: number) {
    // Validate input
    if (!Number.isInteger(newTotal)) {
      throw new Error('挂钩总数必须是整数')
    }
    if (newTotal < MIN_HOOKS || newTotal > MAX_HOOKS) {
      throw new Error(`挂钩总数必须在 ${MIN_HOOKS} 到 ${MAX_HOOKS} 之间`)
    }

    try {
      const currentMax = await query<{ max_no: number }>(
        'SELECT COALESCE(MAX(hook_no), 0) as max_no FROM rack_hooks'
      )
      const maxNo = currentMax[0].max_no
      let hooksChanged = false

      if (newTotal > maxNo) {
        // Add new hooks
        for (let i = maxNo + 1; i <= newTotal; i++) {
          await execute(
            `INSERT OR IGNORE INTO rack_hooks (hook_no, status) VALUES (?, '${HOOK_STATUS_FREE}')`,
            [i]
          )
        }
        hooksChanged = true
      } else if (newTotal < maxNo) {
        // Only remove free hooks from the end
        const occupied = await query<{ hook_no: number }>(
          `SELECT hook_no FROM rack_hooks WHERE hook_no > ? AND status = '${HOOK_STATUS_OCCUPIED}'`,
          [newTotal]
        )
        if (occupied.length > 0) {
          throw new Error(`无法缩减：挂钩 ${occupied.map(h => h.hook_no).join(', ')} 正在使用中`)
        }
        await execute('DELETE FROM rack_hooks WHERE hook_no > ?', [newTotal])
        hooksChanged = true
      }

      await execute('UPDATE rack_settings SET total_hooks = ? WHERE id = 1', [newTotal])
      totalHooks.value = newTotal
      if (hooksChanged) {
        await loadHooks()
      }
    } catch (error) {
      console.error('Failed to set total hooks:', error)
      throw error
    }
  }

  async function getFreeCount(): Promise<number> {
    try {
      const rows = await query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM rack_hooks WHERE status = '${HOOK_STATUS_FREE}'`
      )
      return rows[0].cnt
    } catch (error) {
      console.error('Failed to get free count:', error)
      throw error
    }
  }

  return {
    hooks, totalHooks,
    loadHooks, loadSettings, allocateHook, releaseHook, setTotalHooks, getFreeCount,
  }
})