<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-6">
    <header class="space-y-2">
      <h2 class="text-lg font-semibold text-primary">指令管理</h2>
      <p class="text-sm text-slate-600">
        管理可识别指令、配置阈值，并支持分页、模糊搜索、编辑与删除。
      </p>
    </header>

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
          <h3 class="text-base font-semibold text-primary">已配置指令</h3>
          <p class="text-xs text-slate-500">
            共 {{ commandsStore.commandCount }} 条 · 最近更新
            {{ commandsStore.updatedAt ? formatTime(commandsStore.updatedAt) : '—' }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <el-input
            v-model="searchKeyword"
            placeholder="输入关键词搜索"
            size="small"
            clearable
            class="w-56"
            @clear="clearSearch"
          />
          <el-button size="small" :loading="searching" @click="handleSearch">搜索</el-button>
          <el-button size="small" :disabled="!commandsStore.hasSearchResults" @click="clearSearch">
            清除结果
          </el-button>
        </div>
      </div>

      <el-table :data="commandsStore.commands" :loading="loading" border style="width: 100%">
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
      <el-empty v-if="!commandsStore.commands.length && !loading" description="暂无指令" />
      <div class="flex justify-end">
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

    <section class="space-y-3">
      <h3 class="text-base font-semibold text-primary">批量上传指令</h3>
      <p class="text-xs text-slate-500">每行一条指令，上传后将自动刷新识别缓存。</p>
      <el-input
        v-model="uploadText"
        type="textarea"
        :rows="6"
        placeholder="示例：&#10;站综合信息检查一分钟准备&#10;中央指挥部确认完毕"
      />
      <div class="flex justify-end gap-3">
        <el-button :disabled="!uploadText.trim()" @click="uploadText = ''">清空</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传指令
        </el-button>
      </div>
    </section>

    <section class="space-y-3">
      <header class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-primary">搜索结果</h3>
        <span class="text-xs text-slate-500">使用模糊搜索快速定位单条指令</span>
      </header>
      <el-table
        v-if="commandsStore.hasSearchResults"
        :data="commandsStore.searchResults"
        :loading="searching"
        border
        max-height="260"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="text" label="指令内容" show-overflow-tooltip />
        <el-table-column label="操作" width="200">
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
      <el-empty v-else description="暂无搜索结果" />
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
const editText = ref('')
const editSubmitting = ref(false)
const editingTarget = ref<CommandItem | null>(null)

const loading = computed(() => commandsStore.loading)
const uploading = computed(() => commandsStore.uploading)
const searching = computed(() => commandsStore.searching)

onMounted(() => {
  void commandsStore.fetchCommands()
})

async function handleUpload() {
  const lines = uploadText.value.split(/\r?\n/)
  const success = await commandsStore.uploadCommandList(lines)
  if (success) {
    uploadText.value = ''
    ElMessage.success('指令上传成功')
  } else if (commandsStore.error) {
    ElMessage.error(commandsStore.error)
  }
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
  return new Date(timestamp).toLocaleString()
}
</script>
