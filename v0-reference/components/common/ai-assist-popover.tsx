"use client"

/**
 * 克制型 AI 辅助浮层母版
 *
 * 与原型对话式 AI 助手互补：轻量内联辅助，就地润色/摘要/续写/取标题，
 * 结果可一键采用，不打断创作心流。鎏金调性（避免原 AI 紫色违规），
 * 全程设计令牌，深色 / 小程序友好。
 */

import { useState } from "react"
import {
  Sparkles,
  Wand2,
  ScrollText,
  PenLine,
  Heading,
  TextQuote,
  Feather,
  Check,
  RotateCcw,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { runAIAssist } from "@/lib/api/ai-assist"
import {
  SCENE_CAPABILITIES,
  type AIAssistAction,
  type AIAssistScene,
} from "@/lib/types/ai-assist"

const ACTION_ICON: Record<AIAssistAction, typeof Wand2> = {
  polish: Wand2,
  summarize: ScrollText,
  continue: PenLine,
  title: Heading,
  expand: TextQuote,
  classical: Feather,
}

// 鎏金 AI 主色（避免紫色违规，契合国学品牌）
const AI_GOLD = "#c9a96e"

interface AIAssistPopoverProps {
  scene: AIAssistScene
  /** 当前输入框内容 */
  text: string
  /** 用户采用某条结果时回调（替换/插入由消费方决定） */
  onApply: (result: string) => void
  className?: string
}

export function AIAssistPopover({ scene, text, onApply, className }: AIAssistPopoverProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<AIAssistAction | null>(null)
  const [candidates, setCandidates] = useState<string[]>([])
  const [activeAction, setActiveAction] = useState<AIAssistAction | null>(null)
  const capabilities = SCENE_CAPABILITIES[scene]

  const hasText = text.trim().length > 0

  const run = async (action: AIAssistAction) => {
    if (!hasText) return
    setLoading(action)
    setActiveAction(action)
    setCandidates([])
    const res = await runAIAssist({ action, input: text, scene })
    setCandidates(res.candidates)
    setLoading(null)
  }

  const reset = () => {
    setCandidates([])
    setActiveAction(null)
  }

  return (
    <div className={cn("relative", className)}>
      {/* 触发按钮：鎏金星芒，克制不抢眼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors"
        style={{ background: `${AI_GOLD}1f`, color: "#8a6d2f" }}
        aria-label="AI 辅助"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI 辅助
      </button>

      {open && (
        <>
          {/* 轻量蒙层，点击关闭 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute bottom-full right-0 z-50 mb-2 w-[280px] rounded-2xl border border-border bg-card p-3 shadow-xl"
            role="dialog"
            aria-label="AI 辅助面板"
          >
            {/* 头部 */}
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: AI_GOLD }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="text-[13px] font-bold text-foreground">国学小助</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="关闭" className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!hasText && (
              <p className="rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">
                先写几个字，我来帮你润色、提炼或雅化～
              </p>
            )}

            {/* 能力选择 */}
            {hasText && candidates.length === 0 && !loading && (
              <div className="grid grid-cols-2 gap-2">
                {capabilities.map((cap) => {
                  const Icon = ACTION_ICON[cap.action]
                  return (
                    <button
                      key={cap.action}
                      onClick={() => run(cap.action)}
                      className="flex flex-col gap-0.5 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-transparent"
                      style={{ ["--hover-bg" as string]: `${AI_GOLD}14` }}
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                        <Icon className="h-3.5 w-3.5" style={{ color: "#8a6d2f" }} />
                        {cap.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{cap.hint}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 加载中 */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: AI_GOLD }} />
                正在为你{capabilities.find((c) => c.action === loading)?.label}…
              </div>
            )}

            {/* 结果候选 */}
            {candidates.length > 0 && !loading && (
              <div className="space-y-2">
                {candidates.map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-2.5">
                    <p className="text-pretty text-[13px] leading-relaxed text-foreground/90">{c}</p>
                    <button
                      onClick={() => {
                        onApply(c)
                        setOpen(false)
                        reset()
                      }}
                      className="mt-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-white"
                      style={{ background: AI_GOLD }}
                    >
                      <Check className="h-3 w-3" />
                      采用
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => activeAction && run(activeAction)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  换一个
                </button>
              </div>
            )}

            {/* 免责声明：克制合规 */}
            <p className="mt-2.5 text-center text-[10px] text-muted-foreground/70">
              内容由 AI 生成，仅供参考
            </p>
          </div>
        </>
      )}
    </div>
  )
}
