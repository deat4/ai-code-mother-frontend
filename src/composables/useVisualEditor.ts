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
  /** 元素唯一标识 */
  id: string
  /** 元素标签名 */
  tagName: string
  /** 元素类名 */
  className: string
  /** 元素 ID */
  elementId: string
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
  /** 选中的元素列表 */
  selectedElements: Ref<SelectedElement[]>
  /** 是否有待发送的选中元素 */
  hasSelectedElements: ComputedRef<boolean>
  /** 进入编辑模式 */
  enterEditMode: () => void
  /** 退出编辑模式 */
  exitEditMode: () => void
  /** 切换编辑模式 */
  toggleEditMode: () => void
  /** 移除选中的元素 */
  removeElement: (elementId: string) => void
  /** 清空所有选中元素 */
  clearElements: () => void
  /** 获取格式化的元素描述（用于附加到提示词） */
  getElementsDescription: () => string
  /** 处理发送消息后的清理 */
  handleAfterSend: () => void
}

/**
 * 生成元素唯一 ID
 */
function generateElementId(element: ElementInfo): string {
  return `${element.tagName}_${element.selector}_${Date.now()}`
}

/**
 * 将 ElementInfo 转换为 SelectedElement
 */
function toSelectedElement(elementInfo: ElementInfo): SelectedElement {
  return {
    id: generateElementId(elementInfo),
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
 * 可视化编辑器 Composable
 */
export function useVisualEditor(options: UseVisualEditorOptions): UseVisualEditorReturn {
  const { iframeRef, previewUrl, enabled } = options

  // 编辑模式状态
  const isEditMode = ref(false)

  // 选中的元素列表
  const selectedElements = ref<SelectedElement[]>([])

  // 是否有待发送的选中元素
  const hasSelectedElements = computed(() => selectedElements.value.length > 0)

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

  // 移除选中的元素
  const removeElement = (elementId: string): void => {
    const index = selectedElements.value.findIndex((el) => el.id === elementId)
    if (index > -1) {
      selectedElements.value.splice(index, 1)
      editor?.clearSelection()
    }
  }

  // 清空所有选中元素
  const clearElements = (): void => {
    selectedElements.value = []
  }

  // 获取格式化的元素描述
  const getElementsDescription = (): string => {
    if (selectedElements.value.length === 0) return ''

    const descriptions = selectedElements.value.map((el, index) => {
      const parts = [`元素 ${index + 1}:`]

      if (el.elementId) {
        parts.push(`  ID: #${el.elementId}`)
      }
      if (el.className) {
        parts.push(`  类名: .${el.className.split(/\s+/).join('.')}`)
      }
      parts.push(`  标签: <${el.tagName}>`)
      if (el.textContent) {
        parts.push(`  内容: "${el.textContent}"`)
      }
      parts.push(`  选择器: ${el.selector}`)
      if (el.pagePath) {
        parts.push(`  页面路径: ${el.pagePath}`)
      }
      parts.push(
        `  位置: top=${el.rect.top}, left=${el.rect.left}, width=${el.rect.width}, height=${el.rect.height}`,
      )

      return parts.join('\n')
    })

    return `\n\n--- 用户选中的页面元素 ---\n${descriptions.join('\n\n')}\n--- 请根据这些元素信息修改对应的样式或内容 ---\n`
  }

  // 处理发送消息后的清理
  const handleAfterSend = (): void => {
    clearElements()
    exitEditMode()
  }

  // 初始化编辑器
  const initEditor = (): void => {
    if (!iframeRef.value) return

    editor = new VisualEditor({
      onElementSelected: (elementInfo: ElementInfo) => {
        // 检查是否已存在相同选择器的元素
        const exists = selectedElements.value.some((el) => el.selector === elementInfo.selector)
        if (!exists) {
          selectedElements.value.push(toSelectedElement(elementInfo))
        }
      },
      onElementHover: (elementInfo: ElementInfo) => {
        // 可以在这里处理悬浮提示
        console.log('[VisualEditor] Hover:', elementInfo.selector)
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
    selectedElements,
    hasSelectedElements,
    enterEditMode,
    exitEditMode,
    toggleEditMode,
    removeElement,
    clearElements,
    getElementsDescription,
    handleAfterSend,
  }
}

// 导出类型
export type { SelectedElement as VisualEditorSelectedElement }
export type { ElementInfo } from '@/utils/visualEditor'
