# AGENTS.md

Guidelines for AI coding agents working in this Vue 3 + TypeScript + Vite project.

## Project Overview

- **Framework**: Vue 3 with Composition API (`<script setup lang="ts">`)
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7
- **State Management**: Pinia (setup stores pattern)
- **Router**: Vue Router 5
- **UI Library**: Ant Design Vue 4

## Commands

```bash
# Development
npm run dev              # Start dev server (Vite)

# Build
npm run build            # Type-check + build (production)
npm run build-only       # Build without type-check

# Type Checking
npm run type-check       # vue-tsc --build

# Linting (runs oxlint first, then eslint)
npm run lint             # Run all linters with auto-fix
npm run lint:oxlint      # oxlint . --fix (fast linter)
npm run lint:eslint      # eslint . --fix --cache

# Formatting
npm run format           # prettier --write src/
```

### Single Test

This project does not currently have a test framework configured. If tests are added, check `package.json` for the test command.

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

- Use path alias `@/` for `src/` imports:

```typescript
import MyComponent from '@/components/MyComponent.vue'
import { useCounterStore } from '@/stores/counter'
```

- Import order: Vue core → third-party → local (separated by blank lines)

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import router from '@/router'
```

### TypeScript

- Strict mode enabled via `@vue/tsconfig/tsconfig.dom.json`
- `noUncheckedIndexedAccess: true` - array/object access may return undefined
- Always define types for props, emits, and function parameters
- Avoid `any`; use `unknown` with type guards when type is uncertain

### Vue Components

- Use `<script setup lang="ts">` for all components
- Define props with `defineProps<T>()` and emits with `defineEmits<T>()`
- Use composables pattern for reusable logic

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

<style scoped>
/* Component-scoped styles */
</style>
```

### Pinia Stores

Use the setup stores pattern (not options API):

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useExampleStore = defineStore('example', () => {
  const items = ref<string[]>([])
  const count = computed(() => items.value.length)

  function addItem(item: string) {
    items.value.push(item)
  }

  return { items, count, addItem }
})
```

### Naming Conventions

- **Files**: `kebab-case` for Vue components (`user-profile.vue`)
- **Components**: `PascalCase` in templates and imports
- **Stores**: `useXxxStore` naming pattern
- **Composables**: `useXxx` naming pattern
- **Constants**: `UPPER_SNAKE_CASE`
- **Variables/functions**: `camelCase`

### Error Handling

- Use try/catch for async operations
- Prefer throwing typed errors over generic Error
- Log errors with context for debugging

```typescript
try {
  await fetchData()
} catch (error) {
  console.error('Failed to fetch data:', error)
  throw error
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
├── App.vue          # Root component
├── main.ts          # App entry point
├── router/
│   └── index.ts     # Vue Router configuration
├── stores/
│   └── *.ts         # Pinia stores
├── assets/          # Static assets
└── components/      # Vue components (create as needed)
```

## Node Version

- Requires Node.js `^20.19.0` or `>=22.12.0`

## Important Notes

- Run `npm run lint` before committing to catch issues
- Run `npm run type-check` to verify TypeScript types
- Use Ant Design Vue components when UI elements are needed
- Keep components small and focused; extract logic to composables/stores
