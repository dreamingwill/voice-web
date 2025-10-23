<template>
  <header class="bg-primary text-white shadow">
    <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4 justify-between">
      <router-link to="/" class="text-lg font-semibold tracking-wide">
        Voice &amp; Speaker Recognition
      </router-link>

      <nav v-if="userStore.isAuthenticated" class="flex items-center gap-4 text-sm">
        <RouterLink class="hover:underline" :class="linkClass('/')" to="/">Realtime View</RouterLink>
        <RouterLink
          class="hover:underline"
          :class="linkClass('/admin/operators')"
          to="/admin/operators"
        >
          Operators
        </RouterLink>
        <RouterLink
          class="hover:underline"
          :class="linkClass('/admin/logs')"
          to="/admin/logs"
        >
          Logs
        </RouterLink>
      </nav>

      <div class="flex items-center gap-3 text-sm">
        <template v-if="userStore.isAuthenticated">
          <span class="text-emerald-100">
            {{ userStore.operatorName }} ({{ userStore.role }})
          </span>
          <el-button type="primary" plain size="small" @click="logout">
            Logout
          </el-button>
        </template>
        <template v-else>
          <el-button size="small" @click="goLogin">Login</el-button>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUser'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

function logout() {
  userStore.logout()
  router.push({ name: 'login' })
}

function goLogin() {
  router.push({ name: 'login' })
}

function linkClass(path: string) {
  return route.path === path ? 'font-semibold underline' : 'text-emerald-100'
}
</script>
