<template>
  <section class="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center space-y-6">
    <h2 class="text-3xl font-bold text-primary">Hello Voice System</h2>
    <p class="text-slate-600">
      This landing page confirms the real-time voice and speaker recognition frontend scaffold is ready.
    </p>
    <el-button type="primary" size="large" @click="goAdmin">
      Go to Admin Login
    </el-button>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goAdmin() {
  router.push({ name: 'login' })
}
</script>
