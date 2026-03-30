<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import { auth } from '@/lib/supabase'

const router = useRouter()

onMounted(async () => {
  await nextTick()
  await router.isReady()
  const { session } = await auth.getSession()
  if (!session && router.currentRoute.value.meta.requiresAuth !== false) {
    router.push('/login')
  }
})
</script>

<template>
  <AppLayout />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
  background: var(--content-bg);
}
</style>