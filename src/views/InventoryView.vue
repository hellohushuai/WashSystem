<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useInventoryStore, type InventoryItem } from '@/stores/inventory'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useInventoryStore()
const showDialog = ref(false)
const showAdjustDialog = ref(false)
const editingId = ref<number | null>(null)
const adjustId = ref<number | null>(null)
const form = ref({ name: '', category: '洗涤剂', quantity: 0, unit: '瓶', min_quantity: 0 })
const adjustForm = ref({ delta: 0, reason: '' })

const categories = ['洗涤剂', '包装材料', '其他']

onMounted(() => store.loadItems())

function openAdd() {
  editingId.value = null
  form.value = { name: '', category: '洗涤剂', quantity: 0, unit: '瓶', min_quantity: 0 }
  showDialog.value = true
}

function openEdit(item: InventoryItem) {
  editingId.value = item.id
  form.value = { name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, min_quantity: item.min_quantity }
  showDialog.value = true
}

function openAdjust(item: InventoryItem) {
  adjustId.value = item.id
  adjustForm.value = { delta: 0, reason: '' }
  showAdjustDialog.value = true
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请填写物品名称')
    return
  }
  if (editingId.value) {
    await store.updateItem(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await store.createItem(form.value)
    ElMessage.success('添加成功')
  }
  showDialog.value = false
}

async function handleAdjust() {
  if (!adjustId.value || adjustForm.value.delta === 0) return
  await store.adjustQuantity(adjustId.value, adjustForm.value.delta, adjustForm.value.reason)
  ElMessage.success(adjustForm.value.delta > 0 ? '入库成功' : '出库成功')
  showAdjustDialog.value = false
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确认删除此库存物品？', '确认')
  await store.deleteItem(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>库存管理</h2>
      <el-button type="primary" @click="openAdd">添加物品</el-button>
    </div>

    <el-table :data="store.items" stripe style="background: var(--card-bg);" empty-text="暂无库存">
      <el-table-column prop="name" label="物品名称" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column label="库存量" width="140">
        <template #default="{ row }">
          <span :style="{ color: row.quantity <= row.min_quantity ? '#f56c6c' : 'inherit', fontWeight: row.quantity <= row.min_quantity ? 'bold' : 'normal' }">
            {{ row.quantity }} {{ row.unit }}
          </span>
          <el-tag v-if="row.quantity <= row.min_quantity" type="danger" size="small" style="margin-left: 4px;">不足</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="min_quantity" label="最低库存" width="100">
        <template #default="{ row }">{{ row.min_quantity }} {{ row.unit }}</template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openAdjust(row)">出入库</el-button>
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingId ? '编辑物品' : '添加物品'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始库存"><el-input-number v-model="form.quantity" :min="0" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="form.unit" style="width: 100px;" /></el-form-item>
        <el-form-item label="最低库存"><el-input-number v-model="form.min_quantity" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAdjustDialog" title="出入库操作" width="380px">
      <el-form label-width="60px">
        <el-form-item label="数量">
          <el-input-number v-model="adjustForm.delta" />
          <span style="margin-left: 8px; color: var(--text-secondary);">正数入库，负数出库</span>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="adjustForm.reason" placeholder="出入库原因（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdjustDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdjust">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>