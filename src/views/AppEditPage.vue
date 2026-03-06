<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, updateApp } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

const appId = route.params.id as string
const submitting = ref(false)

const formState = reactive({
  appName: '',
  cover: '',
  priority: 0,
  initPrompt: '',
  codeGenType: '',
  deployKey: '',
  userId: 0,
  createTime: '',
  updateTime: '',
  deployTime: '',
})

// 是否是管理员
const isAdmin = computed(() => {
  return loginUserStore.loginUser?.userRole === 'admin'
})

// 是否可以编辑（所有者或管理员）
const canEdit = computed(() => {
  const user = loginUserStore.loginUser
  if (!user || !user.id || !formState.userId) return false
  return String(user.id) === String(formState.userId) || user.userRole === 'admin'
})

// 加载应用信息
const loadAppInfo = async () => {
  try {
    const res = await getAppVoById({ id: appId as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      const app = res.data.data
      formState.appName = app.appName ?? ''
      formState.cover = app.cover ?? ''
      formState.priority = app.priority ?? 0
      formState.initPrompt = app.initPrompt ?? ''
      formState.codeGenType = app.codeGenType ?? ''
      formState.deployKey = app.deployKey ?? ''
      formState.userId = app.userId ?? 0
      formState.createTime = app.createTime ?? ''
      formState.updateTime = app.updateTime ?? ''
      formState.deployTime = app.deployedTime ?? ''
    }
  } catch {
    message.error('加载应用信息失败')
  }
}

// 保存修改
const handleSubmit = async () => {
  if (!formState.appName) {
    message.error('请输入应用名称')
    return
  }

  try {
    submitting.value = true
    const res = await updateApp({
      id: appId as unknown as number,
      appName: formState.appName,
      cover: formState.cover,
      priority: formState.priority,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    if (res.data.code === 0) {
      message.success('保存成功')
    } else {
      message.error('保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const handleReset = () => {
  loadAppInfo()
}

// 进入对话
const goToChat = () => {
  router.push(`/app/chat/${appId}`)
}

onMounted(() => {
  loadAppInfo()
})
</script>

<template>
  <div class="app-edit-page">
    <div class="page-header">
      <a-button type="link" @click="router.back()">← 返回</a-button>
      <h1 class="page-title">编辑应用信息</h1>
    </div>

    <div class="page-content">
      <!-- 基本信息 -->
      <a-card title="基本信息" class="form-card">
        <a-form layout="vertical">
          <a-form-item label="* 应用名称">
            <a-input
              v-model:value="formState.appName"
              placeholder="请输入应用名称"
              :maxLength="50"
              show-count
            />
          </a-form-item>

          <a-form-item label="应用封面">
            <a-input v-model:value="formState.cover" placeholder="请输入图片链接" />
            <div v-if="formState.cover" class="cover-preview">
              <img :src="formState.cover" alt="应用封面" />
            </div>
            <div class="form-tip">支持图片链接，建议尺寸：400x300</div>
          </a-form-item>

          <a-form-item label="优先级">
            <a-tooltip :title="!isAdmin ? '仅管理员可修改优先级' : ''">
              <a-input-number
                v-model:value="formState.priority"
                :min="0"
                :max="999"
                style="width: 100%"
                :disabled="!isAdmin"
              />
            </a-tooltip>
            <div class="form-tip">
              设置为 99 表示精选应用{{ !isAdmin ? '，仅管理员可修改' : '' }}
            </div>
          </a-form-item>

          <a-form-item label="初始提示词">
            <a-textarea
              v-model:value="formState.initPrompt"
              placeholder="初始提示词"
              :rows="4"
              :maxLength="1000"
              show-count
              disabled
            />
            <div class="form-tip">初始提示词不可修改</div>
          </a-form-item>

          <a-form-item label="生成类型">
            <a-input v-model:value="formState.codeGenType" disabled />
            <div class="form-tip">生成类型不可修改</div>
          </a-form-item>

          <a-form-item label="部署密钥">
            <a-input v-model:value="formState.deployKey" disabled />
            <div class="form-tip">部署密钥不可修改</div>
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button v-if="canEdit" type="primary" @click="handleSubmit" :loading="submitting">
                保存修改
              </a-button>
              <a-button @click="handleReset">重置</a-button>
              <a-button type="link" @click="goToChat">进入对话</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>

      <!-- 应用信息 -->
      <a-card title="应用信息" class="info-card">
        <a-descriptions bordered :column="2">
          <a-descriptions-item label="应用 ID">
            {{ appId }}
          </a-descriptions-item>
          <a-descriptions-item label="创建者">
            {{ formState.userId }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ formState.createTime }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formState.updateTime }}
          </a-descriptions-item>
          <a-descriptions-item label="部署时间">
            {{ formState.deployTime || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="访问链接">
            <a
              v-if="formState.deployKey"
              :href="`/api/static/${formState.deployKey}/`"
              target="_blank"
            >
              查看预览
            </a>
            <span v-else>-</span>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.app-edit-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.page-content {
  max-width: 900px;
  margin: 0 auto;
}

.form-card,
.info-card {
  margin-bottom: 24px;
}

.cover-preview {
  margin-top: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 16px;
  background: #fafafa;
}

.cover-preview img {
  max-width: 400px;
  max-height: 300px;
  border-radius: 4px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>
