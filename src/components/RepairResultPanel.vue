<script setup lang="ts">
import { ref, computed } from 'vue'
import { TaskStatus, normalizeTaskStatus, type RepairResult, type TaskInfo } from '@/types/task'

const props = defineProps<{
  repairResult?: RepairResult
  taskInfo?: TaskInfo
}>()

// 展开状态
const isExpanded = ref(false)

// 标准化后的状态
const normalizedStatus = computed(() => {
  const status = props.taskInfo?.status
  return typeof status === 'string' ? normalizeTaskStatus(status) : status
})

// 是否显示面板
const showPanel = computed(() => {
  // 如果有修复结果，显示
  if (props.repairResult?.attempted !== undefined) {
    return true
  }
  // 如果有修复记录，显示
  if (props.taskInfo?.repairCount !== undefined && props.taskInfo.repairCount > 0) {
    return true
  }
  // 如果有修复摘要，显示
  if (props.taskInfo?.repairSummary) {
    return true
  }
  return false
})

// 是否正在修复
const isRepairing = computed(() => {
  return props.repairResult?.attempted === true && props.repairResult?.success === undefined
})

// 修复是否成功
const repairSuccess = computed(() => {
  return props.repairResult?.success ?? null
})

// 修复轮次
const repairRound = computed(() => {
  return props.repairResult?.repairRound ?? props.taskInfo?.repairCount ?? 0
})

// 最大修复轮次
const maxRepairRounds = computed(() => {
  return props.repairResult?.maxRepairRounds ?? props.taskInfo?.maxRepairCount ?? 1
})

// 修复摘要
const repairSummary = computed(() => {
  return props.repairResult?.summary || props.taskInfo?.repairSummary || ''
})

// 未触发原因
const skippedReason = computed(() => {
  return props.repairResult?.skippedReason || ''
})

// 状态文案
const statusText = computed(() => {
  if (isRepairing.value) {
    return '系统正在尝试自动修复'
  }
  if (repairSuccess.value === true) {
    return '自动修复完成，重新校验通过'
  }
  if (repairSuccess.value === false) {
    return '自动修复完成，但重新校验仍失败'
  }
  if (props.repairResult?.attempted === false) {
    if (skippedReason.value) {
      return `未触发自动修复：${skippedReason.value}`
    }
    return '未触发自动修复'
  }
  // 从 taskInfo 判断
  if (props.taskInfo?.repairCount && props.taskInfo.repairCount > 0) {
    if (normalizedStatus.value === TaskStatus.SUCCESS) {
      return '自动修复完成，任务成功'
    }
    if (normalizedStatus.value === TaskStatus.FAILED) {
      return '自动修复后仍未通过'
    }
  }
  return ''
})

// 状态颜色
const statusColor = computed(() => {
  if (isRepairing.value) {
    return 'processing'
  }
  if (repairSuccess.value === true) {
    return 'success'
  }
  if (repairSuccess.value === false) {
    return 'warning'
  }
  if (props.repairResult?.attempted === false) {
    return 'default'
  }
  // 从 taskInfo 判断
  if (props.taskInfo?.repairCount && props.taskInfo.repairCount > 0) {
    if (normalizedStatus.value === TaskStatus.SUCCESS) {
      return 'success'
    }
    if (normalizedStatus.value === TaskStatus.FAILED) {
      return 'warning'
    }
  }
  return 'default'
})

// 是否尝试了修复
const attemptedRepair = computed(() => {
  return props.repairResult?.attempted === true || (props.taskInfo?.repairCount && props.taskInfo.repairCount > 0)
})

// 切换展开
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div v-if="showPanel" class="repair-result-panel">
    <!-- 标题行 -->
    <div class="panel-header" @click="toggleExpand">
      <div class="header-left">
        <a-tag :color="statusColor" size="small">
          {{ isRepairing ? '正在修复' : attemptedRepair ? '已修复' : '未修复' }}
        </a-tag>
        <span class="status-text">{{ statusText }}</span>
      </div>
      <div class="header-right">
        <a-button type="link" size="small">
          {{ isExpanded ? '收起' : '展开详情' }}
        </a-button>
      </div>
    </div>

    <!-- 展开内容 -->
    <div v-if="isExpanded" class="panel-body">
      <!-- 修复轮次 -->
      <div v-if="attemptedRepair" class="repair-round-section">
        <div class="section-row">
          <span class="section-label">修复轮次：</span>
          <span class="section-value">第 {{ repairRound }} / {{ maxRepairRounds }} 轮</span>
        </div>
      </div>

      <!-- 修复摘要 -->
      <div v-if="repairSummary" class="repair-summary-section">
        <div class="section-row">
          <span class="section-label">修复说明：</span>
          <span class="summary-content">{{ repairSummary }}</span>
        </div>
      </div>

      <!-- 未触发原因 -->
      <div v-if="!attemptedRepair && skippedReason" class="skipped-reason-section">
        <div class="section-row">
          <span class="section-label">跳过原因：</span>
          <span class="skipped-content">{{ skippedReason }}</span>
        </div>
      </div>

      <!-- 修复结果说明 -->
      <div class="repair-explain-section">
        <a-alert
          v-if="isRepairing"
          type="info"
          message="检测到可修复错误，系统正在尝试自动修复"
          show-icon
        />
        <a-alert
          v-else-if="repairSuccess === true"
          type="success"
          message="自动修复成功，重新校验通过"
          show-icon
        />
        <a-alert
          v-else-if="repairSuccess === false"
          type="warning"
          message="自动修复完成，但仍存在问题，请查看关键错误"
          show-icon
        />
        <a-alert
          v-else-if="!attemptedRepair && skippedReason.includes('只有警告')"
          type="info"
          message="未触发自动修复：当前只有警告，无需修复"
          show-icon
        />
        <a-alert
          v-else-if="!attemptedRepair && skippedReason.includes('上限')"
          type="warning"
          message="未触发自动修复：已达到修复上限"
          show-icon
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.repair-result-panel {
  background: #fff8e1;
  border-radius: 8px;
  border: 1px solid #ffd591;
  margin-bottom: 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  background: #fffbe6;
}

.panel-header:hover {
  background: #fff1b8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 13px;
  color: #333;
}

.panel-body {
  padding: 16px;
  border-top: 1px solid #ffd591;
  background: #fff;
}

.section-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.section-label {
  font-size: 13px;
  color: #666;
  min-width: 80px;
}

.section-value {
  font-size: 13px;
  color: #333;
}

.repair-round-section {
  margin-bottom: 12px;
}

.repair-summary-section {
  margin-bottom: 12px;
}

.summary-content {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}

.skipped-reason-section {
  margin-bottom: 12px;
}

.skipped-content {
  font-size: 13px;
  color: #999;
}

.repair-explain-section {
  margin-top: 12px;
}

.repair-explain-section :deep(.ant-alert) {
  margin-bottom: 0;
}
</style>