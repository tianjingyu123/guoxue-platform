/**
 * 成就时刻数据类型（峰值时刻母版）
 *
 * 统一「结课证书」与「读后小结」两种"你做到了"的仪式感卡片。
 * 二者共用宣纸金边印章骨架，差异在标题/数据项/落款。
 * 后续成就勋章解锁、连续签到里程碑等峰值时刻可照此范式扩展。
 */

export type AchievementType = "certificate" | "summary"

// 一项数据指标（如"学习时长 31 小时"）
export interface AchievementStat {
  label: string
  value: string
}

export interface AchievementData {
  type: AchievementType
  /** 证书：学员姓名；小结：读者昵称 */
  userName: string
  /** 证书：课程名；小结：书名 */
  subject: string
  /** 完成日期 */
  date: string
  /** 数据指标（证书：时长/章节/知识点；小结：时长/天数/笔记数） */
  stats: AchievementStat[]
  /** AI 生成的感言 / 一句话读后感（小结可编辑） */
  aiComment: string
  /** 证书编号（证书专属，可选） */
  serialNo?: string
  /** 授课讲师（证书专属，可选） */
  instructor?: string
  /** 二维码图片地址（可选） */
  qrCodeUrl?: string
}

// 卡片尺寸（竖版荣誉证书比例）
export const ACHIEVEMENT_SIZE = { width: 375, height: 540 } as const

// 各类型的文案配置
export const ACHIEVEMENT_META: Record<
  AchievementType,
  { sealTitle: string; enTitle: string; doneText: (subject: string) => string; shareLabel: string }
> = {
  certificate: {
    sealTitle: "结业证书",
    enTitle: "CERTIFICATE OF COMPLETION",
    doneText: (s) => `已完成《${s}》全部课程的学习`,
    shareLabel: "分享你的成就",
  },
  summary: {
    sealTitle: "读后小结",
    enTitle: "A JOURNEY THROUGH THE CLASSICS",
    doneText: (s) => `已读完《${s}》`,
    shareLabel: "分享你的书香气",
  },
}
