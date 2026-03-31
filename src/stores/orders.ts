import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useRackStore } from './rack'
import { useCustomerStore } from './customers'

// Order status constants
export const ORDER_STATUS_PENDING = '未开始'
export const ORDER_STATUS_PAID = '已付款'
export const ORDER_STATUS_COMPLETED = '已结束'

// Validation constants
const MIN_ITEMS = 1
const MAX_ITEMS = 100

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
  // additional fields for mobile
  pickup_date?: string
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
  // additional fields for mobile
  garment_name?: string
  service_name?: string
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

      const { data, error } = await supabase
        .from('orders')
        .select('order_no')
        .like('order_no', `${prefix}%`)
        .order('order_no', { ascending: false })
        .limit(1)

      if (error) throw error

      let seq = 1
      if (data && data.length > 0) {
        const lastOrderNo = data[0].order_no
        const lastSeq = parseInt(lastOrderNo.replace(prefix, ''), 10)
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1
        }
      }
      return `${prefix}${String(seq).padStart(3, '0')}`
    } catch (error) {
      console.error('Failed to generate order number:', error)
      throw error
    }
  }

  async function loadOrders(filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone)
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.search) {
        query = query.or(`order_no.ilike.%${filters.search}%,customers.name.ilike.%${filters.search}%,customers.phone.ilike.%${filters.search}%`)
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + ' 23:59:59')
      }

      const { data, error } = await query
      if (error) throw error

      // Transform data to include customer_name and customer_phone
      orders.value = (data || []).map((order: any) => ({
        ...order,
        customer_name: order.customers?.name,
        customer_phone: order.customers?.phone,
      }))
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

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return undefined

      return {
        ...data,
        customer_name: (data as any).customers?.name,
        customer_phone: (data as any).customers?.phone,
      }
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

      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('id')

      if (error) throw error
      return data || []
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

      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_no: orderNo,
          customer_id: customerId,
          status: ORDER_STATUS_PENDING,
          total_amount: totalAmount,
          notes: notes ?? '',
        })
        .select()
        .single()

      if (orderError) throw orderError
      const orderId = orderData.id

      // Create items and allocate hooks
      for (const item of items) {
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            garment_type: item.garment_type,
            service_type: item.service_type,
            price: item.price * discount,
            notes: item.notes ?? '',
          })
          .select()
          .single()

        if (itemError) throw itemError
        const itemId = itemData.id

        const hookNo = await rackStore.allocateHook(itemId)
        if (hookNo !== null) {
          await supabase
            .from('order_items')
            .update({ hook_no: hookNo })
            .eq('id', itemId)
        }
      }

      // Add points to customer
      if (customer) {
        const { data: levelData } = await supabase
          .from('membership_levels')
          .select('points_rate')
          .eq('id', customer.membership_level_id)
          .single()
        const pointsRate = levelData?.points_rate ?? 1.0
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

      // Get current order status for transition validation
      const order = await getOrder(orderId)
      if (!order) {
        throw new Error('订单不存在')
      }
      const currentStatus = order.status

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        [ORDER_STATUS_PENDING]: [ORDER_STATUS_PAID],
        [ORDER_STATUS_PAID]: [ORDER_STATUS_COMPLETED],
        [ORDER_STATUS_COMPLETED]: [],
      }
      const allowedNextStatuses = validTransitions[currentStatus] || []
      if (!allowedNextStatuses.includes(newStatus)) {
        throw new Error(`无效的状态转换: ${currentStatus} → ${newStatus}`)
      }

      if (newStatus === ORDER_STATUS_COMPLETED) {
        // Verify: all items picked up AND fully paid
        const items = await getOrderItems(orderId)
        const allPickedUp = items.every(i => i.is_picked_up === 1)
        if (!allPickedUp) {
          throw new Error('还有衣物未取走，无法结束订单')
        }
        if (order.paid_amount < order.total_amount) {
          throw new Error('尚未付清全部费用，无法结束订单')
        }
        // Release all hooks for items in this order
        const rackStore = useRackStore()
        for (const item of items) {
          if (item.hook_no !== null) {
            await rackStore.releaseHook(item.hook_no)
          }
        }
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus, picked_up_at: new Date().toISOString() })
          .eq('id', orderId)
        if (error) throw error
      } else if (newStatus === ORDER_STATUS_PAID) {
        // Auto-pay full amount when status changes to PAID
        const { error } = await supabase
          .from('orders')
          .update({
            status: newStatus,
            paid_amount: order.total_amount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', orderId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', orderId)
        if (error) throw error
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

      // Get order to validate payment amount
      const order = await getOrder(orderId)
      if (!order) {
        throw new Error('订单不存在')
      }
      const remainingBalance = order.total_amount - order.paid_amount
      if (amount > remainingBalance) {
        throw new Error(`付款金额超过待付金额: 还需 ${remainingBalance} 元`)
      }

      // Update order paid_amount
      const { error: updateError } = await supabase
        .from('orders')
        .update({ paid_amount: order.paid_amount + amount, payment_method: method })
        .eq('id', orderId)
      if (updateError) throw updateError

      // Auto-create financial record
      const { error: insertError } = await supabase
        .from('financial_records')
        .insert({
          type: '收入',
          amount,
          category: '订单收入',
          source: 'order',
          related_order_id: orderId,
          description: '订单收款',
        })
      if (insertError) throw insertError
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
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (!items) return

      const { error } = await supabase
        .from('order_items')
        .update({ is_picked_up: 1 })
        .eq('id', itemId)
      if (error) throw error

      // Release hook
      if (items.hook_no !== null) {
        await rackStore.releaseHook(items.hook_no)
      }
    } catch (error) {
      console.error('Failed to pick up item:', error)
      throw error
    }
  }

  async function getTodayStats(): Promise<{ orderCount: number; income: number }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const startOfDay = `${today}T00:00:00`
      const endOfDay = `${today}T23:59:59`

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)

      if (orderError) throw orderError

      const { data: incomeData, error: incomeError } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('type', '收入')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)

      if (incomeError) throw incomeError

      const income = (incomeData || []).reduce((sum, record) => sum + (record.amount || 0), 0)
      return {
        orderCount: orderData?.length ?? 0,
        income,
      }
    } catch (error) {
      console.error('Failed to get today stats:', error)
      throw error
    }
  }

  // Record balance payment (without updating payment_method since it's internal)
  async function recordBalancePayment(orderId: number, amount: number) {
    try {
      // Get current paid_amount
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('paid_amount')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      const { error: updateError } = await supabase
        .from('orders')
        .update({ paid_amount: (order?.paid_amount ?? 0) + amount })
        .eq('id', orderId)
      if (updateError) throw updateError

      // Record as financial income - source is 'order' but payment method is '余额'
      const { error: insertError } = await supabase
        .from('financial_records')
        .insert({
          type: '收入',
          amount,
          category: '订单收入',
          source: 'order',
          related_order_id: orderId,
          description: '余额支付',
        })
      if (insertError) throw insertError
    } catch (error) {
      console.error('Failed to record balance payment:', error)
      throw error
    }
  }

  return {
    orders,
    loadOrders, getOrder, getOrderItems, createOrder,
    updateStatus, recordPayment, recordBalancePayment, pickUpItem, getTodayStats,
  }
})