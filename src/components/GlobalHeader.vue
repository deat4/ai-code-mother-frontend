<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import { routes } from '@/router'

const router = useRouter()

// 当前选中菜单
const selectedKeys = ref<string[]>(['/'])

// 监听路由变化，更新当前选中菜单
router.afterEach((to) => {
  selectedKeys.value = [to.path]
})

// 从路由配置生成菜单项
const menuItems = computed<MenuProps['items']>(() => {
  return routes.map((route) => ({
    key: route.path,
    label: route.meta?.title ?? route.name,
  }))
})

// 处理菜单点击
const handleMenuClick: MenuProps['onClick'] = (e) => {
  const key = e.key as string
  selectedKeys.value = [key]
  router.push(key)
}

const handleLogin = () => {
  console.log('登录')
}
</script>

<template>
  <div class="global-header">
    <div class="header-left">
      <div class="logo-wrapper">
        <img src="/logo.png" alt="logo" class="logo" />
        <span class="title">AI 代码母体</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="horizontal"
        :items="menuItems"
        class="header-menu"
        @click="handleMenuClick"
      />
    </div>
    <div class="header-right">
      <a-button type="primary" @click="handleLogin">登录</a-button>
    </div>
  </div>
</template>

<style scoped>
.global-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  margin-right: 24px;
}

.logo {
  height: 32px;
  width: auto;
}

.title {
  margin-left: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
  white-space: nowrap;
}

.header-menu {
  flex: 1;
  border-bottom: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (max-width: 768px) {
  .global-header {
    padding: 0 12px;
  }

  .title {
    display: none;
  }

  .header-menu {
    display: none;
  }
}
</style>
