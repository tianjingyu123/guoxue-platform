"use client"

/**
 * 成就时刻母版样板预览页
 * 演示两种峰值时刻：首次结课证书、首次读完古籍小结。
 * 作为各业务场景接入成就时刻母版的参考样板。
 */

import { useState } from "react"
import { Award, BookOpen } from "lucide-react"
import { AchievementMoment } from "@/components/common/achievement-moment"
import type { AchievementData } from "@/lib/types/achievement"

const CERTIFICATE: AchievementData = {
  type: "certificate",
  userName: "周明远",
  subject: "八字入门实战课",
  date: "2026-06-15",
  stats: [
    { label: "学习时长", value: "31h" },
    { label: "完成章节", value: "24节" },
    { label: "知识点", value: "186" },
  ],
  aiComment: "在热卜国学完成了《八字入门实战课》，探寻东方智慧的旅程，刚刚开始。",
  serialNo: "RB2026061500",
  instructor: "李明德",
}

const SUMMARY: AchievementData = {
  type: "summary",
  userName: "林清欢",
  subject: "道德经",
  date: "2026-06-15",
  stats: [
    { label: "阅读时长", value: "12h" },
    { label: "阅读天数", value: "21天" },
    { label: "划线笔记", value: "47" },
  ],
  aiComment: "读《道德经》八十一章，悟道法自然，明有无相生。",
}

export default function AchievementDemoPage() {
  const [open, setOpen] = useState<null | "certificate" | "summary">(null)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <h1 className="text-center text-[16px] font-bold text-foreground">成就时刻母版 · 样板预览</h1>
      </header>

      <div className="flex-1 space-y-4 p-5">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          成就时刻是"你做到了"的仪式感峰值。点击下方按钮，体验首次结课、首次读完古籍的成就卡片。
        </p>

        <button
          onClick={() => setOpen("certificate")}
          className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#c9a96e1f" }}>
            <Award className="h-6 w-6" style={{ color: "#8a6d2f" }} />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium text-foreground">结课证书</span>
            <span className="block text-[13px] text-muted-foreground">首次完成一门课程</span>
          </span>
        </button>

        <button
          onClick={() => setOpen("summary")}
          className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#c41e3a1a" }}>
            <BookOpen className="h-6 w-6" style={{ color: "#c41e3a" }} />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium text-foreground">读后小结</span>
            <span className="block text-[13px] text-muted-foreground">首次读完一本古籍（可编辑读后感）</span>
          </span>
        </button>
      </div>

      <AchievementMoment
        open={open === "certificate"}
        data={CERTIFICATE}
        onClose={() => setOpen(null)}
        continueLabel="查看更多课程"
      />
      <AchievementMoment
        open={open === "summary"}
        data={SUMMARY}
        onClose={() => setOpen(null)}
        continueLabel="继续探索古籍"
        editableComment
      />
    </div>
  )
}
