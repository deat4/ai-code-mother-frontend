# AGENTS.md

Guidelines for AI coding agents working in this Vue 3 + TypeScript + Vite project.

## Project Overview

- **Framework**: Vue 3 with Composition API (`<script setup lang="ts">`)
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7
- **State Management**: Pinia (setup stores pattern)
- **Router**: Vue Router 5
- **UI Library**: Ant Design Vue 4
- **HTTP Client**: Axios
- **Markdown**: marked + highlight.js + dompurify

## Commands

```bash
# Development
npm run dev              # Start dev server (Vite)

# Build
npm run build            # Type-check + build (production)
npm run build-only       # Build without type-check
npm run preview          # Preview production build

# Type Checking
npm run type-check       # vue-tsc --build

# Linting (runs oxlint first, then eslint)
npm run lint             # Run all linters with auto-fix
npm run lint:oxlint      # oxlint . --fix (fast linter)
npm run lint:eslint      # eslint . --fix --cache

# Formatting
npm run format           # prettier --write src/

# API Code Generation
npm run openapi2ts       # Generate API code from OpenAPI spec
```

**Note**: No test framework is configured in this project.

## Environment Variables

The project uses Vite environment variables. Copy `.env.example` to `.env.development` or `.env.production`:

| Variable | Description | Example |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8123/api` |
| `VITE_DEPLOY_DOMAIN` | Deployed app domain | `http://localhost:8123/api/static` |
| `VITE_PREVIEW_DOMAIN` | Preview app domain | `http://localhost:8123/api/preview` |

### URL Construction Rules

**Deployed App:**
```
{VITE_DEPLOY_DOMAIN}/{deployKey}/
Example: http://localhost:8123/api/static/aB3xYz/
```

**Preview App:**
```
{VITE_PREVIEW_DOMAIN}/{codeGenType}_{appId}/
Example: http://localhost:8123/api/preview/HTML_1/
```

### Usage in Code

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_BASE_URL
const deployDomain = import.meta.env.VITE_DEPLOY_DOMAIN
const previewDomain = import.meta.env.VITE_PREVIEW_DOMAIN
```

## Code Style

### Formatting (Prettier)

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100
}
```

### EditorConfig

- Indent: 2 spaces
- Line ending: LF
- Charset: UTF-8
- Max line length: 100
- Trim trailing whitespace
- Insert final newline

### Imports

Use path alias `@/` for `src/` imports. Order: Vue core → third-party → local (separated by blank lines).

```typescript
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import { getLoginUser } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'
```

### TypeScript

- Strict mode enabled via `@vue/tsconfig/tsconfig.dom.json`
- `noUncheckedIndexedAccess: true` - array/object access may return undefined
- Always define types for props, emits, and function parameters
- Avoid `any`; use `unknown` with type guards when type is uncertain
- Use API types from `@/api` for backend data structures (auto-generated)

### Vue Components

Use `<script setup lang="ts">` for all components. Define props with `defineProps<T>()` and emits with `defineEmits<T>()`.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'

interface Props {
  title: string
}

const props = defineProps<Props>()
const count = ref(0)

const handleClick = async () => {
  try {
    // async operation
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败')
  }
}
</script>

<template>
  <div>{{ props.title }}: {{ count }}</div>
</template>

<style scoped>
/* Component-scoped styles */
</style>
```

### Pinia Stores

Use the setup stores pattern (not options API):

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({
    userName: '未登录',
  })

  async function fetchLoginUser() {
    try {
      const res = await getLoginUser()
      if (res.data.code === 0 && res.data.data) {
        loginUser.value = res.data.data
      }
    } catch (error) {
      console.error('获取登录用户信息失败:', error)
    }
  }

  return { loginUser, fetchLoginUser }
})
```

### Naming Conventions

- **Files**: `kebab-case` for Vue components (`user-profile.vue`)
- **Components**: `PascalCase` in templates and imports
- **Stores**: `useXxxStore` naming pattern
- **Composables**: `useXxx` naming pattern
- **Constants**: `UPPER_SNAKE_CASE` (`ACCESS_ENUM`)
- **Variables/functions**: `camelCase`

### Error Handling

Use try/catch for async operations. Use `message` from ant-design-vue for user feedback.

