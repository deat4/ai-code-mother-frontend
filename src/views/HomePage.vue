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
    if (res.data.code === 0 && res.data.data) {
      message.success('应用创建成功')
      // 跳转到对话页面
      router.push(`/app/chat/${res.data.data}`)
    } else {
      message.error('创建失败，' + (res.data.message ?? '未知错误'))
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
      myAppsTotal.value = res.data.data.totalRow ?? 0
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
      goodAppsTotal.value = res.data.data.totalRow ?? 0
    }
  } catch (error) {
    console.error('加载精选应用失败:', error)
  }
}

onMounted(() => {
  loadMyApps()
  loadGoodApps()
})
</script>

<template>
  <div class="home-page">
    <!-- 网站标题和输入框 -->
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
          placeholder="使用 NoCode 创建一个高效的小工具，帮我计算……"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          class="prompt-input"
        />
        <div class="input-actions">
          <div class="left-actions">
            <a-button size="small">
              <template #icon>📎</template>
              上传
            </a-button>
            <a-button size="small">
              <template #icon>✨</template>
              优化
            </a-button>
          </div>
          <a-button type="primary" shape="circle" size="large" @click="handleCreateApp">
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

    <!-- 我的作品 -->
    <div class="apps-section" v-if="myApps.length > 0">
      <h2 class="section-title">我的作品</h2>
      <div class="apps-grid">
        <div v-for="app in myApps" :key="app.id" class="app-card">
          <div class="app-cover">
            <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
            <div v-else class="cover-placeholder">
              <span>📱</span>
            </div>
          </div>
          <h3 class="app-name">{{ app.appName ?? '未命名应用' }}</h3>
          <p class="app-time">创建于 {{ app.createTime }}</p>
        </div>
      </div>
    </div>

    <!-- 精选案例 -->
    <div class="apps-section" v-if="goodApps.length > 0">
      <h2 class="section-title">精选案例</h2>
      <div class="apps-grid">
        <div v-for="app in goodApps" :key="app.id" class="app-card">
          <div class="app-cover">
            <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
            <div v-else class="cover-placeholder">
              <span>📱</span>
            </div>
          </div>
          <h3 class="app-name">{{ app.appName ?? '未命名应用' }}</h3>
          <div class="app-meta">
            <a-avatar :src="app.user?.userAvatar" size="small" />
            <span class="user-name">{{ app.user?.userName ?? '匿名' }}</span>
            <a-tag color="purple" v-if="app.user?.userRole === 'admin'">官方</a-tag>
            <a-tag v-else>用户应用</a-tag>
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
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 50%, #80deea 100%);
  padding: 64px 24px;
  border-radius: 16px;
}

.title {
  font-size: 48px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 32px;
}

.prompt-input-wrapper {
  max-width: 800px;
  margin: 0 auto 24px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.prompt-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
}

.prompt-input :deep(textarea) {
  font-size: 16px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.left-actions {
  display: flex;
  gap: 8px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

.apps-section {
  margin-bottom: 64px;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.app-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.app-card:hover {
  transform: translateY(-4px);
}

.app-cover {
  height: 200px;
  background: #f5f5f5;
  overflow: hidden;
}

.app-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 64px;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding: 16px;
  margin: 0;
}

.app-time {
  font-size: 14px;
  color: #999;
  padding: 0 16px 16px;
  margin: 0;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.user-name {
  flex: 1;
  font-size: 14px;
  color: #666;
}
</style>
