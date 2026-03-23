# AGENTS.md

Guidelines for AI coding agents working in this Vue 3 + TypeScript + Vite project.

## Project Stack

- **Framework**: Vue 3 with Composition API (`<script setup lang="ts">`)
- **Language**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess: true`)
- **Build**: Vite 7 | **State**: Pinia (setup stores) | **UI**: Ant Design Vue 4
- **Node**: `^20.19.0` or `>=22.12.0`

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Type-check + build
npm run type-check       # vue-tsc --build
npm run lint             # oxlint → eslint with auto-fix
npm run format           # prettier --write src/
npm run openapi2ts       # Generate API code from OpenAPI
```

**Note**: No test framework configured.

## Environment Variables

| Variable              | Description         |
| --------------------- | ------------------- |
| `VITE_API_BASE_URL`   | Backend API URL     |
| `VITE_DEPLOY_DOMAIN`  | Deployed app domain |
| `VITE_PREVIEW_DOMAIN` | Preview app domain  |

## Code Style

### Formatting & Imports

- Prettier: `{ "semi": false, "singleQuote": true, "printWidth": 100 }`
- EditorConfig: 2 spaces, LF, UTF-8, max 100 chars
- Use `@/` alias for `src/`. Import order: Vue core → third-party → local

```typescript
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import { getLoginUser } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'
```

### TypeScript

- Always define types for props, emits, parameters
- Avoid `any`; use `unknown` with type guards
- Use API types from `@/api` (auto-generated)
- **Snowflake IDs**: Convert to String: `String(item.id)`

### Vue Components

Use `<script setup lang="ts">`. **Avoid Options API**.

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
}
const props = defineProps<Props>()
const count = ref(0)
</script>

<template>
  <div>{{ props.title }}: {{ count }}</div>
</template>
```

### Pinia Stores

```typescript
export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({ userName: '未登录' })

  async function fetchLoginUser() {
    const res = await getLoginUser()
    if (res.data.code === 0 && res.data.data) {
      loginUser.value = res.data.data
    }
  }

  return { loginUser, fetchLoginUser }
})
```

### Naming Conventions

- **Files**: `kebab-case` (`user-profile.vue`)
- **Components**: `PascalCase`
- **Stores**: `useXxxStore`
- **Composables**: `useXxx`
- **Constants**: `UPPER_SNAKE_CASE`

### Error Handling

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

## File Structure

```
src/
├── access/          # Permission control
├── api/             # Auto-generated API
├── components/      # Vue components
├── layouts/         # Layout components
├── router/          # Vue Router
├── stores/          # Pinia stores
├── utils/           # Utilities
└── views/           # Pages
```

## Permission System

- `NOT_LOGIN` - No login required
- `USER` - Login required
- `ADMIN` - Admin role required

Configure in route `meta.access`.

## Code Generation Types

```typescript
enum CodeGenTypeEnum {
  HTML = 'html',
  MULTI_FILE = 'multi_file',
  VUE_PROJECT = 'vue_project',
}
```

## Key Patterns

### SSE Streaming

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

### Route Watching & Cleanup

```typescript
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      resetState()
      // Re-fetch data
    }
  },
)

let timeoutId: ReturnType<typeof setTimeout> | null = null
const resetState = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}
```

## Linting & Workflow

- **Linters**: oxlint (fast) → ESLint (full). Config: `eslint.config.ts`
- Run `npm run lint` before committing
- Run `npm run type-check` to verify types
- Use Ant Design Vue components for UI
- Run `npm run openapi2ts` when backend API changes
