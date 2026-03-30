import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface GarmentType {
  id: number
  name: string
  price: number
  sort_order: number
  is_active: number
  created_at: string
}

export interface ServiceType {
  id: number
  name: string
  price: number
  sort_order: number
  is_active: number
  created_at: string
}

export const useTypesStore = defineStore('types', () => {
  const garmentTypes = ref<GarmentType[]>([])
  const serviceTypes = ref<ServiceType[]>([])

  // Garment Types
  async function loadGarmentTypes() {
    try {
      const { data, error } = await supabase
        .from('garment_types')
        .select('*')
        .order('sort_order')
      if (error) throw error
      garmentTypes.value = data || []
    } catch (error) {
      console.error('Failed to load garment types:', error)
      throw error
    }
  }

  async function createGarmentType(type: Omit<GarmentType, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('garment_types')
        .insert([{
          name: type.name,
          price: type.price,
          sort_order: type.sort_order,
          is_active: type.is_active ?? 1
        }])
        .select()
        .single()
      if (error) throw error
      await loadGarmentTypes()
      return data?.id
    } catch (error) {
      console.error('Failed to create garment type:', error)
      throw error
    }
  }

  async function updateGarmentType(id: number, type: Partial<GarmentType>) {
    try {
      const allowedFields = ['name', 'price', 'sort_order', 'is_active']
      const updateData: Record<string, any> = {}
      for (const [key, val] of Object.entries(type)) {
        if (key !== 'id' && key !== 'created_at' && allowedFields.includes(key)) {
          updateData[key] = val
        }
      }
      if (Object.keys(updateData).length === 0) return
      const { error } = await supabase
        .from('garment_types')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
      await loadGarmentTypes()
    } catch (error) {
      console.error('Failed to update garment type:', error)
      throw error
    }
  }

  async function deleteGarmentType(id: number) {
    try {
      const { error } = await supabase
        .from('garment_types')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadGarmentTypes()
    } catch (error) {
      console.error('Failed to delete garment type:', error)
      throw error
    }
  }

  // Service Types
  async function loadServiceTypes() {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('sort_order')
      if (error) throw error
      serviceTypes.value = data || []
    } catch (error) {
      console.error('Failed to load service types:', error)
      throw error
    }
  }

  async function createServiceType(type: Omit<ServiceType, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .insert([{
          name: type.name,
          price: type.price,
          sort_order: type.sort_order,
          is_active: type.is_active ?? 1
        }])
        .select()
        .single()
      if (error) throw error
      await loadServiceTypes()
      return data?.id
    } catch (error) {
      console.error('Failed to create service type:', error)
      throw error
    }
  }

  async function updateServiceType(id: number, type: Partial<ServiceType>) {
    try {
      const allowedFields = ['name', 'price', 'sort_order', 'is_active']
      const updateData: Record<string, any> = {}
      for (const [key, val] of Object.entries(type)) {
        if (key !== 'id' && key !== 'created_at' && allowedFields.includes(key)) {
          updateData[key] = val
        }
      }
      if (Object.keys(updateData).length === 0) return
      const { error } = await supabase
        .from('service_types')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
      await loadServiceTypes()
    } catch (error) {
      console.error('Failed to update service type:', error)
      throw error
    }
  }

  async function deleteServiceType(id: number) {
    try {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadServiceTypes()
    } catch (error) {
      console.error('Failed to delete service type:', error)
      throw error
    }
  }

  return {
    garmentTypes, serviceTypes,
    loadGarmentTypes, createGarmentType, updateGarmentType, deleteGarmentType,
    loadServiceTypes, createServiceType, updateServiceType, deleteServiceType,
  }
})