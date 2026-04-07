<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getAppVoById,
  deleteApp,
  stopGeneration,
  deployApp,
  downloadApp,
} from '@/api/appController'
import { listAppChatHistory, saveUserMessage, saveAiMessage } from '@/api/chatHistoryController'
import { diffVersions, createVersion } from '@/api/appVersionController'

import { useLoginUserStore } from '@/stores/loginUser'
import { useVisualEditor } from '@/composables/useVisualEditor'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import VersionList from '@/components/VersionList.vue'
import VersionDiff from '@/components/VersionDiff.vue'
import hljs from 'highlight.js'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

// 恢复 appId 的响应式，防止路由参数变化时失效和 undefined 报错
const appId = computed(() => route.params.id as string)

const isViewOnly = computed(() => route.query.view === '1')
const app = ref<API.AppVO>()

// 定义消息列表的 DOM 引用，替代原生的 querySelector
const messageListRef = ref<HTMLElement | null>(null)

// 预览 iframe 引用（用于可视化编辑）
const previewIframeRef = ref<HTMLIFrameElement | null>(null)

// 补全刚才被意外截断的 ChatMessage 接口定义
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: Array<{ name: string; path: string }>
  createTime: string
}

// 代码文件接口（用于 Tab 展示）
interface CodeFile {
  fileName: string
  language: string
  content: string
}

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const generating = ref(false)

// 代码文件列表（Tab 展示）
const codeFiles = ref<CodeFile[]>([])
const activeCodeTab = ref<string>('')

// 对话历史分页相关
const hasMoreHistory = ref(true)
const loadingHistory = ref(false)
const oldestMessageTime = ref<string | null>(null)
const pageSize = 10
const totalHistoryCount = ref(0)

// AI 生成相关
const currentSessionId = ref<string | null>(null) // 当前生成会话 ID

// 预览相关
const showPreview = ref(false)
const previewUrl = ref('')

// 直接编辑应用状态
const applyingEdit = ref(false)

// 是否是应用的所有者（保留 String 强转，应对后端的 Number 精度问题）
const isOwner = computed(() => {
  if (!app.value || !loginUserStore.loginUser.id) return false
  return String(app.value.userId) === String(loginUserStore.loginUser.id)
})

// 是否可以编辑（非只读模式且是所有者）
const canEdit = computed(() => !isViewOnly.value && isOwner.value)

// 可视化编辑器（单选模式）
const {
  isEditMode,
  isDirectEdit,
  selectedElement,
  hasSelectedElement,
  editedElement,
  hasEditedElement,
  exitEditMode,
  toggleEditMode,
  clearSelectedElement,
  clearEditedElement,
  getElementDescription,
  getEditDescription,
  handleAfterSend,
  onIframeLoad,
} = useVisualEditor({
  iframeRef: previewIframeRef,
  previewUrl,
  enabled: canEdit,
})

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
  // 重置对话历史分页状态
  hasMoreHistory.value = true
  loadingHistory.value = false
  oldestMessageTime.value = null
  totalHistoryCount.value = 0
  currentSessionId.value = null
  // 重置可视化编辑器状态
  clearSelectedElement()
  clearEditedElement()
  // 重置代码文件状态
  codeFiles.value = []
  activeCodeTab.value = ''
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

// 代码高亮
const highlightedCode = (file: CodeFile) => {
  const language = hljs.getLanguage(file.language) ? file.language : 'plaintext'
  return hljs.highlight(file.content, { language }).value
}

// 复制代码
const copyCode = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}

