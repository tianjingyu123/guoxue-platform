/**
 * 平台品牌常量（单一事实来源）
 *
 * 所有品牌露出（海报/分享/证书/页脚）统一引用此处，确保口径一致。
 * 修改品牌名、Slogan、分享文案时只需改这一处。
 */

export const BRAND = {
  // 品牌名
  name: "热卜国学",
  nameShort: "热卜",
  nameEn: "REBU",
  // 品牌标语
  slogan: "探寻东方智慧",
  sloganAlt: "观天地 · 明心性",
  // 描述与版权
  tagline: "国学知识平台",
  copyright: "热卜国学 · 让国学回归生活",
  // 二维码引导
  qrGuide: "长按识别 · 开启国学之旅",
} as const

// 分享文案风格（3.2 节：文化感，非诱导式）
export type ShareTone = "literary" | "simple" | "humorous"

export interface ShareToneOption {
  tone: ShareTone
  label: string
  /** 生成函数：传入主题名，产出文案 */
  build: (subject: string) => string
}

export const SHARE_TONES: ShareToneOption[] = [
  {
    tone: "literary",
    label: "文艺",
    build: (s) => `在${BRAND.name}，遇见${s ? `《${s}》里的` : ""}东方智慧。`,
  },
  {
    tone: "simple",
    label: "简约",
    build: (s) => `推荐一个国学平台给你${s ? `，正在读《${s}》` : ""}。`,
  },
  {
    tone: "humorous",
    label: "幽默",
    build: (s) => `${s ? `读了《${s}》才发现` : "学了国学才发现"}，原来传统文化这么有意思。`,
  },
]

// 按海报类型的「品牌推荐语」（3.1 节：课程推荐语 / 古籍读后感 等）
// 作为 description 缺省时的兜底，确保每张海报都有文化质感的文字。
import type { PosterType } from "@/lib/types/poster"

export function brandRecommendByType(type: PosterType, subject?: string): string {
  const map: Record<PosterType, string> = {
    course: "一门值得静心研习的好课，与你共探东方智慧。",
    article: "字字珠玑，愿这篇文字也照亮你的片刻。",
    product: "器以载道，好物配好学。",
    live: "相约直播间，听一场有温度的国学分享。",
    invite: "邀你同行，一起在经典中遇见更好的自己。",
    profile: "同道中人，愿与你以文会友。",
    circle: "圈以聚气，志同道合者，来此一叙。",
  }
  return map[type] || BRAND.slogan
}
