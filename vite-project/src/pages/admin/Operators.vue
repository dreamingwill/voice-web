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

    <el-table v-loading="loading" :data="operators" border stripe>
      <el-table-column type="index" width="60" label="#" />
      <el-table-column prop="name" label="姓名" width="160" />
      <el-table-column prop="role" label="角色" width="150" />
      <el-table-column label="声纹状态" width="160">
        <template #default="{ row }">
          <el-tag v-if="row.voiceprintId" type="success" size="small">
            已登记 · {{ row.voiceprintId }}
          </el-tag>
          <el-tag v-else type="info" size="small">
            未登记
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="200">
        <template #default="{ row }">
          {{ formatTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260">
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
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="isFormVisible"
      :title="isEditing ? '编辑操作员' : '新增操作员'"
      width="420px"
    >
      <el-form
        ref="operatorFormRef"
        :model="form"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入操作员姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-input v-model="form.role" placeholder="如：指挥员 / 调度员" />
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
import type { Operator } from '@/mocks/http'
import RecordVoiceModal from '@/components/admin/RecordVoiceModal.vue'

const loading = ref(false)
const operators = ref<Operator[]>([])
const isFormVisible = ref(false)
const formSubmitting = ref(false)
const form = reactive<{ id: string | null; name: string; role: string }>({
  id: null,
  name: '',
  role: '',
})
const operatorFormRef = ref<FormInstance>()
const voiceTarget = ref<Operator | null>(null)
const isVoiceModalVisible = ref(false)

const formRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请输入角色', trigger: 'blur' }],
}

const isEditing = computed(() => Boolean(form.id))

onMounted(() => {
  void fetchOperators()
})

async function fetchOperators() {
  loading.value = true
  try {
    const response = await api.get<Operator[]>('/api/operators')
    operators.value = response.data ?? []
  } catch (error) {
    console.error('[Operators] fetch failed', error)
    ElMessage.error('加载操作员列表失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.id = null
  form.name = ''
  form.role = ''
  isFormVisible.value = true
  void nextTickValidate(false)
}

function openEditDialog(row: Operator) {
  form.id = row.id
  form.name = row.name
  form.role = row.role
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
        await api.put(`/api/operators/${form.id}`, {
          name: form.name,
          role: form.role,
        })
        ElMessage.success('操作员信息已更新')
      } else {
        await api.post('/api/operators', {
          name: form.name,
          role: form.role,
        })
        ElMessage.success('已新增操作员')
      }
      isFormVisible.value = false
      await fetchOperators()
    } catch (error) {
      console.error('[Operators] submit failed', error)
      ElMessage.error('保存失败，请稍后再试')
    } finally {
      formSubmitting.value = false
    }
  })
}

function confirmDelete(row: Operator) {
  ElMessageBox.confirm(`确定要删除操作员「${row.name}」吗？`, '确认删除', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      await api.delete(`/api/operators/${row.id}`)
      ElMessage.success('已删除操作员')
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

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}
</script>
