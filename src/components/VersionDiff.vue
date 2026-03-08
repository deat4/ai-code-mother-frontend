<template>
  <div class="version-diff">
    <div class="diff-header">
      <div class="diff-info">
        <span class="diff-label">
          <a-tag color="red">{{ oldVersionName }}</a-tag>
        </span>
        <span class="diff-stats">
          <span class="removal" v-if="stats.deletions > 0">
            <minus-outlined /> {{ stats.deletions }} removal
          </span>
        </span>
      </div>
      <div class="diff-lines">
        <span>{{ oldLineCount }} lines</span>
        <a-button size="small" @click="copyContent('old')">Copy</a-button>
      </div>
    </div>

    <div class="diff-body">
      <div class="diff-pane diff-pane-old">
        <div class="diff-content" v-html="oldContentHtml"></div>
      </div>
    </div>

    <div class="diff-header" style="margin-top: 16px">
      <div class="diff-info">
        <span class="diff-label">
          <a-tag color="green">{{ newVersionName }}</a-tag>
        </span>
        <span class="diff-stats">
          <span class="addition" v-if="stats.additions > 0">
            <plus-outlined /> {{ stats.additions }} additions
          </span>
        </span>
      </div>
      <div class="diff-lines">
        <span>{{ newLineCount }} lines</span>
        <a-button size="small" @click="copyContent('new')">Copy</a-button>
      </div>
    </div>

    <div class="diff-body">
      <div class="diff-pane diff-pane-new">
        <div class="diff-content" v-html="newContentHtml"></div>
      </div>
    </div>
  </div>
</template>

import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons-vue'

interface Props {
  oldVersionName: string
  newVersionName: string
  oldContent?: string
  newContent?: string
  diffResult?: API.VersionDiff
}

const props = withDefaults(defineProps<Props>(), {
  oldContent: '',
  newContent: '',
})

// 统计信息
const stats = computed(() => {
  const s = props.diffResult?.stats || { additions: 0, deletions: 0, changes: 0 }
  return s
})

// 行数统计
const oldLineCount = computed(() => {
  const content = props.diffResult?.oldContent || props.oldContent
  return content ? content.split('\n').length : 0
})

const newLineCount = computed(() => {
  const content = props.diffResult?.newContent || props.newContent
  return content ? content.split('\n').length : 0
})

// 显示的内容（带行号和差异高亮）
const oldContentHtml = computed(() => {
  const content = props.diffResult?.oldContent || props.oldContent
  return renderDiffContent(content, 'old')
})

const newContentHtml = computed(() => {
  const content = props.diffResult?.newContent || props.newContent
  return renderDiffContent(content, 'new')
})

// 渲染差异内容
const renderDiffContent = (content?: string, type?: 'old' | 'new') => {
  if (!content) return ''

  const lines = content.split('\n')
  const html = lines
    .map((line, index) => {
      const lineNum = index + 1
      // 如果有 diffHtml，直接使用后端返回的差异 HTML
      if (props.diffResult?.diffHtml) {
        return `<div class="diff-line">${lineNum}: ${escapeHtml(line)}</div>`
      }
      return `<div class="diff-line">${lineNum}: ${escapeHtml(line)}</div>`
    })
    .join('')

  return html
}

// HTML 转义
const escapeHtml = (html: string) => {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

// 复制内容
const copyContent = async (type: 'old' | 'new') => {
  const content =
    type === 'old'
      ? props.diffResult?.oldContent || props.oldContent
      : props.diffResult?.newContent || props.newContent

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
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
}

.diff-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diff-label {
  font-weight: 600;
}

.diff-stats {
  display: flex;
  gap: 16px;
  color: #586069;
  font-size: 12px;
}

.diff-stats .removal {
  color: #cb2431;
}

.diff-stats .addition {
  color: #28a745;
}

.diff-lines {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #586069;
}

.diff-body {
  border: 1px solid #e1e4e8;
  border-top: none;
}

.diff-pane {
  overflow-x: auto;
  background: #fff;
}

.diff-content {
  min-height: 200px;
}

.diff-line {
  display: flex;
  padding: 2px 8px;
  line-height: 1.5;
}

.diff-line::before {
  content: attr(data-line-number);
  display: inline-block;
  min-width: 50px;
  padding-right: 16px;
  text-align: right;
  color: #1b1f23;
  user-select: none;
}

/* 差异高亮 */
.diff-line-removed {
  background-color: #ffeef0;
}

.diff-line-added {
  background-color: #e6ffed;
}

/* 滚动条样式 */
.diff-content::-webkit-scrollbar {
  height: 8px;
}

.diff-content::-webkit-scrollbar-track {
  background: #f6f8fa;
}

.diff-content::-webkit-scrollbar-thumb {
  background: #d1d5da;
  border-radius: 4px;
}

.diff-content::-webkit-scrollbar-thumb:hover {
  background: #959da5;
}
</style>
