<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, deployApp, chatToGenCode } from '@/api/appController'

const route = useRoute()

const appId = route.params.id as string

// 应用信息
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

// 预览相关
const showPreview = ref(false)
const previewUrl = ref('')

// 获取应用信息
const fetchAppInfo = async () => {
  try {
    const res = await getAppVoById({ id: appId as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      app.value = res.data.data
    } else {
      message.error('获取应用信息失败')
    }
  } catch {
    message.error('获取应用信息失败')
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputText.value.trim()) return

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText.value,
    createTime: new Date().toISOString(),
  }
  messages.value.push(userMsg)
  inputText.value = ''
  sending.value = true
  generating.value = true

  // 创建 AI 消息占位
  const aiMessageId = (Date.now() + 1).toString()
  messages.value.push({
    id: aiMessageId,
    role: 'assistant',
    content: '',
    createTime: new Date().toISOString(),
  })

  try {
    // 使用 EventSource 处理 SSE 流
    const url = `http://localhost:8123/api/app/chat/gen/code?appId=${encodeURIComponent(appId)}&message=${encodeURIComponent(userMsg.content)}`
    const eventSource = new EventSource(url)
    
    const aiMsg = messages.value.find((m) => m.id === aiMessageId)
    
    eventSource.onmessage = (event) => {
      try {
        // 解析后端返回的 JSON 数据 { "d": "内容片段" }
        const data = JSON.parse(event.data)
        if (data.d && aiMsg) {
          // 追加内容到 AI 消息
          aiMsg.content += data.d
        }
      } catch (e) {
        console.error('解析 SSE 数据失败:', e)
      }
    }
    
    eventSource.onerror = () => {
      eventSource.close()
      sending.value = false
      generating.value = false
      message.error('生成失败，连接中断')
    }
    
    eventSource.addEventListener('done', () => {
      eventSource.close()
      sending.value = false
      generating.value = false
      // 生成完成后显示预览
      showPreview.value = true
      previewUrl.value = `http://localhost:8123/api/static/vue_${appId}/`
    })
  } catch {
    message.error('生成失败')
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
      // 打开部署的 URL
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
  // 自动发送初始提示词
  if (app.value?.initPrompt) {
    inputText.value = app.value.initPrompt
    sendMessage()
  }
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
      <a-button type="primary" @click="handleDeploy">
        <template #icon>🚀</template>
        部署
      </a-button>
    </div>

    <div class="chat-content">
      <div class="chat-section">
        <div class="message-list">
          <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
            <div class="message-avatar">
              <a-avatar v-if="msg.role === 'user'" style="background-color: #1890ff">
                <template #icon>👤</template>
              </a-avatar>
              <a-avatar v-else style="background-color: #52c41a">
                <template #icon>🤖</template>
              </a-avatar>
            </div>
            <div class="message-content">
              <div class="message-text">{{ msg.content }}</div>
              <div v-if="msg.files" class="message-files">
                <div v-for="file in msg.files" :key="file.path" class="file-item">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-path">{{ file.path }}</span>
                </div>
              </div>
              <div class="message-time">{{ msg.createTime }}</div>
            </div>
          </div>
        </div>

        <div class="input-section">
          <a-textarea
            v-model:value="inputText"
            placeholder="描述越详细，页面越具体，可以一步一步完善生成效果"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            @press-enter="sendMessage"
          />
          <div class="input-actions">
            <div class="left-actions">
              <a-button size="small">
                <template #icon>📎</template>
                上传
              </a-button>
              <a-button size="small">
                <template #icon>✏️</template>
                编辑
              </a-button>
              <a-button size="small">
                <template #icon>✨</template>
                优化
              </a-button>
            </div>
            <a-button type="primary" shape="circle" @click="sendMessage" :loading="sending">
              <template #icon>↑</template>
            </a-button>
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="preview-section">
        <div class="preview-header">
          <span class="preview-title">预览效果</span>
          <a-button size="small" @click="handleDeploy">
            <template #icon>🚀</template>
            部署
          </a-button>
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

.header-left {
  display: flex;
  align-items: center;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-section {
  width: 50%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
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

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 80%;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.message-item.user .message-content {
  background: #1890ff;
  color: #fff;
}

.message-text {
  line-height: 1.6;
  margin-bottom: 12px;
}

.message-files {
  margin-top: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.message-item.user .file-item {
  background: rgba(255, 255, 255, 0.2);
}

.file-icon {
  font-size: 16px;
}

.file-name {
  font-weight: 500;
  flex: 1;
}

.file-path {
  color: #999;
  font-size: 12px;
}

.message-item.user .file-path {
  color: rgba(255, 255, 255, 0.8);
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.message-item.user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.input-section {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.input-section textarea {
  border: none;
  box-shadow: none !important;
  resize: none;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 14px;
}

.preview-container {
  flex: 1;
  overflow: hidden;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
