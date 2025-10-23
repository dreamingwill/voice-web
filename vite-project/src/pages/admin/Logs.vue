<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-primary">事件日志</h2>
        <p class="text-sm text-slate-600">查看模拟的转写、说话人和授权记录，并可导出 CSV。</p>
      </div>
      <el-button type="primary" plain size="small" :loading="exporting" @click="exportLogs">
        导出 CSV
      </el-button>
    </header>

    <el-form :inline="true" :model="filters" label-position="left" size="small" class="flex flex-wrap gap-3">
      <el-form-item label="事件类型">
        <el-select v-model="filters.type" placeholder="全部" clearable>
          <el-option label="全部" value="" />
          <el-option label="指令" value="command" />
          <el-option label="报告" value="report" />
        </el-select>
      </el-form-item>
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
      <el-table-column type="index" width="60" label="#" />
      <el-table-column prop="timestamp" label="时间" width="180">
        <template #default="{ row }">
          {{ formatTimestamp(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.type === 'command' ? 'warning' : 'info'" size="small">
            {{ row.type === 'command' ? '指令' : '报告' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operator" label="人员" width="180" />
      <el-table-column prop="summary" label="摘要" />
      <el-table-column label="是否授权" width="140">
        <template #default="{ row }">
          <el-tag :type="row.authorized ? 'success' : 'danger'" size="small">
            {{ row.authorized ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/apiService'
import type { LogEntry } from '@/mocks/http'

const loading = ref(false)
const exporting = ref(false)
const logs = ref<LogEntry[]>([])

const filters = reactive({
  type: '' as '' | 'command' | 'report',
  authorized: '' as '' | 'true' | 'false',
})

onMounted(() => {
  void fetchLogs()
})

async function fetchLogs() {
  loading.value = true
  try {
    const response = await api.get<LogEntry[]>('/api/logs')
    logs.value = response.data ?? []
  } catch (error) {
    console.error('[Logs] fetch failed', error)
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

const displayedLogs = computed(() =>
  logs.value.filter((log) => {
    const matchesType = !filters.type || log.type === filters.type
    const matchesAuth =
      !filters.authorized ||
      (filters.authorized === 'true' ? log.authorized : !log.authorized)
    return matchesType && matchesAuth
  }),
)

function applyFilters() {
  ElMessage.success('筛选条件已应用')
}

function resetFilters() {
  filters.type = ''
  filters.authorized = ''
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
    ElMessage.warning('当前无数据可导出')
    return
  }
  exporting.value = true
  try {
    const header = ['时间', '类型', '人员', '摘要', '授权']
    const rows = displayedLogs.value.map((log) => [
      formatTimestamp(log.timestamp),
      log.type === 'command' ? '指令' : '报告',
      log.operator,
      log.summary,
      log.authorized ? '是' : '否',
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
    ElMessage.success('日志已导出')
  } catch (error) {
    console.error('[Logs] export failed', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>
