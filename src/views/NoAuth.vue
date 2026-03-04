<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="no-auth-page">
    <div class="content">
      <h1 class="title">403</h1>
      <h2 class="subtitle">你没有权限</h2>
      <p class="description">抱歉，您没有权限访问此页面</p>
      <a-button type="primary" @click="goHome">返回首页</a-button>
    </div>
  </div>
</template>

<style scoped>
.no-auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f0f2f5;
}

.content {
  text-align: center;
  padding: 48px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 72px;
  font-weight: 700;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.description {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}
</style>
