<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { addApp, listMyAppVoByPage, listGoodAppVoByPage } from '@/api/appController'

const router = useRouter()
const route = useRoute()

// 提示词输入
const promptText = ref('')
const creating = ref(false)

// 我的应用
const myApps = ref<API.AppVO[]>([])
const myAppsTotal = ref(0)
const myAppsParams = reactive({
  current: 1,
  pageSize: 20,
})

// 精选应用
const goodApps = ref<API.AppVO[]>([])
const goodAppsTotal = ref(0)
const goodAppsParams = reactive({
  current: 1,
  pageSize: 20,
  sortField: 'createTime',
  sortOrder: 'desc',
})

// 快速创建示例 - 按钮显示简短，点击填入详细描述
const quickPrompts = [
  {
    label: '个人博客',
    value:
      '个人博客：设计一个简洁优雅的个人博客网站，包含文章列表、分类标签、搜索功能，以及文章详情页的评论区。整体风格偏向现代简约，支持响应式布局。',
  },
  {
    label: '企业官网',
    value:
      '企业官网：创建一个专业的企业官网，包含首页轮播、关于我们、产品展示、新闻动态、联系方式等模块。配色采用深蓝色系，体现企业形象和专业感。',
  },
  {
    label: '电商购物',
    value:
      '电商购物：设计一个现代化的电商购物平台，包含商品列表、分类筛选、购物车、结算流程等核心功能。界面风格简洁大气，突出商品展示效果。',
  },
  {
    label: '在线教育',
    value:
      '在线教育：开发一个在线教育平台，包含课程列表、视频播放、学习进度跟踪、讨论区等功能。界面风格清新活泼，适合学习场景，支持移动端适配。',
  },
]

// 创建应用
const handleCreateApp = async () => {
  if (!promptText.value.trim()) {
    message.warning('请输入提示词')
    return
  }
  try {
    creating.value = true
    const res = await addApp({
      appName: promptText.value.slice(0, 20),
      initPrompt: promptText.value,
      codeGenType: 'HTML',
    })
    if (res.data.code === 0 && res.data.data) {
      message.success('应用创建成功')
      // 防御雪花 ID 精度丢失
      router.push(`/app/chat/${String(res.data.data)}`)
    } else {
      message.error('创建失败：' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('创建失败，请稍后重试')
  } finally {
    creating.value = false
  }
}

// 加载我的应用
const loadMyApps = async () => {
  try {
    const res = await listMyAppVoByPage(myAppsParams)
    if (res.data.code === 0 && res.data.data) {
      myApps.value = res.data.data.records ?? []
      myAppsTotal.value = Number(res.data.data.totalRow) || 0
    }
  } catch (error) {
    console.error('加载我的应用失败:', error)
  }
}

// 加载精选应用
const loadGoodApps = async () => {
  try {
    const res = await listGoodAppVoByPage(goodAppsParams)
    if (res.data.code === 0 && res.data.data) {
      goodApps.value = res.data.data.records ?? []
      goodAppsTotal.value = res.data.data.totalRow || 0
    }
  } catch (error) {
    console.error('加载精选应用失败:', error)
  }
}

// 强制入参类型为 string 防御雪花 ID 问题
const goToChat = (appId: string, viewOnly: boolean = false) => {
  const url = `/app/chat/${appId}${viewOnly ? '?view=1' : ''}`
  router.push(url)
}

const openDeployUrl = (app: API.AppVO) => {
  if (!app.deployKey) return
  const url = `${import.meta.env.VITE_DEPLOY_DOMAIN}/${app.deployKey}/`
  window.open(url, '_blank')
}

const formatTime = (time?: string) => {
  if (!time) return ''
  try {
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  } catch {
    return time
  }
}

// 应用详情弹窗
const showAppInfoModal = ref(false)
const selectedApp = ref<API.AppVO | null>(null)

// 打开应用详情弹窗
const openAppInfo = (app: API.AppVO) => {
  selectedApp.value = app
  showAppInfoModal.value = true
}

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
    })
  } catch {
    return time
  }
}

onMounted(() => {
  loadMyApps()
  loadGoodApps()
})

// 监听路由变化，返回主页时刷新应用列表
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/') {
      loadMyApps()
    }
  },
)
</script>

