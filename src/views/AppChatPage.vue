<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { getAppVoById, deployApp, deleteApp } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

// 保持对路由参数的响应式追踪，避免手动赋值导致失去响应
const appId = computed(() => route.params.id as string)
const isViewOnly = computed(() => route.query.view === '1')
const app = ref<API.AppVO>()

// 定义消息列表的 DOM 引用，替代原生的 querySelector
const messageListRef = ref<HTMLElement | null>(null)

// 对话消息
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: Array<{ name: string; path: string }>
  createTime: string
}

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const generating = ref(false)

// 预览相关
const showPreview = ref(false)
const previewUrl = ref('')

// 是否是应用的所有者
const isOwner = computed(() => {
  if (!app.value || !loginUserStore.loginUser.id) return false
  return String(app.value.userId) === String(loginUserStore.loginUser.id)
})

// 是否可以编辑（非只读模式且是所有者）
const canEdit = computed(() => !isViewOnly.value && isOwner.value)

// 获取应用信息使用的定时器引用
let initPromptTimeoutId: ReturnType<typeof setTimeout> | null = null

// 重置组件状态
const resetState = () => {
  // 清除自动发送初始消息的定时器
  if (initPromptTimeoutId) {
    clearTimeout(initPromptTimeoutId)
    initPromptTimeoutId = null
  }
  messages.value = []
  app.value = undefined
  inputText.value = ''
  sending.value = false
  generating.value = false
  showPreview.value = false
  previewUrl.value = ''
}

// 监听路由参数变化，处理从不同应用间导航
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      resetState()
      fetchAppInfo()
    }
  },
)

// 格式化完整时间
const formatDateTime = (time?: string) => {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return time
  }
}

// 获取应用信息
const fetchAppInfo = async () => {
  // 清除之前的定时器，防止竞态条件
  if (initPromptTimeoutId) {
    clearTimeout(initPromptTimeoutId)
    initPromptTimeoutId = null
  }

  if (!appId.value) return
  try {
    // 恢复使用 as unknown as number，保留字符串传值，防止雪花算法 ID 精度丢失！
    const res = await getAppVoById({ id: appId.value as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      app.value = res.data.data
      // 只有在非查看模式且是所有者时，才自动发送初始消息
      initPromptTimeoutId = setTimeout(() => {
        initPromptTimeoutId = null
        if (app.value?.initPrompt && !isViewOnly.value && isOwner.value) {
          inputText.value = app.value.initPrompt
          sendMessage()
        }
      }, 100)
    } else {
      message.error('获取应用信息失败')
    }
  } catch {
    message.error('获取应用信息失败')
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputText.value.trim() || sending.value || !canEdit.value) return

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText.value,
    createTime: new Date().toLocaleTimeString(),
  }
  messages.value.push(userMsg)
  const currentInput = inputText.value
  inputText.value = ''
  sending.value = true
  generating.value = true

  // 创建 AI 消息占位
  const aiMessageId = (Date.now() + 1).toString()
  messages.value.push({
    id: aiMessageId,
    role: 'assistant',
    content: '',
    createTime: new Date().toLocaleTimeString(),
  })

  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}/app/chat/gen/code?appId=${encodeURIComponent(appId.value)}&message=${encodeURIComponent(currentInput)}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const decoder = new TextDecoder()
    let buffer = ''
    let contentBuffer = '' // 累积的内容缓冲区

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()
          try {
            const parsed = JSON.parse(data)
            if (parsed.d) {
              contentBuffer += parsed.d
              // 通过索引直接更新数组元素，触发 Vue 响应式更新
              const msgIndex = messages.value.findIndex((m) => m.id === aiMessageId)
              const targetMsg = msgIndex !== -1 ? messages.value[msgIndex] : undefined
              if (targetMsg) {
                targetMsg.content = contentBuffer
              }
              // 非阻塞滚动，不等待 DOM 更新完成
              requestAnimationFrame(() => {
                if (messageListRef.value) {
                  messageListRef.value.scrollTop = messageListRef.value.scrollHeight
                }
              })
            }
          } catch {
            /* 忽略心跳或非JSON */
          }
        } else if (trimmedLine.startsWith('event:done')) {
          // 完成事件处理
        }
      }
    }

    // 生成结束后更新预览
    showPreview.value = true
    previewUrl.value = `${import.meta.env.VITE_PREVIEW_DOMAIN}/${app.value?.codeGenType || 'HTML'}_${appId.value}/`
  } catch (error) {
    console.error('生成失败:', error)
    message.error('生成失败')
  } finally {
    sending.value = false
    generating.value = false
  }
}

// 部署成功弹窗
const showDeployModal = ref(false)
const deployUrl = ref('')

