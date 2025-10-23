<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header>
      <h2 class="text-lg font-semibold text-primary">Operators &amp; Voiceprints</h2>
      <p class="text-sm text-slate-600">
        Maintain operator directory and simulate the voiceprint enrollment workflow.
      </p>
    </header>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Operator Directory" name="directory">
        <el-table :data="operators" size="small" stripe>
          <el-table-column prop="name" label="Name" width="160" />
          <el-table-column prop="role" label="Role" width="150" />
          <el-table-column prop="voiceprintId" label="Voiceprint ID" />
          <el-table-column label="Actions" width="140">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="selectOperator(row)">
                Edit
              </el-button>
              <el-button type="danger" link size="small">Disable</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="Voiceprint Enrollment" name="enroll">
        <el-form :model="enrollment" label-position="top" class="max-w-md space-y-4">
          <el-form-item label="Operator">
            <el-select v-model="enrollment.operatorId" placeholder="Select operator">
              <el-option v-for="operator in operators" :key="operator.id" :label="operator.name" :value="operator.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="Capture Samples">
            <el-steps :active="enrollment.captureStep" finish-status="success">
              <el-step title="Ambient Noise" />
              <el-step title="Keyword Phrase" />
              <el-step title="Confirmation" />
            </el-steps>
          </el-form-item>
          <div class="flex gap-3">
            <el-button type="primary" @click="advanceEnrollment">Capture Next Sample</el-button>
            <el-button @click="resetEnrollment">Reset</el-button>
          </div>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

interface OperatorRow {
  id: string
  name: string
  role: string
  voiceprintId: string
}

const activeTab = ref<'directory' | 'enroll'>('directory')

const operators = ref<OperatorRow[]>([
  { id: 'op-1', name: '张伟', role: 'Supervisor', voiceprintId: 'VP-88421' },
  { id: 'op-2', name: '李强', role: 'Operator', voiceprintId: 'VP-77310' },
  { id: 'op-3', name: '王芳', role: 'Field Unit', voiceprintId: 'VP-66102' },
])

const enrollment = reactive({
  operatorId: '',
  captureStep: 0,
})

function selectOperator(row: OperatorRow) {
  activeTab.value = 'enroll'
  enrollment.operatorId = row.id
  ElMessage.info(`Editing voiceprint workflow for ${row.name}`)
}

function advanceEnrollment() {
  if (!enrollment.operatorId) {
    ElMessage.warning('Select an operator first.')
    return
  }

  if (enrollment.captureStep < 3) {
    enrollment.captureStep += 1
    ElMessage.success(`Captured sample ${enrollment.captureStep}/3`)
  } else {
    ElMessage.success('Enrollment simulated successfully!')
  }
}

function resetEnrollment() {
  enrollment.operatorId = ''
  enrollment.captureStep = 0
}
</script>
