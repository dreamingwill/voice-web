<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-primary">Event Logs</h2>
        <p class="text-sm text-slate-600">Review simulated ASR, speaker, and authorization history.</p>
      </div>
      <el-button type="primary" plain size="small" @click="exportLogs">Export CSV</el-button>
    </header>

    <el-form :inline="true" :model="filters" label-position="left" size="small" class="flex flex-wrap gap-3">
      <el-form-item label="Type">
        <el-select v-model="filters.type" placeholder="All">
          <el-option label="All" value="" />
          <el-option label="Command" value="command" />
          <el-option label="Report" value="report" />
        </el-select>
      </el-form-item>
      <el-form-item label="Authorization">
        <el-select v-model="filters.authorized" placeholder="Any">
          <el-option label="Any" value="" />
          <el-option label="Authorized" value="true" />
          <el-option label="Unauthorized" value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="applyFilters">Apply</el-button>
        <el-button @click="resetFilters">Reset</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="displayedLogs" stripe size="small" height="360">
      <el-table-column prop="timestamp" label="Time" width="160" />
      <el-table-column prop="type" label="Type" width="100" />
      <el-table-column prop="operator" label="Operator" width="180" />
      <el-table-column prop="summary" label="Summary" />
      <el-table-column label="Authorized" width="140">
        <template #default="{ row }">
          <el-tag :type="row.authorized ? 'success' : 'danger'" size="small">
            {{ row.authorized ? 'Yes' : 'No' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

interface LogRow {
  id: string
  timestamp: string
  type: 'command' | 'report'
  operator: string
  summary: string
  authorized: boolean
}

const logs = ref<LogRow[]>([
  {
    id: 'log-1',
    timestamp: new Date().toLocaleString(),
    type: 'command',
    operator: '指挥员 张伟',
    summary: 'countdown initiated @ T-10',
    authorized: true,
  },
  {
    id: 'log-2',
    timestamp: new Date().toLocaleString(),
    type: 'report',
    operator: '巡逻员 王芳',
    summary: 'Perimeter secure, continuing sweep.',
    authorized: true,
  },
  {
    id: 'log-3',
    timestamp: new Date().toLocaleString(),
    type: 'command',
    operator: '未知人员',
    summary: 'Attempted access_override on Hangar Bay.',
    authorized: false,
  },
])

const filters = reactive({
  type: '',
  authorized: '',
})

const displayedLogs = computed(() => {
  return logs.value.filter((log) => {
    const matchesType = !filters.type || log.type === filters.type
    const matchesAuth =
      !filters.authorized ||
      (filters.authorized === 'true' ? log.authorized : !log.authorized)
    return matchesType && matchesAuth
  })
})

function applyFilters() {
  ElMessage.success('Filters applied')
}

function resetFilters() {
  filters.type = ''
  filters.authorized = ''
}

function exportLogs() {
  ElMessage.success('Mock export triggered (CSV generation pending backend integration).')
}
</script>
