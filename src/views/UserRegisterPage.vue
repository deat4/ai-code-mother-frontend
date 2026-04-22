<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { userRegister } from '@/api/userController'

const router = useRouter()

const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

/**
 * 提交表单
 */
const handleSubmit = async (values: API.UserRegisterRequest) => {
  try {
    const res = await userRegister(values)
    if (res.data.code === 0 && res.data.data) {
      message.success('注册成功')
      router.push({
        path: '/user/login',
        replace: true,
      })
    } else {
      message.error('注册失败，' + (res.data.message ?? '未知错误'))
    }
  } catch {
    message.error('注册失败，请稍后重试')
  }
}
</script>

<template>
  <div id="userRegisterPage">
    <h2 class="title">AI 代码母体 - 用户注册</h2>
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
      <a-form-item
        name="checkPassword"
        :rules="[
          { required: true, message: '请再次输入密码' },
          { min: 8, message: '密码不能小于 8 位' },
        ]"
      >
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" />
      </a-form-item>
      <div class="tips">
        已有账号？
        <RouterLink to="/user/login">去登录</RouterLink>
      </div>
      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">注册</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
#userRegisterPage {
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
  margin-bottom: var(--space-2);
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
  text-wrap: balance;
}

.desc {
  text-align: center;
  margin-bottom: var(--space-6);
  color: var(--color-text-secondary);
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

.tips a:hover {
  color: var(--color-accent-hover);
}

@media (max-width: 768px) {
  #userRegisterPage {
    max-width: 100%;
    padding: var(--space-6) var(--space-4);
    border-radius: var(--radius-md);
  }
}
</style>
