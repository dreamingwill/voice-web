<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-primary">日志中心</h2>
        <p class="text-sm text-slate-600">
          {{ headerDescription }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button
          v-if="activeTab === 'operator_logs'"
          type="primary"
          plain
          :loading="operatorExporting"
          @click="exportOperatorLogs"
        >
          导出 CSV
        </el-button>
        <el-button
          v-else
          type="primary"
          plain
          :loading="transcriptExporting"
          @click="exportTranscripts"
        >
          导出 CSV
        </el-button>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="-mb-2">
      <el-tab-pane label="操作事件" name="operator_logs">
        <el-form
          :inline="true"
          :model="operatorFilters"
          label-position="left"
          size="small"
          class="flex flex-wrap gap-3"
        >
          <el-form-item label="授权状态">
            <el-select v-model="operatorFilters.authorized" placeholder="全部" clearable>
              <el-option label="全部" value="" />
              <el-option label="已授权" value="true" />
              <el-option label="未授权" value="false" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="applyOperatorFilters">应用筛选</el-button>
            <el-button @click="resetOperatorFilters">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="operatorLoading" :data="operatorDisplayedLogs" stripe size="small" height="420">
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
          <span class="text-sm text-slate-500">共 {{ operatorPagination.total }} 条记录</span>
          <el-pagination
            background
            layout="prev, pager, next, sizes"
            :total="operatorPagination.total"
            :page-size="operatorPagination.pageSize"
            :current-page="operatorPagination.page"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="handleOperatorPageSizeChange"
            @current-change="handleOperatorPageChange"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="历史说话记录" name="transcripts">
        <el-form
          :inline="true"
          :model="transcriptFilters"
          label-position="left"
          size="small"
          class="flex flex-wrap gap-3"
        >
          <el-form-item label="会话 ID">
            <el-input
              v-model="transcriptFilters.sessionId"
              placeholder="精确会话编号"
              clearable
              maxlength="64"
            />
          </el-form-item>
          <!-- <el-form-item label="用户名">
            <el-input v-model="transcriptFilters.username" placeholder="操作者或账号" clearable maxlength="64" />
          </el-form-item> -->
          <el-form-item label="主说话人">
            <el-input v-model="transcriptFilters.speaker" placeholder="例如 speaker_1" clearable maxlength="64" />
          </el-form-item>
          <!-- <el-form-item label="状态">
            <el-input v-model="transcriptFilters.status" placeholder="completed / processing 等" clearable maxlength="32" />
          </el-form-item> -->
          <el-form-item label="全文搜索">
            <el-input
              v-model="transcriptFilters.search"
              placeholder="关键字匹配转写文本"
              clearable
              maxlength="100"
            />
          </el-form-item>
          <!-- <el-form-item label="时间范围">
            <el-date-picker
              v-model="transcriptFilters.dateRange"
              type="datetimerange"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm"
              :default-time="['00:00:00', '23:59:59']"
              clearable
            />
          </el-form-item> -->
          <el-form-item>
            <el-button type="primary" @click="applyTranscriptFilters">应用筛选</el-button>
            <el-button @click="resetTranscriptFilters">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="transcriptLoading" :data="transcriptDisplayedRecords" stripe size="small" height="420">
          <el-table-column type="index" label="#" />
          <el-table-column prop="created_at" label="时间" width="165">
            <template #default="{ row }">
              {{ formatTimestamp(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="session_id" label="会话标识" width="200" show-overflow-tooltip />
          <el-table-column label="主说话人" width="180">
            <template #default="{ row }">
              <!-- <div>{{ formatTranscriptSpeaker(row) }}</div> -->
              <div v-if="formatTranscriptSpeakers(row)" class="text-xs text-slate-500">
                {{ formatTranscriptSpeakers(row) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="文本内容" min-width="220">
            <template #default="{ row }">
              <div class="whitespace-pre-line break-words leading-snug text-slate-700">
                {{ formatTranscriptText(row.text) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="段数 / 时长" width="140">
            <template #default="{ row }">
              <div>段数：{{ row.segments_count ?? 0 }}</div>
              <div class="text-xs text-slate-500">时长：{{ formatDuration(row.duration_ms) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="相似度" width="150">
            <template #default="{ row }">
              {{ formatSimilarity(row.similarity_avg, row.similarity_max) }}
            </template>
          </el-table-column>
          <el-table-column prop="locale" label="语种" width="90">
            <template #default="{ row }">
              {{ row.locale || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="channel" label="来源" width="90">
            <template #default="{ row }">
              {{ row.channel || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.status" size="small" effect="light">
                {{ row.status }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-slate-500">共 {{ transcriptPagination.total }} 条记录</span>
          <el-pagination
            background
            layout="prev, pager, next, sizes"
            :total="transcriptPagination.total"
            :page-size="transcriptPagination.pageSize"
            :current-page="transcriptPagination.page"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="handleTranscriptPageSizeChange"
            @current-change="handleTranscriptPageChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/apiService'

interface OperatorLogEntry {
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

interface OperatorLogsResponse {
  items: OperatorLogEntry[]
  total: number
  page: number
  page_size: number
}

interface TranscriptSpeaker {
  speaker?: string | null
  name?: string | null
  username?: string | null
}

interface TranscriptRecord {
  id: number
  session_id: string
  user_id?: number | null
  username?: string | null
  dominant_speaker?: string | null
  speakers?: TranscriptSpeaker[] | null
  text?: string | null
  duration_ms?: number | null
  similarity_avg?: number | null
  similarity_max?: number | null
  segments_count: number
  status?: string | null
  locale?: string | null
  channel?: string | null
  operator?: string | null
  created_at: string
  updated_at?: string | null
}

interface TranscriptsResponse {
  items: TranscriptRecord[]
  total: number
  page: number
  page_size: number
}

const activeTab = ref<'operator_logs' | 'transcripts'>('operator_logs')

const operatorLoading = ref(false)
const operatorExporting = ref(false)
const operatorLogs = ref<OperatorLogEntry[]>([])
const operatorFilters = reactive({
  authorized: '' as '' | 'true' | 'false',
})
const operatorPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const transcriptLoading = ref(false)
const transcriptExporting = ref(false)
const transcripts = ref<TranscriptRecord[]>([])
const transcriptFilters = reactive({
  sessionId: '',
  username: '',
  speaker: '',
  status: '',
  search: '',
  dateRange: [] as [Date, Date] | [] | null,
})
const transcriptPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})
const transcriptsLoaded = ref(false)

const headerDescription = computed(() =>
  activeTab.value === 'operator_logs'
    ? '查看操作员变更等后台事件，支持筛选与导出 CSV。'
    : '按会话、说话人、关键字等条件查询历史说话记录。',
)

onMounted(() => {
  void fetchOperatorLogs()
})

watch(activeTab, (tab) => {
  if (tab === 'transcripts' && !transcriptsLoaded.value) {
    void fetchTranscripts()
  }
})

const operatorDisplayedLogs = computed(() => operatorLogs.value)
const transcriptDisplayedRecords = computed(() => transcripts.value)

async function fetchOperatorLogs() {
  operatorLoading.value = true
  try {
    const params: Record<string, unknown> = {
      page: operatorPagination.page,
      page_size: operatorPagination.pageSize,
      type: 'operator_change',
    }
    if (operatorFilters.authorized) {
      params.authorized = operatorFilters.authorized === 'true'
    }
    const response = await api.get<OperatorLogsResponse>('api/logs', { params })
    operatorLogs.value = response.data?.items ?? []
    operatorPagination.total = response.data?.total ?? 0
    operatorPagination.pageSize = response.data?.page_size ?? operatorPagination.pageSize
  } catch (error) {
    console.error('[Logs] fetch operator logs failed', error)
    ElMessage({
      type: 'error',
      message: isUnauthorizedError(error) ? '登录状态失效，请重新登录' : '加载操作事件失败',
      showClose: true,
    })
  } finally {
    operatorLoading.value = false
  }
}

async function fetchTranscripts() {
  transcriptLoading.value = true
  try {
    const params: Record<string, unknown> = {
      page: transcriptPagination.page,
      page_size: transcriptPagination.pageSize,
    }
    if (transcriptFilters.sessionId.trim()) {
      params.session_id = transcriptFilters.sessionId.trim()
    }
    if (transcriptFilters.username.trim()) {
      params.username = transcriptFilters.username.trim()
    }
    if (transcriptFilters.speaker.trim()) {
      params.speaker = transcriptFilters.speaker.trim()
    }
    if (transcriptFilters.status.trim()) {
      params.status = transcriptFilters.status.trim()
    }
    if (transcriptFilters.search.trim()) {
      params.search = transcriptFilters.search.trim()
    }
    if (Array.isArray(transcriptFilters.dateRange) && transcriptFilters.dateRange.length === 2) {
      const [from, to] = transcriptFilters.dateRange
      if (from) params.from = from.toISOString()
      if (to) params.to = to.toISOString()
    }
    const response = await api.get<TranscriptsResponse>('api/transcripts', { params })
    transcripts.value = response.data?.items ?? []
    transcriptPagination.total = response.data?.total ?? 0
    transcriptPagination.pageSize = response.data?.page_size ?? transcriptPagination.pageSize
    transcriptsLoaded.value = true
  } catch (error) {
    console.error('[Logs] fetch transcripts failed', error)
    ElMessage({
      type: 'error',
      message: isUnauthorizedError(error) ? '登录状态失效，请重新登录' : '加载说话记录失败',
      showClose: true,
    })
  } finally {
    transcriptLoading.value = false
  }
}

function applyOperatorFilters() {
  operatorPagination.page = 1
  void fetchOperatorLogs()
  ElMessage({
    type: 'success',
    message: '筛选条件已应用',
    showClose: true,
  })
}

function resetOperatorFilters() {
  operatorFilters.authorized = ''
  operatorPagination.page = 1
  void fetchOperatorLogs()
}

function applyTranscriptFilters() {
  transcriptPagination.page = 1
  void fetchTranscripts()
  ElMessage({
    type: 'success',
    message: '筛选条件已应用',
    showClose: true,
  })
}

function resetTranscriptFilters() {
  transcriptFilters.sessionId = ''
  transcriptFilters.username = ''
  transcriptFilters.speaker = ''
  transcriptFilters.status = ''
  transcriptFilters.search = ''
  transcriptFilters.dateRange = []
  transcriptPagination.page = 1
  void fetchTranscripts()
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function formatDuration(value?: number | null) {
  if (!value || value <= 0) return '0:00'
  const seconds = Math.floor(value / 1000)
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${minutes}:${remain.toString().padStart(2, '0')}`
}

function formatSimilarity(avg?: number | null, max?: number | null) {
  if (avg == null && max == null) return '-'
  const avgStr = avg == null ? '-' : avg.toFixed(2)
  const maxStr = max == null ? '-' : max.toFixed(2)
  return `均值 ${avgStr} / 最大 ${maxStr}`
}

function formatTranscriptSpeaker(record: TranscriptRecord) {
  return record.dominant_speaker || record.operator || record.username || '未知'
}

function formatTranscriptText(text?: string | null, limit = 35) {
  if (!text) return '-'
  const normalized = text.trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}…`
}

function formatTranscriptSpeakers(record: TranscriptRecord) {
  if (!record.speakers?.length) return ''
  const labels = record.speakers
    .map((item) => item.name || item.username || item.speaker)
    .filter(Boolean) as string[]
  return labels.join('、')
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

function exportOperatorLogs() {
  if (!operatorDisplayedLogs.value.length) {
    ElMessage({
      type: 'warning',
      message: '当前无数据可导出',
      showClose: true,
    })
    return
  }
  operatorExporting.value = true
  try {
    const header = ['时间', '类别', '操作者', '关联对象', '摘要']
    const rows = operatorDisplayedLogs.value.map((log) => [
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
    link.download = `operator-logs-${Date.now()}.csv`
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
    console.error('[Logs] export operator logs failed', error)
    ElMessage({
      type: 'error',
      message: '导出失败',
      showClose: true,
    })
  } finally {
    operatorExporting.value = false
  }
}

function exportTranscripts() {
  if (!transcriptDisplayedRecords.value.length) {
    ElMessage({
      type: 'warning',
      message: '当前无数据可导出',
      showClose: true,
    })
    return
  }
  transcriptExporting.value = true
  try {
    const header = ['时间', '会话ID', '主说话人', '文本内容', '段数', '时长', '相似度', '状态']
    const rows = transcriptDisplayedRecords.value.map((item) => [
      formatTimestamp(item.created_at),
      item.session_id,
      formatTranscriptSpeaker(item),
      (item.text ?? '').replace(/\n+/g, ' '),
      String(item.segments_count ?? 0),
      formatDuration(item.duration_ms),
      formatSimilarity(item.similarity_avg, item.similarity_max),
      item.status ?? '',
    ])
    const csvContent = [header, ...rows].map((row) => toCsvRow(row)).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transcripts-${Date.now()}.csv`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage({
      type: 'success',
      message: '记录已导出',
      showClose: true,
    })
  } catch (error) {
    console.error('[Logs] export transcripts failed', error)
    ElMessage({
      type: 'error',
      message: '导出失败',
      showClose: true,
    })
  } finally {
    transcriptExporting.value = false
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

function getTargetLabel(log: OperatorLogEntry) {
  if (log.type === 'operator_change') {
    return log.username ?? `ID ${log.user_id ?? '-'}`
  }
  return log.session_id ? `会话 ${log.session_id}` : '会话未知'
}

function getSummary(log: OperatorLogEntry) {
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
  return '事件详情'
}

function handleOperatorPageChange(page: number) {
  operatorPagination.page = page
  void fetchOperatorLogs()
}

function handleOperatorPageSizeChange(size: number) {
  operatorPagination.pageSize = size
  operatorPagination.page = 1
  void fetchOperatorLogs()
}

function handleTranscriptPageChange(page: number) {
  transcriptPagination.page = page
  void fetchTranscripts()
}

function handleTranscriptPageSizeChange(size: number) {
  transcriptPagination.pageSize = size
  transcriptPagination.page = 1
  void fetchTranscripts()
}

function isUnauthorizedError(error: unknown) {
  return Boolean((error as { response?: { status?: number } })?.response?.status === 401)
}
</script>
