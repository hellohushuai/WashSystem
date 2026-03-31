<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import { auth } from '@/lib/supabase'

const router = useRouter()
const loading = ref(true)

// 检测是否为 Android/Capacitor 平台
const isAndroidPlatform = () => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform()
    if (platform === 'android') return true
  }
  if (/Android/i.test(navigator.userAgent)) {
    return true
  }
  return false
}

onMounted(async () => {
  await nextTick()
  await router.isReady()
  const { session } = await auth.getSession()

  if (isAndroidPlatform()) {
    // Android APK: 跳转到移动端
    if (session) {
      router.push('/mobile')
    } else {
      router.push('/mobile/login')
    }
  } else {
    // 桌面版: 保持原有逻辑
    if (!session && router.currentRoute.value.meta.requiresAuth !== false) {
      router.push('/login')
    }
  }

  // 短暂延迟后显示内容，避免闪烁
  setTimeout(() => {
    loading.value = false
  }, 100)
})
</script>

<template>
  <!-- 检测完成前显示空白，避免闪烁 -->
  <div v-if="loading" class="loading-screen"></div>
  <AppLayout v-else />
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

.loading-screen {
  width: 100vw;
  height: 100vh;
  background: var(--content-bg);
}
</style>