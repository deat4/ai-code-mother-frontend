<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="home-page">
    <h1>AI 代码母体</h1>
    <p>欢迎来到 AI 代码母体 - 智能代码生成平台</p>
    <a-button type="primary" @click="count++">点击次数: {{ count }}</a-button>
  </div>
</template>

<style scoped>
.home-page {
  text-align: center;
  padding: 48px 24px;
}

.home-page h1 {
  font-size: 32px;
  margin-bottom: 16px;
  color: #1890ff;
}

.home-page p {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}
</style>
