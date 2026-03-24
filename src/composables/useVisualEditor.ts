/**
 * 可视化编辑器 Composable
 * 提供 Vue 组件接口，封装 VisualEditor 类
 */
import { ref, computed, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import { VisualEditor, type ElementInfo } from '@/utils/visualEditor'

/**
 * 选中的元素信息（用于 UI 展示）
 */
export interface SelectedElement {
  /** 元素标签名 */
  tagName: string
  /** 元素 ID */
  elementId: string
  /** 元素类名 */
  className: string
  /** 元素文本内容 */
  textContent: string
  /** CSS 选择器 */
  selector: string
  /** 页面路径 */
  pagePath: string
  /** 元素位置 */
  rect: {
    top: number
    left: number
    width: number
    height: number
  }
}

/**
 * 可视化编辑器选项
 */
export interface UseVisualEditorOptions {
  /** 预览 iframe 的 ref */
  iframeRef: Ref<HTMLIFrameElement | null>
  /** 预览 URL */
  previewUrl: Ref<string>
  /** 是否启用编辑功能 */
  enabled?: Ref<boolean>
}

/**
 * 可视化编辑器返回值
 */
export interface UseVisualEditorReturn {
  /** 是否处于编辑模式 */
  isEditMode: Ref<boolean>
  /** 选中的元素（单选模式） */
  selectedElement: Ref<SelectedElement | null>
  /** 是否有选中的元素 */
  hasSelectedElement: ComputedRef<boolean>
  /** 进入编辑模式 */
  enterEditMode: () => void
  /** 退出编辑模式 */
  exitEditMode: () => void
  /** 切换编辑模式 */
  toggleEditMode: () => void
  /** 清除选中的元素 */
  clearSelectedElement: () => void
  /** 获取格式化的元素描述（用于附加到提示词） */
  getElementDescription: () => string
  /** 处理发送消息后的清理 */
  handleAfterSend: () => void
  /** iframe 加载完成回调 */
  onIframeLoad: () => void
}

/**
 * 将 ElementInfo 转换为 SelectedElement
 */
function toSelectedElement(elementInfo: ElementInfo): SelectedElement {
  return {
    tagName: elementInfo.tagName,
    className: elementInfo.className,
    elementId: elementInfo.id,
    textContent: elementInfo.textContent,
    selector: elementInfo.selector,
    pagePath: elementInfo.pagePath,
    rect: elementInfo.rect,
  }
}

/**
 * 可视化编辑器 Composable（单选模式）
 */
export function useVisualEditor(options: UseVisualEditorOptions): UseVisualEditorReturn {
  const { iframeRef, previewUrl, enabled } = options

  // 编辑模式状态
  const isEditMode = ref(false)

  // 选中的元素（单选模式）
  const selectedElement = ref<SelectedElement | null>(null)

  // 是否有选中的元素
  const hasSelectedElement = computed(() => selectedElement.value !== null)

  // VisualEditor 实例
  let editor: VisualEditor | null = null

  // 进入编辑模式
  const enterEditMode = (): void => {
    if (enabled && !enabled.value) return
    editor?.enableEditMode()
  }

  // 退出编辑模式
  const exitEditMode = (): void => {
    editor?.disableEditMode()
  }

  // 切换编辑模式
  const toggleEditMode = (): void => {
    if (enabled && !enabled.value) return
    editor?.toggleEditMode()
  }

  // 清除选中的元素
  const clearSelectedElement = (): void => {
    selectedElement.value = null
    editor?.clearSelection()
  }

  // 获取格式化的元素描述
  const getElementDescription = (): string => {
    if (!selectedElement.value) return ''

    const el = selectedElement.value
    const parts: string[] = []

    parts.push(`选中元素信息：`)
    if (el.pagePath) {
      parts.push(`- 页面路径: ${el.pagePath}`)
    }
    parts.push(`- 标签: ${el.tagName}`)
    parts.push(`- 选择器: ${el.selector}`)
    if (el.textContent) {
      parts.push(`- 当前内容: ${el.textContent.substring(0, 100)}`)
    }

    return '\n' + parts.join('\n')
  }

  // 处理发送消息后的清理
  const handleAfterSend = (): void => {
    clearSelectedElement()
    exitEditMode()
  }

  // iframe 加载完成回调
  const onIframeLoad = (): void => {
    editor?.onIframeLoad()
  }

  // 初始化编辑器
  const initEditor = (): void => {
    if (!iframeRef.value) return

    editor = new VisualEditor({
      onElementSelected: (elementInfo: ElementInfo) => {
        // 单选模式：直接替换
        selectedElement.value = toSelectedElement(elementInfo)
      },
      onElementHover: (elementInfo: ElementInfo) => {
        // 可以在这里处理悬浮提示
      },
      onEditModeChange: (mode: boolean) => {
        isEditMode.value = mode
      },
    })

    editor.init(iframeRef.value)
  }

  // 监听 iframe 变化
  watch(
    () => iframeRef.value,
    (iframe) => {
      if (iframe) {
        if (editor) {
          editor.destroy()
        }
        initEditor()
      }
    },
    { immediate: true },
  )

  // 监听 previewUrl 变化，通知编辑器重新加载
  watch(
    () => previewUrl.value,
    () => {
      if (editor) {
        // 等待 iframe 重新加载
        setTimeout(() => {
          editor?.onIframeLoad()
        }, 100)
      }
    },
  )

  // 组件挂载时初始化
  onMounted(() => {
    if (iframeRef.value) {
      initEditor()
    }
  })

  // 组件卸载时清理
  onUnmounted(() => {
    if (editor) {
      editor.destroy()
      editor = null
    }
  })

  return {
    isEditMode,
    selectedElement,
    hasSelectedElement,
    enterEditMode,
    exitEditMode,
    toggleEditMode,
    clearSelectedElement,
    getElementDescription,
    handleAfterSend,
    onIframeLoad,
  }
}

// 导出类型
export type { SelectedElement as VisualEditorSelectedElement }
export type { ElementInfo } from '@/utils/visualEditor'
