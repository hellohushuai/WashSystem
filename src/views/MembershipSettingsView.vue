<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore, type MembershipLevel } from '@/stores/customers'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const store = useCustomerStore()
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ name: '', discount: 1.0, points_threshold: 0, points_rate: 1.0, sort_order: 0 })

onMounted(() => store.loadLevels())

function openAdd() {
  editingId.value = null
  form.value = { name: '', discount: 1.0, points_threshold: 0, points_rate: 1.0, sort_order: 0 }
  showDialog.value = true
}

function openEdit(level: MembershipLevel) {
  editingId.value = level.id
  form.value = { name: level.name, discount: level.discount, points_threshold: level.points_threshold, points_rate: level.points_rate, sort_order: level.sort_order }
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请填写等级名称')
    return
  }
  if (editingId.value) {
    await store.updateLevel(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await store.createLevel(form.value)
    ElMessage.success('添加成功')
  }
  showDialog.value = false
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('删除此等级后，关联的客户将变为无等级。确认删除？', '确认')
  await store.deleteLevel(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>会员等级设置</h2>
      <div style="display: flex; gap: 8px;">
        <el-button @click="router.back()">返回</el-button>
        <el-button type="primary" @click="openAdd">添加等级</el-button>
      </div>
    </div>

    <el-table :data="store.levels" stripe style="width: 100%; background: var(--card-bg);" empty-text="暂无等级">
      <el-table-column prop="name" label="等级名称" width="120" />
      <el-table-column prop="discount" label="折扣" width="100">
        <template #default="{ row }">{{ (row.discount * 10).toFixed(1) }}折</template>
      </el-table-column>
      <el-table-column prop="points_threshold" label="升级积分" width="120" />
      <el-table-column prop="points_rate" label="积分倍率" width="120">
        <template #default="{ row }">×{{ row.points_rate }}</template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingId ? '编辑等级' : '添加等级'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="折扣">
          <el-input-number v-model="form.discount" :min="0.1" :max="1.0" :step="0.05" :precision="2" />
          <span style="margin-left: 8px; color: var(--text-secondary);">{{ (form.discount * 10).toFixed(1) }}折</span>
        </el-form-item>
        <el-form-item label="升级积分"><el-input-number v-model="form.points_threshold" :min="0" /></el-form-item>
        <el-form-item label="积分倍率"><el-input-number v-model="form.points_rate" :min="0.1" :step="0.5" :precision="1" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>