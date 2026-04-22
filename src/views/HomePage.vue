<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { addApp, listMyAppVoByPage, listGoodAppVoByPage } from '@/api/appController'
import { CodeGenTypeEnum, CODE_GEN_TYPE_CONFIG, DEFAULT_COVER } from '@/constants/codeGenType'

const router = useRouter()
const route = useRoute()

// 提示词输入
const promptText = ref('')
const creating = ref(false)

// 代码生成类型（默认智能选择）
const selectedCodeGenType = ref<CodeGenTypeEnum>(CodeGenTypeEnum.AUTO)
const codeGenTypeOptions = Object.values(CODE_GEN_TYPE_CONFIG)

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
    // 智能路由：AUTO 时不传 codeGenType，让后端自动选择
    const requestData: API.AppAddRequest = {
      appName: promptText.value.slice(0, 20),
      initPrompt: promptText.value,
    }
    if (selectedCodeGenType.value !== CodeGenTypeEnum.AUTO) {
      requestData.codeGenType = selectedCodeGenType.value
    }
    const res = await addApp(requestData)
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
        <div class="input-footer">
          <a-select
            v-model:value="selectedCodeGenType"
            :options="codeGenTypeOptions"
            class="gen-type-select"
          />
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
            <img
              v-if="app.cover"
              :src="app.cover"
              :alt="app.appName"
              @error="(e) => ((e.target as HTMLImageElement).src = DEFAULT_COVER)"
            />
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
            <img
              v-if="app.cover"
              :src="app.cover"
              :alt="app.appName"
              @error="(e) => ((e.target as HTMLImageElement).src = DEFAULT_COVER)"
            />
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
  background: var(--color-surface-base);
  padding: var(--space-12) var(--space-6);
}

.hero-section {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  margin-bottom: var(--space-12);
  padding: var(--space-10) var(--space-6);
}

.title {
  font-size: var(--font-size-48);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  margin-bottom: var(--space-3);
}

.subtitle {
  font-size: var(--font-size-16);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.prompt-input-wrapper {
  max-width: 700px;
  margin: 0 auto var(--space-6);
  background: var(--color-surface-base);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-1);
  position: relative;
}

.prompt-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-4);
}

.gen-type-select {
  width: 160px;
}

.submit-btn-wrapper {
  position: absolute;
  right: var(--space-6);
  bottom: var(--space-6);
}

.quick-prompts {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-6);
  flex-wrap: wrap;
}

.quick-prompts :deep(.ant-btn) {
  background: var(--color-surface-base);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-2) var(--space-6);
  font-size: var(--font-size-14);
  color: var(--color-text-secondary);
  margin: var(--space-1);
  box-shadow: var(--shadow-0);
}

.quick-prompts :deep(.ant-btn:hover) {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: var(--shadow-1);
}

.apps-section {
  max-width: 1200px;
  margin: 0 auto var(--space-12);
}

.section-title {
  color: var(--color-text-primary);
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-6);
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

.app-card {
  background: var(--color-surface-base);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-1);
}

.app-card:hover {
  box-shadow: var(--shadow-2);
}

.app-cover {
  height: 180px;
  position: relative;
  background: var(--color-surface-muted);
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
  font-size: var(--font-size-48);
  background: var(--color-surface-subtle);
}

.card-actions {
  position: absolute;
  inset: 0;
  background: rgba(29, 29, 31, 0.56);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-6);
  opacity: 0;
  gap: var(--space-3);
}

.app-card:hover .card-actions {
  opacity: 1;
}

.app-name {
  font-size: var(--font-size-16);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  padding: var(--space-3) var(--space-4) var(--space-1);
  margin: 0;
}

.app-time {
  font-size: var(--font-size-12);
  color: var(--color-text-tertiary);
  padding: var(--space-0) var(--space-4) var(--space-3);
}

/* App card info layout */
.app-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.app-avatar {
  flex-shrink: 0;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border-subtle);
}

.app-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.user-nickname {
  font-size: var(--font-size-12);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 补充弹窗所需的样式 */
.app-info-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.info-row {
  display: flex;
  align-items: flex-start;
  font-size: var(--font-size-14);
  color: var(--color-text-primary);
}

.info-label {
  color: var(--color-text-secondary);
  width: 80px;
  flex-shrink: 0;
  line-height: var(--line-height-relaxed);
}

.creator-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  line-height: var(--line-height-relaxed);
}

.info-desc {
  flex: 1;
  background: var(--color-surface-muted);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  line-height: var(--line-height-relaxed);
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .home-page {
    padding: var(--space-6) var(--space-4);
  }

  .hero-section {
    padding: var(--space-8) var(--space-4);
    margin-bottom: var(--space-8);
  }

  .title {
    font-size: var(--font-size-28);
  }

  .apps-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}
</style>
