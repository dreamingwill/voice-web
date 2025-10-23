<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-primary">事件日志</h2>
        <p class="text-sm text-slate-600">查看模拟的转写、说话人和授权记录。</p>
      </div>
      <el-button type="primary" plain size="small" @click="exportLogs">导出 CSV</el-button>
    </header>

    <el-form :inline="true" :model="filters" label-position="left" size="small" class="flex flex-wrap gap-3">
      <el-form-item label="事件类型">
        <el-select v-model="filters.type" placeholder="全部">
          <el-option label="全部" value="" />
          <el-option label="指令" value="command" />
          <el-option label="报告" value="report" />
        </el-select>
      </el-form-item>
      <el-form-item label="授权状态">
        <el-select v-model="filters.authorized" placeholder="全部">
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

    <el-table :data="displayedLogs" stripe size="small" height="360">
      <el-table-column prop="timestamp" label="时间" width="160" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          {{ row.type === 'command' ? '指令' : '报告' }}
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
    summary: '发起倒计时指令（T-10）',
    authorized: true,
  },
  {
    id: 'log-2',
    timestamp: new Date().toLocaleString(),
    type: 'report',
    operator: '巡逻员 王芳',
    summary: '外围安全，继续巡查。',
    authorized: true,
  },
  {
    id: 'log-3',
    timestamp: new Date().toLocaleString(),
    type: 'command',
    operator: '未知人员',
    summary: '尝试在机库入口执行未授权解锁。',
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
  ElMessage.success('筛选条件已应用')
}

function resetFilters() {
  filters.type = ''
  filters.authorized = ''
}

function exportLogs() {
  ElMessage.success('已触发模拟导出，待后端接入后生成 CSV。')
}
</script>
