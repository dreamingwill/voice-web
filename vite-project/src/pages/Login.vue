<template>
  <section class="max-w-sm mx-auto bg-white rounded-lg shadow p-6 space-y-5">
    <header class="text-center space-y-1">
      <h2 class="text-xl font-semibold">系统登录</h2>
      <p class="text-sm text-slate-500">使用模拟账号进入语音控制台。</p>
    </header>
    <el-form :model="form" label-position="top" @submit.prevent="attemptLogin">
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="用户名" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
          show-password
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="w-full" :loading="submitting" @click="attemptLogin">
          登录
        </el-button>
      </el-form-item>
      <p class="text-xs text-slate-400 text-center">
        提示：admin / voice123
      </p>
    </el-form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/useUser'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
})

const submitting = ref(false)

async function attemptLogin() {
  if (submitting.value) return
  submitting.value = true
  const success = await userStore.login(form)
  submitting.value = false

  if (success) {
    ElMessage.success('登录成功，正在跳转至控制台。')
    router.push({ name: 'home' })
  } else {
    ElMessage.error('账号或密码错误，请重试（admin / voice123）')
  }
}
</script>
