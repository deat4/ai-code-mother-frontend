<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ValidationResult, ValidationIssue, BuildResult } from '@/types/task'

const props = defineProps<{
  validationResult?: ValidationResult
  issueCount?: number
  buildResult?: BuildResult
}>()

// 展开状态
const isExpanded = ref(false)
const showBuildLog = ref(false)

// 是否显示面板
const showPanel = computed(() => {
  return (
    props.validationResult !== undefined ||
    props.issueCount !== undefined ||
    props.buildResult !== undefined
  )
})

// 是否通过
const passed = computed(() => {
  return props.validationResult?.passed ?? null
})

// 摘要
const summary = computed(() => {
  return props.validationResult?.summary || ''
})

// 问题列表
const issues = computed(() => {
  return props.validationResult?.issues || []
})

// 问题数量
const displayIssueCount = computed(() => {
  return props.issueCount ?? issues.value.length ?? 0
})

// 关键错误
const keyErrors = computed(() => {
  return props.buildResult?.keyErrors || props.validationResult?.buildResult?.keyErrors || []
})

// 显示前 3 条关键错误
const displayedKeyErrors = computed(() => {
  return keyErrors.value.slice(0, 3)
})

// 是否有更多关键错误
const hasMoreKeyErrors = computed(() => {
  return keyErrors.value.length > 3
})

// 构建结果
const buildResultData = computed(() => {
  return props.buildResult || props.validationResult?.buildResult
})

// 安装是否成功
const installSuccess = computed(() => {
  return buildResultData.value?.installSuccess
})

// 构建是否成功
const buildSuccess = computed(() => {
  return buildResultData.value?.buildSuccess
})

// 问题级别颜色
const getSeverityColor = (severity?: string) => {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'default'
}

// 切换展开
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 切换构建日志
const toggleBuildLog = () => {
  showBuildLog.value = !showBuildLog.value
}
</script>

<template>
  <div v-if="showPanel" class="validation-result-panel">
    <!-- 标题行 -->
    <div class="panel-header" @click="toggleExpand">
      <div class="header-left">
        <a-tag :color="passed === true ? 'success' : passed === false ? 'error' : 'default'" size="small">
          {{ passed === true ? '校验通过' : passed === false ? '校验未通过' : '校验结果' }}
        </a-tag>
        <span class="summary-text">{{ summary }}</span>
        <span v-if="displayIssueCount > 0" class="issue-count">
          {{ displayIssueCount }} 个问题
        </span>
      </div>
      <div class="header-right">
        <a-button type="link" size="small">
          {{ isExpanded ? '收起' : '展开详情' }}
        </a-button>
      </div>
    </div>

    <!-- 展开内容 -->
    <div v-if="isExpanded" class="panel-body">
      <!-- 关键错误 -->
      <div v-if="keyErrors.length > 0" class="key-errors-section">
        <div class="section-title">关键错误</div>
        <div class="key-errors-list">
          <div v-for="(error, index) in displayedKeyErrors" :key="index" class="key-error-item">
            <a-tag color="error" size="small">错误</a-tag>
            <span class="error-text">{{ error }}</span>
          </div>
          <div v-if="hasMoreKeyErrors" class="more-errors">
            还有 {{ keyErrors.length - 3 }} 条错误...
          </div>
        </div>
      </div>

      <!-- 构建状态 -->
      <div v-if="buildResultData" class="build-status-section">
        <div class="section-title">构建状态</div>
        <div class="build-status-row">
          <span class="build-item">
            <a-tag :color="installSuccess === true ? 'success' : installSuccess === false ? 'error' : 'default'" size="small">
              安装依赖: {{ installSuccess === true ? '成功' : installSuccess === false ? '失败' : '未知' }}
            </a-tag>
          </span>
          <span class="build-item">
            <a-tag :color="buildSuccess === true ? 'success' : buildSuccess === false ? 'error' : 'default'" size="small">
              项目构建: {{ buildSuccess === true ? '成功' : buildSuccess === false ? '失败' : '未知' }}
            </a-tag>
          </span>
        </div>
        <div v-if="buildResultData.installDurationMs || buildResultData.buildDurationMs" class="build-duration">
          <span v-if="buildResultData.installDurationMs">
            安装耗时: {{ Math.round(buildResultData.installDurationMs / 1000) }}秒
          </span>
          <span v-if="buildResultData.buildDurationMs">
            构建耗时: {{ Math.round(buildResultData.buildDurationMs / 1000) }}秒
          </span>
        </div>
        <!-- 构建日志切换 -->
        <a-button v-if="buildResultData.installLog || buildResultData.buildLog" type="link" size="small" @click.stop="toggleBuildLog">
          {{ showBuildLog ? '隐藏日志' : '查看构建日志' }}
        </a-button>
      </div>

      <!-- 构建日志内容 -->
      <div v-if="showBuildLog && buildResultData" class="build-log-section">
        <div v-if="buildResultData.installLog" class="log-block">
          <div class="log-title">安装日志</div>
          <pre class="log-content">{{ buildResultData.installLog }}</pre>
        </div>
        <div v-if="buildResultData.buildLog" class="log-block">
          <div class="log-title">构建日志</div>
          <pre class="log-content">{{ buildResultData.buildLog }}</pre>
        </div>
      </div>

      <!-- 问题列表 -->
      <div v-if="issues.length > 0" class="issues-section">
        <div class="section-title">问题详情</div>
        <div class="issues-list">
          <div v-for="(issue, index) in issues" :key="index" class="issue-item">
            <a-tag :color="getSeverityColor(issue.severity)" size="small">
              {{ issue.severity || '问题' }}
            </a-tag>
            <span class="issue-file">{{ issue.filePath }}</span>
            <span class="issue-message">{{ issue.message }}</span>
          </div>
        </div>
      </div>

      <!-- 无问题提示 -->
      <div v-if="passed === true && issues.length === 0" class="no-issues">
        <a-result status="success" title="校验通过，没有发现问题" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.validation-result-panel {
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  margin-bottom: 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  background: #fff;
}

.panel-header:hover {
  background: #f5f5f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-text {
  font-size: 13px;
  color: #333;
}

.issue-count {
  font-size: 12px;
  color: #999;
}

.panel-body {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.key-errors-section {
  margin-bottom: 16px;
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
  padding-left: 32px;
}

.build-status-section {
  margin-bottom: 16px;
}

.build-status-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.build-duration {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.build-log-section {
  margin-top: 12px;
  background: #282c34;
  border-radius: 6px;
  padding: 12px;
}

.log-block {
  margin-bottom: 12px;
}

.log-block:last-child {
  margin-bottom: 0;
}

.log-title {
  font-size: 12px;
  color: #abb2bf;
  margin-bottom: 6px;
}

.log-content {
  font-size: 11px;
  color: #e5c07b;
  background: transparent;
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.issues-section {
  margin-top: 16px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
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

.no-issues {
  padding: 16px 0;
}
</style>