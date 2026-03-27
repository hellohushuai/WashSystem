<script setup lang="ts">
defineProps<{ status: string }>()

const typeMap: Record<string, string> = {
  '未开始': 'info',
  '进行中': 'warning',
  '已付款': 'success',
  '已结束': '',
}
</script>

<template>
  <el-tag :type="(typeMap[status] as any) || 'info'" size="small">{{ status }}</el-tag>
</template>