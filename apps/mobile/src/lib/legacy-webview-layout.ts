/** 全部输入/输出均为逻辑像素；窗口原点与设备安全区不能重复扣减。 */
export function legacyWebviewLayout(info: {
  windowHeight?: number; windowTop?: number; statusBarHeight?: number;
  platform?: string;
  safeAreaInsets?: { top?: number };
}): { top: string; bottom: string; statusbar?: { background: string } } | null {
  const height = info.windowHeight
  const origin = info.windowTop ?? 0
  const status = info.statusBarHeight ?? 0
  const safeTop = info.safeAreaInsets?.top ?? 0
  if (![height, origin, status, safeTop].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return null
  const top = Math.max(0, status, safeTop) - Math.min(Math.max(0, status, safeTop), origin)
  if (height! <= top) return null
  // 由原生statusbar机制预留系统栏，避免手算top导致网页与裁切区域不一致。
  // https://www.html5plus.org/doc/zh_cn/webview.html#plus.webview.WebviewStyles
  if (info.platform === 'android') return { top: '0px', bottom: '0px', statusbar: { background: '#FAF8F5' } }
  // 不同时传 height，否则 bottom 被忽略。
  return { top: `${top}px`, bottom: '0px' }
}
