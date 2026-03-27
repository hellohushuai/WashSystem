<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRackStore, type RackHook } from '@/stores/rack'
import RackGrid from '@/components/RackGrid.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const store = useRackStore()
const newTotal = ref(100)

const freeCount = computed(() => store.hooks.filter(h => h.status === '空闲').length)
const occupiedCount = computed(() => store.hooks.filter(h => h.status === '占用').length)

onMounted(async () => {
  await store.loadSettings()
  await store.loadHooks()
  newTotal.value = store.totalHooks
})

function handleHookClick(hook: RackHook) {
  if (hook.status === '占用' && hook.order_id) {
    router.push(`/orders/${hook.order_id}`)
  }
}

async function handleResize() {
  if (newTotal.value < 1) {
    ElMessage.warning('至少需要1个挂钩')
    return
  }
  try {
    await store.setTotalHooks(newTotal.value)
    ElMessage.success(`挂钩总数已调整为 ${newTotal.value}`)
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>货架管理</h2>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="color: var(--text-secondary);">
          空闲: <b style="color: #67c23a;">{{ freeCount }}</b> |
          占用: <b style="color: #f56c6c;">{{ occupiedCount }}</b> |
          总计: <b>{{ store.hooks.length }}</b>
        </span>
      </div>
    </div>

    <el-card shadow="hover" style="margin-bottom: 16px; background: var(--card-bg); border-color: var(--border-color);">
      <template #header>挂钩设置</template>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span>挂钩总数:</span>
        <el-input-number v-model="newTotal" :min="1" :max="999" />
        <el-button type="primary" @click="handleResize">调整</el-button>
        <span style="color: var(--text-secondary); font-size: 12px;">（只能删除空闲挂钩）</span>
      </div>
    </el-card>

    <el-card shadow="hover" style="background: var(--card-bg); border-color: var(--border-color);">
      <template #header>
        <span>挂钩状态（点击占用的挂钩可跳转到订单）</span>
      </template>
      <RackGrid :hooks="store.hooks" @click-hook="handleHookClick" />
    </el-card>
  </div>
</template>