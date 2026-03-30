import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

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
      const { data, error } = await supabase
        .from('membership_levels')
        .select('*')
        .order('sort_order')
      if (error) throw error
      levels.value = data || []
    } catch (error) {
      console.error('Failed to load levels:', error)
      throw error
    }
  }

  async function createLevel(level: Omit<MembershipLevel, 'id'>) {
    console.log('Creating level with data:', JSON.stringify(level))
    try {
      const { data, error } = await supabase
        .from('membership_levels')
        .insert([level])
        .select()
        .single()
      if (error) throw error
      await loadLevels()
      return data?.id
    } catch (error) {
      console.error('Failed to create level:', error)
      throw error
    }
  }

  async function updateLevel(id: number, level: Partial<MembershipLevel>) {
    try {
      const { error } = await supabase
        .from('membership_levels')
        .update(level)
        .eq('id', id)
      if (error) throw error
      await loadLevels()
    } catch (error) {
      console.error('Failed to update level:', error)
      throw error
    }
  }

  async function deleteLevel(id: number) {
    try {
      // First set customers with this level to null
      await supabase
        .from('customers')
        .update({ membership_level_id: null })
        .eq('membership_level_id', id)
      // Then delete the level
      const { error } = await supabase
        .from('membership_levels')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadLevels()
    } catch (error) {
      console.error('Failed to delete level:', error)
      throw error
    }
  }

  async function loadCustomers(search?: string) {
    try {
      // Load levels first
      await loadLevels()
      const levelMap = new Map(levels.value.map(l => [l.id, l]))

      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      // Transform the data to flatten membership level info
      customers.value = (data || []).map((customer: any) => {
        const level = customer.membership_level_id ? levelMap.get(customer.membership_level_id) : null
        return {
          ...customer,
          level_name: level?.name,
          discount: level?.discount
        }
      })
    } catch (error) {
      console.error('Failed to load customers:', error)
      throw error
    }
  }

  async function getCustomer(id: number): Promise<Customer | undefined> {
    try {
      // Load levels first
      await loadLevels()
      const levelMap = new Map(levels.value.map(l => [l.id, l]))

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        const level = data.membership_level_id ? levelMap.get(data.membership_level_id) : null
        return {
          ...data,
          level_name: level?.name,
          discount: level?.discount
        }
      }
      return undefined
    } catch (error) {
      console.error('Failed to get customer:', error)
      throw error
    }
  }

  async function createCustomer(c: { name: string; phone: string; membership_level_id?: number; notes?: string }) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: c.name,
          phone: c.phone,
          membership_level_id: c.membership_level_id ?? null,
          notes: c.notes ?? '',
          points: 0,
          balance: 0
        }])
        .select()
        .single()

      if (error) throw error
      return data?.id
    } catch (error) {
      console.error('Failed to create customer:', error)
      throw error
    }
  }

  async function updateCustomer(id: number, c: Partial<Customer>) {
    try {
      const allowedFields = ['name', 'phone', 'membership_level_id', 'points', 'balance', 'notes']
      const updateData: Record<string, any> = {}
      for (const [key, val] of Object.entries(c)) {
        if (key !== 'id' && key !== 'created_at' && key !== 'level_name' && key !== 'discount' && allowedFields.includes(key)) {
          updateData[key] = val
        }
      }
      if (Object.keys(updateData).length === 0) return

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update customer:', error)
      throw error
    }
  }

  async function addPoints(customerId: number, points: number): Promise<number> {
    try {
      // Get current points
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('points')
        .eq('id', customerId)
        .single()

      if (fetchError) throw fetchError

      const newPoints = (customer?.points || 0) + points

      const { error } = await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', customerId)

      if (error) throw error
      return newPoints
    } catch (error) {
      console.error('Failed to add points:', error)
      throw error
    }
  }

  async function recharge(customerId: number, amount: number, paymentMethod: string = '现金'): Promise<number> {
    try {
      // Get current balance
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .single()

      if (fetchError) throw fetchError

      const newBalance = (customer?.balance || 0) + amount

      // Update customer balance
      const { error } = await supabase
        .from('customers')
        .update({ balance: newBalance })
        .eq('id', customerId)

      if (error) throw error

      // Record recharge
      await supabase
        .from('recharge_records')
        .insert([{
          customer_id: customerId,
          amount: amount,
          payment_method: paymentMethod
        }])

      // Create financial record
      await supabase
        .from('financial_records')
        .insert([{
          type: '收入',
          amount: amount,
          category: '会员充值',
          source: 'recharge',
          related_customer_id: customerId,
          description: '会员充值'
        }])

      return newBalance
    } catch (error) {
      console.error('Failed to recharge:', error)
      throw error
    }
  }

  async function useBalance(customerId: number, amount: number): Promise<boolean> {
    try {
      // Get current balance
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .single()

      if (fetchError) throw fetchError

      const currentBalance = customer?.balance || 0
      if (currentBalance < amount) {
        return false
      }

      const { error } = await supabase
        .from('customers')
        .update({ balance: currentBalance - amount })
        .eq('id', customerId)

      if (error) throw error
      return true
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