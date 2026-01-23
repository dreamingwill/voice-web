<template>
  <section class="bg-white rounded-lg shadow p-4 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-primary">指令识别</h2>
        <p class="text-xs text-slate-500">已配置 {{ commandsStore.commandCount }} 条指令</p>
      </div>
      <el-tag :type="commandsStore.enabled ? 'success' : 'info'" size="small">
        {{ commandsStore.enabled ? '已开启' : '已关闭' }}
      </el-tag>
    </header>
    <div class="space-y-2 rounded-md border border-slate-200/70 p-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">识别开关</span>
          <el-switch
            v-model="localEnabled"
            :loading="saving"
            inline-prompt
            active-text="开启"
            inactive-text="关闭"
          />
        </div>
        <el-button type="primary" size="small" :loading="saving" @click="handleSaveSettings">
          保存设置
        </el-button>
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-600">匹配阈值 (0.50 - 0.99)</label>
        <div class="flex flex-wrap items-center gap-2">
          <el-input-number
            v-model="localThreshold"
            :min="0.5"
            :max="0.99"
            :step="0.01"
            :precision="2"
            size="small"
            :disabled="saving"
          />
          <span class="text-xs text-slate-500">数值越高匹配越严格</span>
        </div>
      </div>
    </div>

    <p class="text-xs text-slate-500 flex items-center justify-between">
      <span>阈值：{{ thresholdLabel }}</span>
      <RouterLink v-if="isAuthenticated" to="/admin/commands" class="text-primary hover:underline">
        指令管理
      </RouterLink>
    </p>

    <div v-if="commandsStore.enabled" class="space-y-3">
      <div
        v-if="latestMatch"
        class="rounded-md border border-emerald-200 bg-emerald-50/80 p-3 space-y-1"
      >
        <p class="text-xs text-emerald-700">最新命中 · {{ formatTime(latestMatch.timestamp) }}</p>
        <p class="text-xs text-emerald-700">转发状态：{{ forwardStatusLabel }}</p>
        <p v-if="latestMatchCode" class="text-xs text-emerald-700">编号 {{ latestMatchCode }}</p>
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
      <div v-else class="text-xs text-slate-500 border border-dashed border-slate-200 rounded-md py-4 text-center bg-slate-50/50">
        等待新的指令匹配…
      </div>
    </div>

    <div v-else class="text-sm text-slate-500 space-y-2">
      <p>当前未开启指令识别，所有转写都将作为普通语句展示。</p>
      <p class="text-xs">前往指令管理页可上传指令并开启识别。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCommandsStore } from '@/stores/useCommands'
import { getCommandForwardErrorMessage } from '@/utils/commandForwardError'
import { useUserStore } from '@/stores/useUser'

const commandsStore = useCommandsStore()
const userStore = useUserStore()

const localEnabled = ref(commandsStore.enabled)
const localThreshold = ref(commandsStore.matchThreshold)

const thresholdLabel = computed(() => commandsStore.matchThreshold.toFixed(2))
const latestMatch = computed(() => commandsStore.lastMatch)
const latestMatchCode = computed(() => {
  const match = latestMatch.value
  if (!match) return ''
  if (match.code?.trim()) return match.code.trim()
  if (typeof match.command_id === 'number') return String(match.command_id)
  return ''
})
const forwardStatusLabel = computed(() => {
  const match = latestMatch.value
  if (!match) return '未知'
  if (match.forwardStatus === 'failed') {
    const mapped = getCommandForwardErrorMessage(match.forwardError ?? '')
    return mapped ?? '发送失败'
  }
  return match.blocked ? '已阻止' : '已转发'
})
const isAuthenticated = computed(() => userStore.isAuthenticated)
const saving = computed(() => commandsStore.saving)

watch(
  () => commandsStore.enabled,
  (value) => {
    localEnabled.value = value
  },
)

watch(
  () => commandsStore.matchThreshold,
  (value) => {
    localThreshold.value = Number(value.toFixed(2))
  },
)

onMounted(() => {
  void commandsStore.fetchCommands()
})

async function handleSaveSettings() {
  const success = await commandsStore.saveSettings({
    enabled: localEnabled.value,
    matchThreshold: localThreshold.value,
  })
  if (success) {
    ElMessage.success('指令配置已更新')
  } else if (commandsStore.error) {
    ElMessage.error(commandsStore.error)
  }
}

function formatScore(score?: number) {
  if (typeof score !== 'number') return '—'
  return `${(score * 100).toFixed(1)}%`
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString()
}
</script>
