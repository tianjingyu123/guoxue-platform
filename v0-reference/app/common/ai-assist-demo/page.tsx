"use client"

/**
 * AI 辅助母版样板预览页
 * 演示两种内联辅助场景：写评论时润色/雅化、创作内容时润色/扩写/续写/雅化。
 * 展示「就地辅助 + 一键采用」不打断心流的范式。
 */

import { useState } from "react"
import { AIAssistPopover } from "@/components/common/ai-assist-popover"
import { cn } from "@/lib/utils"

export default function AIAssistDemoPage() {
  const [tab, setTab] = useState<"comment" | "creation">("comment")
  const [comment, setComment] = useState("这本书讲得挺好的我很喜欢")
  const [creation, setCreation] = useState("读《论语》有感")

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <h1 className="text-center text-[16px] font-bold text-foreground">AI 辅助母版 · 样板预览</h1>
        <div className="mt-3 flex gap-2">
          {([
            ["comment", "写评论"],
            ["creation", "创作内容"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors",
                tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <p className="mb-3 text-[13px] text-muted-foreground">
          {tab === "comment"
            ? "在评论框右下角点「AI 辅助」，可润色或雅化你的表达，结果一键采用。"
            : "创作时随手点「AI 辅助」，润色 / 扩写 / 续写 / 雅化，灵感不断。"}
        </p>

        {tab === "comment" ? (
          <div className="rounded-2xl border border-border bg-card p-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="说说你的想法…"
            />
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-[12px] text-muted-foreground">{comment.length} 字</span>
              <AIAssistPopover scene="comment" text={comment} onApply={setComment} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-3">
            <textarea
              value={creation}
              onChange={(e) => setCreation(e.target.value)}
              rows={6}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="写点什么…"
            />
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-[12px] text-muted-foreground">{creation.length} 字</span>
              <AIAssistPopover scene="creation" text={creation} onApply={setCreation} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
