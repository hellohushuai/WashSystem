import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'
import { useRackStore } from './rack'
import { useCustomerStore } from './customers'

// Order status constants
export const ORDER_STATUS_PENDING = '未开始'
export const ORDER_STATUS_PAID = '已付款'
export const ORDER_STATUS_COMPLETED = '已结束'

// Validation constants
const MIN_ITEMS = 1
const MAX_ITEMS = 100

// Helper to safely convert lastInsertId to number
function toNumber(value: number | bigint | undefined): number {
  if (value === undefined) {
    throw new Error('插入操作未返回有效的ID')
  }
  return typeof value === 'bigint' ? Number(value) : value
}

export interface Order {
  id: number
  order_no: string
  customer_id: number
  status: string
  total_amount: number
  paid_amount: number
  payment_method: string
  notes: string
  created_at: string
  completed_at: string | null
  picked_up_at: string | null
  // joined
  customer_name?: string
  customer_phone?: string
  item_count?: number
}

export interface OrderItem {
  id: number
  order_id: number
  garment_type: string
  service_type: string
  price: number
  hook_no: number | null
  is_picked_up: number
  notes: string
}

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])

  async function generateOrderNo(): Promise<string> {
    try {
      const today = new Date()
      const dateStr = today.getFullYear().toString()
        + String(today.getMonth() + 1).padStart(2, '0')
        + String(today.getDate()).padStart(2, '0')
      const prefix = `DC${dateStr}`
      const rows = await query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM orders WHERE order_no LIKE ?",
        [`${prefix}%`]
      )
      const seq = String(rows[0].cnt + 1).padStart(3, '0')
      return `${prefix}${seq}`
    } catch (error) {
      console.error('Failed to generate order number:', error)
      throw error
    }
  }

  async function loadOrders(filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    try {
      let sql = `
        SELECT o.*, c.name as customer_name, c.phone as customer_phone,
               (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
      `
      const params: unknown[] = []

      if (filters?.status) {
        sql += ' AND o.status = ?'
        params.push(filters.status)
      }
      if (filters?.search) {
        sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR o.order_no LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
      }
      if (filters?.dateFrom) {
        sql += ' AND o.created_at >= ?'
        params.push(filters.dateFrom)
      }
      if (filters?.dateTo) {
        sql += ' AND o.created_at <= ?'
        params.push(filters.dateTo + ' 23:59:59')
      }
      sql += ' ORDER BY o.created_at DESC'
      orders.value = await query<Order>(sql, params)
    } catch (error) {
      console.error('Failed to load orders:', error)
      throw error
    }
  }

  async function getOrder(id: number): Promise<Order | undefined> {
    try {
      // Validate input
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('无效的订单ID')
      }
      const rows = await query<Order>(
        `SELECT o.*, c.name as customer_name, c.phone as customer_phone
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.id = ?`,
        [id]
      )
      return rows[0]
    } catch (error) {
      console.error('Failed to get order:', error)
      throw error
    }
  }

  async function getOrderItems(orderId: number): Promise<OrderItem[]> {
    try {
      // Validate input
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new Error('无效的订单ID')
      }
      return query<OrderItem>('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [orderId])
    } catch (error) {
      console.error('Failed to get order items:', error)
      throw error
    }
  }

  async function createOrder(
    customerId: number,
    items: { garment_type: string; service_type: string; price: number; notes?: string }[],
    notes?: string
  ): Promise<number> {
    try {
      // Validate customerId
      if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new Error('无效的客户ID')
      }

      // Validate items array
      if (!Array.isArray(items) || items.length < MIN_ITEMS) {
        throw new Error(`订单至少需要 ${MIN_ITEMS} 个项目`)
      }
      if (items.length > MAX_ITEMS) {
        throw new Error(`订单最多 ${MAX_ITEMS} 个项目`)
      }

      // Validate each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item.garment_type || item.garment_type.trim() === '') {
          throw new Error(`项目 ${i + 1}: 衣物类型不能为空`)
        }
        if (!item.service_type || item.service_type.trim() === '') {
          throw new Error(`项目 ${i + 1}: 服务类型不能为空`)
        }
        if (typeof item.price !== 'number' || item.price < 0) {
          throw new Error(`项目 ${i + 1}: 价格必须是非负数`)
        }
      }

      const rackStore = useRackStore()
      const customerStore = useCustomerStore()

      // Check free hooks
      const freeCount = await rackStore.getFreeCount()
      if (freeCount < items.length) {
        throw new Error(`挂钩不足：需要 ${items.length} 个，当前空闲 ${freeCount} 个`)
      }

      const orderNo = await generateOrderNo()

      // Get customer discount
      const customer = await customerStore.getCustomer(customerId)
      if (!customer) {
        throw new Error('客户不存在')
      }
      const discount = customer.discount ?? 1.0

      const totalAmount = items.reduce((sum, item) => sum + item.price, 0) * discount

      const result = await execute(
        `INSERT INTO orders (order_no, customer_id, status, total_amount, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [orderNo, customerId, ORDER_STATUS_PENDING, totalAmount, notes ?? '']
      )
      const orderId = toNumber(result.lastInsertId)

      // Create items and allocate hooks
      for (const item of items) {
        const itemResult = await execute(
          'INSERT INTO order_items (order_id, garment_type, service_type, price, notes) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.garment_type, item.service_type, item.price * discount, item.notes ?? '']
        )
        const itemId = toNumber(itemResult.lastInsertId)
        const hookNo = await rackStore.allocateHook(itemId)
        if (hookNo !== null) {
          await execute('UPDATE order_items SET hook_no = ? WHERE id = ?', [hookNo, itemId])
        }
      }

      // Add points to customer
      if (customer) {
        const pointsRate = customer.discount !== undefined
          ? (await query<{ points_rate: number }>(
              'SELECT points_rate FROM membership_levels WHERE id = ?',
              [customer.membership_level_id]
            ))[0]?.points_rate ?? 1.0
          : 1.0
        const points = Math.floor(totalAmount * pointsRate)
        await customerStore.addPoints(customerId, points)
      }

      return orderId
    } catch (error) {
      console.error('Failed to create order:', error)
      throw error
    }
  }

  async function updateStatus(orderId: number, newStatus: string) {
    try {
      // Validate input
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new Error('无效的订单ID')
      }
      if (!newStatus || newStatus.trim() === '') {
        throw new Error('订单状态不能为空')
      }

      // Validate status value
      const validStatuses = [ORDER_STATUS_PENDING, ORDER_STATUS_PAID, ORDER_STATUS_COMPLETED]
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`无效的订单状态: ${newStatus}`)
      }

      if (newStatus === ORDER_STATUS_COMPLETED) {
        // Verify: all items picked up AND fully paid
        const items = await getOrderItems(orderId)
        const allPickedUp = items.every(i => i.is_picked_up === 1)
        if (!allPickedUp) {
          throw new Error('还有衣物未取走，无法结束订单')
        }
        const order = await getOrder(orderId)
        if (order && order.paid_amount < order.total_amount) {
          throw new Error('尚未付清全部费用，无法结束订单')
        }
        await execute(
          `UPDATE orders SET status = ?, picked_up_at = datetime('now', 'localtime') WHERE id = ?`,
          [newStatus, orderId]
        )
      } else if (newStatus === ORDER_STATUS_PAID) {
        const order = await getOrder(orderId)
        if (order) {
          await execute(
            `UPDATE orders SET status = ?, paid_amount = ?, completed_at = datetime('now', 'localtime') WHERE id = ?`,
            [newStatus, order.total_amount, orderId]
          )
        }
      } else {
        await execute('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId])
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      throw error
    }
  }

  async function recordPayment(orderId: number, amount: number, method: string) {
    try {
      // Validate input
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new Error('无效的订单ID')
      }
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('付款金额必须是正数')
      }
      if (!method || method.trim() === '') {
        throw new Error('付款方式不能为空')
      }

      await execute(
        'UPDATE orders SET paid_amount = paid_amount + ?, payment_method = ? WHERE id = ?',
        [amount, method, orderId]
      )
      // Auto-create financial record
      await execute(
        "INSERT INTO financial_records (type, amount, category, related_order_id, description) VALUES ('收入', ?, '订单收入', ?, ?)",
        [amount, orderId, `订单收款`]
      )
    } catch (error) {
      console.error('Failed to record payment:', error)
      throw error
    }
  }

  async function pickUpItem(itemId: number) {
    try {
      // Validate input
      if (!Number.isInteger(itemId) || itemId <= 0) {
        throw new Error('无效的衣物ID')
      }

      const rackStore = useRackStore()
      const items = await query<OrderItem>('SELECT * FROM order_items WHERE id = ?', [itemId])
      if (items.length === 0) return

      const item = items[0]
      await execute('UPDATE order_items SET is_picked_up = 1 WHERE id = ?', [itemId])

      // Release hook
      if (item.hook_no !== null) {
        await rackStore.releaseHook(item.hook_no)
      }
    } catch (error) {
      console.error('Failed to pick up item:', error)
      throw error
    }
  }

  async function getTodayStats(): Promise<{ orderCount: number; income: number }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const orderRows = await query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ?",
        [today]
      )
      const incomeRows = await query<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = '收入' AND date(created_at) = ?",
        [today]
      )
      return {
        orderCount: orderRows[0].cnt,
        income: incomeRows[0].total,
      }
    } catch (error) {
      console.error('Failed to get today stats:', error)
      throw error
    }
  }

  return {
    orders,
    loadOrders, getOrder, getOrderItems, createOrder,
    updateStatus, recordPayment, pickUpItem, getTodayStats,
  }
})