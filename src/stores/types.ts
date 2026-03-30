import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

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
      garmentTypes.value = await query<GarmentType>(
        'SELECT * FROM garment_types ORDER BY sort_order'
      )
    } catch (error) {
      console.error('Failed to load garment types:', error)
      throw error
    }
  }

  async function createGarmentType(type: Omit<GarmentType, 'id' | 'created_at'>) {
    try {
      const result = await execute(
        'INSERT INTO garment_types (name, price, sort_order, is_active) VALUES (?, ?, ?, ?)',
        [type.name, type.price, type.sort_order, type.is_active ?? 1]
      )
      await loadGarmentTypes()
      return result.lastInsertId
    } catch (error) {
      console.error('Failed to create garment type:', error)
      throw error
    }
  }

  async function updateGarmentType(id: number, type: Partial<GarmentType>) {
    try {
      const allowedFields = ['name', 'price', 'sort_order', 'is_active']
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, val] of Object.entries(type)) {
        if (key !== 'id' && key !== 'created_at' && allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          values.push(val)
        }
      }
      if (fields.length === 0) return
      values.push(id)
      await execute(`UPDATE garment_types SET ${fields.join(', ')} WHERE id = ?`, values)
      await loadGarmentTypes()
    } catch (error) {
      console.error('Failed to update garment type:', error)
      throw error
    }
  }

  async function deleteGarmentType(id: number) {
    try {
      await execute('DELETE FROM garment_types WHERE id = ?', [id])
      await loadGarmentTypes()
    } catch (error) {
      console.error('Failed to delete garment type:', error)
      throw error
    }
  }

  // Service Types
  async function loadServiceTypes() {
    try {
      serviceTypes.value = await query<ServiceType>(
        'SELECT * FROM service_types ORDER BY sort_order'
      )
    } catch (error) {
      console.error('Failed to load service types:', error)
      throw error
    }
  }

  async function createServiceType(type: Omit<ServiceType, 'id' | 'created_at'>) {
    try {
      const result = await execute(
        'INSERT INTO service_types (name, price, sort_order, is_active) VALUES (?, ?, ?, ?)',
        [type.name, type.price, type.sort_order, type.is_active ?? 1]
      )
      await loadServiceTypes()
      return result.lastInsertId
    } catch (error) {
      console.error('Failed to create service type:', error)
      throw error
    }
  }

  async function updateServiceType(id: number, type: Partial<ServiceType>) {
    try {
      const allowedFields = ['name', 'price', 'sort_order', 'is_active']
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, val] of Object.entries(type)) {
        if (key !== 'id' && key !== 'created_at' && allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          values.push(val)
        }
      }
      if (fields.length === 0) return
      values.push(id)
      await execute(`UPDATE service_types SET ${fields.join(', ')} WHERE id = ?`, values)
      await loadServiceTypes()
    } catch (error) {
      console.error('Failed to update service type:', error)
      throw error
    }
  }

  async function deleteServiceType(id: number) {
    try {
      await execute('DELETE FROM service_types WHERE id = ?', [id])
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