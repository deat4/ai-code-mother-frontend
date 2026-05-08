<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  TaskStatus,
  normalizeTaskStatus,
  normalizeTaskStage,
  TASK_STATUS_TEXT,
  TASK_STAGE_TEXT,
  TASK_STATUS_COLOR,
  TASK_STAGE_COLOR,
  type TaskInfo,
  type ValidationResult,
  type RepairResult,
  type TaskLogEntry,
  type BuildResult,
} from '@/types/task'
import { getTask, getTaskLogs, parseTaskResponse } from '@/api/taskController'

const props = defineProps<{
  open: boolean
  taskInfo?: TaskInfo
  validationResult?: ValidationResult
  repairResult?: RepairResult
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
}>()

// 任务日志
const taskLogs = ref<TaskLogEntry[]>([])
const loadingLogs = ref(false)

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

// 状态文案
const statusText = computed(() => {
  if (normalizedStatus.value) {
    return TASK_STATUS_TEXT[normalizedStatus.value] ?? '未知状态'
  }
  return ''
})

// 阶段文案
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

// 构建结果
const buildResult = computed(() => {
  return props.taskInfo?.buildResult || props.validationResult?.buildResult
})

// 是否显示构建详情
const showBuildDetails = computed(() => {
  return buildResult.value !== undefined
})

// 是否显示校验详情
const showValidationDetails = computed(() => {
  return props.validationResult !== undefined || props.taskInfo?.validationSummary
})

// 是否显示修复详情
const showRepairDetails = computed(() => {
  return props.repairResult !== undefined ||
    (props.taskInfo?.repairCount !== undefined && props.taskInfo.repairCount > 0)
})

// 关闭抽屉
const handleClose = () => {
  emit('update:open', false)
  emit('close')
}

// 加载任务日志
const loadTaskLogs = async () => {
  if (!props.taskInfo?.taskId) return
  loadingLogs.value = true
  try {
    const res = await getTaskLogs(props.taskInfo.taskId)
    if (res.data.code === 0 && res.data.data) {
      taskLogs.value = res.data.data || []
    }
  } catch (err) {
    console.warn('加载任务日志失败:', err)
    taskLogs.value = []
  } finally {
    loadingLogs.value = false
  }
}

// 监听抽屉打开，加载日志
watch(() => props.open, (isOpen) => {
  if (isOpen && props.taskInfo?.taskId) {
    loadTaskLogs()
  }
})

// 格式化时间
const formatTime = (time?: string) => {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return time
  }
}

// 日志级别颜色
const getLogLevelColor = (level?: string) => {
  if (level === 'error') return 'error'
  if (level === 'warn') return 'warning'
  if (level === 'info') return 'processing'
  return 'default'
}

// 阶段名称
const getStageName = (stage?: string) => {
  if (!stage) return ''
  const normalized = normalizeTaskStage(stage)
  return normalized ? TASK_STAGE_TEXT[normalized] : stage
}
</script>

