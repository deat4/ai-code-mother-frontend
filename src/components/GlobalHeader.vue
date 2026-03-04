<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { LogoutOutlined } from '@ant-design/icons-vue'
import { routes } from '@/router'
import { useLoginUserStore } from '@/stores/loginUser'
import { userLogout } from '@/api/userController'
import { checkAccess, ACCESS_ENUM } from '@/access'

const router = useRouter()
const loginUserStore = useLoginUserStore()

// 当前选中菜单
const selectedKeys = ref<string[]>(['/'])

// 监听路由变化，更新当前选中菜单
router.afterEach((to) => {
  selectedKeys.value = [to.path]
})

// 从路由配置生成菜单项（根据权限过滤）
const menuItems = computed<MenuProps['items']>(() => {
  return routes
    .filter((route) => {
      // 过滤掉隐藏的菜单
      if (route.meta?.hideInMenu) return false
      // 根据权限过滤菜单
      const needAccess = (route.meta?.access as string) ?? ACCESS_ENUM.NOT_LOGIN
      return checkAccess(loginUserStore.loginUser, needAccess)
    })
    .map((route) => ({
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
  router.push('/user/login')
}

// 用户注销
const doLogout = async () => {
  try {
    const res = await userLogout()
    if (res.data.code === 0) {
      loginUserStore.setLoginUser({
        userName: '未登录',
      })
      message.success('退出登录成功')
      await router.push('/user/login')
    } else {
      message.error('退出登录失败，' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('退出登录失败，请稍后重试')
  }
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
      <div class="user-login-status">
        <div v-if="loginUserStore.loginUser.id">
          <a-dropdown>
            <a-space>
              <a-avatar :src="loginUserStore.loginUser.userAvatar" />
              {{ loginUserStore.loginUser.userName ?? '无名' }}
            </a-space>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="doLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <div v-else>
          <a-button type="primary" @click="handleLogin">登录</a-button>
        </div>
      </div>
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
