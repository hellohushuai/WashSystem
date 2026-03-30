<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTypesStore, type GarmentType } from '@/stores/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const store = useTypesStore()
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ name: '', price: 0, sort_order: 0, is_active: 1 })
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await store.loadGarmentTypes()
})

function openAdd() {
  editingId.value = null
  let maxSort = 0
  if (store.garmentTypes && store.garmentTypes.length > 0) {
    maxSort = store.garmentTypes.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0)
  }
  form.value = { name: '', price: 0, sort_order: maxSort + 1, is_active: 1 }
  showDialog.value = true
}

function openEdit(type: GarmentType) {
  editingId.value = type.id
  form.value = {
    name: type.name,
    price: type.price,
    sort_order: type.sort_order,
    is_active: type.is_active
  }
  showDialog.value = true
}

// Export to CSV
function exportToCSV() {
  const headers = ['类型名称', '价格(元)', '排序', '状态']
  const rows = store.garmentTypes.map(t => [
    t.name,
    t.price.toString(),
    t.sort_order.toString(),
    t.is_active ? '启用' : '禁用'
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `衣物类型_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// Import from CSV
function triggerImport() {
  fileInput.value?.click()
}

async function handleFileImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      const dataLines = lines.slice(1)
      let successCount = 0

      for (const line of dataLines) {
        const values = line.match(/("([^"]*)"|[^,]+)/g) || []
        const [name, price, sortOrder, status] = values.map(v => v.replace(/^"|"$/g, '').trim())

        if (name) {
          try {
            await store.createGarmentType({
              name,
              price: parseFloat(price) || 0,
              sort_order: parseInt(sortOrder) || 0,
              is_active: status === '禁用' ? 0 : 1
            })
            successCount++
          } catch {
            // Skip duplicates
          }
        }
      }

      await store.loadGarmentTypes()
      ElMessage.success(`导入成功：${successCount} 条`)
    } catch (error) {
      ElMessage.error('导入失败：文件格式错误')
    }
  }
  reader.readAsText(file)

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleSave() {
  const name = form.value.name?.trim()
  if (!name) {
    ElMessage.warning('请填写类型名称')
    return
  }

  const typeData = {
    name: name,
    price: Number(form.value.price) || 0,
    sort_order: Number(form.value.sort_order) || 0,
    is_active: form.value.is_active ? 1 : 0
  }

  try {
    if (editingId.value) {
      await store.updateGarmentType(editingId.value, typeData)
      ElMessage.success('修改成功')
    } else {
      await store.createGarmentType(typeData)
      ElMessage.success('添加成功')
    }
    showDialog.value = false
    await store.loadGarmentTypes()
  } catch (error: any) {
    console.error('Save error:', error)
    const errMsg = error?.message || error?.toString() || '操作失败'
    ElMessage.error('错误: ' + errMsg)
    ElMessageBox.alert('操作失败！\n\n错误信息: ' + errMsg, '保存失败', {
      confirmButtonText: '确定',
      type: 'error'
    })
  }
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确认删除此衣物类型？', '确认删除')
  await store.deleteGarmentType(id)
  ElMessage.success('已删除')
}

async function toggleActive(type: GarmentType) {
  try {
    await store.updateGarmentType(type.id, { is_active: type.is_active ? 0 : 1 })
    ElMessage.success(type.is_active ? '已禁用' : '已启用')
    await store.loadGarmentTypes()
  } catch (error: any) {
    ElMessage.error('操作失败: ' + (error?.message || error?.toString()))
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>衣物类型管理</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="router.back()">返回</el-button>
        <el-button @click="exportToCSV">导出</el-button>
        <el-button @click="triggerImport">导入</el-button>
        <el-button type="primary" @click="openAdd">添加类型</el-button>
        <input ref="fileInput" type="file" accept=".csv" style="display: none;" @change="handleFileImport" />
      </div>
    </div>

    <el-table :data="store.garmentTypes" stripe style="width: 100%; background: var(--card-bg);" empty-text="暂无类型">
      <el-table-column prop="name" label="类型名称" width="150" />
      <el-table-column prop="price" label="价格(元)" width="120">
        <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column prop="is_active" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="warning" link size="small" @click="toggleActive(row)">
            {{ row.is_active ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingId ? '编辑类型' : '添加类型'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如：上衣、裤子、西装" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="form.price" :min="0" :step="1" :precision="2" />
          <span style="margin-left: 8px; color: var(--text-secondary);">元</span>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.is_active" :active-value="1" :inactive-value="0" />
          <span style="margin-left: 8px;">{{ form.is_active ? '启用' : '禁用' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>