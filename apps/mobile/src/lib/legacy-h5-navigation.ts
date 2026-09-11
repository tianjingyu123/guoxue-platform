/** 标记只属于当前浏览历史项，不保存第三方地址或登录凭据。 */
const RETURN_MARKER = '__rebuLegacyDeparted'

export function markLegacyDeparture(history: History): void {
  history.replaceState({ ...history.state, [RETURN_MARKER]: true }, '')
}

export function consumeLegacyReturn(history: History): boolean {
  if (!history.state?.[RETURN_MARKER]) return false
  const state = { ...history.state }
  delete state[RETURN_MARKER]
  history.replaceState(state, '')
  return true
}

export function validateLegacyNavigation(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['www.yrydai.com', 'www.yrydai.cn', 'yrydai.com', 'yrydai.cn'].includes(url.hostname)) {
    throw new Error('排盘工具地址未正确配置')
  }
  return url.href
}
