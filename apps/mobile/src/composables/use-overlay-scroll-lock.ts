import { onBeforeUnmount, watch, type WatchSource } from 'vue'

type InlineSnapshot = {
  bodyOverflow: string
  bodyPaddingRight: string
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyWidth: string
  htmlOverflow: string
  htmlOverscrollBehavior: string
  scrollX: number
  scrollY: number
}

export type OverlayAccessibilityOptions = {
  /** 按 Esc 时关闭当前最上层弹层。 */
  onEscape?: () => void
  /** 当前弹层的根容器，用于限制 Tab 焦点。 */
  focusContainerSelector?: string
  /** 弹层打开后优先聚焦的元素；未提供时聚焦首个可交互元素。 */
  initialFocusSelector?: string
}

type OverlayEntry = {
  token: symbol
  options: OverlayAccessibilityOptions
  restoreTarget: HTMLElement | null
  compensatedRoot: HTMLElement | null
  previousTranslate: string
  previousHeight: string
  previousBottom: string
  compensatedAncestors: Array<{
    element: HTMLElement
    previousMinHeight: string
  }>
}

let activeLocks = 0
let snapshot: InlineSnapshot | null = null
const overlayStack: OverlayEntry[] = []
let keyboardListenerInstalled = false

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[role="radio"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getScrollbarWidth() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
}

