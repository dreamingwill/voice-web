<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-primary">操作员与声纹管理</h2>
        <p class="text-sm text-slate-600">
          维护操作员资料、执行新增/编辑/停用等操作，并支持现场声纹登记流程。
        </p>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        新增操作员
      </el-button>
    </header>

    <div class="flex flex-wrap items-center gap-3">
      <el-input
        v-model="filters.keyword"
        placeholder="按用户名模糊搜索"
        clearable
        class="w-60"
        @keyup.enter="applySearch"
        @clear="handleSearchReset"
      />
      <el-button type="primary" @click="applySearch">查询</el-button>
      <el-button @click="handleSearchReset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="operators" border stripe>
      <el-table-column type="index" width="60" label="#" />
      <el-table-column prop="account" label="账号" width="160" />
      <el-table-column prop="username" label="姓名" width="140" />
      <el-table-column label="角色" width="150">
        <template #default="{ row }">
          {{ row.identity ?? '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="160">
        <template #default="{ row }">
          {{ row.phone ?? '—' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
            {{ row.status === 'enabled' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="声纹状态" width="160">
        <template #default="{ row }">
          <el-tag v-if="row.has_voiceprint" type="success" size="small">
            已登记
          </el-tag>
          <el-tag v-else type="info" size="small">
            未登记
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button
            link
            type="success"
            size="small"
            @click="openVoiceModal(row)"
          >
            声纹登记
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            @click="confirmDelete(row)"
          >
            删除
          </el-button>
          <el-button
            link
            :type="row.status === 'enabled' ? 'warning' : 'success'"
            size="small"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'enabled' ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-sm text-slate-500">共 {{ pagination.total }} 条记录</span>
      <el-pagination
        background
        layout="prev, pager, next, sizes"
        :total="pagination.total"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
    </div>

    <el-dialog
      v-model="isFormVisible"
      :title="isEditing ? '编辑操作员' : '新增操作员'"
      width="min(420px, 92vw)"
    >
      <el-form
        ref="operatorFormRef"
        :model="form"
        :rules="formRules"
        label-position="top"
        class="operator-form"
      >
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" placeholder="唯一账号，例如 employee01" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="用于登录的唯一标识" />
        </el-form-item>
        <el-form-item label="角色" prop="identity">
          <el-input v-model="form.identity" placeholder="如：指挥员 / 调度员" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="可选，11位手机号" maxlength="20" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isFormVisible = false">取消</el-button>
          <el-button type="primary" :loading="formSubmitting" @click="submitForm">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <RecordVoiceModal
      :visible="isVoiceModalVisible"
      :operator="voiceTarget"
      @close="closeVoiceModal"
      @completed="handleVoiceCompleted"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import api from '@/services/apiService'
import RecordVoiceModal from '@/components/admin/RecordVoiceModal.vue'

const loading = ref(false)
interface Operator {
  id: number
  account: string
  username: string
  identity?: string | null
  phone?: string | null
  status: 'enabled' | 'disabled'
  has_voiceprint: boolean
}

interface OperatorListResponse {
  items: Operator[]
  total: number
  page: number
  page_size: number
}

const operators = ref<Operator[]>([])
const isFormVisible = ref(false)
const formSubmitting = ref(false)
const form = reactive<{ id: number | null; account: string; username: string; identity: string; phone: string }>({
  id: null,
  account: '',
  username: '',
  identity: '',
  phone: '',
})
const operatorFormRef = ref<FormInstance>()
const voiceTarget = ref<Operator | null>(null)
const isVoiceModalVisible = ref(false)
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})
const filters = reactive({
  keyword: '',
})

const formRules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  identity: [{ required: true, message: '请输入角色', trigger: 'blur' }],
}

const isEditing = computed(() => Boolean(form.id))

onMounted(() => {
  void fetchOperators()
})

async function fetchOperators() {
  loading.value = true
  try {
    const response = await api.get<OperatorListResponse>('/api/users', {
      params: {
        page: pagination.page,
        page_size: pagination.pageSize,
        keyword: filters.keyword || undefined,
      },
    })
    operators.value = response.data?.items ?? []
    pagination.total = response.data?.total ?? 0
    pagination.pageSize = response.data?.page_size ?? pagination.pageSize
  } catch (error) {
    console.error('[Operators] fetch failed', error)
    ElMessage({
      type: 'error',
      message: isUnauthorizedError(error) ? '登录状态失效，请重新登录' : '加载操作员列表失败',
      showClose: true,
    })
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.id = null
  form.account = ''
  form.username = ''
  form.identity = ''
  form.phone = ''
  isFormVisible.value = true
  void nextTickValidate(false)
}

function openEditDialog(row: Operator) {
  form.id = row.id
  form.account = row.account
  form.username = row.username
  form.identity = row.identity ?? ''
  form.phone = row.phone ?? ''
  isFormVisible.value = true
  void nextTickValidate(false)
}

async function nextTickValidate(clear = true) {
  await nextTick()
  if (clear) {
    operatorFormRef.value?.clearValidate()
  }
}

async function submitForm() {
  if (!operatorFormRef.value) return
  await operatorFormRef.value.validate(async (valid) => {
    if (!valid) return
    formSubmitting.value = true
    try {
      if (isEditing.value && form.id) {
        await api.patch(`/api/users/${form.id}`, {
          account: form.account,
          username: form.username,
          identity: form.identity,
          phone: form.phone || null,
        })
        ElMessage({
          type: 'success',
          message: '操作员信息已更新',
          showClose: true,
        })
      } else {
        await api.post('/api/users', {
          account: form.account,
          username: form.username,
          identity: form.identity,
          phone: form.phone || null,
        })
        ElMessage({
          type: 'success',
          message: '已新增操作员',
          showClose: true,
        })
        pagination.page = 1
      }
      isFormVisible.value = false
      await fetchOperators()
    } catch (error) {
      console.error('[Operators] submit failed', error)
      ElMessage({
        type: 'error',
        message: '保存失败，请稍后再试',
        showClose: true,
      })
    } finally {
      formSubmitting.value = false
    }
  })
}

function confirmDelete(row: Operator) {
  ElMessageBox.confirm(`确定要删除操作员「${row.username}」吗？`, '确认删除', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await api.delete(`/api/users/${row.id}`)
      ElMessage({
        type: 'success',
        message: '已删除操作员',
        showClose: true,
      })
      await fetchOperators()
    })
    .catch(() => undefined)
}

function openVoiceModal(row: Operator) {
  voiceTarget.value = row
  isVoiceModalVisible.value = true
}

function closeVoiceModal() {
  isVoiceModalVisible.value = false
  voiceTarget.value = null
}

async function handleVoiceCompleted() {
  await fetchOperators()
}

function handlePageChange(page: number) {
  pagination.page = page
  void fetchOperators()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  void fetchOperators()
}

function applySearch() {
  pagination.page = 1
  void fetchOperators()
}

function handleSearchReset() {
  filters.keyword = ''
  pagination.page = 1
  void fetchOperators()
}

async function toggleStatus(row: Operator) {
  const targetStatus = row.status === 'enabled' ? 'disabled' : 'enabled'
  try {
    await api.post(`/api/users/${row.id}/status`, { status: targetStatus })
    ElMessage({
      type: 'success',
      message: targetStatus === 'enabled' ? '已启用该操作员' : '已禁用该操作员',
      showClose: true,
    })
    await fetchOperators()
  } catch (error) {
    console.error('[Operators] toggle status failed', error)
    ElMessage({
      type: 'error',
      message: '更新状态失败',
      showClose: true,
    })
  }
}

function isUnauthorizedError(error: unknown) {
  return Boolean((error as { response?: { status?: number } })?.response?.status === 401)
}
</script>

<style scoped>
.operator-form {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}
</style>