```typescript
try {
  const res = await fetchData()
  if (res.data.code === 0 && res.data.data) {
    message.success('操作成功')
  } else {
    message.error('操作失败：' + (res.data.message ?? '未知错误'))
  }
} catch (error) {
  console.error('操作失败:', error)
  message.error('操作失败，请稍后重试')
}
```

## Linting

This project uses two linters:

1. **oxlint** - Fast linter (runs first)
2. **ESLint** - Full linting with Vue and TypeScript rules

ESLint config: `eslint.config.ts` (flat config)

- `pluginVue.configs['flat/essential']` - Vue essential rules
- `vueTsConfigs.recommended` - TypeScript recommended rules
- Plugins: vue, typescript, unicorn, oxc

## File Structure

```
src/
├── App.vue              # Root component
├── main.ts              # App entry point
├── access/              # Permission control module
│   ├── accessEnum.ts    # Permission enum definition
│   ├── checkAccess.ts   # Permission check function
│   └── index.ts         # Router guard & module entry
├── api/                 # Auto-generated API code
├── components/          # Vue components
│   ├── GlobalHeader.vue
│   ├── GlobalFooter.vue
│   └── MarkdownRenderer.vue  # Markdown + syntax highlighting
├── layouts/             # Layout components
├── router/              # Vue Router configuration
├── stores/              # Pinia stores
├── utils/               # Utility functions
│   └── request.ts       # Axios request wrapper
└── views/               # Page components
```

## Permission System

### Permission Levels (ACCESS_ENUM)

- `NOT_LOGIN` - No login required
- `USER` - Login required
- `ADMIN` - Admin role required

### Route Configuration

```typescript
{
  path: '/admin/userManage',
  meta: {
    title: '用户管理',
    access: ACCESS_ENUM.ADMIN,
    hideInMenu: true,
  },
}
```

## Node Version

- Requires Node.js `^20.19.0` or `>=22.12.0`

## Important Notes

- Run `npm run lint` before committing to catch issues
- Run `npm run type-check` to verify TypeScript types
- Use Ant Design Vue components when UI elements are needed
- Keep components small and focused; extract logic to composables/stores
- Run `npm run openapi2ts` to regenerate API code when backend changes

## Markdown Rendering

Use `MarkdownRenderer.vue` for rendering Markdown content with syntax highlighting:

```vue
<MarkdownRenderer :content="markdownText" />
```

Features:
- Markdown parsing via `marked`
- Code syntax highlighting via `highlight.js`
- XSS sanitization via `DOMPurify`
- Auto-detects JSON `{ "html": "..." }` format and extracts HTML
- Renders HTML directly when content starts with `<!DOCTYPE` or `<html`

## SSE Streaming Pattern

When implementing Server-Sent Events streaming:

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
      // Process data
    }
  }
}
```

## Route Parameter Changes

When a component needs to handle route parameter changes (e.g., navigating between items), use `watch`:

```typescript
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
let itemId = route.params.id as string

const resetState = () => {
  // Reset all reactive state
}

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      resetState()
      itemId = newId as string
      // Re-fetch data
    }
  },
)
```

## setTimeout Cleanup

Always clean up `setTimeout` in `resetState` or `onUnmounted` to prevent race conditions:

```typescript
let timeoutId: ReturnType<typeof setTimeout> | null = null

const resetState = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  // Reset other state
}

// When setting timeout
timeoutId = setTimeout(() => {
  timeoutId = null
  // Do something
}, 100)
```

## Chat History Loading

When loading chat history on page entry:

```typescript
// Load history from API
const res = await listAppChatHistory({
  appId: appId.value,
  lastCreateTime: loadMore ? oldestMessageTime.value : undefined,
  pageSize: 10,
})

// Important: Data is in res.data.data.records (paginated response)
const historyList = res.data.data.records || []

// Reverse because backend returns newest first
historyMessages.reverse()
```

## AI Generation Stop

To stop AI generation mid-stream:

```typescript
// Save sessionId from SSE event
if (parsed.sessionId) {
  currentSessionId.value = parsed.sessionId
}

// Stop generation
await stopGeneration({ sessionId: currentSessionId.value })
```

## Version Management

Components:
- `VersionList.vue` - List all versions
- `VersionDiff.vue` - Compare two versions

API:
- `listAppVersions` - Get version list
- `diffVersions` - Compare versions
- `rollbackToVersion` - Rollback to specific version
```
