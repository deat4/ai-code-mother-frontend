/**
 * 可视化编辑器 Composable
 * 处理 iframe 通信、元素选中、编辑模式管理
 */
import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'

/**
 * 选中的元素信息
 */
export interface SelectedElement {
  /** 元素唯一标识（用于移除） */
  id: string
  /** 元素标签名 */
  tagName: string
  /** 元素类名 */
  className: string
  /** 元素 ID */
  elementId: string
  /** 元素文本内容（截取前 50 字符） */
  textContent: string
  /** 元素 CSS 选择器 */
  selector: string
  /** 元素的 XPath */
  xpath: string
  /** 截图 base64（可选） */
  screenshot?: string
}

/**
 * iframe 发送的消息类型
 */
interface IframeMessage {
  type: 'ELEMENT_HOVER' | 'ELEMENT_CLICK' | 'ELEMENT_LEAVE' | 'EDITOR_READY'
  payload?: SelectedElement
}

/**
 * 主窗口发送给 iframe 的消息类型
 */
interface HostMessage {
  type: 'START_EDIT_MODE' | 'STOP_EDIT_MODE' | 'REMOVE_HIGHLIGHT' | 'HIGHLIGHT_ELEMENT'
  payload?: { selector: string }
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
  /** 发送消息给 iframe */
  sendMessageToIframe: (message: HostMessage) => void
  /** 处理发送消息后的清理 */
  handleAfterSend: () => void
}

/**
 * 生成元素的唯一 ID
 */
function generateElementId(element: SelectedElement): string {
  return `${element.tagName}_${element.selector}_${Date.now()}`
}

/**
 * 生成 CSS 选择器
 */
function generateSelector(element: HTMLElement): string {
  // 优先使用 ID
  if (element.id) {
    return `#${CSS.escape(element.id)}`
  }

  // 尝试使用唯一的类名
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(Boolean)
    if (classes.length > 0) {
      return `.${classes.map((c) => CSS.escape(c)).join('.')}`
    }
  }

  // 使用标签名 + nth-child
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter((el) => el.tagName === element.tagName)
    const index = siblings.indexOf(element) + 1
    return `${element.tagName.toLowerCase()}:nth-child(${index})`
  }

  return element.tagName.toLowerCase()
}

/**
 * 生成 XPath
 */
function generateXPath(element: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1
    let sibling: Element | null = current.previousElementSibling

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }

    const tagName = current.tagName.toLowerCase()
    const indexStr = index > 1 ? `[${index}]` : ''
    parts.unshift(`${tagName}${indexStr}`)
    current = current.parentElement
  }

  return '/' + parts.join('/')
}

/**
 * 从 DOM 元素提取信息
 */
function extractElementInfo(element: HTMLElement): SelectedElement {
  const textContent = (element.textContent || '').trim().slice(0, 50)
  const selector = generateSelector(element)
  const xpath = generateXPath(element)

  const info: SelectedElement = {
    id: '',
    tagName: element.tagName.toLowerCase(),
    className: element.className || '',
    elementId: element.id || '',
    textContent,
    selector,
    xpath,
  }

  info.id = generateElementId(info)
  return info
}

/**
 * 注入到 iframe 的编辑脚本
 */
