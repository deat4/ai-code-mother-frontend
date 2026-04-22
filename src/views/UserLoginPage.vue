<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { message } from 'ant-design-vue'
import { userLogin } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const formState = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

/**
 * 提交表单
 */
const handleSubmit = async (values: API.UserLoginRequest) => {
  try {
    const res = await userLogin(values)
    if (res.data.code === 0 && res.data.data) {
      // 更新登录用户状态
      loginUserStore.setLoginUser(res.data.data)
      message.success('登录成功')
      router.push({
        path: '/',
        replace: true,
      })
    } else {
      message.error('登录失败，' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('登录失败，网络错误')
  }
}
</script>

<template>
  <div id="userLoginPage">
    <h2 class="title">鱼皮 AI 应用生成 - 用户登录</h2>
    <div class="desc">不写一行代码，生成完整应用</div>
    <a-form :model="formState" name="basic" autocomplete="off" @finish="handleSubmit">
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入账号' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>
      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 8, message: '密码不能小于 8 位' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>
      <div class="tips">
        没有账号？
        <RouterLink to="/user/register">去注册</RouterLink>
      </div>
      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">登录</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
#userLoginPage {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
  background: var(--color-surface-base);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
}

.title {
  text-align: center;
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
  text-wrap: balance;
}

.desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
  font-size: var(--font-size-14);
  text-wrap: pretty;
}

.tips {
  text-align: right;
  margin-bottom: var(--space-4);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-14);
}

.tips a {
  color: var(--color-accent);
}

@media (max-width: 768px) {
  #userLoginPage {
    max-width: 100%;
    padding: var(--space-6) var(--space-4);
    border-radius: var(--radius-md);
  }
}
</style>
