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
      const { data, error } = await supabase
        .from('rack_hooks')
        .select(`
          *,
          order_items (garment_type),
          orders (order_no, customer_id, customers (name))
        `)
        .order('hook_no')
      if (error) throw error

      // Transform data to flatten joined fields
      hooks.value = (data || []).map((hook: any) => ({
        ...hook,
        garment_type: hook.order_items?.garment_type,
        order_no: hook.orders?.order_no,
        order_id: hook.orders?.id,
        customer_name: hook.orders?.customers?.name
      }))
    } catch (error) {
      console.error('Failed to load hooks:', error)
      throw error
    }
  }

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('rack_settings')
        .select('total_hooks')
        .eq('id', 1)
        .single()
      if (error) throw error
      if (data) {
        totalHooks.value = data.total_hooks
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      throw error
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
      if (fetchError) throw fetchError
      if (!free || free.length === 0) return null
      const hookNo = free[0].hook_no

      const { error } = await supabase
        .from('rack_hooks')
        .update({ status: '占用', order_item_id: orderItemId })
        .eq('hook_no', hookNo)
      if (error) throw error
      return hookNo
    } catch (error) {
      console.error('Failed to allocate hook:', error)
      throw error
    }
  }

  async function releaseHook(hookNo: number) {
    try {
      // Check if hook exists
      const { data: existing, error: fetchError } = await supabase
        .from('rack_hooks')
        .select('id')
        .eq('hook_no', hookNo)
        .single()
      if (fetchError) throw fetchError
      if (!existing) {
        throw new Error(`挂钩 ${hookNo} 不存在`)
      }
      const { error } = await supabase
        .from('rack_hooks')
        .update({ status: '空闲', order_item_id: null })
        .eq('hook_no', hookNo)
      if (error) throw error
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

      // Update settings
      const { error: updateError } = await supabase
        .from('rack_settings')
        .update({ total_hooks: newTotal })
        .eq('id', 1)
      if (updateError) throw updateError

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
      if (error) throw error
      return data?.length ?? 0
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