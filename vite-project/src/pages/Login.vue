<template>
  <section class="max-w-sm mx-auto bg-white rounded-lg shadow p-6 space-y-4">
    <h2 class="text-xl font-semibold text-center">Admin Login</h2>
    <el-form :model="form" label-position="top">
      <el-form-item label="Username">
        <el-input v-model="form.username" placeholder="Enter username" />
      </el-form-item>
      <el-form-item label="Password">
        <el-input v-model="form.password" type="password" placeholder="Enter password" show-password />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="w-full" @click="backHome">
          Back to Home
        </el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = reactive({
  username: '',
  password: '',
})

function backHome() {
  router.push({ name: 'home' })
}
</script>
