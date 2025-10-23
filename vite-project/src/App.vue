<template>
  <div class="min-h-screen flex flex-col bg-slate-100 text-slate-900">
    <AppHeader />
    <main class="flex-1 px-4 py-8">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/header/AppHeader.vue'
import AppFooter from '@/components/footer/AppFooter.vue'
</script>
