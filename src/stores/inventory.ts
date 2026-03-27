import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query, execute } from '@/db'

// Validation constants
const MAX_QUANTITY = 100000
const MIN_QUANTITY = 0

export interface InventoryItem {
  id: number
  name: string
  category: string
  quantity: number
  unit: string
  min_quantity: number
  updated_at: string
}

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<InventoryItem[]>([])

  async function loadItems() {
    try {
      items.value = await query<InventoryItem>('SELECT * FROM inventory ORDER BY category, name')
    } catch (error) {
      console.error('Failed to load inventory items:', error)
      throw error
    }
  }

  async function createItem(item: { name: string; category: string; quantity: number; unit: string; min_quantity: number }) {
    try {
      // Validate name
      if (!item.name || item.name.trim() === '') {
        throw new Error('物品名称不能为空')
      }

      // Validate category
      if (!item.category || item.category.trim() === '') {
        throw new Error('分类不能为空')
      }

      // Validate quantity
      if (typeof item.quantity !== 'number') {
        throw new Error('数量必须是数字')
      }
      if (item.quantity < MIN_QUANTITY) {
        throw new Error('数量不能为负数')
      }
      if (item.quantity > MAX_QUANTITY) {
        throw new Error(`数量不能超过 ${MAX_QUANTITY}`)
      }

      // Validate unit
      if (!item.unit || item.unit.trim() === '') {
        throw new Error('单位不能为空')
      }

      // Validate min_quantity
      if (typeof item.min_quantity !== 'number') {
        throw new Error('最小库存数量必须是数字')
      }
      if (item.min_quantity < MIN_QUANTITY) {
        throw new Error('最小库存数量不能为负数')
      }
      if (item.min_quantity > MAX_QUANTITY) {
        throw new Error(`最小库存数量不能超过 ${MAX_QUANTITY}`)
      }

      await execute(
        'INSERT INTO inventory (name, category, quantity, unit, min_quantity) VALUES (?, ?, ?, ?, ?)',
        [item.name, item.category, item.quantity, item.unit, item.min_quantity]
      )
      await loadItems()
    } catch (error) {
      console.error('Failed to create inventory item:', error)
      throw error
    }
  }

  async function updateItem(id: number, item: Partial<InventoryItem>) {
    try {
      // Validate id
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('无效的物品ID')
      }

      // Validate name if provided
      if (item.name !== undefined && (!item.name || item.name.trim() === '')) {
        throw new Error('物品名称不能为空')
      }

      // Validate category if provided
      if (item.category !== undefined && (!item.category || item.category.trim() === '')) {
        throw new Error('分类不能为空')
      }

      // Validate quantity if provided
      if (item.quantity !== undefined) {
        if (typeof item.quantity !== 'number') {
          throw new Error('数量必须是数字')
        }
        if (item.quantity < MIN_QUANTITY) {
          throw new Error('数量不能为负数')
        }
        if (item.quantity > MAX_QUANTITY) {
          throw new Error(`数量不能超过 ${MAX_QUANTITY}`)
        }
      }

      // Validate unit if provided
      if (item.unit !== undefined && (!item.unit || item.unit.trim() === '')) {
        throw new Error('单位不能为空')
      }

      // Validate min_quantity if provided
      if (item.min_quantity !== undefined) {
        if (typeof item.min_quantity !== 'number') {
          throw new Error('最小库存数量必须是数字')
        }
        if (item.min_quantity < MIN_QUANTITY) {
          throw new Error('最小库存数量不能为负数')
        }
        if (item.min_quantity > MAX_QUANTITY) {
          throw new Error(`最小库存数量不能超过 ${MAX_QUANTITY}`)
        }
      }

      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, val] of Object.entries(item)) {
        if (!['id', 'updated_at'].includes(key)) {
          fields.push(`${key} = ?`)
          values.push(val)
        }
      }
      fields.push("updated_at = datetime('now', 'localtime')")
      values.push(id)

      if (fields.length <= 1) {
        throw new Error('没有需要更新的字段')
      }

      await execute(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, values)
      await loadItems()
    } catch (error) {
      console.error('Failed to update inventory item:', error)
      throw error
    }
  }

  async function adjustQuantity(id: number, delta: number, _reason: string) {
    try {
      // Validate id
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('无效的物品ID')
      }

      // Validate delta
      if (typeof delta !== 'number') {
        throw new Error('数量变化必须是数字')
      }

      // Get current item to validate adjustment doesn't go below zero
      const currentItems = await query<InventoryItem>('SELECT quantity FROM inventory WHERE id = ?', [id])
      if (currentItems.length === 0) {
        throw new Error('物品不存在')
      }
      const newQuantity = currentItems[0].quantity + delta
      if (newQuantity < MIN_QUANTITY) {
        throw new Error(`调整后数量不能为负数，当前数量: ${currentItems[0].quantity}，变化: ${delta}`)
      }
      if (newQuantity > MAX_QUANTITY) {
        throw new Error(`调整后数量不能超过 ${MAX_QUANTITY}`)
      }

      await execute(
        "UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
        [delta, id]
      )
      await loadItems()
    } catch (error) {
      console.error('Failed to adjust quantity:', error)
      throw error
    }
  }

  async function deleteItem(id: number) {
    try {
      // Validate id
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('无效的物品ID')
      }

      await execute('DELETE FROM inventory WHERE id = ?', [id])
      await loadItems()
    } catch (error) {
      console.error('Failed to delete inventory item:', error)
      throw error
    }
  }

  async function getLowStockItems(): Promise<InventoryItem[]> {
    try {
      return query<InventoryItem>('SELECT * FROM inventory WHERE quantity <= min_quantity ORDER BY name')
    } catch (error) {
      console.error('Failed to get low stock items:', error)
      throw error
    }
  }

  return { items, loadItems, createItem, updateItem, adjustQuantity, deleteItem, getLowStockItems }
})