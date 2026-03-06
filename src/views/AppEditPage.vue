<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, updateApp } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = route.params.id as string

// 表单数据
const formState = reactive({
  appName: '',
  cover: '',
  priority: 0,
})

const loading = ref(false)
const submitting = ref(false)

// 是否为管理员
const isAdmin = ref(loginUserStore.loginUser.userRole === 'admin')

// 加载应用信息
const loadAppInfo = async () => {
  try {
    loading.value = true
    const res = await getAppVoById({ id: appId as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      const app = res.data.data
      formState.appName = app.appName ?? ''
      formState.cover = app.cover ?? ''
      formState.priority = app.priority ?? 0
    } else {
      message.error('加载应用信息失败')
    }
  } catch {
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formState.appName.trim()) {
    message.warning('请输入应用名称')
    return
  }
  try {
    submitting.value = true
    const res = await updateApp({
      id: appId,
      appName: formState.appName,
    })
    if (res.data.code === 0) {
      message.success('保存成功')
      router.back()
    } else {
      message.error('保存失败，' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (appId) {
    loadAppInfo()
  } else {
    message.error('应用 ID 不存在')
    router.push('/')
  }
})
</script>

<template>
  <div class="app-edit-page">
    <div class="edit-container">
      <a-card title="编辑应用信息" :loading="loading">
        <a-form :model="formState" layout="vertical" @finish="handleSubmit">
          <a-form-item label="应用名称" name="appName">
            <a-input
              v-model:value="formState.appName"
              placeholder="请输入应用名称"
              :disabled="loading"
            />
          </a-form-item>
          <a-form-item label="封面图片 URL" name="cover">
            <a-input
              v-model:value="formState.cover"
              placeholder="请输入封面图片 URL"
              :disabled="loading || !isAdmin"
            />
          </a-form-item>
          <a-form-item label="优先级" name="priority" v-if="isAdmin">
            <a-input-number
              v-model:value="formState.priority"
              :min="0"
              :max="99"
              placeholder="优先级（0-99）"
              :disabled="loading"
            />
            <a-typography-text type="secondary" style="font-size: 12px">
              优先级 >= 99 的应用将显示为精选案例
            </a-typography-text>
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="submitting">保存</a-button>
              <a-button @click="router.back()">取消</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.app-edit-page {
  padding: 24px;
}

.edit-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
