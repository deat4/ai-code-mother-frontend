/**
 * 代码生成类型枚举
 * 注意：值必须与后端 CodeGenTypeEnum 的枚举名称保持一致（大写）
 * AUTO 为前端专用，表示让后端自动选择（不传 codeGenType）
 */
export enum CodeGenTypeEnum {
  AUTO = 'AUTO', // 前端专用：智能路由，后端自动选择
  HTML = 'HTML',
  MULTI_FILE = 'MULTI_FILE',
  VUE_PROJECT = 'VUE_PROJECT',
}

/**
 * 代码生成类型配置（用于下拉选择）
 */
export const CODE_GEN_TYPE_CONFIG = {
  [CodeGenTypeEnum.AUTO]: {
    label: '智能选择',
    value: CodeGenTypeEnum.AUTO,
  },
  [CodeGenTypeEnum.HTML]: {
    label: '原生 HTML 模式',
    value: CodeGenTypeEnum.HTML,
  },
  [CodeGenTypeEnum.MULTI_FILE]: {
    label: '原生多文件模式',
    value: CodeGenTypeEnum.MULTI_FILE,
  },
  [CodeGenTypeEnum.VUE_PROJECT]: {
    label: 'Vue 项目模式',
    value: CodeGenTypeEnum.VUE_PROJECT,
  },
}

/**
 * 默认封面图 URL
 */
export const DEFAULT_COVER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMmY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0OCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='

/**
 * 获取静态资源预览URL
 * 后端已处理 dist/ 目录查找，无需手动添加 dist/index.html 后缀
 */
export const getStaticPreviewUrl = (codeGenType: string, appId: string) => {
  return `${import.meta.env.VITE_PREVIEW_DOMAIN}/${codeGenType}_${appId}/`
}
