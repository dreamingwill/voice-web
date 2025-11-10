<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-primary">事件日志</h2>
        <p class="text-sm text-slate-600">查看操作员变更与语音事件，支持筛选与导出 CSV。</p>
      </div>
      <el-button type="primary" plain size="small" :loading="exporting" @click="exportLogs">
        导出 CSV
      </el-button>
    </header>

    <el-tabs v-model="activeType" class="-mb-2">
      <el-tab-pane label="操作事件" name="operator_change" />
      <el-tab-pane label="语音事件" name="transcript" />
    </el-tabs>

    <el-form :inline="true" :model="filters" label-position="left" size="small" class="flex flex-wrap gap-3">
      <el-form-item label="授权状态">
        <el-select v-model="filters.authorized" placeholder="全部" clearable>
          <el-option label="全部" value="" />
          <el-option label="已授权" value="true" />
          <el-option label="未授权" value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="applyFilters">应用筛选</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="displayedLogs" stripe size="small" height="420">
      <el-table-column type="index" label="#" />
      <el-table-column prop="timestamp" label="时间" width="165">
        <template #default="{ row }">
          {{ formatTimestamp(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column label="类别">
        <template #default="{ row }">
          {{ formatCategoryLabel(row.category) }}
        </template>
      </el-table-column>
      <el-table-column prop="operator" label="操作者">
        <template #default="{ row }">
          {{ row.operator || '未知' }}
        </template>
      </el-table-column>
      <el-table-column label="关联对象">
        <template #default="{ row }">
          {{ getTargetLabel(row) }}
        </template>
      </el-table-column>
      <el-table-column label="摘要">
        <template #default="{ row }">
          {{ getSummary(row) }}
        </template>
      </el-table-column>
    </el-table>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-sm text-slate-500">共 {{ pagination.total }} 条记录</span>
      <el-pagination
        background
        layout="prev, pager, next, sizes"
        :total="pagination.total"
        :page-size="pagination.pageSize"
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100]"
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/apiService'

interface LogEntry {
  id: number
  timestamp: string
  type: string
  category?: string | null
  session_id?: string | null
  operator?: string | null
  authorized?: boolean | null
  payload?: Record<string, unknown> | null
  username?: string | null
  user_id?: number | null
  redacted?: boolean | null
}

interface LogsResponse {
  items: LogEntry[]
  total: number
  page: number
  page_size: number
}

const loading = ref(false)
const exporting = ref(false)
const logs = ref<LogEntry[]>([])
const activeType = ref<'operator_change' | 'transcript'>('operator_change')

const filters = reactive({
  authorized: '' as '' | 'true' | 'false',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

onMounted(() => {
  void fetchLogs()
})

async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.page,
      page_size: pagination.pageSize,
      type: activeType.value,
    }
    if (filters.authorized) {
      params.authorized = filters.authorized === 'true'
    }
    const response = await api.get<LogsResponse>('api/logs', { params })
    logs.value = response.data?.items ?? []
    pagination.total = response.data?.total ?? 0
    pagination.pageSize = response.data?.page_size ?? pagination.pageSize
  } catch (error) {
    console.error('[Logs] fetch failed', error)
    ElMessage({
      type: 'error',
      message: isUnauthorizedError(error) ? '登录状态失效，请重新登录' : '加载日志失败',
      showClose: true,
    })
  } finally {
    loading.value = false
  }
}

watch(activeType, () => {
  pagination.page = 1
  void fetchLogs()
})

const displayedLogs = computed(() => logs.value)

function applyFilters() {
  pagination.page = 1
  void fetchLogs()
  ElMessage({
    type: 'success',
    message: '筛选条件已应用',
    showClose: true,
  })
}

function resetFilters() {
  filters.authorized = ''
  pagination.page = 1
  void fetchLogs()
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function toCsvRow(row: string[]): string {
  return row
    .map((cell) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    })
    .join(',')
}

function exportLogs() {
  if (!displayedLogs.value.length) {
    ElMessage({
      type: 'warning',
      message: '当前无数据可导出',
      showClose: true,
    })
    return
  }
  exporting.value = true
  try {
    const header = ['时间', '类别', '操作者', '关联对象', '摘要']
    const rows = displayedLogs.value.map((log) => [
      formatTimestamp(log.timestamp),
      formatCategoryLabel(log.category),
      log.operator ?? '',
      getTargetLabel(log),
      getSummary(log),
    ])
    const csvContent = [header, ...rows].map((row) => toCsvRow(row)).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `logs-${Date.now()}.csv`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage({
      type: 'success',
      message: '日志已导出',
      showClose: true,
    })
  } catch (error) {
    console.error('[Logs] export failed', error)
    ElMessage({
      type: 'error',
      message: '导出失败',
      showClose: true,
    })
  } finally {
    exporting.value = false
  }
}

function formatCategoryLabel(category?: string | null) {
  const map: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    voiceprint_aggregate: '声纹聚合',
    final: '语音',
    audio_start: '音频开始',
    status_change: '切换状态',
  }
  return (category && map[category]) || category || '-'
}

function getTargetLabel(log: LogEntry) {
  if (log.type === 'operator_change') {
    return log.username ?? `ID ${log.user_id ?? '-'}`
  }
  return log.session_id ? `会话 ${log.session_id}` : '会话未知'
}

function getSummary(log: LogEntry) {
  if (log.type === 'operator_change') {
    switch (log.category) {
      case 'create':
        return `创建 ${log.username ?? ''}`.trim()
      case 'update': {
        const changes = log.payload && (log.payload as Record<string, unknown>).changes
        if (changes && typeof changes === 'object') {
          const parts = Object.entries(changes as Record<string, { from?: unknown; to?: unknown }>)
            .map(([field, change]) => `${field}: ${change.from ?? '-'} → ${change.to ?? '-'}`)
          if (parts.length) {
            return `更新 ${log.username ?? ''}`
          }
        }
        return `更新 ${log.username ?? ''}`
      }
      case 'delete':
        return `删除 ${log.username ?? ''}`
      case 'voiceprint_aggregate':
        return `为 ${log.username ?? ''} 聚合声纹`
      default:
        return `操作 ${log.username ?? ''}`
    }
  }
  if (log.type === 'transcript') {
    // const speaker = log.operator || log.username || '未知人员'
    const payload = (log.payload ?? {}) as Record<string, unknown>
    const similarity = typeof payload.similarity === 'number' ? `最高声纹相似度 ${Math.round(payload.similarity * 100) / 100}` : ''
    return ` ${similarity}`
  }
  return '事件详情'
}

function handlePageChange(page: number) {
  pagination.page = page
  void fetchLogs()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  void fetchLogs()
}

function isUnauthorizedError(error: unknown) {
  return Boolean((error as { response?: { status?: number } })?.response?.status === 401)
}
</script>
