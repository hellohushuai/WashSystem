<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'
import { ElMessage } from 'element-plus'

const router = useRouter()
const store = useCustomerStore()
const search = ref('')
const showAddDialog = ref(false)
const form = ref({ name: '', phone: '', membership_level_id: undefined as number | undefined, notes: '' })
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await store.loadLevels()
  await store.loadCustomers()
})

async function handleSearch() {
  await store.loadCustomers(search.value || undefined)
}

async function handleAdd() {
  if (!form.value.name || !form.value.phone) {
    ElMessage.warning('请填写姓名和手机号')
    return
  }
  try {
    await store.createCustomer(form.value)
    ElMessage.success('客户添加成功')
    showAddDialog.value = false
    form.value = { name: '', phone: '', membership_level_id: undefined, notes: '' }
    await store.loadCustomers()
  } catch (e: any) {
    ElMessage.error(e.message || '添加失败')
  }
}

// Export to CSV
function exportToCSV() {
  const headers = ['姓名', '手机号', '会员等级', '积分', '余额', '注册时间']
  const rows = store.customers.map(c => [
    c.name,
    c.phone,
    c.level_name || '',
    c.points.toString(),
    (c.balance || 0).toString(),
    c.created_at
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `客户列表_${new Date().toISOString().split('T')[0]}.csv`
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

      // Skip header
      const dataLines = lines.slice(1)
      let successCount = 0
      let errorCount = 0

      for (const line of dataLines) {
        // Parse CSV line (handle quoted values)
        const values = line.match(/("([^"]*)"|[^,]+)/g) || []
        const [name, phone, levelName] = values.map(v => v.replace(/^"|"$/g, '').trim())

        if (name && phone) {
          // Find level by name
          let levelId: number | undefined
          if (levelName) {
            const level = store.levels.find(l => l.name === levelName)
            levelId = level?.id
          }

          try {
            await store.createCustomer({
              name,
              phone,
              membership_level_id: levelId,
              notes: ''
            })
            successCount++
          } catch {
            errorCount++
          }
        } else {
          errorCount++
        }
      }

      await store.loadCustomers()
      ElMessage.success(`导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`)
    } catch (error) {
      ElMessage.error('导入失败：文件格式错误')
    }
  }
  reader.readAsText(file)

  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>客户管理</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="router.push('/customers/membership')">会员等级设置</el-button>
        <el-button @click="exportToCSV">导出</el-button>
        <el-button @click="triggerImport">导入</el-button>
        <el-button type="primary" @click="showAddDialog = true">添加客户</el-button>
        <input ref="fileInput" type="file" accept=".csv" style="display: none;" @change="handleFileImport" />
      </div>
    </div>

    <el-input
      v-model="search"
      placeholder="搜索姓名或手机号"
      clearable
      style="margin-bottom: 16px; max-width: 300px;"
      @input="handleSearch"
      @clear="handleSearch"
    />

    <el-table :data="store.customers" stripe style="width: 100%; background: var(--card-bg);" empty-text="暂无客户">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="level_name" label="会员等级" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.level_name" size="small">{{ row.level_name }}</el-tag>
          <span v-else style="color: var(--text-secondary);">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="points" label="积分" width="80" />
      <el-table-column prop="balance" label="余额" width="100">
        <template #default="{ row }">
          <span style="color: var(--el-color-success);">¥{{ (row.balance || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" />
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="router.push(`/customers/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showAddDialog" title="添加客户" width="420px">
      <el-form label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="客户姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="form.membership_level_id" placeholder="选择等级" clearable>
            <el-option v-for="l in store.levels" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>