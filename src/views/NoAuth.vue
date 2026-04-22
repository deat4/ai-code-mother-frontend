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
  background: var(--color-surface-base);
  padding: var(--space-8) var(--space-4);
}

.content {
  text-align: center;
  padding: var(--space-12);
  background: var(--color-surface-base);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
}

.title {
  font-size: var(--font-size-48);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
  margin-bottom: var(--space-4);
  line-height: var(--line-height-tight);
}

.subtitle {
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.description {
  font-size: var(--font-size-14);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
}

@media (max-width: 768px) {
  .content {
    width: 100%;
    padding: var(--space-8) var(--space-4);
    border-radius: var(--radius-md);
  }
}
</style>
