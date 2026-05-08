<script setup lang="ts">
import { computed } from 'vue'
import {
  TaskStatus,
  TaskStage,
  normalizeTaskStatus,
  normalizeTaskStage,
  TASK_STAGE_TEXT,
  getStageIndex,
  isStageCompleted,
  type TaskInfo,
} from '@/types/task'

const props = defineProps<{
  taskInfo?: TaskInfo
  codeGenType?: string
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

// 是否是 Vue 项目（需要显示 BUILDING 阶段）
const isVueProject = computed(() => {
  return props.codeGenType === 'VUE_PROJECT'
})

// 需要显示的阶段列表（根据项目类型动态生成）
const visibleStages = computed(() => {
  const baseStages = [
    TaskStage.GENERATING,
    TaskStage.VALIDATING,
    TaskStage.DONE,
  ]
  // Vue 项目添加 BUILDING 阶段
  if (isVueProject.value) {
    // 在 VALIDATING 和 DONE 之间插入 BUILDING
    return [
      TaskStage.GENERATING,
      TaskStage.VALIDATING,
      TaskStage.BUILDING,
      TaskStage.DONE,
    ]
  }
  return baseStages
})

// 是否需要显示修复阶段（任务失败且有修复记录）
const showRepairing = computed(() => {
  // 如果当前阶段是 REPAIRING，则显示
  if (normalizedStage.value === TaskStage.REPAIRING) {
    return true
  }
  // 如果有修复记录（repairCount > 0），也显示
  if (props.taskInfo?.repairCount && props.taskInfo.repairCount > 0) {
    return true
  }
  return false
})

// 完整的阶段列表（包含可能的 REPAIRING）
const allStages = computed(() => {
  const stages = [...visibleStages.value]
  // 如果需要显示修复阶段，在 VALIDATING 后插入
  if (showRepairing.value) {
    const validatingIndex = stages.indexOf(TaskStage.VALIDATING)
    if (validatingIndex !== -1) {
      stages.splice(validatingIndex + 1, 0, TaskStage.REPAIRING)
    }
  }
  return stages
})

// 获取阶段状态
const getStageStatus = (stage: TaskStage) => {
  // 当前阶段
  if (stage === normalizedStage.value) {
    // 任务失败时，当前阶段标红
    if (normalizedStatus.value === TaskStatus.FAILED) {
      return 'failed'
    }
    // 任务取消时，当前阶段标灰
    if (normalizedStatus.value === TaskStatus.CANCELED) {
      return 'canceled'
    }
    // 正在执行中
    return 'active'
  }

  // 已完成的阶段
  if (isStageCompleted(stage, normalizedStage.value)) {
    return 'completed'
  }

  // 特殊处理：如果当前是 REPAIRING，则 VALIDATING 也是完成的
  if (normalizedStage.value === TaskStage.REPAIRING && stage === TaskStage.VALIDATING) {
    return 'completed'
  }

  // 特殊处理：如果当前是 DONE，则 REPAIRING 也是完成的（如果存在）
  if (normalizedStage.value === TaskStage.DONE && stage === TaskStage.REPAIRING) {
    if (showRepairing.value) {
      return 'completed'
    }
  }

  // 未进入的阶段
  return 'pending'
}

// 获取阶段颜色
const getStageColor = (stage: TaskStage) => {
  const status = getStageStatus(stage)
  switch (status) {
    case 'completed':
      return '#52c41a' // 绿色 - 已完成
    case 'active':
      return '#1890ff' // 蓝色 - 正在进行
    case 'failed':
      return '#ff4d4f' // 红色 - 失败
    case 'canceled':
      return '#d9d9d9' // 灰色 - 已取消
    default:
      return '#d9d9d9' // 灰色 - 待执行
  }
}

// 是否显示时间线
const showTimeline = computed(() => {
  return props.taskInfo?.taskId !== undefined && props.taskInfo?.taskId !== 0
})
</script>

<template>
  <div v-if="showTimeline" class="task-stage-timeline">
    <div class="timeline-container">
      <div class="timeline-track">
        <div
          v-for="(stage, index) in allStages"
          :key="stage"
          class="timeline-item"
          :class="getStageStatus(stage)"
        >
          <!-- 连接线 -->
          <div
            v-if="index < allStages.length - 1"
            class="timeline-line"
            :style="{ backgroundColor: getStageColor(stage) }"
          ></div>

          <!-- 阶段节点 -->
          <div
            class="stage-node"
            :style="{ backgroundColor: getStageColor(stage) }"
          >
            <span v-if="getStageStatus(stage) === 'completed'" class="node-icon">✓</span>
            <span v-else-if="getStageStatus(stage) === 'failed'" class="node-icon">✗</span>
            <span v-else-if="getStageStatus(stage) === 'active'" class="node-icon loading">●</span>
            <span v-else class="node-icon">{{ index + 1 }}</span>
          </div>

          <!-- 阶段名称 -->
          <div class="stage-label">
            <span class="stage-text">{{ TASK_STAGE_TEXT[stage] }}</span>
            <span v-if="getStageStatus(stage) === 'active'" class="stage-status active-status">
              进行中
            </span>
            <span v-else-if="getStageStatus(stage) === 'failed'" class="stage-status failed-status">
              失败
            </span>
            <span v-else-if="getStageStatus(stage) === 'canceled'" class="stage-status canceled-status">
              已取消
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-stage-timeline {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.timeline-container {
  display: flex;
  flex-direction: column;
}

.timeline-track {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.timeline-line {
  position: absolute;
  top: 12px;
  left: 50%;
  width: 100%;
  height: 2px;
  z-index: 0;
}

.timeline-item:last-child .timeline-line {
  display: none;
}

.stage-node {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: all 0.3s ease;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.node-icon {
  font-size: 12px;
  color: #fff;
  font-weight: 600;
}

.node-icon.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.stage-label {
  margin-top: 8px;
  text-align: center;
}

.stage-text {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
}

.stage-status {
  font-size: 11px;
  display: block;
  margin-top: 2px;
}

.active-status {
  color: #1890ff;
}

.failed-status {
  color: #ff4d4f;
}

.canceled-status {
  color: #999;
}

/* 状态样式 */
.timeline-item.completed .stage-node {
  background-color: #52c41a;
}

.timeline-item.active .stage-node {
  background-color: #1890ff;
}

.timeline-item.failed .stage-node {
  background-color: #ff4d4f;
}

.timeline-item.canceled .stage-node {
  background-color: #d9d9d9;
}

.timeline-item.pending .stage-node {
  background-color: #d9d9d9;
}
</style>