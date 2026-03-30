import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

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
      // Load hooks without joins
      const { data, error } = await supabase
        .from('rack_hooks')
        .select('*')
        .order('hook_no')
      if (error) {
        console.warn('rack_hooks table not found, using empty hooks')
        hooks.value = []
        return
      }

      if (!data || data.length === 0) {
        hooks.value = []
        return
      }

      // Get order items that have hook assigned
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, garment_type, order_id')

      // Get order IDs that are in use
      const orderItemMap = new Map(orderItems?.map(oi => [oi.id, oi]) || [])

      // Get orders info
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_no, customer_id')

      const orderMap = new Map(orders?.map(o => [o.id, o]) || [])

      // Get customers info
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')

      const customerMap = new Map(customers?.map(c => [c.id, c]) || [])

      // Transform data to add joined fields
      hooks.value = (data || []).map((hook: any) => {
        const orderItem = hook.order_item_id ? orderItemMap.get(hook.order_item_id) : null
        const order = orderItem ? orderMap.get(orderItem.order_id) : null
        const customer = order ? customerMap.get(order.customer_id) : null

        return {
          ...hook,
          garment_type: orderItem?.garment_type,
          order_no: order?.order_no,
          order_id: order?.id,
          customer_name: customer?.name
        }
      })
    } catch (error) {
      console.error('Failed to load hooks:', error)
      throw error
    }
  }

  async function loadSettings() {
    try {
      // Try to get settings, if table doesn't exist, use default
      const { data, error } = await supabase
        .from('rack_settings')
        .select('total_hooks')
        .eq('id', 1)
        .single()
      if (error) {
        // If error, try to create the table and insert default
        const { error: insertError } = await supabase.from('rack_settings').insert([{ id: 1, total_hooks: 100 }])
        if (insertError) {
          // Table might not exist, use default
          totalHooks.value = 100
          return
        }
      }
      if (data) {
        totalHooks.value = data.total_hooks
      } else {
        totalHooks.value = 100
      }
    } catch (error) {
      // Default to 100 if any error
      totalHooks.value = 100
    }
  }

  async function allocateHook(orderItemId: number): Promise<number | null> {
    try {
      const { data: free, error: fetchError } = await supabase
        .from('rack_hooks')
        .select('hook_no')
        .eq('status', '空闲')
        .order('hook_no')
        .limit(1)
      if (fetchError || !free || free.length === 0) return null
      const hookNo = free[0].hook_no

      const { error } = await supabase
        .from('rack_hooks')
        .update({ status: '占用', order_item_id: orderItemId })
        .eq('hook_no', hookNo)
      if (error) {
        console.warn('Failed to allocate hook:', error)
        return null
      }
      return hookNo
    } catch (error) {
      console.error('Failed to allocate hook:', error)
      return null
    }
  }

  async function releaseHook(hookNo: number) {
    try {
      // Check if hook exists
      const { data: existing, error: fetchError } = await supabase
        .from('rack_hooks')
        .select('hook_no')
        .eq('hook_no', hookNo)
        .single()
      if (fetchError) return // Silently return if hook doesn't exist
      if (!existing) return
      const { error } = await supabase
        .from('rack_hooks')
        .update({ status: '空闲', order_item_id: null })
        .eq('hook_no', hookNo)
      if (error) console.warn('Failed to release hook:', error)
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
      const { data: currentMax } = await supabase
        .from('rack_hooks')
        .select('hook_no')
        .order('hook_no', { ascending: false })
        .limit(1)
      const maxNo = currentMax && currentMax.length > 0 ? currentMax[0].hook_no : 0
      let hooksChanged = false

      if (newTotal > maxNo) {
        // Add new hooks
        for (let i = maxNo + 1; i <= newTotal; i++) {
          const { error } = await supabase
            .from('rack_hooks')
            .insert({ hook_no: i, status: '空闲' })
          if (error && error.code !== '23505') throw error // Ignore duplicate key error
        }
        hooksChanged = true
      } else if (newTotal < maxNo) {
        // Only remove free hooks from the end
        const { data: occupied } = await supabase
          .from('rack_hooks')
          .select('hook_no')
          .gt('hook_no', newTotal)
          .eq('status', '占用')
        if (occupied && occupied.length > 0) {
          throw new Error(`无法缩减：挂钩 ${occupied.map(h => h.hook_no).join(', ')} 正在使用中`)
        }
        const { error: deleteError } = await supabase
          .from('rack_hooks')
          .delete()
          .gt('hook_no', newTotal)
        if (deleteError) throw deleteError
        hooksChanged = true
      }

      // Update settings - try update first, then insert if needed
      const { error: updateError } = await supabase
        .from('rack_settings')
        .update({ total_hooks: newTotal })
        .eq('id', 1)

      if (updateError) {
        // Try to insert if update failed (table might not exist)
        const { error: insertError } = await supabase.from('rack_settings').insert([{ id: 1, total_hooks: newTotal }])
        if (insertError) {
          // Ignore if both fail - settings might not be critical
        }
      }

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
      const { data, error } = await supabase
        .from('rack_hooks')
        .select('hook_no', { count: 'exact' })
        .eq('status', '空闲')
      if (error) return 0
      return data?.length ?? 0
    } catch (error) {
      return 0
    }
  }

  return {
    hooks, totalHooks,
    loadHooks, loadSettings, allocateHook, releaseHook, setTotalHooks, getFreeCount,
  }
})