// 直接应用编辑修改（不追加描述，直接发送给 AI）
const applyEditDirectly = async () => {
  if (!editedElement.value) return

  applyingEdit.value = true
  try {
    // 构建提示词
    const editDesc = getEditDescription()
    const fullPrompt = `请根据以下修改更新代码：${editDesc}`

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `直接应用修改：${editedElement.value.elementInfo.tagName} 元素`,
      createTime: new Date().toLocaleTimeString(),
    }
    messages.value.push(userMsg)

    // 清理编辑状态
    clearEditedElement()
    exitEditMode()

    sending.value = true
    generating.value = true

    // 保存用户消息
    saveUserMessage({
      appId: appId.value as any,
      message: fullPrompt,
    }).catch((err) => console.error('保存用户消息失败:', err))

    const aiMessageId = (Date.now() + 1).toString()
    messages.value.push({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      createTime: new Date().toLocaleTimeString(),
    })

    // 发送给 AI
    const url = `${import.meta.env.VITE_API_BASE_URL}/app/chat/gen/code?appId=${encodeURIComponent(appId.value)}&message=${encodeURIComponent(fullPrompt)}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const decoder = new TextDecoder()
    let buffer = ''
    let contentBuffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('event:session')) continue
        if (trimmedLine.startsWith('event:tool_call')) continue

        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()
          try {
            const parsed = JSON.parse(data)
            if (parsed.sessionId) {
              currentSessionId.value = parsed.sessionId
              continue
            }
            if (parsed.type === 'tool_call') {
              codeFiles.value.push({
                fileName: parsed.fileName,
                language: parsed.language,
                content: parsed.content,
              })
              if (!activeCodeTab.value) {
                activeCodeTab.value = parsed.fileName
              }
              continue
            }
            if (parsed.d) {
              contentBuffer += parsed.d
              const msgIndex = messages.value.findIndex((m) => m.id === aiMessageId)
              const targetMsg = msgIndex !== -1 ? messages.value[msgIndex] : undefined
              if (targetMsg) {
                targetMsg.content = contentBuffer
              }
              requestAnimationFrame(() => {
                if (messageListRef.value) {
                  messageListRef.value.scrollTop = messageListRef.value.scrollHeight
                }
              })
            }
          } catch {
            /* 忽略 */
          }
        } else if (trimmedLine.startsWith('event:done')) {
          currentSessionId.value = null
          if (contentBuffer) {
            saveAiMessage({
              appId: appId.value as any,
              message: contentBuffer,
            }).catch((err) => console.error('保存 AI 消息失败:', err))

            createVersion({
              appId: appId.value as any,
              summary: '直接应用编辑修改',
              content: contentBuffer,
            }).catch((err) => console.error('创建版本失败:', err))

            fetchAppInfo().catch((err) => console.error('刷新应用信息失败:', err))
          }
        }
      }
    }
    showPreview.value = true
  } catch (error) {
    console.error('应用修改失败:', error)
    message.error('应用修改失败')
  } finally {
    sending.value = false
    generating.value = false
    currentSessionId.value = null
    applyingEdit.value = false
  }
}

// 聚焦输入框以追加描述
const focusInputForEdit = () => {
  // 聚焦输入框
  const textarea = document.querySelector('.input-section textarea') as HTMLTextAreaElement
  if (textarea) {
    textarea.focus()
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
    // 替换 as unknown as number 为 as any，避免语义误导，同时骗过 TS 类型检查。建议修改 API 定义为 string。
    const res = await getAppVoById({ id: appId.value as any })
    if (res.data.code === 0 && res.data.data) {
      app.value = res.data.data

      // 加载对话历史
      await loadChatHistory()

      // 只有是自己的 app 且没有对话历史时，才自动发送初始消息
      if (isOwner.value && messages.value.length === 0 && app.value?.initPrompt) {
        initPromptTimeoutId = setTimeout(() => {
          initPromptTimeoutId = null
          inputText.value = app.value?.initPrompt || ''
          sendMessage()
        }, 100)
      }

      // 如果有至少 2 条对话记录，展示网站预览
      if (messages.value.length >= 2) {
        showPreview.value = true
        // 优先使用后端返回的 previewUrl，否则自行拼接
        previewUrl.value =
          app.value?.previewUrl ||
          `${import.meta.env.VITE_PREVIEW_DOMAIN}/${app.value?.codeGenType || 'HTML'}_${appId.value}/`
      }
    } else {
      message.error('获取应用信息失败')
    }
  } catch {
    message.error('获取应用信息失败')
  }
}

// 加载对话历史
const loadChatHistory = async (loadMore = false) => {
  if (!appId.value || loadingHistory.value) return

  loadingHistory.value = true
  try {
    const res = await listAppChatHistory({
      appId: appId.value as any,
      lastCreateTime: loadMore ? oldestMessageTime.value || undefined : undefined,
      pageSize,
    })

    if (res.data.code === 0 && res.data.data) {
      const historyList = res.data.data.records || []

      if (historyList.length > 0) {
        // 转换为 ChatMessage 格式
        const historyMessages: ChatMessage[] = historyList.map((item) => ({
          id: String(item.id), // 保留强转 String，防止雪花 ID 问题
          role: item.messageType === 'user' ? 'user' : 'assistant',
          content: item.message || '',
          createTime: item.createTime || '',
          files: item.fileList ? JSON.parse(item.fileList) : undefined,
        }))

        // 关键：假设后端返回的是倒序（最新在前），需要反转让老消息在前
        historyMessages.reverse()

        if (loadMore) {
          // 加载更多：添加到列表开头
          messages.value.unshift(...historyMessages)
        } else {
          // 首次加载：直接设置
          messages.value = historyMessages
        }

        // 关键：更新游标为当前已加载消息中最老的那条的创建时间
        oldestMessageTime.value = messages.value[0]?.createTime || null

        // 判断是否还有更多历史
        hasMoreHistory.value = historyList.length === pageSize
      } else {
        hasMoreHistory.value = false
      }
    }
  } catch (error) {
    console.error('加载对话历史失败:', error)
  } finally {
    loadingHistory.value = false
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputText.value.trim() || sending.value || !canEdit.value) return

  // 构建完整提示词（用户输入 + 选中的元素信息 + 编辑信息）
  const elementDesc = getElementDescription()
  const editDesc = getEditDescription()
  const fullPrompt = inputText.value + elementDesc + editDesc

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content:
      inputText.value +
      (elementDesc ? '\n[已附加选中元素信息]' : '') +
      (editDesc ? '\n[已附加修改内容]' : ''),
    createTime: new Date().toLocaleTimeString(),
  }
  messages.value.push(userMsg)
  const currentInput = fullPrompt
  inputText.value = ''
  sending.value = true
  generating.value = true

  // 清理选中元素并退出编辑模式
  handleAfterSend()

  // 落库用户消息（异步，不阻塞后续流程）
  saveUserMessage({
    appId: appId.value as any,
    message: currentInput,
  }).catch((err) => console.error('保存用户消息失败:', err))

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

        // 处理 session 事件 - 保存 sessionId
        if (trimmedLine.startsWith('event:session')) {
          // 下一个 data 行包含 sessionId
          continue
        }

        // 处理 tool_call 事件 - 下一个 data 行包含文件信息
        if (trimmedLine.startsWith('event:tool_call')) {
          continue
        }

        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()
          try {
            const parsed = JSON.parse(data)
            // 保存 sessionId
            if (parsed.sessionId) {
              currentSessionId.value = parsed.sessionId
              continue
            }
            // 处理 tool_call 数据
            if (parsed.type === 'tool_call') {
              codeFiles.value.push({
                fileName: parsed.fileName,
                language: parsed.language,
                content: parsed.content,
              })
              // 默认激活第一个文件
              if (!activeCodeTab.value) {
                activeCodeTab.value = parsed.fileName
              }
              continue
            }
            // 处理内容流
            if (parsed.d) {
              contentBuffer += parsed.d
              const msgIndex = messages.value.findIndex((m) => m.id === aiMessageId)
              const targetMsg = msgIndex !== -1 ? messages.value[msgIndex] : undefined
              if (targetMsg) {
                targetMsg.content = contentBuffer
              }
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
          // 生成完成，清除 sessionId
          currentSessionId.value = null

          // 落库 AI 消息
          if (contentBuffer) {
            saveAiMessage({
              appId: appId.value as any,
              message: contentBuffer,
            }).catch((err) => console.error('保存 AI 消息失败:', err))

            // 创建版本（使用用户输入前20字符作为摘要）
            const summary = currentInput.slice(0, 20) || 'AI 生成'
            createVersion({
              appId: appId.value as any,
              summary,
              content: contentBuffer,
            }).catch((err) => console.error('创建版本失败:', err))

            // 刷新应用信息（更新版本号等）
            fetchAppInfo().catch((err) => console.error('刷新应用信息失败:', err))
          }
        } // end else if (event:done)
      } // end for
    } // end while
    showPreview.value = true
  } catch (error) {
    console.error('生成失败:', error)
    message.error('生成失败')
  } finally {
    sending.value = false
    generating.value = false
    currentSessionId.value = null
  }
}

// 停止 AI 生成
const handleStopGeneration = async () => {
  if (!currentSessionId.value) return

  try {
    const res = await stopGeneration({ sessionId: currentSessionId.value })
    if (res.data.code === 0) {
      message.success('已停止生成')
    }
  } catch (error) {
    console.error('停止生成失败:', error)
  } finally {
    generating.value = false
    sending.value = false
    currentSessionId.value = null
  }
}

// 部署成功弹窗
const showDeployModal = ref(false)
const deployUrl = ref('')

// 部署应用
const handleDeploy = async () => {
  if (!app.value?.id) {
    message.error('应用信息不存在')
    return
  }

  try {
    const res = await deployApp({ appId: app.value.id })
    if (res.data.code === 0 && res.data.data) {
      // 部署成功，后端返回完整URL
      deployUrl.value = res.data.data
      showDeployModal.value = true
      // 刷新应用信息以更新 deployKey
      await fetchAppInfo()
    } else {
      message.error('部署失败：' + (res.data.message ?? '未知错误'))
    }
  } catch (error) {
    console.error('部署失败:', error)
    message.error('部署失败，请稍后重试')
  }
}

const copyDeployUrl = () => {
  navigator.clipboard.writeText(deployUrl.value)
  message.success('已复制')
}

// 访问部署网站
const visitDeployUrl = () => {
  window.open(deployUrl.value, '_blank')
}

// 打开预览
const openPreview = () => {
  showPreview.value = true
  // 优先使用后端返回的 previewUrl，否则自行拼接
  const baseUrl =
    app.value?.previewUrl ||
    `${import.meta.env.VITE_PREVIEW_DOMAIN}/${app.value?.codeGenType || 'HTML'}_${appId.value}/`
  previewUrl.value = `${baseUrl}?t=${Date.now()}`
}

// 应用详情弹窗
const showAppInfo = ref(false)

// 版本管理相关
const showVersionModal = ref(false)
const showVersionDiffModal = ref(false)
const versionListRef = ref()
const compareData = ref<{
  oldVersion: number
  newVersion: number
  diffResult?: API.VersionDiffVO
}>({
  oldVersion: 0,
  newVersion: 0,
})

// 监听版本弹窗打开，刷新版本列表数据
watch(showVersionModal, (isOpen) => {
  if (isOpen && versionListRef.value) {
    // 弹窗每次打开，强制刷新版本列表，避免数据陈旧
    versionListRef.value.loadVersions()
  }
})

const handleVersionCompare = async (
  version: API.AppVersionVO,
  targetVersion?: API.AppVersionVO,
) => {
  if (!appId.value) return

  // 动态决定新旧版本号
  let oldV = version.versionNumber ? version.versionNumber - 1 : 0
  let newV = version.versionNumber || 1

  // 如果传了 targetVersion（说明是批量对比功能）
  if (targetVersion && targetVersion.versionNumber && version.versionNumber) {
    oldV = Math.min(version.versionNumber, targetVersion.versionNumber)
    newV = Math.max(version.versionNumber, targetVersion.versionNumber)
  }

  // 防止因为 V1 版本减一变成 V0 导致后端报错
  if (oldV <= 0) oldV = 1

  try {
    const res = await diffVersions({
      appId: appId.value as any,
      oldVersion: oldV,
      newVersion: newV,
    })

    if (res.data.code === 0 && res.data.data) {
      compareData.value = {
        oldVersion: oldV,
        newVersion: newV,
        diffResult: res.data.data,
      }
      showVersionDiffModal.value = true
    } else {
      message.error(res.data.message || '获取版本对比失败')
    }
  } catch (error) {
    console.error('获取版本对比失败:', error)
    message.error('获取版本对比失败')
  }
}

// 处理版本查看
const handleVersionView = (version: API.AppVersionVO) => {
  console.log('查看版本:', version)
  // TODO: 实现版本查看功能
}

// 处理版本回退
const handleVersionRollback = async (version: API.AppVersionVO) => {
  console.log('已回退到版本:', version)
  // 1. 关闭版本弹窗
  showVersionModal.value = false
  showAppInfo.value = false
  // 2. 重新拉取应用最新信息（更新当前版本号和最新生成的预览）
  await fetchAppInfo()
  message.success(`应用已成功刷新至 V${version.versionNumber}`)
}

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
        const res = await deleteApp({ id: appId.value as any })
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

// 下载应用代码
const downloading = ref(false)
const handleDownloadApp = async () => {
  if (!app.value?.id) return
  try {
    downloading.value = true
    const res = await downloadApp(app.value.id as number)
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([res.data as any]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${app.value.appName || 'app'}_${app.value.id}.zip`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    message.success('下载成功')
  } catch (error: any) {
    console.error('下载失败:', error)
    message.error('下载失败，请稍后重试')
  } finally {
    downloading.value = false
  }
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
            <template #icon>🚀</template>
            部署
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="chat-content">
      <div class="chat-section" :style="{ width: showPreview ? '40%' : '100%' }">
        <div class="message-list" ref="messageListRef">
          <div v-if="messages.length > 0" class="load-more-section">
            <a-button
              v-if="hasMoreHistory"
              type="link"
              :loading="loadingHistory"
              @click="loadChatHistory(true)"
            >
              {{ loadingHistory ? '加载中...' : '加载更多' }}
            </a-button>
            <span v-else class="no-more-history">没有更多历史消息了</span>
          </div>

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
        <div v-if="!showPreview && messages.length >= 2" class="open-preview-section">
          <a-button type="primary" @click="openPreview">
            <template #icon>🖥️</template>
            打开预览
          </a-button>
        </div>

        <div class="input-section">
          <!-- 选中元素信息展示（单选模式） -->
          <a-alert
            v-if="hasSelectedElement"
            class="selected-element-alert"
            type="info"
            closable
            @close="clearSelectedElement"
          >
            <template #message>
              <div class="selected-element-info">
                <div class="element-header">
                  <span class="element-tag">选中元素：{{ selectedElement?.tagName }}</span>
                  <span v-if="selectedElement?.elementId" class="element-id">
                    #{{ selectedElement.elementId }}
                  </span>
                  <span v-if="selectedElement?.className" class="element-class">
                    .{{ selectedElement.className.split(' ').join('.') }}
                  </span>
                </div>
                <div class="element-details">
                  <div v-if="selectedElement?.textContent" class="element-item">
                    内容: {{ selectedElement.textContent.substring(0, 50)
                    }}{{ selectedElement.textContent.length > 50 ? '...' : '' }}
                  </div>
                  <div v-if="selectedElement?.pagePath" class="element-item">
                    页面路径: {{ selectedElement.pagePath }}
                  </div>
                  <div class="element-item">
                    选择器:
                    <code class="element-selector-code">{{ selectedElement?.selector }}</code>
                  </div>
                </div>
              </div>
            </template>
          </a-alert>

          <!-- 编辑结果信息展示 -->
          <div v-if="hasEditedElement" class="edited-element-card">
            <div class="edit-card-header">
              <span class="edit-card-title">✏️ 已修改: {{ editedElement?.elementInfo?.tagName }}</span>
              <a-button type="text" size="small" @click="clearEditedElement">✕</a-button>
            </div>
            <div class="edit-card-body">
              <div class="edit-item">
                <span class="edit-label">原内容:</span>
                <span class="edit-old">{{ editedElement?.originalContent?.substring(0, 50)
                }}{{ (editedElement?.originalContent?.length || 0) > 50 ? '...' : '' }}</span>
              </div>
              <div class="edit-item">
                <span class="edit-label">新内容:</span>
                <span class="edit-new">{{ editedElement?.editedContent?.substring(0, 50)
                }}{{ (editedElement?.editedContent?.length || 0) > 50 ? '...' : '' }}</span>
              </div>
              <div class="edit-item">
                <span class="edit-label">选择器:</span>
                <code class="edit-selector-code">{{ editedElement?.elementInfo?.selector }}</code>
              </div>
            </div>
            <div class="edit-card-actions">
              <a-button type="primary" size="small" :loading="applyingEdit" @click="applyEditDirectly">
                直接应用修改
              </a-button>
              <a-button size="small" @click="focusInputForEdit">
                追加描述发送
              </a-button>
            </div>
          </div>

          <a-tooltip :title="!canEdit ? '无法在别人的作品下对话哦~' : ''" placement="top">
            <div style="width: 100%">
              <a-textarea
                v-model:value="inputText"
                :placeholder="
                  hasEditedElement
                    ? `已修改 ${editedElement?.elementInfo?.tagName} 元素，描述您想要的进一步修改...`
                    : hasSelectedElement
                      ? `正在编辑 ${selectedElement?.tagName} 元素，描述您想要的修改...`
                      : isEditMode
                        ? '编辑模式：点击选中元素，双击直接编辑内容'
                        : '请描述你想生成的网站，越详细效果越好哦'
                "
                :auto-size="{ minRows: 3, maxRows: 6 }"
                :disabled="!canEdit"
                @press-enter.prevent="sendMessage"
              />
            </div>
          </a-tooltip>
          <div class="input-actions">
            <div class="left-actions">
              <a-button size="small" :disabled="!canEdit">📎 上传</a-button>
              <a-button
                v-if="showPreview && canEdit"
                size="small"
                :type="isEditMode ? 'primary' : 'default'"
                @click="toggleEditMode"
              >
                {{ isEditMode ? '📝 退出编辑' : '✏️ 可视化编辑' }}
              </a-button>
            </div>
            <a-button
              v-if="!generating"
              type="primary"
              shape="circle"
              @click="sendMessage"
              :loading="sending"
              :disabled="!canEdit"
              >↑</a-button
            >
            <a-button v-else type="primary" shape="circle" danger @click="handleStopGeneration"
              >■</a-button
            >
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="preview-section">
        <!-- 代码文件 Tab 栏 -->
        <div v-if="codeFiles.length > 0" class="code-tabs-section">
          <a-tabs v-model:activeKey="activeCodeTab" size="small">
            <a-tab-pane v-for="file in codeFiles" :key="file.fileName" :tab="file.fileName">
              <div class="code-content">
                <div class="code-header">
                  <span class="file-lang">{{ file.language }}</span>
                  <a-button size="small" @click="copyCode(file.content)">复制</a-button>
                </div>
                <pre><code v-html="highlightedCode(file)"></code></pre>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
        <div class="preview-header">
          <span class="preview-title">预览效果</span>
          <div class="preview-actions">
            <a-button size="small" type="link" @click="showPreview = false">关闭预览</a-button>
          </div>
        </div>
        <div class="preview-container">
          <iframe
            ref="previewIframeRef"
            :src="previewUrl"
            class="preview-frame"
            :class="{ 'edit-mode': isEditMode }"
            @load="onIframeLoad"
          ></iframe>
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
        <div class="info-item">
          <span class="info-label">当前版本：</span>
          <a-tag color="blue">v{{ app?.currentVersion || 1 }}</a-tag>
          <span class="version-count">（共 {{ app?.totalVersions || 1 }} 个版本）</span>
        </div>
        <div v-if="canEdit" class="action-buttons">
          <a-button type="primary" @click="handleEditApp">✏️ 修改</a-button>
          <a-button @click="handleDownloadApp" :loading="downloading">📦 下载代码</a-button>
          <a-button @click="showVersionModal = true">📋 版本历史</a-button>
          <a-button danger @click="handleDeleteApp">🗑️ 删除</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="showVersionModal"
      title="版本历史"
      :footer="null"
      width="900px"
      class="version-modal"
    >
      <div class="version-modal-content">
        <VersionList
          ref="versionListRef"
          :appId="appId as any"
          :current-version="app?.currentVersion || 1"
          @compare="handleVersionCompare"
          @view="handleVersionView"
          @rollback="handleVersionRollback"
        />
      </div>
    </a-modal>

    <a-modal
      v-model:open="showVersionDiffModal"
      title="版本对比"
      :footer="null"
      width="1200px"
      class="version-diff-modal"
    >
      <div class="version-diff-modal-content">
        <VersionDiff
          :old-version-name="`v${compareData.oldVersion}`"
          :new-version-name="`v${compareData.newVersion}`"
          :diff-result="compareData.diffResult"
        />
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
/* Import highlight.js theme for code tabs */
@import 'highlight.js/styles/github-dark.css';

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
  width: 60%;
  background: #fff;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

