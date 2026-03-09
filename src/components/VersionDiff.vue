<template>
  <div class="version-diff">
    <!-- 统计信息 -->
    <div class="diff-stats-bar">
      <div class="stat-item">
        <span class="stat-label">新增:</span>
        <span class="stat-value addition">+{{ stats.additions || 0 }} 行</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">删除:</span>
        <span class="stat-value deletion">-{{ stats.deletions || 0 }} 行</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总行数:</span>
        <span class="stat-value">{{ stats.totalLines || 0 }} 行</span>
      </div>
    </div>

    <!-- 左右对比容器 -->
    <div class="diff-container">
      <!-- 左侧：旧版本 -->
      <div class="diff-pane">
        <div class="pane-header">
          <a-tag color="red">{{ oldVersionName }}</a-tag>
          <span class="line-count">{{ oldLineCount }} 行</span>
          <a-button size="small" @click="copyContent('old')">复制</a-button>
        </div>
        <div class="pane-content">
          <pre><code v-html="oldContentHtml"></code></pre>
        </div>
      </div>

      <!-- 右侧：新版本 -->
      <div class="diff-pane">
        <div class="pane-header">
          <a-tag color="green">{{ newVersionName }}</a-tag>
          <span class="line-count">{{ newLineCount }} 行</span>
          <a-button size="small" @click="copyContent('new')">复制</a-button>
        </div>
        <div class="pane-content">
          <pre><code v-html="newContentHtml"></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'

interface Props {
  oldVersionName: string
  newVersionName: string
  diffResult?: API.VersionDiff
}

const props = defineProps<Props>()

// 统计信息
const stats = computed(() => {
  return props.diffResult?.stats || { additions: 0, deletions: 0, changes: 0, totalLines: 0 }
})

// 行数统计
const oldLineCount = computed(() => {
  const content = props.diffResult?.oldContent || ''
  return content ? content.split('\n').length : 0
})

const newLineCount = computed(() => {
  const content = props.diffResult?.newContent || ''
  return content ? content.split('\n').length : 0
})

// 旧版本内容 HTML
const oldContentHtml = computed(() => {
  const content = props.diffResult?.oldContent || ''
  return renderContent(content)
})

// 新版本内容 HTML
const newContentHtml = computed(() => {
  const content = props.diffResult?.newContent || ''
  return renderContent(content)
})

// 渲染内容（带行号）
const renderContent = (content: string) => {
  if (!content) return ''

  const lines = content.split('\n')
  return lines
    .map((line, index) => {
      const lineNum = index + 1
      const escapedLine = escapeHtml(line)
      return `<span class="line-number">${lineNum}</span>${escapedLine}`
    })
    .join('\n')
}

// HTML 转义
const escapeHtml = (html: string) => {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

// 复制内容
const copyContent = async (type: 'old' | 'new') => {
  const content = type === 'old' ? props.diffResult?.oldContent : props.diffResult?.newContent

  try {
    await navigator.clipboard.writeText(content || '')
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}
</script>

<style scoped>
.version-diff {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 统计信息栏 */
.diff-stats-bar {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #586069;
  font-size: 13px;
}

.stat-value {
  font-weight: 600;
  font-size: 13px;
}

.stat-value.addition {
  color: #28a745;
}

.stat-value.deletion {
  color: #cb2431;
}

/* 左右对比容器 */
.diff-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.diff-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e1e4e8;
}

.diff-pane:last-child {
  border-right: none;
}

.pane-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fafbfc;
  border-bottom: 1px solid #e1e4e8;
}

.line-count {
  font-size: 12px;
  color: #586069;
}

.pane-content {
  flex: 1;
  overflow: auto;
  background: #fff;
}

.pane-content pre {
  margin: 0;
  padding: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.pane-content code {
  display: block;
}

/* 行号 */
:deep(.line-number) {
  display: inline-block;
  min-width: 40px;
  margin-right: 16px;
  color: #6a737d;
  text-align: right;
  user-select: none;
  opacity: 0.7;
}

/* 滚动条样式 */
.pane-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.pane-content::-webkit-scrollbar-track {
  background: #f6f8fa;
}

.pane-content::-webkit-scrollbar-thumb {
  background: #d1d5da;
  border-radius: 4px;
}

.pane-content::-webkit-scrollbar-thumb:hover {
  background: #959da5;
}
</style>