const EDITOR_INJECT_SCRIPT = `
(function() {
  // 避免重复注入
  if (window.__visualEditorInjected) return;
  window.__visualEditorInjected = true;

  let isEditMode = false;
  let hoveredElement = null;
  let selectedElements = new Set();
  let hoverOverlay = null;

  // 创建悬浮高亮层
  function createHoverOverlay() {
    if (hoverOverlay) return;
    hoverOverlay = document.createElement('div');
    hoverOverlay.id = '__visual_editor_hover_overlay__';
    hoverOverlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      border: 2px dashed #1890ff;
      background: rgba(24, 144, 255, 0.1);
      transition: all 0.1s ease;
      display: none;
    \`;
    document.body.appendChild(hoverOverlay);
  }

  // 创建选中高亮层
  function createSelectedOverlay(element, isSelected) {
    const overlay = document.createElement('div');
    overlay.className = '__visual_editor_selected_overlay__';
    overlay.dataset.selector = element.dataset.__selector || '';
    overlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      z-index: 999998;
      border: 2px solid \${isSelected ? '#52c41a' : '#faad14'};
      background: \${isSelected ? 'rgba(82, 196, 26, 0.15)' : 'rgba(250, 173, 20, 0.1)'};
      transition: all 0.15s ease;
    \`;
    
    const rect = element.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    
    document.body.appendChild(overlay);
    return overlay;
  }

  // 更新悬浮高亮位置
  function updateHoverOverlay(element) {
    if (!hoverOverlay || !element) {
      if (hoverOverlay) hoverOverlay.style.display = 'none';
      return;
    }
    
    const rect = element.getBoundingClientRect();
    hoverOverlay.style.display = 'block';
    hoverOverlay.style.left = rect.left + 'px';
    hoverOverlay.style.top = rect.top + 'px';
    hoverOverlay.style.width = rect.width + 'px';
    hoverOverlay.style.height = rect.height + 'px';
  }

  // 发送消息给父窗口
  function sendToParent(type, payload) {
    if (window.parent !== window) {
      window.parent.postMessage({ type, payload }, '*');
    }
  }

  // 生成元素选择器
  function generateSelector(element) {
    if (element.id) return '#' + CSS.escape(element.id);
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\\s+/).filter(Boolean);
      if (classes.length > 0) {
        return '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }
    
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
      const index = siblings.indexOf(element) + 1;
      return element.tagName.toLowerCase() + ':nth-child(' + index + ')';
    }
    
    return element.tagName.toLowerCase();
  }

  // 生成 XPath
  function generateXPath(element) {
    const parts = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const indexStr = index > 1 ? '[' + index + ']' : '';
      parts.unshift(tagName + indexStr);
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }

  // 提取元素信息
  function extractElementInfo(element) {
    const textContent = (element.textContent || '').trim().slice(0, 50);
    const selector = generateSelector(element);
    const xpath = generateXPath(element);
    
    return {
      id: element.tagName + '_' + selector + '_' + Date.now(),
      tagName: element.tagName.toLowerCase(),
      className: element.className || '',
      elementId: element.id || '',
      textContent: textContent,
      selector: selector,
      xpath: xpath
    };
  }

  // 鼠标移动处理
  function handleMouseMove(e) {
    if (!isEditMode) return;
    
    const target = e.target;
    if (target === hoverOverlay || target.classList.contains('__visual_editor_selected_overlay__')) return;
    
    if (hoveredElement !== target) {
      hoveredElement = target;
      updateHoverOverlay(target);
      sendToParent('ELEMENT_HOVER', extractElementInfo(target));
    }
  }

  // 鼠标离开处理
  function handleMouseLeave(e) {
    if (!isEditMode) return;
    
    if (e.target === document.body || e.target === document.documentElement) {
      hoveredElement = null;
      updateHoverOverlay(null);
      sendToParent('ELEMENT_LEAVE');
    }
  }

  // 点击处理
  function handleClick(e) {
    if (!isEditMode) return;
    
    const target = e.target;
    if (target === hoverOverlay || target.classList.contains('__visual_editor_selected_overlay__')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const selector = generateSelector(target);
    
    if (selectedElements.has(selector)) {
      // 取消选中
      selectedElements.delete(selector);
      target.dataset.__selected = 'false';
      // 移除对应的高亮层
      document.querySelectorAll('.__visual_editor_selected_overlay__').forEach(overlay => {
        if (overlay.dataset.selector === selector) {
          overlay.remove();
        }
      });
    } else {
      // 添加选中
      selectedElements.add(selector);
      target.dataset.__selected = 'true';
      target.dataset.__selector = selector;
      createSelectedOverlay(target, true);
      sendToParent('ELEMENT_CLICK', extractElementInfo(target));
    }
    
    return false;
  }

  // 启动编辑模式
  function startEditMode() {
    isEditMode = true;
    createHoverOverlay();
    document.body.style.cursor = 'crosshair';
    
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    document.addEventListener('click', handleClick, true);
  }

  // 停止编辑模式
  function stopEditMode() {
    isEditMode = false;
    document.body.style.cursor = '';
    
    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
    
    // 移除所有选中高亮
    document.querySelectorAll('.__visual_editor_selected_overlay__').forEach(el => el.remove());
    
    // 清理元素标记
    document.querySelectorAll('[data-__selected]').forEach(el => {
      delete el.dataset.__selected;
      delete el.dataset.__selector;
    });
    
    selectedElements.clear();
    hoveredElement = null;
    
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('mouseleave', handleMouseLeave, true);
    document.removeEventListener('click', handleClick, true);
  }

  // 监听来自父窗口的消息
  window.addEventListener('message', function(e) {
    const { type, payload } = e.data || {};
    
    switch (type) {
      case 'START_EDIT_MODE':
        startEditMode();
        break;
      case 'STOP_EDIT_MODE':
        stopEditMode();
        break;
      case 'REMOVE_HIGHLIGHT':
        if (payload && payload.selector) {
          selectedElements.delete(payload.selector);
          document.querySelectorAll('.__visual_editor_selected_overlay__').forEach(overlay => {
            if (overlay.dataset.selector === payload.selector) {
              overlay.remove();
            }
          });
        }
        break;
    }
  });

  // 通知父窗口编辑器已就绪
  sendToParent('EDITOR_READY');
  
  console.log('[Visual Editor] Injected and ready');
})();
`

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

  // 处理来自 iframe 的消息
  const handleMessage = (event: MessageEvent) => {
    // 安全检查：确保消息来自预期的源
    // 由于预览 URL 可能与主站同域，这里不做 origin 检查
    const message = event.data as IframeMessage | undefined
    if (!message || !message.type) return

    switch (message.type) {
      case 'ELEMENT_HOVER':
        // 可以在这里处理悬浮提示
        break

      case 'ELEMENT_CLICK':
        if (message.payload) {
          // 检查是否已存在
          const exists = selectedElements.value.some(
            (el) => el.selector === message.payload!.selector,
          )
          if (!exists) {
            selectedElements.value.push(message.payload)
          }
        }
        break

      case 'ELEMENT_LEAVE':
        // 可以在这里清理悬浮状态
        break

      case 'EDITOR_READY':
        // 编辑器就绪，如果当前在编辑模式，重新发送状态
        if (isEditMode.value) {
          sendMessageToIframe({ type: 'START_EDIT_MODE' })
        }
        break
    }
  }

  // 发送消息给 iframe
  const sendMessageToIframe = (message: HostMessage) => {
    const iframe = iframeRef.value
    if (!iframe || !iframe.contentWindow) return

    iframe.contentWindow.postMessage(message, '*')
  }

  // 进入编辑模式
  const enterEditMode = () => {
    if (enabled && !enabled.value) return
    isEditMode.value = true
    sendMessageToIframe({ type: 'START_EDIT_MODE' })
  }

  // 退出编辑模式
  const exitEditMode = () => {
    isEditMode.value = false
    sendMessageToIframe({ type: 'STOP_EDIT_MODE' })
  }

  // 切换编辑模式
  const toggleEditMode = () => {
    if (isEditMode.value) {
      exitEditMode()
    } else {
      enterEditMode()
    }
  }

  // 移除选中的元素
  const removeElement = (elementId: string) => {
    const index = selectedElements.value.findIndex((el) => el.id === elementId)
    if (index > -1) {
      const removed = selectedElements.value[index]
      selectedElements.value.splice(index, 1)

      // 通知 iframe 移除高亮
      if (removed) {
        sendMessageToIframe({
          type: 'REMOVE_HIGHLIGHT',
          payload: { selector: removed.selector },
        })
      }
    }
  }

  // 清空所有选中元素
  const clearElements = () => {
    selectedElements.value = []
    // 退出编辑模式会自动清理 iframe 中的高亮
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
      parts.push(`  XPath: ${el.xpath}`)

      return parts.join('\n')
    })

    return `\n\n--- 用户选中的页面元素 ---\n${descriptions.join('\n\n')}\n--- 请根据这些元素信息修改对应的样式或内容 ---\n`
  }

  // 处理发送消息后的清理
  const handleAfterSend = () => {
    clearElements()
    exitEditMode()
  }

  // 注入编辑脚本到 iframe
  const injectEditorScript = () => {
    const iframe = iframeRef.value
    if (!iframe || !iframe.contentWindow) return

    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document
      const script = doc.createElement('script')
      script.textContent = EDITOR_INJECT_SCRIPT
      doc.body.appendChild(script)
      console.log('[Visual Editor] Script injected successfully (same-origin)')
    } catch (error) {
      // 如果无法访问 iframe 内容（跨域），则无法注入
      console.warn(
        '[Visual Editor] Cannot access iframe content (cross-origin), script injection failed',
        error,
      )
    }
  }

  // 监听 iframe 加载完成
  const handleIframeLoad = () => {
    // 尝试注入编辑脚本
    injectEditorScript()

    // 如果当前在编辑模式，重新发送状态
    if (isEditMode.value) {
      sendMessageToIframe({ type: 'START_EDIT_MODE' })
    }
  }

  // 设置 iframe 事件监听
  const setupIframeListeners = () => {
    const iframe = iframeRef.value
    if (!iframe) return

    iframe.addEventListener('load', handleIframeLoad)
  }

  // 清理 iframe 事件监听
  const cleanupIframeListeners = () => {
    const iframe = iframeRef.value
    if (!iframe) return

    iframe.removeEventListener('load', handleIframeLoad)
  }

  // 组件挂载时设置监听
  onMounted(() => {
    window.addEventListener('message', handleMessage)
    setupIframeListeners()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
    cleanupIframeListeners()
    if (isEditMode.value) {
      exitEditMode()
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
    sendMessageToIframe,
    handleAfterSend,
  }
}

// 导出类型
export type { SelectedElement as VisualEditorSelectedElement }
