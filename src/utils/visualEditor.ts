/**
 * 可视化编辑器
 * 负责管理 iframe 内的可视化编辑功能
 */

/**
 * 元素信息接口
 */
export interface ElementInfo {
  /** 元素标签名 */
  tagName: string
  /** 元素 ID */
  id: string
  /** 元素类名 */
  className: string
  /** 元素文本内容 */
  textContent: string
  /** CSS 选择器 */
  selector: string
  /** 页面路径（查询参数和锚点） */
  pagePath: string
  /** 元素位置信息 */
  rect: {
    top: number
    left: number
    width: number
    height: number
  }
  /** 编辑前的原始内容（可选） */
  originalContent?: string
  /** 编辑后的内容（可选） */
  editedContent?: string
}

/**
 * 编辑结果接口
 */
export interface EditResult {
  /** 元素信息 */
  elementInfo: ElementInfo
  /** 原始内容 */
  originalContent: string
  /** 编辑后的内容 */
  editedContent: string
}

/**
 * 可视化编辑器选项
 */
export interface VisualEditorOptions {
  /** 元素选中回调 */
  onElementSelected?: (elementInfo: ElementInfo) => void
  /** 元素悬浮回调 */
  onElementHover?: (elementInfo: ElementInfo) => void
  /** 编辑模式状态变化回调 */
  onEditModeChange?: (isEditMode: boolean) => void
  /** 直接编辑完成回调 */
  onEditComplete?: (editResult: EditResult) => void
  /** 直接编辑模式变化回调 */
  onDirectEditModeChange?: (isDirectEdit: boolean) => void
}

/**
 * iframe 消息类型
 */
interface IframeMessage {
  type: string
  data?: {
    elementInfo?: ElementInfo
    editResult?: EditResult
  }
}

/**
 * 主窗口发送给 iframe 的消息类型
 */
interface HostMessage {
  type: 'TOGGLE_EDIT_MODE' | 'CLEAR_SELECTION' | 'CLEAR_ALL_EFFECTS' | 'START_DIRECT_EDIT' | 'END_DIRECT_EDIT'
  editMode?: boolean
}

/**
 * 可视化编辑器类
 */
export class VisualEditor {
  private iframe: HTMLIFrameElement | null = null
  private isEditMode = false
  private isDirectEdit = false
  private options: VisualEditorOptions
  private messageHandler: ((event: MessageEvent) => void) | null = null

  constructor(options: VisualEditorOptions = {}) {
    this.options = options
  }

  /**
   * 初始化编辑器
   */
  init(iframe: HTMLIFrameElement): void {
    this.iframe = iframe
    this.setupMessageListener()
  }

  /**
   * 开启编辑模式
   */
  enableEditMode(): void {
    if (!this.iframe) return

    this.isEditMode = true
    this.options.onEditModeChange?.(true)

    // 延迟注入，确保 iframe 已加载
    setTimeout(() => {
      this.injectEditScript()
    }, 300)
  }

  /**
   * 关闭编辑模式
   */
  disableEditMode(): void {
    this.isEditMode = false
    this.isDirectEdit = false
    this.options.onEditModeChange?.(false)
    this.options.onDirectEditModeChange?.(false)

    this.sendMessageToIframe({
      type: 'TOGGLE_EDIT_MODE',
      editMode: false,
    })

    // 清除所有编辑状态
    this.sendMessageToIframe({
      type: 'CLEAR_ALL_EFFECTS',
    })
  }

  /**
   * 开启直接编辑模式（给选中元素添加 contentEditable）
   */
  startDirectEdit(): void {
    if (!this.iframe || !this.isEditMode) return

    this.isDirectEdit = true
    this.options.onDirectEditModeChange?.(true)

    this.sendMessageToIframe({
      type: 'START_DIRECT_EDIT',
    })
  }

  /**
   * 结束直接编辑模式
   */
  endDirectEdit(): void {
    this.isDirectEdit = false
    this.options.onDirectEditModeChange?.(false)

    this.sendMessageToIframe({
      type: 'END_DIRECT_EDIT',
    })
  }

  /**
   * 获取直接编辑模式状态
   */
  getDirectEditMode(): boolean {
    return this.isDirectEdit
  }

  /**
   * 切换编辑模式
   */
  toggleEditMode(): boolean {
    if (this.isEditMode) {
      this.disableEditMode()
    } else {
      this.enableEditMode()
    }
    return this.isEditMode
  }

