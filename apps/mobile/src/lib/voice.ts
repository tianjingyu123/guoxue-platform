/**
 * 热卜国学 · 品牌声线（视觉签名系统批0 · 2026-07-17）
 *
 * 声线规范：
 * - 像一位可亲近的书院先生：温和、有文气、不掉书袋；短句、白话为骨、点到即止。
 * - 空态不说"暂无数据"（系统腔），说人话并给下一步去处。
 * - 全站同场景文案从这里取，禁止各页各写一套。
 *
 * 🔴 禁区（禁文艺化，必须直白准确）：
 * - 资金场景（支付/退款/提现/余额）：金额、状态、失败原因一字不装饰。
 * - 错误与合规场景（报错、审核驳回、协议、实名）：直说事实与解法，不绕弯。
 */
export const VOICE = {
  /* —— 空态 —— */
  EMPTY_DEFAULT: '这里还空着',
  EMPTY_FEED: '书案还空着，去发现页拾一篇好文',
  EMPTY_FAVORITES: '收藏夹里还没有藏品',
  EMPTY_SEARCH: '没寻到相关内容，换个词再试试',
  EMPTY_PAIPAN: '还没起过盘，从一盘开始',
  /* —— 加载 —— */
  LOADING: '研墨中…',
  LOADING_PAIPAN: '推演中…',
  LOADING_AI: '先生思考中…',
  /* —— 列表尾 —— */
  END: '已到卷尾',
  /* —— 轻提示（toast） —— */
  TOAST_CHECKIN: '今日功课，已记一笔',
  TOAST_PUBLISHED: '已发布，静候知音',
  TOAST_FOLLOWED: '已关注，常来常往',
  /* —— 下拉刷新 —— */
  REFRESH_NEW: '新卷已展，为你换了一批',
} as const

export type VoiceKey = keyof typeof VOICE
