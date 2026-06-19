import { Info, ShieldAlert, Sparkles, HeartPulse } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 统一免责声明 / 风险提示组件
 *
 * 全平台合规文案的唯一出口，确保样式、措辞、位置统一。
 * 命理平台法律底线：排盘、AI、直播、中医养生等敏感场景必须展示。
 *
 * variant:
 * - fortune  命理排盘类："AI生成，仅供传统文化研习参考，不构成任何预测或建议"
 * - ai       AI生成内容："AI生成内容仅供参考，请理性看待"
 * - medical  中医养生类："健康科普，不替代专业医疗"
 * - product  保健品类："保健品不能替代药品"
 * - entertainment 直播娱乐："内容仅供娱乐参考"
 * - custom   自定义文案（传 text）
 *
 * tone:
 * - subtle  极弱化（页面底部小字，默认）
 * - card    卡片式（带背景色块，更醒目）
 * - inline  行内徽标（持续展示标签，如直播间角标）
 */
export type DisclaimerVariant =
  | "fortune"
  | "ai"
  | "medical"
  | "product"
  | "entertainment"
  | "custom"

const PRESETS: Record<
  Exclude<DisclaimerVariant, "custom">,
  { icon: typeof Info; text: string }
> = {
  fortune: {
    icon: Sparkles,
    text: "以上内容由 AI 生成，仅供传统文化研习参考，不构成任何预测或建议。",
  },
  ai: {
    icon: Sparkles,
    text: "AI 生成内容仅供参考，请理性看待，重要决策请咨询专业人士。",
  },
  medical: {
    icon: HeartPulse,
    text: "本内容为健康科普，不替代专业医疗诊断与治疗，如有不适请及时就医。",
  },
  product: {
    icon: ShieldAlert,
    text: "保健食品不能替代药品，不具有疾病预防或治疗功能，请理性选购。",
  },
  entertainment: {
    icon: Info,
    text: "直播内容仅供娱乐参考，请勿盲信，理性消费。",
  },
}

interface DisclaimerProps {
  variant?: DisclaimerVariant
  /** variant 为 custom 时的文案 */
  text?: string
  /** 展示形态 */
  tone?: "subtle" | "card" | "inline"
  className?: string
}

export function Disclaimer({
  variant = "fortune",
  text,
  tone = "subtle",
  className,
}: DisclaimerProps) {
  const preset = variant === "custom" ? null : PRESETS[variant]
  const Icon = preset?.icon ?? Info
  const content = variant === "custom" ? text ?? "" : preset!.text

  if (!content) return null

  // 行内徽标：用于直播间等需要持续展示的角标
  if (tone === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm",
          className,
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {content}
      </span>
    )
  }

  // 卡片式：更醒目，用于结果页等关键场景
  if (tone === "card") {
    return (
      <div
        role="note"
        className={cn(
          "flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2.5",
          className,
        )}
      >
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-amber-700">{content}</p>
      </div>
    )
  }

  // 极弱化：页面底部小字，默认
  return (
    <p
      role="note"
      className={cn(
        "flex items-center justify-center gap-1 px-4 py-3 text-center text-[10px] leading-relaxed text-muted-foreground/60",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {content}
    </p>
  )
}
