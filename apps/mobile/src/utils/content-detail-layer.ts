/**
 * H5 内容详情层
 *
 * 内容卡点击后不立即销毁列表页，而是从卡片原位放大为全屏详情；
 * 关闭时再缩回原卡片。小程序/App 不执行 DOM 分支，调用方自动降级为正常路由。
 */

let closeActiveLayer: (() => void) | null = null

const CONTENT_LAYER_CLOSE_MESSAGE = 'gx-content-layer-close'

/** H5 内嵌详情页通知父级收起；普通 H5、小程序、App 返回 false。 */
export function requestParentContentLayerClose(): boolean {
  let handled = false
  // #ifdef H5
  if (
    typeof window !== 'undefined'
    && window.self !== window.top
    && new URLSearchParams(window.location.search).has('__contentLayer')
  ) {
    window.parent.postMessage({ type: CONTENT_LAYER_CLOSE_MESSAGE }, window.location.origin)
    handled = true
  }
  // #endif
  return handled
}

function elementLike(value: unknown): HTMLElement | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as { $el?: unknown }).$el || value
  if (
    raw
    && typeof raw === 'object'
    && typeof (raw as HTMLElement).closest === 'function'
    && typeof (raw as HTMLElement).getBoundingClientRect === 'function'
  ) {
    return raw as HTMLElement
  }
  return null
}

function sourceElement(source: unknown): HTMLElement | null {
  const direct = elementLike(source)
  if (direct) return direct
  if (!source || typeof source !== 'object') return null

  const candidate = source as {
    currentTarget?: unknown
    target?: unknown
    $el?: unknown
    clientX?: number
    clientY?: number
    changedTouches?: ArrayLike<{ clientX?: number; clientY?: number }>
    composedPath?: () => unknown[]
  }
  const fromFields = [
    elementLike(candidate.currentTarget),
    elementLike(candidate.$el),
    elementLike(candidate.target),
  ].find(Boolean)
  if (fromFields) return fromFields

  if (typeof candidate.composedPath === 'function') {
    const fromPath = candidate.composedPath().map(elementLike).find(Boolean)
    if (fromPath) return fromPath
  }

  const touch = candidate.changedTouches?.[0]
  const clientX = candidate.clientX ?? touch?.clientX
  const clientY = candidate.clientY ?? touch?.clientY
  if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
    const fromPoint = document.elementFromPoint(Number(clientX), Number(clientY))
    if (fromPoint) return fromPoint as HTMLElement
  }

  return document.querySelector('[data-content-card]:hover') as HTMLElement | null
}

