/**
 * 图片 CDN 裁剪工具（腾讯云 COS 数据万象 imageMogr2）
 *
 * 背景（2026-07-17 性能审计实测）：列表封面直接加载原图（实测单张 101.6KB），
 * 追加 imageMogr2 缩略 + webp 后同图仅 12.2KB——列表页流量/解码开销约降一个数量级。
 *
 * 规则（只动 URL 生成，不碰任何懒加载/兜底逻辑）：
 * - 仅处理腾讯云 COS 域名（*.myqcloud.com）的 http(s) 图片；
 * - blob: / data: / 空值 / 非 COS 域名一律原样返回；
 * - URL 中已带 imageMogr2（上游已裁剪）不重复追加；
 * - 已有 query 用 & 连接，否则用 ?（数据万象两种写法均支持）。
 */
export function cdnImage(src: string | null | undefined, w = 400): string {
  if (!src || typeof src !== 'string') return ''
  const s = src.trim()
  if (!s) return ''
  // 本地对象 URL / 内联图不可裁剪，原样返回
  if (s.startsWith('blob:') || s.startsWith('data:')) return s
  // 仅 COS 域名（泛匹配 .myqcloud.com，覆盖 cos.ap-guangzhou.myqcloud.com 等各地域桶）
  if (!s.includes('.myqcloud.com')) return s
  // 已带裁剪参数不重复追加
  if (s.includes('imageMogr2')) return s
  const sep = s.includes('?') ? '&' : '?'
  return `${s}${sep}imageMogr2/thumbnail/${w}x/format/webp`
}
