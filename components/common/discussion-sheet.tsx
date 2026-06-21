"use client"

/**
 * 讨论抽屉包装组件
 *
 * 把讨论母版 DiscussionPanel 包成底部弹层，用于详情/阅读页的「查看全部讨论」。
 * 统一替换原型中分散的 CommentSheet，复用于古籍/电子书/诗词/文章等场景。
 */

import { useEffect } from "react"
import { X } from "lucide-react"
import { DiscussionPanel } from "@/components/common/discussion-panel"
import type { DiscussionConfig, DiscussionItem } from "@/lib/types/discussion"

interface DiscussionSheetProps {
  open: boolean
  onClose: () => void
  config: DiscussionConfig
  items: DiscussionItem[]
  /** 启用 AI 辅助输入 */
  enableAIAssist?: boolean
}

export function DiscussionSheet({ open, onClose, config, items, enableAIAssist }: DiscussionSheetProps) {
  // 打开时锁定背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [open])

  return (
    <>
      {/* 遮罩 */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      {/* 抽屉 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
      >
        {/* 顶部拖拽条与关闭 */}
        <div className="relative flex-shrink-0 pt-2.5">
          <div className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden />
          <button
            onClick={onClose}
            className="absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* 母版面板 */}
        <DiscussionPanel
          config={config}
          items={items}
          enableAIAssist={enableAIAssist}
          className="min-h-0 flex-1"
        />
      </div>
    </>
  )
}
