# AI 代码母体 - 前端项目

基于 Vue 3 + TypeScript + Vite 构建的智能代码生成平台前端应用。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript 5.9
- **构建工具**: Vite 7
- **状态管理**: Pinia
- **路由**: Vue Router 5
- **UI 组件库**: Ant Design Vue 4
- **HTTP 客户端**: Axios
- **Markdown 渲染**: marked + highlight.js + dompurify
- **代码规范**: ESLint + Prettier + oxlint
## 功能特性

### 用户系统

- 用户登录/注册
- 登录状态管理
- 用户注销

### 权限管理

- 基于 Vue Router 的全局权限控制
- 三级权限：未登录、普通用户、管理员
- 自动菜单过滤（根据权限隐藏无权访问的菜单项）
- 无权限页面提示

### 用户管理

- 用户列表展示（分页）
- 用户搜索（账号、用户名）
- 用户删除（带确认弹窗）
- 角色标签展示

### 布局系统

- 响应式上中下布局
- 全局头部（Logo + 导航菜单 + 用户信息）
- 全局底部（版权信息）

### 应用生成

- AI 智能生成网站应用
- SSE 流式传输实时预览
- Markdown 内容渲染（代码高亮）
- 部署成功弹窗提示

### 预览功能

- 实时预览生成的网站
- 左右分栏布局（对话区 40% : 预览区 60%）

## 快速开始
### 应用生成

- AI 智能生成网站应用
- SSE 流式传输实时预览
- Markdown 内容渲染（代码高亮）
- 部署成功弹窗提示

### 预览功能

- 实时预览生成的网站
- 左右分栏布局（对话区 40% : 预览区 60%）

## 快速开始

### 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm 或 pnpm

### 环境变量配置

复制 `.env.example` 为 `.env.development` 或 `.env.production`：

```bash
cp .env.example .env.development
```

环境变量说明：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8123/api` |
| `VITE_DEPLOY_DOMAIN` | 已部署应用访问域名 | `http://localhost:8123/api/static` |
| `VITE_PREVIEW_DOMAIN` | 预览应用访问域名 | `http://localhost:8123/api/preview` |

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173

### URL 构建规则

**已部署应用：**
```
{VITE_DEPLOY_DOMAIN}/{deployKey}/
示例: http://localhost:8123/api/static/aB3xYz/
```

**预览应用：**
```
{VITE_PREVIEW_DOMAIN}/{codeGenType}_{appId}/
示例: http://localhost:8123/api/preview/HTML_1/
```

### 生产构建

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 类型检查

```bash
npm run type-check
```

### API 代码生成

```bash
npm run openapi2ts
```

从后端 OpenAPI 文档自动生成前端 API 代码。

## 项目结构

```
src/
├── access/              # 权限控制模块
│   ├── accessEnum.ts    # 权限枚举
│   ├── checkAccess.ts   # 权限检查
│   └── index.ts         # 路由守卫
├── api/                 # API 接口（自动生成）
├── components/          # 公共组件
│   ├── GlobalHeader.vue
│   ├── GlobalFooter.vue
│   └── MarkdownRenderer.vue  # Markdown 渲染组件（支持代码高亮）
├── layouts/             # 布局组件
│   └── BasicLayout.vue
├── router/              # 路由配置
├── stores/              # 状态管理
├── utils/               # 工具函数
│   └── request.ts       # Axios 封装
└── views/               # 页面组件
    ├── HomePage.vue
    ├── UserLoginPage.vue
    ├── UserRegisterPage.vue
    ├── UserManagePage.vue
    └── NoAuth.vue
```

## 权限配置

### 路由权限

在路由配置中设置 `meta.access` 字段：

```typescript
{
  path: '/admin/userManage',
  meta: {
    title: '用户管理',
    access: ACCESS_ENUM.ADMIN,  // 仅管理员可访问
  },
}
```

### 权限等级

| 权限        | 说明           |
| ----------- | -------------- |
| `NOT_LOGIN` | 无需登录       |
| `USER`      | 需要登录       |
| `ADMIN`     | 需要管理员权限 |

## 开发建议

### IDE 配置

推荐使用 VS Code + Vue (Official) 插件。

### 代码规范

- 使用 Vue 3 组合式 API
- 遵循 ESLint + Prettier 规范
- 组件使用 `<script setup lang="ts">` 语法

## 后端接口

后端 API 文档地址配置在 `openapi2ts.config.ts`：

```typescript
export default {
  schemaPath: 'http://localhost:8123/api/v3/api-docs',
  serversPath: './src',
}
```

### Markdown 渲染

使用 `MarkdownRenderer.vue` 组件渲染 Markdown 内容，支持代码高亮：

```vue
<MarkdownRenderer :content="markdownText" />
```

特性：
- Markdown 解析（marked）
- 代码语法高亮（highlight.js）
- XSS 安全过滤（DOMPurify）
- 自动检测 JSON `{ "html": "..." }` 格式并提取 HTML
- 直接渲染 HTML 内容（以 `<!DOCTYPE` 或 `<html` 开头）

### SSE 流式传输

后端使用 Server-Sent Events 返回流式数据，前端使用 Fetch API 的 ReadableStream 处理：

```typescript
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''
  
  for (const line of lines) {
    if (line.trim().startsWith('data:')) {
      const data = line.trim().slice(5).trim()
      // 处理数据
    }
  }
}
```

## 许可证

MIT License
