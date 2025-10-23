<template>
  <section class="bg-white rounded-lg shadow p-6 space-y-5">
    <header>
      <h2 class="text-lg font-semibold text-primary">操作员与声纹管理</h2>
      <p class="text-sm text-slate-600">
        维护操作员目录，并模拟声纹采集与登记流程。
      </p>
    </header>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="操作员目录" name="directory">
        <el-table :data="operators" size="small" stripe>
          <el-table-column prop="name" label="姓名" width="160" />
          <el-table-column prop="role" label="角色" width="150" />
          <el-table-column prop="voiceprintId" label="声纹 ID" />
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="selectOperator(row)">
                编辑
              </el-button>
              <el-button type="danger" link size="small">停用</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="声纹登记" name="enroll">
        <el-form :model="enrollment" label-position="top" class="max-w-md space-y-4">
          <el-form-item label="操作员">
            <el-select v-model="enrollment.operatorId" placeholder="请选择操作员">
              <el-option v-for="operator in operators" :key="operator.id" :label="operator.name" :value="operator.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="采集语音样本">
            <el-steps :active="enrollment.captureStep" finish-status="success">
              <el-step title="环境噪声" />
              <el-step title="关键词语音" />
              <el-step title="结果确认" />
            </el-steps>
          </el-form-item>
          <div class="flex gap-3">
            <el-button type="primary" @click="advanceEnrollment">采集下一段</el-button>
            <el-button @click="resetEnrollment">重置流程</el-button>
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
  { id: 'op-1', name: '张伟', role: '指挥员', voiceprintId: 'VP-88421' },
  { id: 'op-2', name: '李强', role: '操作员', voiceprintId: 'VP-77310' },
  { id: 'op-3', name: '王芳', role: '巡逻员', voiceprintId: 'VP-66102' },
])

const enrollment = reactive({
  operatorId: '',
  captureStep: 0,
})

function selectOperator(row: OperatorRow) {
  activeTab.value = 'enroll'
  enrollment.operatorId = row.id
  ElMessage.info(`已切换到 ${row.name} 的声纹登记流程`)
}

function advanceEnrollment() {
  if (!enrollment.operatorId) {
    ElMessage.warning('请先选择需要登记的操作员。')
    return
  }

  if (enrollment.captureStep < 3) {
    enrollment.captureStep += 1
    ElMessage.success(`已完成第 ${enrollment.captureStep} / 3 段样本采集`)
  } else {
    ElMessage.success('声纹登记模拟完成！')
  }
}

function resetEnrollment() {
  enrollment.operatorId = ''
  enrollment.captureStep = 0
}
</script>
