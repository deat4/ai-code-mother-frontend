<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, deployApp } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'

const route = useRoute()
const loginUserStore = useLoginUserStore()
const appId = route.params.id as string

// 是否为只读模式（从精选页面点击进入）
const isViewOnly = computed(() => route.query.view === '1')
const app = ref<API.AppVO>()

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

// 是否是应用的所有者
const isOwner = computed(() => {
  if (!app.value || !loginUserStore.loginUser.id) return false
  return String(app.value.userId) === String(loginUserStore.loginUser.id)
})

const canEdit = computed(() => !isViewOnly.value && isOwner.value)

// 预览相关
const showPreview = ref(false)
const previewUrl = ref('')

// 获取应用信息
const fetchAppInfo = async () => {
  try {
    const res = await getAppVoById({ id: appId as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      app.value = res.data.data
      // 只有在非查看模式且是所有者时，才自动发送初始消息
      // 添加延迟确保用户信息已加载
      setTimeout(() => {
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
    const url = `http://localhost:8123/api/app/chat/gen/code?appId=${encodeURIComponent(appId)}&message=${encodeURIComponent(currentInput)}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const decoder = new TextDecoder()
    const aiMsg = messages.value.find((m) => m.id === aiMessageId)
    let buffer = ''

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
            if (parsed.d && aiMsg) {
              aiMsg.content += parsed.d
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
    previewUrl.value = `http://localhost:8123/api/preview/${app.value?.codeGenType || 'HTML'}_${appId}/`
  } catch (error) {
    console.error('生成失败:', error)
    message.error('生成失败')
  } finally {
    sending.value = false
    generating.value = false
  }
}

// 部署应用
const handleDeploy = async () => {
  try {
    const res = await deployApp({ appId: appId as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      message.success('部署成功')
      window.open(res.data.data, '_blank')
    } else {
      message.error('部署失败')
    }
  } catch {
    message.error('部署失败')
  }
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
      <a-button type="primary" @click="handleDeploy"> <template #icon>🚀</template>部署 </a-button>
    </div>

    <div class="chat-content">
      <div class="chat-section" :style="{ width: showPreview ? '50%' : '100%' }">
        <div class="message-list">
          <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
            <div class="message-avatar">
              <a-avatar v-if="msg.role === 'user'" style="background-color: #1890ff">👤</a-avatar>
              <a-avatar v-else style="background-color: #52c41a">🤖</a-avatar>
            </div>
            <div class="message-content">
              <div class="message-text">{{ msg.content }}</div>
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
                placeholder="描述生成需求..."
                :auto-size="{ minRows: 3, maxRows: 6 }"
                :disabled="!canEdit"
                @press-enter.prevent="sendMessage"
              />
            </div>
          </a-tooltip>
          <div class="input-actions">
            <div class="left-actions">
              <a-button size="small" :disabled="!canEdit">📎 上传</a-button>
              <a-button size="small" :disabled="!canEdit">✨ 优化</a-button>
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
          <iframe :src="previewUrl" class="preview-frame" />
        </div>
      </div>
    </div>
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
.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.chat-section {
  display: flex;
  flex-direction: column;
  padding: 24px;
  transition: width 0.3s ease;
}
.message-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
}
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
  width: 50%;
  background: #fff;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
}
.preview-container {
  flex: 1;
}
.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}
/* 修复点 2：删除了末尾多余且损坏的 CSS 代码 */
</style>
