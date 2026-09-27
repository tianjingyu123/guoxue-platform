/** 保留回答原意，只做适合手机阅读的渐进展示；不凭空生成摘要。 */
export function presentAiAnswer(value: string): { lead: string; detail: string } {
  const content = String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .trim()

  if (content.length <= 140) return { lead: content, detail: '' }

  const firstBreak = content.indexOf('\n')
  let split = firstBreak >= 24 && firstBreak <= 140 ? firstBreak : -1
  if (split < 0) {
    const sentences = /[。！？!?](?:[”’"'])?/g
    for (const match of content.matchAll(sentences)) {
      const end = (match.index || 0) + match[0].length
      if (end >= 12 && end <= 140) { split = end; break }
    }
  }

  // 找不到完整自然断句时不硬截断，以免把古文、引文或事实切坏。
  if (split < 0) return { lead: content, detail: '' }
  const detail = content.slice(split).trim()
  if (detail.length < 36) return { lead: content, detail: '' }
  return { lead: content.slice(0, split).trim(), detail }
}
