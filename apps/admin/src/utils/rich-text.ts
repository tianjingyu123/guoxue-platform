/** 仅判断正文是否为空；展示内容时仍需使用 SafeHtml 做安全过滤。 */
export function normalizeRichText(html: string): string {
  if (!html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, template').forEach(node => node.remove())
  const text = (doc.body.textContent || '').replace(/[\s\u200b-\u200d\uFEFF]/gu, '')
  const hasMedia = Array.from(doc.body.querySelectorAll('img, video, audio, source, iframe'))
    .some(node => Boolean(node.getAttribute('src')?.trim()))
  return text || hasMedia ? html : ''
}