function lockDocumentScroll() {
  if (typeof document === 'undefined') return

  activeLocks += 1
  if (activeLocks > 1) return

  const body = document.body
  const html = document.documentElement
  snapshot = {
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyWidth: body.style.width,
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }

  const scrollbarWidth = getScrollbarWidth()
  // 仅设置 overflow:hidden 会让部分 H5/WebView 的根滚动位置归零。
  // 固定 body 并记录偏移，既能冻结底层页面，也能在关闭弹层后回到原阅读位置。
  body.style.position = 'fixed'
  body.style.top = `${-snapshot.scrollY}px`
  body.style.left = `${-snapshot.scrollX}px`
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  html.style.overflow = 'hidden'
  html.style.overscrollBehavior = 'none'
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`
  }
}

function unlockDocumentScroll() {
  if (typeof document === 'undefined' || activeLocks === 0) return

  activeLocks -= 1
  if (activeLocks > 0 || !snapshot) return

  const body = document.body
  const html = document.documentElement
  body.style.overflow = snapshot.bodyOverflow
  body.style.paddingRight = snapshot.bodyPaddingRight
  body.style.position = snapshot.bodyPosition
  body.style.top = snapshot.bodyTop
  body.style.left = snapshot.bodyLeft
  body.style.width = snapshot.bodyWidth
  html.style.overflow = snapshot.htmlOverflow
  html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior
  const { scrollX, scrollY } = snapshot
  snapshot = null
  window.scrollTo(scrollX, scrollY)
}

function queryLastElement(selector?: string) {
  if (!selector || typeof document === 'undefined') return null
  const matches = document.querySelectorAll<HTMLElement>(selector)
  return matches.length ? matches[matches.length - 1] : null
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.getAttribute('aria-hidden') !== 'true')
}

function focusElement(element: HTMLElement | null) {
  if (!element) return
  try {
    element.focus({ preventScroll: true })
  } catch {
    element.focus()
  }
}

function compensateTransformedAppOffset(entry: OverlayEntry, container: HTMLElement | null) {
  if (!container || typeof window === 'undefined') return

  let current: HTMLElement | null = container
  while (current && getComputedStyle(current).position !== 'fixed') {
    current = current.parentElement
  }
  if (!current) return

  const rect = current.getBoundingClientRect()
  const coversViewport = rect.height >= window.innerHeight - 2
  if (!coversViewport || Math.abs(rect.top) < 1) return

  const offset = -rect.top
  const requiredHeight = window.innerHeight + Math.max(0, offset)
  let ancestor = current.parentElement
  while (ancestor && ancestor !== document.documentElement) {
    const ancestorRect = ancestor.getBoundingClientRect()
    if (ancestorRect.bottom < window.innerHeight - 1) {
      entry.compensatedAncestors.push({
        element: ancestor,
        previousMinHeight: ancestor.style.minHeight,
      })
      ancestor.style.minHeight = `${Math.max(ancestorRect.height, requiredHeight)}px`
    }
    ancestor = ancestor.parentElement
  }

  // 桌面 H5 为限制应用宽度会给 uni-app 建立 transform 包含块。
  // 页面滚动后，fixed 弹层会跟着 uni-app 上移；补足祖先绘制高度后再用独立
  // translate 属性补回偏移，避免弹层在视口下半段被 uni-app 裁掉。
  entry.compensatedRoot = current
  entry.previousTranslate = current.style.translate
  entry.previousHeight = current.style.height
  entry.previousBottom = current.style.bottom
  current.style.height = `${window.innerHeight}px`
  current.style.bottom = 'auto'
  current.style.translate = `0 ${offset}px`
}

function handleOverlayKeydown(event: KeyboardEvent) {
  const entry = overlayStack[overlayStack.length - 1]
  if (!entry) return

  if (event.key === 'Escape' && entry.options.onEscape) {
    event.preventDefault()
    event.stopPropagation()
    entry.options.onEscape()
    return
  }

  if (event.key !== 'Tab' || !entry.options.focusContainerSelector) return

  const container = queryLastElement(entry.options.focusContainerSelector)
  if (!container) return

  const focusable = getFocusableElements(container)
  if (!focusable.length) {
    event.preventDefault()
    focusElement(container)
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (!(active instanceof HTMLElement) || !container.contains(active)) {
    event.preventDefault()
    focusElement(event.shiftKey ? last : first)
    return
  }

  if (event.shiftKey && active === first) {
    event.preventDefault()
    focusElement(last)
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    focusElement(first)
  }
}

function installKeyboardListener() {
  if (keyboardListenerInstalled || typeof document === 'undefined') return
  document.addEventListener('keydown', handleOverlayKeydown, true)
  keyboardListenerInstalled = true
}

function removeKeyboardListener() {
  if (!keyboardListenerInstalled || overlayStack.length || typeof document === 'undefined') return
  document.removeEventListener('keydown', handleOverlayKeydown, true)
  keyboardListenerInstalled = false
}

function registerOverlay(token: symbol, options: OverlayAccessibilityOptions) {
  if (typeof document === 'undefined' || overlayStack.some((entry) => entry.token === token)) return

  const active = document.activeElement
  const restoreTarget = active instanceof HTMLElement
    && active !== document.body
    && active !== document.documentElement
    ? active
    : null

  const entry: OverlayEntry = {
    token,
    options,
    restoreTarget,
    compensatedRoot: null,
    previousTranslate: '',
    previousHeight: '',
    previousBottom: '',
    compensatedAncestors: [],
  }
  overlayStack.push(entry)
  installKeyboardListener()

  if (typeof window === 'undefined') return
  window.requestAnimationFrame(() => {
    const entry = overlayStack[overlayStack.length - 1]
    if (!entry || entry.token !== token) return

    const container = queryLastElement(options.focusContainerSelector)
    compensateTransformedAppOffset(entry, container)
    const initial = queryLastElement(options.initialFocusSelector)
      || (container ? getFocusableElements(container)[0] : null)
      || container
    focusElement(initial)
  })
}

function unregisterOverlay(token: symbol) {
  const index = overlayStack.findIndex((entry) => entry.token === token)
  if (index < 0) return

  const wasTop = index === overlayStack.length - 1
  const [entry] = overlayStack.splice(index, 1)
  if (entry.compensatedRoot) {
    entry.compensatedRoot.style.translate = entry.previousTranslate
    entry.compensatedRoot.style.height = entry.previousHeight
    entry.compensatedRoot.style.bottom = entry.previousBottom
  }
  for (const item of entry.compensatedAncestors.reverse()) {
    item.element.style.minHeight = item.previousMinHeight
  }
  removeKeyboardListener()

  if (!wasTop || typeof window === 'undefined') return
  window.requestAnimationFrame(() => {
    if (entry.restoreTarget?.isConnected) {
      focusElement(entry.restoreTarget)
      return
    }

    const next = overlayStack[overlayStack.length - 1]
    const nextContainer = queryLastElement(next?.options.focusContainerSelector)
    focusElement(nextContainer ? getFocusableElements(nextContainer)[0] || nextContainer : null)
  })
}

/**
 * H5 弹层打开时锁住底层页面滚动，并为键盘用户维护焦点闭环。
 * 引用计数允许分享、购买等弹层叠加出现，不会被较早关闭的弹层提前解锁。
 * 小程序与 App 端仍由模板上的 touchmove 拦截和 scroll-view 独立滚动负责隔离。
 */
export function useOverlayScrollLock(
  open: WatchSource<boolean>,
  options: OverlayAccessibilityOptions = {},
) {
  let locked = false
  let accessibilityRegistered = false
  const token = Symbol('overlay')
  const hasAccessibilityOptions = Boolean(
    options.onEscape || options.focusContainerSelector || options.initialFocusSelector,
  )

  const stop = watch(
    open,
    (value) => {
      if (value && !locked) {
        lockDocumentScroll()
        locked = true
        if (hasAccessibilityOptions) {
          registerOverlay(token, options)
          accessibilityRegistered = true
        }
      } else if (!value && locked) {
        if (accessibilityRegistered) {
          unregisterOverlay(token)
          accessibilityRegistered = false
        }
        unlockDocumentScroll()
        locked = false
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    stop()
    if (accessibilityRegistered) {
      unregisterOverlay(token)
      accessibilityRegistered = false
    }
    if (locked) {
      unlockDocumentScroll()
      locked = false
    }
  })
}