<template>
  <a-drawer
    :open="props.open"
    title="任务详情"
    placement="right"
    :width="480"
    @close="handleClose"
  >
    <div class="task-detail-content">
      <!-- 基本信息 -->
      <div class="detail-section">
        <div class="section-title">基本信息</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">任务 ID</span>
            <span class="info-value">{{ taskInfo?.taskId || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">会话 ID</span>
            <span class="info-value">{{ taskInfo?.sessionId || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">任务状态</span>
            <a-tag v-if="normalizedStatus" :color="statusColor" size="small">
              {{ statusText }}
            </a-tag>
            <span v-else class="info-value">-</span>
          </div>
          <div class="info-item">
            <span class="info-label">当前阶段</span>
            <a-tag v-if="normalizedStage" :color="stageColor" size="small">
              {{ stageText }}
            </a-tag>
            <span v-else class="info-value">-</span>
          </div>
        </div>
      </div>

      <!-- 校验详情 -->
      <div v-if="showValidationDetails" class="detail-section">
        <div class="section-title">校验详情</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">校验结果</span>
            <a-tag
              :color="taskInfo?.validationPassed === true ? 'success' : taskInfo?.validationPassed === false ? 'error' : 'default'"
              size="small"
            >
              {{ taskInfo?.validationPassed === true ? '通过' : taskInfo?.validationPassed === false ? '未通过' : '未知' }}
            </a-tag>
          </div>
          <div class="info-item full-width">
            <span class="info-label">校验摘要</span>
            <span class="info-value">{{ taskInfo?.validationSummary || validationResult?.summary || '-' }}</span>
          </div>
          <div v-if="taskInfo?.issueCount !== undefined" class="info-item">
            <span class="info-label">错误数</span>
            <span class="info-value error-count">{{ taskInfo.issueCount }}</span>
          </div>
          <div v-if="taskInfo?.warningCount !== undefined" class="info-item">
            <span class="info-label">警告数</span>
            <span class="info-value warning-count">{{ taskInfo.warningCount }}</span>
          </div>
        </div>
        <!-- issues 列表 -->
        <div v-if="validationResult?.issues && validationResult.issues.length > 0" class="issues-preview">
          <div class="issues-header">问题列表（前 3 条）</div>
          <div class="issues-list">
            <div
              v-for="(issue, index) in validationResult.issues.slice(0, 3)"
              :key="index"
              class="issue-item"
            >
              <a-tag :color="issue.severity === 'error' ? 'error' : 'warning'" size="small">
                {{ issue.severity || '问题' }}
              </a-tag>
              <span class="issue-file">{{ issue.filePath }}</span>
              <span class="issue-message">{{ issue.message }}</span>
            </div>
            <div v-if="validationResult.issues.length > 3" class="more-issues">
              还有 {{ validationResult.issues.length - 3 }} 条问题...
            </div>
          </div>
        </div>
      </div>

      <!-- 修复详情 -->
      <div v-if="showRepairDetails" class="detail-section">
        <div class="section-title">修复详情</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">修复轮次</span>
            <span class="info-value">
              {{ repairResult?.repairRound || taskInfo?.repairCount || 0 }} /
              {{ repairResult?.maxRepairRounds || taskInfo?.maxRepairCount || 1 }}
            </span>
          </div>
          <div class="info-item full-width">
            <span class="info-label">修复摘要</span>
            <span class="info-value">{{ repairResult?.summary || taskInfo?.repairSummary || '-' }}</span>
          </div>
          <div v-if="repairResult?.attempted !== undefined" class="info-item">
            <span class="info-label">是否尝试</span>
            <a-tag :color="repairResult.attempted ? 'processing' : 'default'" size="small">
              {{ repairResult.attempted ? '是' : '否' }}
            </a-tag>
          </div>
          <div v-if="repairResult?.success !== undefined" class="info-item">
            <span class="info-label">修复结果</span>
            <a-tag :color="repairResult.success ? 'success' : 'warning'" size="small">
              {{ repairResult.success ? '成功' : '失败' }}
            </a-tag>
          </div>
          <div v-if="repairResult?.skippedReason" class="info-item full-width">
            <span class="info-label">跳过原因</span>
            <span class="info-value">{{ repairResult.skippedReason }}</span>
          </div>
        </div>
      </div>

      <!-- 构建详情 -->
      <div v-if="showBuildDetails" class="detail-section">
        <div class="section-title">构建详情</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">依赖安装</span>
            <a-tag
              :color="buildResult?.installSuccess === true ? 'success' : buildResult?.installSuccess === false ? 'error' : 'default'"
              size="small"
            >
              {{ buildResult?.installSuccess === true ? '成功' : buildResult?.installSuccess === false ? '失败' : '未知' }}
            </a-tag>
          </div>
          <div class="info-item">
            <span class="info-label">项目构建</span>
            <a-tag
              :color="buildResult?.buildSuccess === true ? 'success' : buildResult?.buildSuccess === false ? 'error' : 'default'"
              size="small"
            >
              {{ buildResult?.buildSuccess === true ? '成功' : buildResult?.buildSuccess === false ? '失败' : '未知' }}
            </a-tag>
          </div>
          <div v-if="buildResult?.installDurationMs" class="info-item">
            <span class="info-label">安装耗时</span>
            <span class="info-value">{{ Math.round(buildResult.installDurationMs / 1000) }}秒</span>
          </div>
          <div v-if="buildResult?.buildDurationMs" class="info-item">
            <span class="info-label">构建耗时</span>
            <span class="info-value">{{ Math.round(buildResult.buildDurationMs / 1000) }}秒</span>
          </div>
        </div>
        <!-- 关键错误 -->
        <div v-if="buildResult?.keyErrors && buildResult.keyErrors.length > 0" class="key-errors-preview">
          <div class="key-errors-header">关键错误（前 3 条）</div>
          <div class="key-errors-list">
            <div
              v-for="(error, index) in buildResult.keyErrors.slice(0, 3)"
              :key="index"
              class="key-error-item"
            >
              <a-tag color="error" size="small">错误</a-tag>
              <span class="error-text">{{ error }}</span>
            </div>
            <div v-if="buildResult.keyErrors.length > 3" class="more-errors">
              还有 {{ buildResult.keyErrors.length - 3 }} 条错误...
            </div>
          </div>
        </div>
      </div>

      <!-- 任务日志 -->
      <div class="detail-section">
        <div class="section-title">任务日志</div>
        <div v-if="loadingLogs" class="logs-loading">
          <a-spin size="small" />
          <span>加载日志中...</span>
        </div>
        <div v-else-if="taskLogs.length > 0" class="logs-list">
          <div v-for="(log, index) in taskLogs" :key="index" class="log-item">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <a-tag v-if="log.stage" size="small">{{ getStageName(log.stage) }}</a-tag>
            <a-tag v-if="log.level" :color="getLogLevelColor(log.level)" size="small">
              {{ log.level }}
            </a-tag>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
        <div v-else class="no-logs">
          <span class="no-logs-text">暂无日志</span>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="normalizedStatus === TaskStatus.FAILED && taskInfo?.errorMessage" class="detail-section error-section">
        <div class="section-title error-title">错误信息</div>
        <a-alert type="error" :message="taskInfo.errorMessage" show-icon />
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.task-detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #f0f0f0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item.full-width {
  flex-direction: column;
  align-items: flex-start;
}

.info-label {
  font-size: 13px;
  color: #666;
  min-width: 80px;
}

.info-value {
  font-size: 13px;
  color: #333;
}

.error-count {
  color: #ff4d4f;
  font-weight: 500;
}

.warning-count {
  color: #faad14;
  font-weight: 500;
}

.issues-preview {
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.issues-header {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.issue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.issue-file {
  font-size: 12px;
  color: #1890ff;
  font-family: monospace;
}

.issue-message {
  font-size: 12px;
  color: #666;
}

.more-issues {
  font-size: 12px;
  color: #999;
}

.key-errors-preview {
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.key-errors-header {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.key-errors-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.key-error-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-text {
  font-size: 12px;
  color: #cf1322;
}

.more-errors {
  font-size: 12px;
  color: #999;
}

.logs-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
}

.log-time {
  color: #999;
  min-width: 70px;
}

.log-message {
  color: #333;
}

.no-logs {
  padding: 12px;
  text-align: center;
}

.no-logs-text {
  font-size: 13px;
  color: #999;
}

.error-section {
  background: #fff2f0;
  border-color: #ffccc7;
}

.error-title {
  color: #ff4d4f;
}
</style>