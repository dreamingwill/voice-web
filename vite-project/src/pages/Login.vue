<template>
  <section class="max-w-sm mx-auto bg-white rounded-lg shadow p-6 space-y-5">
    <header class="text-center space-y-1">
      <h2 class="text-xl font-semibold">Admin Login</h2>
      <p class="text-sm text-slate-500">Use the mock credentials to access the control console.</p>
    </header>
    <el-form :model="form" label-position="top" @submit.prevent="attemptLogin">
      <el-form-item label="Username">
        <el-input v-model="form.username" placeholder="Username" autocomplete="username" />
      </el-form-item>
      <el-form-item label="Password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          show-password
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="w-full" :loading="submitting" @click="attemptLogin">
          Log In
        </el-button>
      </el-form-item>
      <p class="text-xs text-slate-400 text-center">
        Hint: admin / voice123
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
  const success = userStore.login(form)
  submitting.value = false

  if (success) {
    ElMessage.success('Login successful. Redirecting to dashboard.')
    router.push({ name: 'home' })
  } else {
    ElMessage.error('Invalid credentials. Try admin / voice123')
  }
}
</script>
