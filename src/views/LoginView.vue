<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/lib/supabase'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const showRegister = ref(false)
const registerForm = ref({
  email: '',
  password: '',
  confirmPassword: '',
})
const form = ref({
  email: '',
  password: '',
})

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    ElMessage.warning('请输入邮箱和密码')
    return
  }

  loading.value = true
  try {
    const { error } = await auth.signIn(form.value.email, form.value.password)
    if (error) throw error
    router.push('/')
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerForm.value.email || !registerForm.value.password) {
    ElMessage.warning('请输入邮箱和密码')
    return
  }
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (registerForm.value.password.length < 6) {
    ElMessage.warning('密码长度至少6位')
    return
  }

  loading.value = true
  try {
    const { error } = await auth.signUp(registerForm.value.email, registerForm.value.password)
    if (error) throw error
    ElMessage.success('注册成功，请登录')
    showRegister.value = false
    form.value.email = registerForm.value.email
    registerForm.value = { email: '', password: '', confirmPassword: '' }
  } catch (e: any) {
    ElMessage.error(e.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>干洗店管理系统</h2>
      </template>
      <el-form @submit.prevent="handleLogin">
        <el-form-item label="邮箱">
          <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%;">
            登录
          </el-button>
        </el-form-item>
        <el-form-item>
          <div class="register-hint">
            没有账号？<el-button type="primary" link @click="showRegister = true">立即注册</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 注册对话框 -->
    <el-dialog v-model="showRegister" title="注册账号" width="400px">
      <el-form @submit.prevent="handleRegister">
        <el-form-item label="邮箱">
          <el-input v-model="registerForm.email" type="email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%;">
            注册
          </el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--bg-color, #f5f7fa);
}
.login-card {
  width: 400px;
}
.register-hint {
  text-align: center;
  width: 100%;
  color: #909399;
}
</style>