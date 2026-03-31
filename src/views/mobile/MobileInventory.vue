<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

const store = useInventoryStore()
const loading = ref(true)
const searchQuery = ref('')

// Create modal
const showCreateModal = ref(false)
const creating = ref(false)
const newItem = ref({
  name: '',
  category: '',
  quantity: 0,
  unit: '件',
  min_quantity: 10,
})

const categories = ['洗涤剂', '柔顺剂', '包装材料', '配件', '其他']

const filteredItems = computed(() => {
  if (!searchQuery.value) return store.items
  const q = searchQuery.value.toLowerCase()
  return store.items.filter(item =>
    item.name.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q)
  )
})

const lowStockItems = computed(() => {
  return store.items.filter(item => item.quantity <= item.min_quantity)
})

onMounted(async () => {
  try {
    await store.loadItems()
  } catch (error) {
    console.error('Failed to load inventory:', error)
  } finally {
    loading.value = false
  }
})

async function createItem() {
  if (!newItem.value.name || !newItem.value.category) {
    alert('请填写名称和分类')
    return
  }

  creating.value = true
  try {
    await store.createItem(newItem.value)
    alert('添加成功！')
    showCreateModal.value = false
    newItem.value = { name: '', category: '', quantity: 0, unit: '件', min_quantity: 10 }
  } catch (e: any) {
    alert(e.message || '添加失败')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="mobile-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">库存管理</h2>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="inventory-content">
      <!-- Summary Cards -->
      <div class="summary-row">
        <div class="summary-card">
          <span class="summary-value">{{ store.items.length }}</span>
          <span class="summary-label">全部物品</span>
        </div>
        <div class="summary-card warning">
          <span class="summary-value">{{ lowStockItems.length }}</span>
          <span class="summary-label">库存不足</span>
        </div>
      </div>

      <!-- Low Stock Alert -->
      <div v-if="lowStockItems.length > 0" class="alert-card">
        <span class="material-symbols-outlined alert-icon">warning</span>
        <div class="alert-content">
          <span class="alert-title">库存不足提醒</span>
          <span class="alert-desc">{{ lowStockItems.length }} 种物品库存不足</span>
        </div>
      </div>

      <!-- Search -->
      <div class="search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索物品..."
          class="search-input"
        />
      </div>

      <!-- Category Tabs -->
      <div class="category-tabs">
        <div class="tab-item active">全部</div>
      </div>

      <!-- Item List -->
      <div class="item-list">
        <div v-if="filteredItems.length === 0" class="empty">
          暂无物品
        </div>
        <div v-else v-for="item in filteredItems" :key="item.id" class="item-card">
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-category">{{ item.category }}</span>
          </div>
          <div class="item-stock">
            <span class="stock-count" :class="{ low: item.quantity <= item.min_quantity }">
              {{ item.quantity }} {{ item.unit }}
            </span>
            <span class="min-stock">最小: {{ item.min_quantity }}</span>
          </div>
        </div>
      </div>

      <!-- FAB -->
      <button class="fab" @click="showCreateModal = true">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <h3 class="modal-title">新增库存</h3>

        <div class="form-group">
          <label class="form-label">名称 *</label>
          <input v-model="newItem.name" type="text" class="input-mobile" placeholder="物品名称" />
        </div>

        <div class="form-group">
          <label class="form-label">分类 *</label>
          <select v-model="newItem.category" class="input-mobile">
            <option value="">选择分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">数量</label>
          <input v-model.number="newItem.quantity" type="number" class="input-mobile" min="0" />
        </div>

        <div class="form-group">
          <label class="form-label">单位</label>
          <input v-model="newItem.unit" type="text" class="input-mobile" placeholder="件/袋/箱" />
        </div>

        <div class="form-group">
          <label class="form-label">最低库存</label>
          <input v-model.number="newItem.min_quantity" type="number" class="input-mobile" min="0" />
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showCreateModal = false">取消</button>
          <button class="btn-confirm" @click="createItem" :disabled="creating">
            {{ creating ? '添加中...' : '确认添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.page-header {
  padding: 16px;
  background: var(--surface);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--on-surface-variant);
}

.summary-row {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-card.warning {
  background: var(--warning-bg);
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
}

.summary-card.warning .summary-value {
  color: var(--warning);
}

.summary-label {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.alert-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 16px 16px;
  padding: 12px;
  background: var(--warning-bg);
  border-radius: 12px;
}

.alert-icon {
  color: var(--warning);
  font-size: 24px;
}

.alert-content {
  display: flex;
  flex-direction: column;
}

.alert-title {
  font-weight: 600;
  font-size: 14px;
}

.alert-desc {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 16px;
  padding: 12px 16px;
  background: var(--surface);
  border-radius: 12px;
}

.search-icon {
  color: var(--on-surface-variant);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--on-surface);
}

.search-input::placeholder {
  color: var(--on-surface-variant);
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.tab-item {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  white-space: nowrap;
  background: var(--surface);
}

.tab-item.active {
  background: var(--primary);
  color: var(--on-primary);
}

.item-list {
  padding: 0 16px 16px;
}

.empty {
  text-align: center;
  padding: 48px;
  color: var(--on-surface-variant);
}

.item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 500;
}

.item-category {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.item-stock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stock-count {
  font-weight: 600;
  font-size: 16px;
}

.stock-count.low {
  color: var(--warning);
}

.min-stock {
  font-size: 11px;
  color: var(--on-surface-variant);
}

/* FAB */
.fab {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 99, 151, 0.4);
}

.fab .material-symbols-outlined {
  font-size: 28px;
  color: white;
}

.fab:active {
  transform: scale(0.95);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--surface);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface);
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--on-surface);
  background: var(--surface-container);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.btn-confirm {
  flex: 1;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.6;
}
</style>