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

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const generating = ref(false)

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

// 是否是应用的所有者（保留 String 强转，应对后端的 Number 精度问题）
const isOwner = computed(() => {
  if (!app.value || !loginUserStore.loginUser.id) return false
  return String(app.value.userId) === String(loginUserStore.loginUser.id)
})

// 是否可以编辑（非只读模式且是所有者）
const canEdit = computed(() => !isViewOnly.value && isOwner.value)

// 可视化编辑器
const {
  isEditMode,
  selectedElements,
  hasSelectedElements,
  toggleEditMode,
  removeElement,
  clearElements,
  getElementsDescription,
  handleAfterSend,
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
  clearElements()
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

  // 构建完整提示词（用户输入 + 选中的元素信息）
  const elementsDesc = getElementsDescription()
  const fullPrompt = inputText.value + elementsDesc

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText.value + (elementsDesc ? '\n[已附加选中元素信息]' : ''),
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

        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()
          try {
            const parsed = JSON.parse(data)
            // 保存 sessionId
            if (parsed.sessionId) {
              currentSessionId.value = parsed.sessionId
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
          <!-- 选中元素信息展示 -->
          <div v-if="hasSelectedElements" class="selected-elements-info">
            <a-alert type="info" show-icon>
              <template #message>
                <div class="selected-elements-header">
                  <span>已选中 {{ selectedElements.length }} 个元素：</span>
                  <a-button type="link" size="small" @click="clearElements">清除全部</a-button>
                </div>
              </template>
              <template #description>
                <div class="selected-elements-list">
                  <a-tag
                    v-for="el in selectedElements"
                    :key="el.id"
                    closable
                    @close="removeElement(el.id)"
                  >
                    {{ el.tagName }}{{ el.elementId ? '#' + el.elementId : ''
                    }}{{ el.className ? '.' + el.className.split(/\s+/)[0] : '' }}
                  </a-tag>
                </div>
              </template>
            </a-alert>
          </div>

          <a-tooltip :title="!canEdit ? '无法在别人的作品下对话哦~' : ''" placement="top">
            <div style="width: 100%">
              <a-textarea
                v-model:value="inputText"
                :placeholder="
                  isEditMode
                    ? '编辑模式：点击预览区域选择要修改的元素'
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
              <a-button
                v-if="showPreview"
                :type="isEditMode ? 'primary' : 'default'"
                size="small"
                :disabled="!canEdit"
                @click="toggleEditMode"
              >
                {{ isEditMode ? '📝 退出编辑' : '✏️ 可视化编辑' }}
              </a-button>
              <a-button size="small" :disabled="!canEdit">📎 上传</a-button>
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
        <div class="preview-header">
          <span class="preview-title">预览效果</span>
          <a-button size="small" type="link" @click="showPreview = false">关闭预览</a-button>
        </div>
        <div class="preview-container">
          <iframe
            ref="previewIframeRef"
            :src="previewUrl"
            class="preview-frame"
            :class="{ 'edit-mode': isEditMode }"
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

/* 选中元素信息展示样式 */
.selected-elements-info {
  margin-bottom: 12px;
}

.selected-elements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-elements-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
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
