<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'

const router = useRouter()
const customerStore = useCustomerStore()

const form = ref({
  name: '',
  phone: '',
  notes: '',
  membership_level_id: 1,
})

const loading = ref(false)
const levels = [
  { id: 1, name: '普通会员' },
  { id: 2, name: '银卡会员' },
  { id: 3, name: '金卡会员' },
  { id: 4, name: '钻石会员' },
]

async function submit() {
  if (!form.value.name || !form.value.phone) {
    alert('请填写姓名和电话')
    return
  }

  loading.value = true
  try {
    await customerStore.createCustomer({
      name: form.value.name,
      phone: form.value.phone,
      notes: form.value.notes || undefined,
      membership_level_id: form.value.membership_level_id,
    })
    alert('客户创建成功！')
    router.push('/mobile/customers')
  } catch (e: any) {
    alert(e.message || '创建失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mobile-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h2 class="page-title">新建客户</h2>
    </div>

    <div class="form-content">
      <div class="form-section">
        <label class="form-label required">姓名 *</label>
        <input v-model="form.name" type="text" class="input-mobile" placeholder="请输入姓名" />
      </div>

      <div class="form-section">
        <label class="form-label required">电话 *</label>
        <input v-model="form.phone" type="tel" class="input-mobile" placeholder="请输入电话号码" />
      </div>

      <div class="form-section">
        <label class="form-label">会员等级</label>
        <select v-model="form.membership_level_id" class="input-mobile">
          <option v-for="level in levels" :key="level.id" :value="level.id">
            {{ level.name }}
          </option>
        </select>
      </div>

      <div class="form-section">
        <label class="form-label">备注</label>
        <textarea v-model="form.notes" class="input-mobile textarea" placeholder="备注信息（可选）"></textarea>
      </div>

      <button class="submit-btn" :disabled="loading" @click="submit">
        {{ loading ? '创建中...' : '创建客户' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/mobile.css';

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--surface);
}

.back-btn {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
}

.back-btn:active {
  background: var(--surface-container);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.form-content {
  padding: 16px;
}

.form-section {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--on-surface);
  margin-bottom: 8px;
}

.form-label.required::after {
  content: ' *';
  color: var(--error);
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  margin-top: 16px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
}

.submit-btn:active:not(:disabled) {
  background: var(--primary-darken);
}
</style>