function contentUrl(target: string): string {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const path = target.replace(/^\//, '')
  const separator = target.includes('?') ? '&' : '?'
  return new URL(`${base}${path}${separator}__contentLayer=1`, window.location.origin).toString()
}

/** 支持原位详情层的真实内容详情页；工具、聊天、交易流程不在这里拦截。 */
export function isContentDetailTarget(target: string): boolean {
  const path = target.split('?')[0]
  return [
    '/pkg-video/watch/index',
    '/pkg-video/detail/index',
    '/pkg-circle/articles/detail',
    '/pkg-circle/circles/post',
    '/pkg-course/detail/index',
    '/pkg-mall/product/detail',
    '/pkg-classics/detail/index',
    '/pkg-live/watch/index',
    '/pkg-live/replay-detail/index',
  ].includes(path)
}

/**
 * 成功打开返回 true；不满足 H5/来源卡片/详情路由条件时返回 false，
 * 调用方应继续执行原 navigateTo。
 */
export function tryOpenContentDetailLayer(target: string, source?: unknown): boolean {
  let opened = false

  // #ifdef H5
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (window.self !== window.top) return false
  if (new URLSearchParams(window.location.search).has('__contentLayer')) return false
  if (!isContentDetailTarget(target)) return false

  const sourceNode = sourceElement(source)?.closest('[data-content-card]') as HTMLElement | null
  if (!sourceNode) return false

  const sourceRect = sourceNode.getBoundingClientRect()
  if (sourceRect.width < 24 || sourceRect.height < 24) {
    return false
  }

  closeActiveLayer?.()

  const shell = (document.querySelector('uni-app') || document.body) as HTMLElement
  const shellRect = shell.getBoundingClientRect()
  const localLeft = sourceRect.left - shellRect.left
  const localTop = sourceRect.top - shellRect.top
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 380
  const easing = 'cubic-bezier(0.22, 0.78, 0.18, 1)'
  const previousBodyOverflow = document.body.style.overflow
  const previousSourceOpacity = sourceNode.style.opacity
  const previousSourcePointerEvents = sourceNode.style.pointerEvents

  const layer = document.createElement('section')
  layer.className = 'gx-content-detail-layer'
  layer.setAttribute('role', 'dialog')
  layer.setAttribute('aria-modal', 'true')
  layer.setAttribute('aria-label', '内容详情')
  Object.assign(layer.style, {
    position: 'fixed',
    zIndex: '10020',
    left: `${localLeft}px`,
    top: `${localTop}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    overflow: 'hidden',
    borderRadius: window.getComputedStyle(sourceNode).borderRadius || '14px',
    background: '#FAF8F5',
    boxShadow: '0 12px 40px rgba(42, 31, 20, 0.20)',
    transformOrigin: 'center center',
    transition: `left ${duration}ms ${easing}, top ${duration}ms ${easing}, width ${duration}ms ${easing}, height ${duration}ms ${easing}, border-radius ${duration}ms ${easing}, box-shadow ${duration}ms ease`,
  })

  const cardClone = sourceNode.cloneNode(true) as HTMLElement
  cardClone.removeAttribute('id')
  cardClone.setAttribute('aria-hidden', 'true')
  Object.assign(cardClone.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    margin: '0',
    pointerEvents: 'none',
    overflow: 'hidden',
    transition: `opacity ${Math.max(1, Math.round(duration * 0.42))}ms ease`,
  })

  const loadingLine = document.createElement('div')
  Object.assign(loadingLine.style, {
    position: 'absolute',
    zIndex: '4',
    left: '0',
    top: '0',
    width: '34%',
    height: '2px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, transparent, #C41E3A, #C9A96E, transparent)',
    animation: duration > 1 ? 'gx-content-layer-loading 1.1s ease-in-out infinite' : 'none',
  })

  if (!document.getElementById('gx-content-layer-style')) {
    const style = document.createElement('style')
    style.id = 'gx-content-layer-style'
    style.textContent = `
      @keyframes gx-content-layer-loading {
        0% { transform: translateX(-110%); }
        100% { transform: translateX(300%); }
      }
      .gx-content-detail-layer iframe { color-scheme: light; }
      .gx-content-detail-layer > button:focus-visible {
        outline: 3px solid rgba(196, 30, 58, 0.35) !important;
        outline-offset: 2px !important;
      }
      html.gx-content-reader-open .bottom-nav {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `
    document.head.appendChild(style)
  }

  const frame = document.createElement('iframe')
  frame.title = '内容详情'
  frame.src = contentUrl(target)
  frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture')
  Object.assign(frame.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2',
    width: '100%',
    height: '100%',
    border: '0',
    opacity: '0',
    background: '#FAF8F5',
    transition: `opacity ${Math.max(1, Math.round(duration * 0.46))}ms ease`,
  })

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', '收起内容详情')
  closeButton.textContent = '‹'
  Object.assign(closeButton.style, {
    position: 'absolute',
    zIndex: '5',
    left: '-13px',
    top: '50%',
    width: '42px',
    height: '62px',
    padding: '0 0 2px 10px',
    border: '1px solid rgba(128, 107, 78, 0.18)',
    borderLeft: '0',
    borderRadius: '0 22px 22px 0',
    color: '#2C2C2C',
    background: 'rgba(255, 253, 249, 0.88)',
    boxShadow: '4px 2px 18px rgba(44, 35, 24, 0.10)',
    backdropFilter: 'blur(10px)',
    fontSize: '34px',
    fontFamily: 'Georgia, serif',
    fontWeight: '400',
    lineHeight: '58px',
    opacity: '0',
    transform: 'translate(-7px, -50%)',
    transition: `opacity ${Math.max(1, Math.round(duration * 0.38))}ms ease, transform ${Math.max(1, Math.round(duration * 0.38))}ms ${easing}`,
    cursor: 'pointer',
  })

  let closing = false
  let historyEntryActive = false
  const cleanup = () => {
    document.documentElement.classList.remove('gx-content-reader-open')
    layer.remove()
    sourceNode.style.opacity = previousSourceOpacity
    sourceNode.style.pointerEvents = previousSourcePointerEvents
    document.body.style.overflow = previousBodyOverflow
    document.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('message', onMessage)
    window.removeEventListener('popstate', onPopState)
    if (closeActiveLayer === requestClose) closeActiveLayer = null
  }

  const close = () => {
    if (closing) return
    closing = true
    const currentRect = sourceNode.getBoundingClientRect()
    const currentShellRect = shell.getBoundingClientRect()
    cardClone.style.opacity = '1'
    frame.style.opacity = '0'
    closeButton.style.opacity = '0'
    closeButton.style.transform = 'translate(-7px, -50%)'
    loadingLine.style.opacity = '0'
    Object.assign(layer.style, {
      left: `${currentRect.left - currentShellRect.left}px`,
      top: `${currentRect.top - currentShellRect.top}px`,
      width: `${currentRect.width}px`,
      height: `${currentRect.height}px`,
      borderRadius: window.getComputedStyle(sourceNode).borderRadius || '14px',
      boxShadow: '0 2px 12px rgba(42, 31, 20, 0.08)',
    })
    window.setTimeout(cleanup, duration + 40)
  }

  const requestClose = () => {
    if (closing) return
    if (historyEntryActive) {
      historyEntryActive = false
      window.history.back()
      return
    }
    close()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') requestClose()
  }
  const onMessage = (event: MessageEvent) => {
    if (
      event.origin === window.location.origin
      && event.source === frame.contentWindow
      && event.data?.type === CONTENT_LAYER_CLOSE_MESSAGE
    ) {
      requestClose()
    }
  }
  const onPopState = () => {
    historyEntryActive = false
    close()
  }

  closeButton.addEventListener('click', requestClose)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('message', onMessage)
  window.addEventListener('popstate', onPopState)
  window.history.pushState({ ...(window.history.state || {}), gxContentLayer: true }, '', window.location.href)
  historyEntryActive = true
  frame.addEventListener('load', () => {
    loadingLine.style.opacity = '0'
    frame.style.opacity = '1'
    cardClone.style.opacity = '0'
    closeButton.style.opacity = '0.78'
    closeButton.style.transform = 'translate(0, -50%)'
  }, { once: true })

  layer.append(cardClone, frame, loadingLine, closeButton)
  shell.appendChild(layer)
  // 内容详情层是沉浸式独立空间；打开期间隐藏列表页 Teleport 到 body 的全平台底部导航。
  // cleanup 已统一移除此状态，关闭详情时导航会随卡片缩回动画恢复。
  document.documentElement.classList.add('gx-content-reader-open')
  sourceNode.style.opacity = '0'
  sourceNode.style.pointerEvents = 'none'
  document.body.style.overflow = 'hidden'
  closeActiveLayer = requestClose

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      Object.assign(layer.style, {
        left: '0px',
        top: '0px',
        width: `${shellRect.width}px`,
        height: `${window.innerHeight}px`,
        borderRadius: '0px',
        boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
      })
    })
  })

  opened = true
  // #endif

  return opened
}