/* 代码文件 Tab 栏 */
.code-tabs-section {
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  max-height: 300px;
}

.code-tabs-section :deep(.ant-tabs-nav) {
  margin-bottom: 0;
  padding: 0 8px;
}

.code-tabs-section :deep(.ant-tabs-content) {
  height: 200px;
}

.code-content {
  height: 200px;
  overflow: auto;
  background: #161b22;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  background: #21262d;
  border-bottom: 1px solid #30363d;
}

.file-lang {
  font-size: 12px;
  color: #8b949e;
  font-family: 'Monaco', 'Menlo', monospace;
}

.code-content pre {
  margin: 0;
  padding: 12px;
  font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.code-content code {
  background: transparent;
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

/* 编辑模式下的预览框架 */
.preview-frame.edit-mode {
  cursor: crosshair;
}

/* 预览区域头部操作按钮 */
.preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 选中元素信息展示样式（单选模式） */
.selected-element-alert {
  margin-bottom: 12px;
}

.selected-element-info {
  line-height: 1.5;
}

.element-header {
  margin-bottom: 8px;
}

.element-tag {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.element-id {
  color: #52c41a;
  margin-left: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.element-class {
  color: #faad14;
  margin-left: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.element-details {
  margin-top: 8px;
  font-size: 13px;
}

.element-item {
  margin-bottom: 4px;
  color: #666;
}

.element-item:last-child {
  margin-bottom: 0;
}

.element-selector-code {
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f6f8fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #d73a49;
  border: 1px solid #e1e4e8;
}

/* 编辑结果信息展示样式 */
.edited-element-card {
  margin-bottom: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  overflow: hidden;
}

.edit-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #d9f7be;
  border-bottom: 1px solid #b7eb8f;
}

.edit-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #52c41a;
}

.edit-card-body {
  padding: 12px;
}

.edit-card-body .edit-item {
  margin-bottom: 6px;
  color: #666;
  font-size: 13px;
}

.edit-card-body .edit-item:last-child {
  margin-bottom: 0;
}

.edit-card-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
}

.edit-label {
  color: #999;
  margin-right: 8px;
}

.edit-old {
  color: #cf1322;
  text-decoration: line-through;
}

.edit-new {
  color: #52c41a;
  font-weight: 500;
}

.edit-selector-code {
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f6f8fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #d73a49;
  border: 1px solid #e1e4e8;
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

/* 加载更多历史消息样式 */
.load-more-section {
  text-align: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.no-more-history {
  color: #999;
  font-size: 12px;
}

/* 版本管理弹窗样式 */
.version-modal :deep(.ant-modal-body) {
  padding: 16px;
}

.version-modal-content {
  max-height: 600px;
  overflow-y: auto;
}

.version-diff-modal :deep(.ant-modal-body) {
  padding: 0;
}

.version-diff-modal-content {
  max-height: 700px;
  overflow-y: auto;
}

.version-count {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}

/* 打开预览按钮样式 */
.open-preview-section {
  display: flex;
  justify-content: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
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
