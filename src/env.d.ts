/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 地址 */
  readonly VITE_API_BASE_URL: string
  /** 已部署应用访问域名 */
  readonly VITE_DEPLOY_DOMAIN: string
  /** 预览应用访问域名 */
  readonly VITE_PREVIEW_DOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