<template>
  <div class="home-page">
    <div class="hero-section">
      <h1 class="title">AI 应用生成平台</h1>
      <p class="subtitle">一句话轻松创建网站应用</p>
      <div class="prompt-input-wrapper">
        <a-textarea
          v-model:value="promptText"
          placeholder="帮我创建个人博客网站"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          class="prompt-input"
        />
        <div class="submit-btn-wrapper">
          <a-button
            type="primary"
            shape="circle"
            size="large"
            @click="handleCreateApp"
            :loading="creating"
          >
            <template #icon>↑</template>
          </a-button>
        </div>
      </div>

      <div class="quick-prompts">
        <a-button
          v-for="item in quickPrompts"
          :key="item.label"
          size="large"
          @click="promptText = item.value"
        >
          {{ item.label }}
        </a-button>
      </div>
    </div>

    <div class="apps-section" v-if="myApps.length > 0">
      <h2 class="section-title">我的作品</h2>
      <div class="apps-grid">
        <div v-for="app in myApps" :key="app.id" class="app-card">
          <div class="app-cover">
            <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
            <div v-else class="cover-placeholder"><span>📱</span></div>
            <div class="card-actions">
              <a-button type="primary" @click="app.id && goToChat(String(app.id))"
                >查看对话</a-button
              >
              <a-button v-if="app.deployKey" @click="openDeployUrl(app)">查看作品</a-button>
            </div>
          </div>
          <h3 class="app-name">{{ app.appName ?? '未命名应用' }}</h3>
          <p class="app-time">创建于 {{ formatTime(app.createTime) }}</p>
        </div>
      </div>
    </div>

    <div class="apps-section" v-if="goodApps.length > 0">
      <h2 class="section-title">精选案例</h2>
      <div class="apps-grid">
        <div v-for="app in goodApps" :key="app.id" class="app-card">
          <div class="app-cover">
            <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
            <div v-else class="cover-placeholder"><span>📱</span></div>
            <div class="card-actions">
              <a-space direction="vertical" style="width: 100%">
                <a-space style="width: 100%; justify-content: center">
                  <a-button type="primary" @click="app.id && goToChat(String(app.id), true)"
                    >查看详情</a-button
                  >
                  <a-button @click="openAppInfo(app)">📋 信息</a-button>
                </a-space>
                <a-button v-if="app.deployKey" block @click="openDeployUrl(app)">在线预览</a-button>
              </a-space>
            </div>
          </div>
          <div class="app-info">
            <a-avatar :src="app.user?.userAvatar" :size="40" class="app-avatar" />
            <div class="app-text">
              <h3 class="app-name">{{ app.appName ?? '未命名应用' }}</h3>
              <span class="user-nickname">{{ app.user?.userName ?? '匿名' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      v-model:open="showAppInfoModal"
      :title="selectedApp?.appName ?? '应用详情'"
      :footer="null"
      width="500px"
    >
      <div v-if="selectedApp" class="app-info-content">
        <div class="info-row">
          <span class="info-label">创建者</span>
          <div class="creator-info">
            <a-avatar :src="selectedApp.user?.userAvatar" size="small" />
            <span>{{ selectedApp.user?.userName ?? '未知' }}</span>
          </div>
        </div>
        <div class="info-row">
          <span class="info-label">创建时间</span>
          <span>{{ formatDateTime(selectedApp.createTime) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">应用描述</span>
          <div class="info-desc">
            {{ selectedApp.initPrompt || selectedApp.appDesc || '暂无描述' }}
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f8ff;
  background-image:
    linear-gradient(rgba(107, 95, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(107, 95, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  padding: 48px 24px;
}

.hero-section {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  margin-bottom: 64px;
  padding: 64px 24px;
}

.title {
  font-size: 48px;
  font-weight: 800;
  color: #6b5fff;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 18px;
  color: #999;
  margin-bottom: 32px;
}

.prompt-input-wrapper {
  max-width: 700px;
  margin: 0 auto 24px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(107, 95, 255, 0.1);
  position: relative;
}

.prompt-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
}

.submit-btn-wrapper {
  position: absolute;
  right: 24px;
  bottom: 24px;
}

.quick-prompts {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.quick-prompts :deep(.ant-btn) {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  color: #666;
  margin: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.quick-prompts :deep(.ant-btn:hover) {
  border-color: #6b5fff;
  color: #6b5fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(107, 95, 255, 0.15);
}

.apps-section {
  max-width: 1200px;
  margin: 0 auto 48px;
}

.section-title {
  color: #333;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.app-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.app-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.app-cover {
  height: 180px;
  position: relative;
  background: #fafafa;
}

.app-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: #f0f2f5;
}

.card-actions {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  opacity: 0;
  transition: opacity 0.3s;
  gap: 12px;
}

.app-card:hover .card-actions {
  opacity: 1;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  padding: 12px 16px 4px;
  margin: 0;
}

.app-time {
  font-size: 12px;
  color: #999;
  padding: 0 16px 12px;
}

/* App card info layout */
.app-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #f5f5f5;
}

.app-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-nickname {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 补充弹窗所需的样式 */
.app-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.info-row {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
}

.info-label {
  color: #888;
  width: 80px;
  flex-shrink: 0;
  line-height: 24px;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 24px;
}

.info-desc {
  flex: 1;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
