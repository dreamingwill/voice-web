<template>
  <section class="bg-white rounded-lg shadow p-4 space-y-4">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-primary">测试面板</h2>
        <p class="text-xs text-slate-500">CS_06 WebSocket 网络往返延迟（RTT）</p>
      </div>
      <el-tag :type="statusTag" size="small" effect="light">
        {{ statusText }}
      </el-tag>
    </header>

    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p class="text-xs uppercase tracking-[0.18em] text-slate-500">当前值</p>
      <p class="mt-2 text-3xl font-semibold text-slate-900">
        {{ formatValue(connectionStore.networkRttCurrentMs) }}
      </p>
      <p class="mt-1 text-xs text-slate-500">采样周期 2 秒，仅统计当前会话样本</p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <article class="rounded-lg border border-slate-200 p-3">
        <p class="text-xs text-slate-500">平均值</p>
        <p class="mt-1 text-lg font-semibold text-slate-800">
          {{ formatValue(connectionStore.networkRttAverageMs) }}
        </p>
      </article>
      <article class="rounded-lg border border-slate-200 p-3">
        <p class="text-xs text-slate-500">P95</p>
        <p class="mt-1 text-lg font-semibold text-slate-800">
          {{ formatValue(connectionStore.networkRttP95Ms) }}
        </p>
      </article>
      <article class="rounded-lg border border-slate-200 p-3">
        <p class="text-xs text-slate-500">样本数</p>
        <p class="mt-1 text-lg font-semibold text-slate-800">
          {{ connectionStore.networkRttSampleCount }}
        </p>
      </article>
      <article class="rounded-lg border border-slate-200 p-3">
        <p class="text-xs text-slate-500">判定结果</p>
        <p class="mt-1 text-lg font-semibold" :class="judgementClass">
          {{ judgementText }}
        </p>
      </article>
    </div>

    <div class="flex items-center justify-between gap-3 text-xs text-slate-500">
      <p>判定规则：样本数不少于 {{ minimumSamples }} 且 P95 ≤ 100ms</p>
      <el-button text size="small" @click="connectionStore.clearNetworkRttSamples()">清空样本</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionStore } from '@/stores/useConnection'

const minimumSamples = 20
const connectionStore = useConnectionStore()

const statusTag = computed(() => {
  if (connectionStore.status === 'connected') return 'success'
  if (connectionStore.status === 'connecting') return 'warning'
  return 'info'
})

const statusText = computed(() => {
  if (connectionStore.status === 'connected') return '采样中'
  if (connectionStore.status === 'connecting') return '连接中'
  return '未连接'
})

const judgementText = computed(() => {
  if (connectionStore.networkRttSampleCount < minimumSamples) return '样本不足'
  const p95 = connectionStore.networkRttP95Ms
  if (typeof p95 !== 'number') return '样本不足'
  return p95 <= 100 ? '通过' : '不通过'
})

const judgementClass = computed(() => {
  if (judgementText.value === '通过') return 'text-emerald-700'
  if (judgementText.value === '不通过') return 'text-rose-700'
  return 'text-amber-600'
})

function formatValue(value: number | null) {
  return typeof value === 'number' ? `${value.toFixed(1)} ms` : '--'
}
</script>
