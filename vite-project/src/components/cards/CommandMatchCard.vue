<template>
  <section class="bg-white rounded-lg shadow p-4 space-y-3">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-primary">指令识别</h2>
        <p class="text-xs text-slate-500">已配置 {{ commandsStore.commandCount }} 条指令</p>
      </div>
      <el-tag :type="commandsStore.enabled ? 'success' : 'info'" size="small">
        {{ commandsStore.enabled ? '已开启' : '已关闭' }}
      </el-tag>
    </header>
    <p class="text-xs text-slate-500 flex items-center justify-between">
      <span>阈值：{{ thresholdLabel }}</span>
      <RouterLink v-if="isAuthenticated" to="/admin/commands" class="text-primary hover:underline">
        指令管理
      </RouterLink>
    </p>

    <div v-if="commandsStore.enabled" class="space-y-3">
      <div v-if="latestMatch" class="rounded-md border border-emerald-200 bg-emerald-50/80 p-3 space-y-1">
        <p class="text-xs text-emerald-700">最新命中 · {{ formatTime(latestMatch.timestamp) }}</p>
        <p class="text-base font-semibold text-emerald-900 truncate" :title="latestMatch.command">
          {{ latestMatch.command }}
        </p>
        <p class="text-xs text-emerald-700">
          置信度 {{ formatScore(latestMatch.score) }}
        </p>
        <div class="flex justify-end">
          <el-button text size="small" @click="commandsStore.clearLastMatch">
            清除记录
          </el-button>
        </div>
      </div>
      <el-empty v-else description="等待新的指令匹配" :image-size="90" />
    </div>

    <div v-else class="text-sm text-slate-500 space-y-2">
      <p>当前未开启指令识别，所有转写都将作为普通语句展示。</p>
      <p class="text-xs">前往指令管理页可上传指令并开启识别。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCommandsStore } from '@/stores/useCommands'
import { useUserStore } from '@/stores/useUser'

const commandsStore = useCommandsStore()
const userStore = useUserStore()

const thresholdLabel = computed(() => commandsStore.matchThreshold.toFixed(2))
const latestMatch = computed(() => commandsStore.lastMatch)
const isAuthenticated = computed(() => userStore.isAuthenticated)

onMounted(() => {
  void commandsStore.fetchCommands()
})

function formatScore(score?: number) {
  if (typeof score !== 'number') return '—'
  return `${(score * 100).toFixed(1)}%`
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString()
}
</script>
