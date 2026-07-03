// V5 师徒传承（纯荣誉裂变）数据层
// 后端契约见 apps/server/src/modules/mentorship/mentorship.controller.ts（7 端点·已读源码核实）。
// 合规红线 R1：传道值（mentorshipPoints）是纯荣誉整数，不可兑换现金/国学币/任何财物，只上荣誉榜。
//   完全独立于分销 ReferralRelation/commission/settlement，本模块不涉及任何金额/币。
//
//   POST /mentorship/invite       （登录·师父）→ { inviteToken, shareUrl }
//   GET  /mentorship/invite/:token（公开）      → 师父招徒卡
//   POST /mentorship/accept       （登录·徒弟）  body { token, pledge? } → { mentorshipId, mentorNickname }
//   GET  /mentorship/my-mentor    （登录）      → 我的师父 | null
//   GET  /mentorship/my-disciples （登录·师父）  → { disciples, summary }
//   POST /mentorship/graduate     （登录·徒弟）  → { success }
//   GET  /mentorship/ranking      （公开）      → 传道值荣誉榜 TOP20

import { apiGet, apiPost } from '@/utils/request'

/** 师徒关系状态（后端 status 字段） */
export type MentorshipStatus = 'ACTIVE' | 'GRADUATED'

/** 师徒状态中文标签 */
export const MENTORSHIP_STATUS_LABEL: Record<MentorshipStatus, string> = {
  ACTIVE: '修习中',
  GRADUATED: '已出师',
}

/** 发起拜师邀请返回（POST /mentorship/invite） */
export interface MentorInviteResult {
  inviteToken: string
  shareUrl: string
}

/** 师父招徒卡（GET /mentorship/invite/:token·公开） */
export interface MentorInviteInfo {
  mentorNickname: string
  mentorLevel: number
  mentorTitle: string
  discipleCount: number
}

/** 拜师返回（POST /mentorship/accept） */
export interface AcceptMentorResult {
  mentorshipId: string
  mentorNickname: string
}

/** 我的师父（GET /mentorship/my-mentor·无则 null） */
export interface MyMentor {
  mentorNickname: string
  mentorLevel: number
  mentorTitle: string
  /** 拜师时间（ISO 字符串） */
  since: string
  /** 我为师父贡献的传道值（纯荣誉） */
  myContributedPoints: number
}

/** 徒弟项（GET /mentorship/my-disciples 中的 disciples 元素） */
export interface DiscipleItem {
  discipleNickname: string
  level: number
  status: MentorshipStatus
  /** 该徒累计贡献的传道值（纯荣誉） */
  contributedPoints: number
  since: string
}

/** 徒弟汇总（传道值总/在传/已出师） */
export interface DisciplesSummary {
  totalPoints: number
  activeCount: number
  graduatedCount: number
}

/** 我的徒弟（GET /mentorship/my-disciples） */
export interface MyDisciples {
  disciples: DiscipleItem[]
  summary: DisciplesSummary
}

/** 荣誉榜项（GET /mentorship/ranking） */
export interface RankingItem {
  mentorNickname: string
  mentorLevel: number
  /** 传道值（纯荣誉数字·不可兑换） */
  mentorshipPoints: number
  discipleCount: number
}

/** 师徒传承 API（真连后端·无 mock 回退；错误向上抛给页面走三态） */
export const mentorshipApi = {
  /** 生成拜师邀请链接（师父·token 7 天有效） */
  invite: () => apiPost<MentorInviteResult>('/mentorship/invite'),

  /** 拜师邀请落地页：师父招徒卡（公开·token 失效抛错） */
  getInvite: (token: string) => apiGet<MentorInviteInfo>(`/mentorship/invite/${token}`),

  /** 拜师（徒弟·无 ACTIVE 师父方可·pledge 拜师寄语选填） */
  accept: (token: string, pledge?: string) =>
    apiPost<AcceptMentorResult>('/mentorship/accept', { token, pledge }),

  /** 我的师父（ACTIVE·无则 null） */
  myMentor: () => apiGet<MyMentor | null>('/mentorship/my-mentor'),

  /** 我的徒弟列表 + 传道值汇总 */
  myDisciples: () => apiGet<MyDisciples>('/mentorship/my-disciples'),

  /** 出师（徒弟自主·满学分条件·未满后端抛 message） */
  graduate: () => apiPost<{ success: boolean }>('/mentorship/graduate'),

  /** 传道值荣誉榜 TOP20（公开） */
  ranking: () => apiGet<RankingItem[]>('/mentorship/ranking'),
}
