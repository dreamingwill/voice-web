<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-primary">岗位管理</h2>
      <el-button type="primary" @click="openCreateDialog">新增岗位</el-button>
    </header>

    <el-table v-loading="loading" :data="positions" border stripe>
      <el-table-column type="index" width="60" label="#" />
      <el-table-column prop="name" label="岗位名称" />
      <el-table-column label="权限等级" width="160">
        <template #default="{ row }">
          <el-tag :type="levelTagType(row.level)" size="small">L{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="描述">
        <template #default="{ row }">{{ row.description ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="confirmDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="isFormVisible"
      :title="isEditing ? '编辑岗位' : '新增岗位'"
      width="min(400px, 92vw)"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="岗位名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：指挥员" />
        </el-form-item>
        <el-form-item label="权限等级" prop="level">
          <el-select v-model="form.level" placeholder="选择等级" class="w-full">
            <el-option v-for="n in 8" :key="n" :label="`L${n} — 等级 ${n}`" :value="n" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述（可选）">
          <el-input v-model="form.description" placeholder="简要描述该岗位权限范围" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isFormVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import api from '@/services/apiService'

interface JobPosition {
  id: number
  name: string
  level: number
  description?: string | null
}

const loading = ref(false)
const submitting = ref(false)
const positions = ref<JobPosition[]>([])
const isFormVisible = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<{ id: number | null; name: string; level: number | null; description: string }>({
  id: null,
  name: '',
  level: null,
  description: '',
})

const isEditing = computed(() => Boolean(form.id))

const formRules: FormRules = {
  name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择权限等级', trigger: 'change' }],
}

onMounted(() => void fetchPositions())

async function fetchPositions() {
  loading.value = true
  try {
    const res = await api.get<{ items: JobPosition[]; total: number }>('api/job-positions')
    positions.value = res.data?.items ?? []
  } catch {
    ElMessage({ type: 'error', message: '加载岗位列表失败', showClose: true })
  } finally {
    loading.value = false
  }
}

function levelTagType(level: number) {
  if (level <= 2) return 'info'
  if (level <= 4) return 'success'
  if (level <= 6) return 'warning'
  return 'danger'
}

function openCreateDialog() {
  form.id = null
  form.name = ''
  form.level = null
  form.description = ''
  isFormVisible.value = true
  void nextTick(() => formRef.value?.clearValidate())
}

function openEditDialog(row: JobPosition) {
  form.id = row.id
  form.name = row.name
  form.level = row.level
  form.description = row.description ?? ''
  isFormVisible.value = true
  void nextTick(() => formRef.value?.clearValidate())
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const body = { name: form.name, level: form.level, description: form.description || null }
      if (isEditing.value && form.id) {
        await api.patch(`api/job-positions/${form.id}`, body)
        ElMessage({ type: 'success', message: '岗位已更新', showClose: true })
      } else {
        await api.post('api/job-positions', body)
        ElMessage({ type: 'success', message: '岗位已创建', showClose: true })
      }
      isFormVisible.value = false
      await fetchPositions()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      ElMessage({
        type: 'error',
        message: status === 409 ? '岗位名称已存在' : '保存失败，请稍后再试',
        showClose: true,
      })
    } finally {
      submitting.value = false
    }
  })
}

function confirmDelete(row: JobPosition) {
  ElMessageBox.confirm(`确定要删除岗位「${row.name}」吗？相关操作员的岗位将被清除。`, '确认删除', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await api.delete(`api/job-positions/${row.id}`)
      ElMessage({ type: 'success', message: '已删除岗位', showClose: true })
      await fetchPositions()
    })
    .catch(() => undefined)
}
</script>
