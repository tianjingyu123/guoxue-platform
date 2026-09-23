/** 兼容现有售后 reason 中的凭证段；独立字段需后续数据库方案。 */
export function parseAfterSaleEvidence(reason?: string | null): { reason: string; images: string[] } {
  const text = reason || ''
  const marker = '\n[凭证图片] '
  const at = text.lastIndexOf(marker)
  if (at < 0) return { reason: text, images: [] }
  const urls = text.slice(at + marker.length).trim().split(/\s+/)
  if (!urls.length || urls.length > 5 || urls.some((url) => !/^https?:\/\/[^\s]+$/i.test(url))) {
    return { reason: text, images: [] }
  }
  return { reason: text.slice(0, at), images: urls }
}
