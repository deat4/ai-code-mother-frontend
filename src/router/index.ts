import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import ACCESS_ENUM from '@/access/accessEnum'

// 路由配置 - 单一数据源
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: '主页',
    component: HomePage,
    meta: { title: '主页' },
  },
  {
    path: '/user/login',
    name: '用户登录',
    component: () => import('@/views/UserLoginPage.vue'),
    meta: { title: '用户登录', hideInMenu: true },
  },
  {
    path: '/user/register',
    name: '用户注册',
    component: () => import('@/views/UserRegisterPage.vue'),
    meta: { title: '用户注册', hideInMenu: true },
  },
  {
    path: '/admin/userManage',
    name: '用户管理',
    component: () => import('@/views/UserManagePage.vue'),
    meta: { title: '用户管理', access: ACCESS_ENUM.ADMIN },
  },
  {
    path: '/noAuth',
    name: '无权限',
    component: () => import('@/views/NoAuth.vue'),
    meta: { title: '无权限', hideInMenu: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
