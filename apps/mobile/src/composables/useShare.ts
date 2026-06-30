/**
 * 全平台统一分享。
 * 病灶：海报三套各起炉灶、全平台零 onShareAppMessage、二维码静态。
 * 解药：统一分享内容结构 + 微信原生分享配置生成 + 统一海报页跳转。
 *
 * 用法（页面内）：
 *   import { useShare } from '@/composables/useShare'
 *   const { toAppMessage, toTimeline, openPoster } = useShare()
 *   // 微信小程序原生分享：
 *   onShareAppMessage(() => toAppMessage({ title: 课程.name, path: `/courses/${id}`, cover: 课程.cover }))
 *   // 生成分享海报：
 *   openPoster('course', id)
 */
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'

export interface ShareContent {
  title: string
  summary?: string
  /** 原型路径（分享落地后用 router 解析），如 /courses/123 */
  path: string
  /** 分享卡片缩略图 */
  cover?: string
}

export function useShare() {
  /** 生成 onShareAppMessage 返回值（好友/群） */
  function toAppMessage(c: ShareContent) {
    track.share('app_message', c.path)
    return { title: c.title, path: c.path, imageUrl: c.cover }
  }

  /** 生成 onShareTimeline 返回值（朋友圈） */
  function toTimeline(c: ShareContent) {
    track.share('timeline', c.path)
    const query = c.path.includes('?') ? c.path.split('?')[1] : ''
    return { title: c.title, query, imageUrl: c.cover }
  }

  /** 跳统一分享海报页（type+targetId，海报页含 Logo + 动态二维码） */
  function openPoster(type: string, id: string | number) {
    track.share('poster', id, { type })
    navigateTo(`/common/share-poster?type=${type}&targetId=${id}`)
  }

  return { toAppMessage, toTimeline, openPoster }
}
