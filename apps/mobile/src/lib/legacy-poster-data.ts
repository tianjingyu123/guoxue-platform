import { PUBLIC_PAIPAN_SHARE_URL, publicLegacyShareUrl, type LegacyPosterPayload } from './legacy-paipan-share'
import type { PosterData } from '@/pkg-circle/lib/poster-data'

/** 只接收内存交接的公开页面；不把缺失内容伪装成默认邀请海报。 */
export function buildLegacyPosterData(payload: LegacyPosterPayload | null): PosterData {
  if (!payload || !publicLegacyShareUrl(payload.url)) throw new Error('分享内容已过期，请返回排盘页面重新生成')
  const isEntry = payload.url === PUBLIC_PAIPAN_SHARE_URL
  return {
    type: 'invite',
    title: isEntry ? '热卜排盘工具' : payload.title,
    subtitle: isEntry ? '工具入口' : '排盘页面分享',
    desc: isEntry ? '扫码打开排盘工具入口，不包含当前排盘结果。' : payload.description,
    author: '热卜', authorAvatar: '/static/logo.webp', qrcode: '',
    qrLabel: isEntry ? '扫码打开工具' : '扫码打开页面',
    tag: isEntry ? '工具入口' : '排盘分享',
    link: payload.url,
  }
}
