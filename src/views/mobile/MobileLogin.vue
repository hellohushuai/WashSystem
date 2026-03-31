<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/lib/supabase'

const router = useRouter()
const loading = ref(false)
const form = ref({
  email: '',
  password: '',
})

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    alert('请输入邮箱和密码')
    return
  }

  loading.value = true
  try {
    const { error } = await auth.signIn(form.value.email, form.value.password)
    if (error) throw error
    router.push('/mobile')
  } catch (e: any) {
    alert(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mobile-login">
    <div class="login-card">
      <h1 class="title">干洗店管理</h1>
      <p class="subtitle">登录您的账户</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <input
          v-model="form.email"
          type="email"
          placeholder="邮箱"
          class="input-mobile"
          autocomplete="email"
        />
        <input
          v-model="form.password"
          type="password"
          placeholder="密码"
          class="input-mobile"
          autocomplete="current-password"
        />
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.mobile-login {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  padding: 32px 24px;
  background: var(--surface-container);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 4px;
  text-align: center;
}

.subtitle {
  font-size: 14px;
  color: var(--on-surface-variant);
  margin-bottom: 32px;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-login {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-login:active {
  background: var(--primary-darken);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>