// 部署应用
const handleDeploy = async () => {
  try {
    // 防精度丢失修复
    const res = await deployApp({ appId: appId.value as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      deployUrl.value = res.data.data
      showDeployModal.value = true
    } else {
      message.error('部署失败')
    }
  } catch {
    message.error('部署失败')
  }
}

// 复制 URL
const copyDeployUrl = () => {
  navigator.clipboard.writeText(deployUrl.value)
  message.success('已复制')
}

// 访问部署网站
const visitDeployUrl = () => {
  window.open(deployUrl.value, '_blank')
}

// 应用详情弹窗
const showAppInfo = ref(false)

// 删除应用
const handleDeleteApp = () => {
  Modal.confirm({
    title: '确定要删除此应用吗？',
    content: '删除后无法恢复',
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        // 防精度丢失修复
        const res = await deleteApp({ id: appId.value as unknown as number })
        if (res.data.code === 0) {
          message.success('删除成功')
          router.push('/')
        } else {
          message.error('删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

// 编辑应用
const handleEditApp = () => {
  router.push(`/app/edit/${appId.value}`)
  showAppInfo.value = false
}

onMounted(() => {
  fetchAppInfo()
})
</script>

<template>
  <div class="app-chat-page">
    <div class="chat-header">
      <div class="header-left">
        <a-space>
          <a-avatar :src="app?.cover" size="large" />
          <span class="app-name">{{ app?.appName ?? '加载中...' }}</span>
        </a-space>
      </div>
      <div class="header-right">
        <a-space>
          <a-button @click="showAppInfo = true">ℹ️ 应用详情</a-button>
          <a-button type="primary" @click="handleDeploy">
            <template #icon>🚀</template>部署
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="chat-content">
      <div class="chat-section" :style="{ width: showPreview ? '40%' : '100%' }">
        <div class="message-list" ref="messageListRef">
          <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
            <div class="message-avatar">
              <a-avatar v-if="msg.role === 'user'" style="background-color: #1890ff">👤</a-avatar>
              <a-avatar v-else style="background-color: #52c41a">🤖</a-avatar>
            </div>
            <div class="message-content">
              <div class="message-text">
                <MarkdownRenderer v-if="msg.role === 'assistant'" :content="msg.content" />
                <template v-else>{{ msg.content }}</template>
              </div>
              <div v-if="msg.files && msg.files.length > 0" class="message-files">
                <div v-for="file in msg.files" :key="file.path" class="file-item">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ file.name }}</span>
                </div>
              </div>
              <div class="message-time">{{ msg.createTime }}</div>
            </div>
          </div>
        </div>

        <div class="input-section">
          <a-tooltip :title="!canEdit ? '无法在别人的作品下对话哦~' : ''" placement="top">
            <div style="width: 100%">
              <a-textarea
                v-model:value="inputText"
                placeholder="请描述你想生成的网站，越详细效果越好哦"
                :auto-size="{ minRows: 3, maxRows: 6 }"
                :disabled="!canEdit"
                @press-enter.prevent="sendMessage"
              />
            </div>
          </a-tooltip>
          <div class="input-actions">
            <div class="left-actions">
              <a-button size="small" :disabled="!canEdit">📎 上传</a-button>
            </div>
            <a-button
              type="primary"
              shape="circle"
              @click="sendMessage"
              :loading="sending"
              :disabled="!canEdit"
              >↑</a-button
            >
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="preview-section">
        <div class="preview-header">
          <span class="preview-title">预览效果</span>
          <a-button size="small" type="link" @click="showPreview = false">关闭预览</a-button>
        </div>
        <div class="preview-container">
          <iframe :src="previewUrl" class="preview-frame"></iframe>
        </div>
      </div>
    </div>

    <a-modal v-model:open="showAppInfo" title="应用详情" :footer="null" width="450px">
      <div class="app-info-modal">
        <div class="info-item">
          <span class="info-label">创建者：</span>
          <div class="creator-info">
            <a-avatar :src="app?.user?.userAvatar" size="small" />
            <span>{{ app?.user?.userName ?? '未知' }}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间：</span>
          <span class="info-value">{{ formatDateTime(app?.createTime) }}</span>
        </div>
        <div v-if="canEdit" class="action-buttons">
          <a-button type="primary" @click="handleEditApp">✏️ 修改</a-button>
          <a-button danger @click="handleDeleteApp">🗑️ 删除</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="showDeployModal" :footer="null" width="480px" class="deploy-modal">
      <div class="deploy-success-content">
        <div class="success-icon">
          <div class="icon-circle">
            <span class="checkmark">✓</span>
          </div>
        </div>
        <h3 class="deploy-title">网站部署成功！</h3>
        <p class="deploy-subtitle">你的网站已经成功部署，可以通过以下链接访问：</p>
        <div class="url-input-wrapper">
          <a-input :value="deployUrl" readonly>
            <template #addonAfter>
              <a-tooltip title="复制链接">
                <a-button type="link" @click="copyDeployUrl">
                  <template #icon>📋</template>
                </a-button>
              </a-tooltip>
            </template>
          </a-input>
        </div>
        <div class="modal-actions">
          <a-button type="primary" @click="visitDeployUrl">访问网站</a-button>
          <a-button @click="showDeployModal = false">关 闭</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.app-chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}
.chat-header {
  height: 64px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-right {
  display: flex;
  align-items: center;
}
.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.chat-section {
  display: flex;
  flex-direction: column;
  padding: 16px;
  transition: width 0.3s ease;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
  scroll-behavior: smooth;
} /* 修复点：补充了这里缺失的闭合大括号 */

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.message-item.user {
  flex-direction: row-reverse;
}
.message-content {
  max-width: 80%;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.message-item.user .message-content {
  background: #1890ff;
  color: #fff;
}
.input-section {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #d9d9d9;
}
.input-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.left-actions {
  display: flex;
  gap: 8px;
}
.preview-section {
  width: 60%;
  background: #fff;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

/* 预览区头部样式 */
.preview-header {
  height: 48px;
  padding: 0 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.preview-title {
  font-weight: 600;
  color: #333;
}

.preview-container {
  flex: 1;
}
.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

/* 弹窗所需的样式 */
.app-info-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 0;
}
.info-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}
.info-label {
  color: #888;
  width: 80px;
  flex-shrink: 0;
}
.info-value {
  color: #333;
}
.creator-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 部署成功弹窗样式 */
.deploy-success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.success-icon {
  margin-bottom: 24px;
}

.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #52c41a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkmark {
  font-size: 32px;
  color: #fff;
  font-weight: bold;
}

.deploy-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.deploy-subtitle {
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
  text-align: center;
}

.url-input-wrapper {
  width: 100%;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
