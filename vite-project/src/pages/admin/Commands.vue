<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-6">
    <!-- <header class="space-y-2">
      <h2 class="text-lg font-semibold text-primary">指令管理</h2>
      <p class="text-sm text-slate-600">
        管理可识别指令、配置阈值，并支持分页、模糊搜索、编辑与删除。
      </p>
    </header> -->

    <el-alert
      v-if="commandsStore.error"
      :title="commandsStore.error"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-primary">已配置指令</h2>
          <p class="text-xs text-slate-500">
            共 {{ commandsStore.commandCount }} 条 · 最近更新
            {{ commandsStore.updatedAt ? formatTime(commandsStore.updatedAt) : '—' }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <el-input
            v-model="searchKeyword"
            placeholder="输入关键词搜索"
            clearable
            class="w-60"
            @clear="clearSearch"
            @keyup.enter.native="handleSearch"
          />
          <el-button type="primary" :loading="searching" @click="handleSearch">查询</el-button>
          <el-button :disabled="searching" @click="clearSearch">重置</el-button>
          <el-button type="success" @click="openUploadDialog">
            批量上传指令
          </el-button>
        </div>
      </div>

      <div
        v-if="commandsStore.hasSearchResults"
        class="flex flex-wrap items-center justify-between gap-2 rounded border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-600"
      >
        <span>
          搜索关键词「{{ commandsStore.searchQuery }}」，共 {{ commandsStore.searchTotal }} 条匹配结果
        </span>
        <span class="text-[11px] text-slate-400">每页最多显示 200 条，可继续翻页查看更多</span>
      </div>

      <el-table :data="displayedCommands" :loading="loading" border style="width: 100%">
        <el-table-column type="index" width="60" label="#" />
        <el-table-column prop="text" label="指令内容" min-width="240" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="confirmDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!displayedCommands.length && !loading"
        :description="
          commandsStore.hasSearchResults
            ? `未找到与「${commandsStore.searchQuery}」匹配的指令`
            : '暂无指令'
        "
      />
      <div
        v-if="commandsStore.hasSearchResults"
        class="flex flex-col gap-2 rounded border border-slate-100 p-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          第 {{ commandsStore.searchPage }} /
          {{ Math.max(1, Math.ceil(commandsStore.searchTotal / commandsStore.searchPageSize)) }} 页 ·
          每页 {{ commandsStore.searchPageSize }} 条
        </p>
        <el-pagination
          background
          layout="prev, pager, next, sizes"
          :current-page="commandsStore.searchPage"
          :total="commandsStore.searchTotal"
          :page-size="commandsStore.searchPageSize"
          :page-sizes="[10, 20, 50, 100, 200]"
          @current-change="handleSearchPageChange"
          @size-change="handleSearchPageSizeChange"
        />
      </div>
      <div v-else class="flex justify-end">
        <el-pagination
          background
          layout="prev, pager, next, sizes"
          :current-page="commandsStore.page"
          :total="commandsStore.total"
          :page-size="commandsStore.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="commandsStore.changePage"
          @size-change="commandsStore.changePageSize"
        />
      </div>
    </section>

    <el-dialog v-model="isEditVisible" title="编辑指令" width="min(420px, 92vw)">
      <el-input
        v-model="editText"
        type="textarea"
        :rows="4"
        maxlength="200"
        show-word-limit
        placeholder="请输入新的指令内容"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isEditVisible = false">取消</el-button>
          <el-button type="primary" :loading="editSubmitting" @click="submitEdit">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="isUploadVisible" title="批量上传指令" width="min(520px, 92vw)">
      <p class="text-xs text-slate-500 mb-2">每行一条指令，上传后将自动刷新识别缓存。</p>
      <el-input
        v-model="uploadText"
        type="textarea"
        :rows="8"
        placeholder="示例：&#10;站综合信息检查一分钟准备&#10;中央指挥部确认完毕"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="closeUploadDialog" :disabled="uploading">取消</el-button>
          <el-button :disabled="!uploadText.trim()" :loading="uploading" type="primary" @click="handleUpload">
            上传
          </el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCommandsStore } from '@/stores/useCommands'
import type { CommandItem } from '@/types/commands'

const commandsStore = useCommandsStore()
const uploadText = ref('')
const searchKeyword = ref('')
const isEditVisible = ref(false)
const isUploadVisible = ref(false)
const editText = ref('')
const editSubmitting = ref(false)
const editingTarget = ref<CommandItem | null>(null)

const loading = computed(() => commandsStore.loading)
const uploading = computed(() => commandsStore.uploading)
const searching = computed(() => commandsStore.searching)
const displayedCommands = computed(() =>
  commandsStore.hasSearchResults ? commandsStore.searchResults : commandsStore.commands,
)

onMounted(() => {
  void commandsStore.fetchCommands()
})

async function handleUpload() {
  const lines = uploadText.value.split(/\r?\n/)
  const success = await commandsStore.uploadCommandList(lines)
  if (success) {
    uploadText.value = ''
    isUploadVisible.value = false
    ElMessage.success('指令上传成功')
  } else if (commandsStore.error) {
    ElMessage.error(commandsStore.error)
  }
}

function openUploadDialog() {
  isUploadVisible.value = true
}

function closeUploadDialog() {
  isUploadVisible.value = false
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) {
    clearSearch()
    return
  }
  await commandsStore.search(searchKeyword.value)
}

function clearSearch() {
  searchKeyword.value = ''
  commandsStore.clearSearchResults()
}

async function handleSearchPageChange(page: number) {
  await commandsStore.changeSearchPage(page)
}

async function handleSearchPageSizeChange(size: number) {
  await commandsStore.changeSearchPageSize(size)
}

function openEdit(command: CommandItem) {
  editingTarget.value = command
  editText.value = command.text
  isEditVisible.value = true
}

async function submitEdit() {
  if (!editingTarget.value) return
  const nextText = editText.value.trim()
  if (!nextText) {
    ElMessage.warning('请输入新的指令内容')
    return
  }
  editSubmitting.value = true
  try {
    await commandsStore.updateCommandText(editingTarget.value.id, nextText)
    ElMessage.success('指令已更新')
    isEditVisible.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新失败')
  } finally {
    editSubmitting.value = false
  }
}

async function confirmDelete(command: CommandItem) {
  try {
    await ElMessageBox.confirm(`确定删除指令「${command.text}」吗？该操作不可撤销。`, '删除指令', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await commandsStore.removeCommand(command.id)
    ElMessage.success('指令已删除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  })
}
</script>
