<script setup lang="ts">
import { computed } from 'vue'
import {
  TaskStatus,
  TaskStage,
  normalizeTaskStatus,
  normalizeTaskStage,
  TASK_STATUS_TEXT,
  TASK_STAGE_TEXT,
  TASK_STATUS_COLOR,
  TASK_STAGE_COLOR,
  type TaskInfo,
  type ValidationResult,
} from '@/types/task'

const props = defineProps<{
  taskInfo?: TaskInfo
  validationResult?: ValidationResult
  isStopping?: boolean
}>()

const emit = defineEmits<{
  (e: 'stop'): void
  (e: 'refresh'): void
  (e: 'viewLogs'): void
}>()

// 标准化后的状态
const normalizedStatus = computed(() => {
  const status = props.taskInfo?.status
  return typeof status === 'string' ? normalizeTaskStatus(status) : status
})

// 标准化后的阶段
const normalizedStage = computed(() => {
  const stage = props.taskInfo?.currentStage
  return typeof stage === 'string' ? normalizeTaskStage(stage) : stage
})

// 是否正在运行
const isRunning = computed(() => {
  return normalizedStatus.value === TaskStatus.RUNNING || normalizedStage.value === TaskStage.GENERATING
})

// 是否可以停止
const canStop = computed(() => {
  return isRunning.value && !props.isStopping && props.taskInfo?.sessionId
})

// 显示的状态文案
const statusText = computed(() => {
  if (props.isStopping) return '正在取消...'
  if (normalizedStatus.value) {
    return TASK_STATUS_TEXT[normalizedStatus.value] ?? '未知状态'
  }
  return ''
})

// 显示的阶段文案
const stageText = computed(() => {
  if (normalizedStage.value) {
    return TASK_STAGE_TEXT[normalizedStage.value] ?? '未知阶段'
  }
  return ''
})

// 状态颜色
const statusColor = computed(() => {
  if (normalizedStatus.value) {
    return TASK_STATUS_COLOR[normalizedStatus.value] ?? 'default'
  }
  return 'default'
})

// 阶段颜色
const stageColor = computed(() => {
  if (normalizedStage.value) {
    return TASK_STAGE_COLOR[normalizedStage.value] ?? 'default'
  }
  return 'default'
})

// 是否显示任务卡片
const showCard = computed(() => {
  return props.taskInfo?.taskId !== undefined && props.taskInfo?.taskId !== 0
})

// 是否显示校验摘要
const showValidationSummary = computed(() => {
  return props.taskInfo?.validationSummary || props.validationResult?.summary
})

// 校验摘要内容
const validationSummaryText = computed(() => {
  return props.taskInfo?.validationSummary || props.validationResult?.summary || ''
})

// 是否校验通过
const validationPassed = computed(() => {
  return props.taskInfo?.validationPassed ?? props.validationResult?.passed ?? null
})

// 是否显示错误信息
const showErrorMessage = computed(() => {
  return normalizedStatus.value === TaskStatus.FAILED && props.taskInfo?.errorMessage
})
</script>

<template>
  <div v-if="showCard" class="task-status-card">
    <div class="task-header">
      <div class="task-info-row">
        <span class="task-id">任务 #{{ taskInfo?.taskId }}</span>
        <a-tag v-if="normalizedStage" :color="stageColor" size="small">
          {{ stageText }}
        </a-tag>
        <a-tag v-if="normalizedStatus" :color="statusColor" size="small">
          {{ statusText }}
        </a-tag>
      </div>
      <div class="task-actions">
        <a-button v-if="canStop" type="link" size="small" danger @click="emit('stop')">
          停止
        </a-button>
        <a-button v-if="!isRunning" type="link" size="small" @click="emit('refresh')">
          刷新
        </a-button>
      </div>
    </div>

    <!-- 校验摘要 -->
    <div v-if="showValidationSummary" class="validation-summary">
      <a-tag :color="validationPassed === true ? 'success' : validationPassed === false ? 'error' : 'default'" size="small">
        {{ validationPassed === true ? '校验通过' : validationPassed === false ? '校验未通过' : '校验结果' }}
      </a-tag>
      <span class="summary-text">{{ validationSummaryText }}</span>
    </div>

    <!-- 错误信息 -->
    <div v-if="showErrorMessage" class="error-message">
      <a-alert type="error" :message="taskInfo?.errorMessage" show-icon />
    </div>

    <!-- 取消状态提示 -->
    <div v-if="normalizedStatus === TaskStatus.CANCELED" class="canceled-message">
      <a-alert type="warning" message="任务已被取消" show-icon />
    </div>

    <!-- 进度指示器 -->
    <div v-if="isRunning && !isStopping" class="progress-indicator">
      <a-progress :percent="100" :show-info="false" status="active" stroke-color="#1890ff" />
    </div>
  </div>
</template>

<style scoped>
.task-status-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-id {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.task-actions {
  display: flex;
  gap: 4px;
}

.validation-summary {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-text {
  font-size: 12px;
  color: #666;
}

.error-message {
  margin-top: 8px;
}

.canceled-message {
  margin-top: 8px;
}

.progress-indicator {
  margin-top: 8px;
}
</style>