const MENU_LABELS: Record<string, string> = {
  'group-more-style': '更多文字样式', 'group-justify': '段落对齐', 'group-indent': '段落缩进',
  'group-image': '插入图片', 'group-video': '插入视频', 'group-heading': '标题级别',
  fontSize: '字号', fontFamily: '字体', lineHeight: '行高', headerSelect: '段落格式',
}

export function editorMenuLabel(key: string, text: string, tooltip: string): string {
  const visible = text.replace(/\s+/g, ' ').trim()
  const title = tooltip.split('\n')[0].trim()
  if (MENU_LABELS[key]) return visible ? `${MENU_LABELS[key]}：${visible}` : MENU_LABELS[key]
  return visible || title
}

/** wangEditor v5 的图标标题在 data-tooltip 内，补为真正的可访问名称。 */
export function enhanceEditorAccessibility(root: HTMLElement) {
  // 编辑器内部也观察属性变化；同值反复写入会与分组菜单的 class 更新互相触发。
  function setAttributeOnce(element: HTMLElement, name: string, value: string) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value)
  }
  root.querySelectorAll<HTMLButtonElement>('button[data-menu-key]').forEach(button => {
    const label = editorMenuLabel(button.dataset.menuKey ?? '', button.textContent ?? '', button.dataset.tooltip ?? '')
    if (label) setAttributeOnce(button, 'aria-label', label)
    setAttributeOnce(button, 'aria-disabled', String(button.classList.contains('disabled')))
  })
  root.querySelectorAll<HTMLElement>('[contenteditable="true"]').forEach(body => {
    setAttributeOnce(body, 'role', 'textbox')
    setAttributeOnce(body, 'aria-label', '正文编辑区')
    setAttributeOnce(body, 'aria-multiline', 'true')
  })
}
