# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build (type-check + vite build)
npm run preview      # Preview production build locally
npm run lint         # Run oxlint + ESLint with auto-fix
npm run format       # Format source with Prettier
npm run openapi2ts   # Generate API types from backend OpenAPI spec
```

## Tech Stack

- **Vue 3** with Composition API (`<script setup lang="ts">`)
- **Pinia** for state management
- **Ant Design Vue** for UI components
- **Vue Router** for routing
- **Vite** as build tool
- **oxlint + ESLint** for linting, **Prettier** for formatting

## Architecture

### Entry Point & Layout
- [main.ts](src/main.ts) initializes Vue app with Pinia, Router, and Ant Design Vue
- [App.vue](src/App.vue) wraps [BasicLayout.vue](src/layouts/BasicLayout.vue) (Header/Content/Footer structure)

### Routing & Access Control
- [router/index.ts](src/router/index.ts) defines all routes with `meta.access` for permission requirements
- [access/index.ts](src/access/index.ts) implements global route guard that checks user permissions before navigation
- Three access levels: `NOT_LOGIN`, `USER`, `ADMIN` (defined in [accessEnum.ts](src/access/accessEnum.ts))

### API Layer
- API controllers in `src/api/` are auto-generated via `openapi2ts` from backend OpenAPI spec
- Types are defined in [api/typings.d.ts](src/api/typings.d.ts) under `API` namespace
- [utils/request.ts](src/utils/request.ts) provides Axios instance with:
  - `withCredentials: true` for cookie-based auth
  - Global error handling (40100 code redirects to login)
  - HTTP status code error messages via Ant Design message

### State Management
- [stores/loginUser.ts](src/stores/loginUser.ts) holds current user info fetched from `/user/get/login`

### Key Features
- **Visual Editor**: [composables/useVisualEditor.ts](src/composables/useVisualEditor.ts) provides iframe-based element selection for editing generated pages
- **Chat**: SSE-based AI code generation via [views/AppChatPage.vue](src/views/AppChatPage.vue)
- **Version Management**: [components/VersionList.vue](src/components/VersionList.vue) and [VersionDiff.vue](src/components/VersionDiff.vue) for version history and diffs

## Development Notes

### Backend Proxy
Vite proxies `/api` requests to `http://localhost:8123`. Set `VITE_API_BASE_URL` and `VITE_PREVIEW_DOMAIN` env vars for deployment.

### Vue 3 Code Style
Always use `<script setup lang="ts">` with Composition API. Use `defineProps<T>()` and `defineEmits<T>()` for component interfaces. Avoid Options API.

### API Types Pattern
Import types from the `API` namespace. Controllers export functions that return `AxiosResponse<API.BaseResponseXxx>`.

### Constants
[constants/codeGenType.ts](src/constants/codeGenType.ts) defines code generation modes (HTML, MULTI_FILE, VUE_PROJECT). Values must match backend enum names.