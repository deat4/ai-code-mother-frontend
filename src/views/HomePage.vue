<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { addApp, listMyAppVoByPage, listGoodAppVoByPage } from '@/api/appController'

const router = useRouter()

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

// 快速创建示例
const quickPrompts = ['波普风电商页面', '企业网站', '电商运营后台', '暗黑话题社区']

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
    // 修正点 1: 规范化响应判断
    if (res.data.code === 0 && res.data.data) {
      message.success('应用创建成功')
      router.push(`/app/chat/${res.data.data}`)
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
      // 修正点 2: 确认后端返回字段名，通常为 total
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

const goToChat = (appId: number | string, viewOnly: boolean = false) => {
  const url = `/app/chat/${appId}${viewOnly ? '?view=1' : ''}`
  router.push(url)
}

const openDeployUrl = (app: API.AppVO) => {
  if (!app.deployKey) return
  const url = `http://localhost:8123/api/static/${app.deployKey}/`
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

onMounted(() => {
  loadMyApps()
  loadGoodApps()
})
</script>

<template>
  <div class="home-page">
    <div class="hero-section">
      <h1 class="title">
        一句话
        <img src="https://codefather.cn/logo.png" alt="logo" class="logo" />
        呈所想
      </h1>
      <p class="subtitle">与 AI 对话轻松创建应用和网站</p>
      <div class="prompt-input-wrapper">
        <a-textarea
          v-model:value="promptText"
          placeholder="描述你的想法，例如：创建一个个人简历网页"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          class="prompt-input"
        />
        <div class="input-actions">
          <div class="left-actions">
            <a-button size="small">📎 上传</a-button>
            <a-button size="small">✨ 优化</a-button>
          </div>
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
          v-for="prompt in quickPrompts"
          :key="prompt"
          size="large"
          @click="promptText = prompt"
        >
          {{ prompt }}
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
              <a-button type="primary" @click="app.id && goToChat(app.id)">查看对话</a-button>
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
              <a-button type="primary" @click="app.id && goToChat(app.id, true)">查看详情</a-button>
              <a-button v-if="app.deployKey" @click="openDeployUrl(app)">在线预览</a-button>
            </div>
          </div>
          <h3 class="app-name">{{ app.appName ?? '未命名应用' }}</h3>
          <div class="app-meta">
            <a-avatar :src="app.user?.userAvatar" size="small" />
            <span class="user-name">{{ app.user?.userName ?? '匿名' }}</span>
            <a-tag color="purple" v-if="app.user?.userRole === 'admin'">官方</a-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px;
}
.hero-section {
  text-align: center;
  margin-bottom: 64px;
  background: linear-gradient(135deg, #f5feff 0%, #e0f7fa 100%);
  padding: 64px 24px;
  border-radius: 24px;
}
.title {
  font-size: 48px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.logo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}
.prompt-input-wrapper {
  max-width: 800px;
  margin: 0 auto 24px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  border: 1px solid #eee;
}
.prompt-input {
  border: none !important;
  box-shadow: none !important;
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
.card-actions {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.3s;
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
.app-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f5f5f5;
}
.user-name {
  flex: 1;
  font-size: 13px;
  color: #666;
}
</style>