  /**
   * 获取当前编辑模式状态
   */
  getEditMode(): boolean {
    return this.isEditMode
  }

  /**
   * 强制同步状态并清理
   */
  syncState(): void {
    if (!this.isEditMode) {
      this.sendMessageToIframe({
        type: 'CLEAR_ALL_EFFECTS',
      })
    }
  }

  /**
   * 清除选中的元素
   */
  clearSelection(): void {
    this.sendMessageToIframe({
      type: 'CLEAR_SELECTION',
    })
  }

  /**
   * 销毁编辑器
   */
  destroy(): void {
    if (this.isEditMode) {
      this.disableEditMode()
    }
    this.removeMessageListener()
    this.iframe = null
  }

  /**
   * iframe 加载完成时调用
   */
  onIframeLoad(): void {
    if (this.isEditMode) {
      setTimeout(() => {
        this.injectEditScript()
      }, 500)
    } else {
      // 确保非编辑模式时清理状态
      setTimeout(() => {
        this.syncState()
      }, 500)
    }
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      this.handleIframeMessage(event)
    }
    window.addEventListener('message', this.messageHandler)
  }

  /**
   * 移除消息监听器
   */
  private removeMessageListener(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }
  }

  /**
   * 处理来自 iframe 的消息
   */
  private handleIframeMessage(event: MessageEvent): void {
    const message = event.data as IframeMessage | undefined
    if (!message?.type) return

    const { type, data } = message

    switch (type) {
      case 'ELEMENT_SELECTED':
        if (this.options.onElementSelected && data?.elementInfo) {
          this.options.onElementSelected(data.elementInfo)
        }
        break
      case 'ELEMENT_HOVER':
        if (this.options.onElementHover && data?.elementInfo) {
          this.options.onElementHover(data.elementInfo)
        }
        break
      case 'EDIT_COMPLETE':
        if (this.options.onEditComplete && data?.editResult) {
          this.options.onEditComplete(data.editResult)
          // 结束直接编辑模式
          this.isDirectEdit = false
          this.options.onDirectEditModeChange?.(false)
        }
        break
    }
  }

  /**
   * 向 iframe 发送消息
   */
  private sendMessageToIframe(message: HostMessage): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*')
    }
  }

  /**
   * 注入编辑脚本到 iframe
   */
  private injectEditScript(): void {
    if (!this.iframe) return

    const waitForIframeLoad = (): void => {
      try {
        if (this.iframe!.contentWindow && this.iframe!.contentDocument) {
          // 检查是否已经注入过脚本
          if (this.iframe!.contentDocument.getElementById('visual-edit-script')) {
            this.sendMessageToIframe({
              type: 'TOGGLE_EDIT_MODE',
              editMode: true,
            })
            return
          }

          const script = this.generateEditScript()
          const scriptElement = this.iframe!.contentDocument.createElement('script')
          scriptElement.id = 'visual-edit-script'
          scriptElement.textContent = script
          this.iframe!.contentDocument.head.appendChild(scriptElement)

          console.log('[VisualEditor] Script injected successfully')
        } else {
          setTimeout(waitForIframeLoad, 100)
        }
      } catch (error) {
        console.warn('[VisualEditor] Cannot access iframe content (cross-origin)', error)
      }
    }

    waitForIframeLoad()
  }

  /**
   * 生成编辑脚本内容
   */
  private generateEditScript(): string {
    return `
(function() {
  // 避免重复注入
  if (window.__visualEditorInjected) return;
  window.__visualEditorInjected = true;

  let isEditMode = true;
  let isDirectEdit = false;
  let currentHoverElement = null;
  let currentSelectedElement = null;
  let originalContent = '';

  /**
   * 注入编辑模式样式
   */
  function injectStyles() {
    if (document.getElementById('edit-mode-styles')) return;

    const style = document.createElement('style');
    style.id = 'edit-mode-styles';
    style.textContent = \`
      .edit-hover {
        outline: 2px dashed #1890ff !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
        transition: outline 0.2s ease !important;
        position: relative !important;
      }
      .edit-hover::before {
        content: '' !important;
        position: absolute !important;
        top: -4px !important;
        left: -4px !important;
        right: -4px !important;
        bottom: -4px !important;
        background: rgba(24, 144, 255, 0.05) !important;
        pointer-events: none !important;
        z-index: -1 !important;
      }
      .edit-selected {
        outline: 3px solid #52c41a !important;
        outline-offset: 2px !important;
        cursor: default !important;
        position: relative !important;
      }
      .edit-selected::before {
        content: '' !important;
        position: absolute !important;
        top: -4px !important;
        left: -4px !important;
        right: -4px !important;
        bottom: -4px !important;
        background: rgba(82, 196, 26, 0.05) !important;
        pointer-events: none !important;
        z-index: -1 !important;
      }
      .direct-editing {
        outline: 3px solid #faad14 !important;
        outline-offset: 2px !important;
        background: rgba(250, 173, 20, 0.1) !important;
      }
      .direct-edit-hint {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(250, 173, 20, 0.3);
      }
    \`;
    document.head.appendChild(style);
  }

  /**
   * 生成元素选择器
   */
  function generateSelector(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += '#' + CSS.escape(current.id);
        path.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c && !c.startsWith('edit-'));
        if (classes.length > 0) {
          selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
      }

      const siblings = Array.from(current.parentElement?.children || []);
      const index = siblings.indexOf(current) + 1;
      selector += ':nth-child(' + index + ')';
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * 获取元素信息
   */
  function getElementInfo(element) {
    const rect = element.getBoundingClientRect();
    // 获取页面路径（查询参数和锚点）
    let pagePath = window.location.search + window.location.hash;
    if (!pagePath) {
      pagePath = '';
    }

    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      textContent: (element.textContent || '').trim().substring(0, 100),
      selector: generateSelector(element),
      pagePath: pagePath,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  }

  /**
   * 清除悬浮效果
   */
  function clearHoverEffect() {
    if (currentHoverElement) {
      currentHoverElement.classList.remove('edit-hover');
      currentHoverElement = null;
    }
  }

  /**
   * 清除选中效果
   */
  function clearSelectedEffect() {
    const selected = document.querySelectorAll('.edit-selected');
    selected.forEach(el => el.classList.remove('edit-selected'));
    currentSelectedElement = null;
  }

  /**
   * 显示编辑模式提示
   */
  function showEditTip() {
    if (document.getElementById('edit-tip')) return;

    const tip = document.createElement('div');
    tip.id = 'edit-tip';
    tip.innerHTML = '🎯 编辑模式已开启<br/>点击选中元素，双击直接编辑';
    tip.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
      animation: editTipFadeIn 0.3s ease;
    \`;

    const style = document.createElement('style');
    style.textContent = \`
      @keyframes editTipFadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    \`;
    document.head.appendChild(style);
    document.body.appendChild(tip);

    // 3秒后自动消失
    setTimeout(() => {
      if (tip.parentNode) {
        tip.style.animation = 'editTipFadeIn 0.3s ease reverse';
        setTimeout(() => tip.remove(), 300);
      }
    }, 3000);
  }

  /**
   * 隐藏编辑模式提示
   */
  function hideEditTip() {
    const tip = document.getElementById('edit-tip');
    if (tip) tip.remove();
  }

  /**
   * 开启直接编辑模式
   */
  function startDirectEdit() {
    if (!currentSelectedElement) return;

    isDirectEdit = true;
    originalContent = currentSelectedElement.textContent || '';

    // 添加编辑样式
    currentSelectedElement.classList.add('direct-editing');
    currentSelectedElement.contentEditable = 'true';
    currentSelectedElement.focus();

    // 显示提示
    const hint = document.createElement('div');
    hint.id = 'direct-edit-hint';
    hint.className = 'direct-edit-hint';
    hint.textContent = '编辑中... 点击其他地方完成编辑';
    document.body.appendChild(hint);
  }

  /**
   * 结束直接编辑模式
   */
  function endDirectEdit() {
    if (!currentSelectedElement || !isDirectEdit) return;

    const editedContent = currentSelectedElement.textContent || '';
    const elementInfo = getElementInfo(currentSelectedElement);

    // 移除编辑状态
    currentSelectedElement.contentEditable = 'false';
    currentSelectedElement.classList.remove('direct-editing');
    isDirectEdit = false;

    // 移除提示
    const hint = document.getElementById('direct-edit-hint');
    if (hint) hint.remove();

    // 如果内容有变化，发送编辑结果
    if (editedContent !== originalContent) {
      try {
        window.parent.postMessage({
          type: 'EDIT_COMPLETE',
          data: {
            editResult: {
              elementInfo: elementInfo,
              originalContent: originalContent,
              editedContent: editedContent
            }
          }
        }, '*');
      } catch { /* 静默处理 */ }
    }
  }

  let eventListenersAdded = false;

  /**
   * 添加事件监听器
   */
  function addEventListeners() {
    if (eventListenersAdded) return;

    const mouseoverHandler = (event) => {
      if (!isEditMode || isDirectEdit) return;

      const target = event.target;
      if (target === currentHoverElement || target === currentSelectedElement) return;
      if (target === document.body || target === document.documentElement) return;
      if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;

      clearHoverEffect();
      target.classList.add('edit-hover');
      currentHoverElement = target;

      // 发送悬浮信息给父窗口
      const elementInfo = getElementInfo(target);
      try {
        window.parent.postMessage({
          type: 'ELEMENT_HOVER',
          data: { elementInfo }
        }, '*');
      } catch { /* 静默处理 */ }
    };

    const mouseoutHandler = (event) => {
      if (!isEditMode || isDirectEdit) return;

      const target = event.target;
      if (!event.relatedTarget || !target.contains(event.relatedTarget)) {
        clearHoverEffect();
      }
    };

    const clickHandler = (event) => {
      if (!isEditMode || isDirectEdit) return;

      event.preventDefault();
      event.stopPropagation();

      const target = event.target;
      if (target === document.body || target === document.documentElement) return;
      if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;

      // 如果点击的是已选中的元素，取消选中
      if (target.classList.contains('edit-selected')) {
        target.classList.remove('edit-selected');
        if (currentSelectedElement === target) {
          currentSelectedElement = null;
        }
        return;
      }

      // 清除之前的选中
      clearSelectedEffect();
      clearHoverEffect();

      // 添加选中效果
      target.classList.add('edit-selected');
      currentSelectedElement = target;

      // 发送选中信息给父窗口
      const elementInfo = getElementInfo(target);
      try {
        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          data: { elementInfo }
        }, '*');
      } catch { /* 静默处理 */ }
    };

    const dblclickHandler = (event) => {
      if (!isEditMode) return;

      event.preventDefault();
      event.stopPropagation();

      const target = event.target;
      if (target === document.body || target === document.documentElement) return;
      if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;

      // 如果没有选中，先选中
      if (!currentSelectedElement || currentSelectedElement !== target) {
        clearSelectedEffect();
        clearHoverEffect();
        target.classList.add('edit-selected');
        currentSelectedElement = target;
      }

      // 开启直接编辑
      startDirectEdit();
    };

    const blurHandler = (event) => {
      if (isDirectEdit && currentSelectedElement === event.target) {
        endDirectEdit();
      }
    };

    document.body.addEventListener('mouseover', mouseoverHandler, true);
    document.body.addEventListener('mouseout', mouseoutHandler, true);
    document.body.addEventListener('click', clickHandler, true);
    document.body.addEventListener('dblclick', dblclickHandler, true);
    document.body.addEventListener('blur', blurHandler, true);
    eventListenersAdded = true;
  }

  /**
   * 监听父窗口消息
   */
  window.addEventListener('message', (event) => {
    const { type, editMode } = event.data;

    switch (type) {
      case 'TOGGLE_EDIT_MODE':
        isEditMode = editMode;
        if (isEditMode) {
          injectStyles();
          addEventListeners();
          showEditTip();
        } else {
          clearHoverEffect();
          clearSelectedEffect();
          hideEditTip();
          // 结束直接编辑
          if (isDirectEdit && currentSelectedElement) {
            currentSelectedElement.contentEditable = 'false';
            currentSelectedElement.classList.remove('direct-editing');
            isDirectEdit = false;
            const hint = document.getElementById('direct-edit-hint');
            if (hint) hint.remove();
          }
        }
        break;
      case 'CLEAR_SELECTION':
        clearSelectedEffect();
        break;
      case 'CLEAR_ALL_EFFECTS':
        isEditMode = false;
        clearHoverEffect();
        clearSelectedEffect();
        hideEditTip();
        if (isDirectEdit && currentSelectedElement) {
          currentSelectedElement.contentEditable = 'false';
          currentSelectedElement.classList.remove('direct-editing');
          isDirectEdit = false;
          const hint = document.getElementById('direct-edit-hint');
          if (hint) hint.remove();
        }
        break;
      case 'START_DIRECT_EDIT':
        startDirectEdit();
        break;
      case 'END_DIRECT_EDIT':
        endDirectEdit();
        break;
    }
  });

  // 初始化
  injectStyles();
  addEventListeners();
  showEditTip();
})();
    `
  }
}
