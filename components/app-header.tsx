"use client"

import { useState } from "react"
import { Bell, Search, Sparkles, Plus, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const tabs = [
  { name: "推荐", href: "/" },
  { name: "关注", href: "/" },
  { name: "热门", href: "/" },
  { name: "直播", href: "/live" },
  { name: "同城", href: "/" },
]

export function AppHeader() {
  const [activeTab, setActiveTab] = useState("推荐")
  const [hasUnread] = useState(true) // 模拟未读消息

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm safe-area-pt">
      <div className="max-w-lg mx-auto">
        {/* 搜索栏 + 通知 */}
        <div className="flex items-center gap-3 h-12 px-4">
          {/* AI搜索框 - 简化设计 */}
          <Link href="/search" className="flex-1" aria-label="AI搜索平台全部内容">
            <div className="relative flex items-center h-8 px-3 rounded-full bg-[var(--surface-sunken)] border border-[var(--line)]">
              <Search className="w-3.5 h-3.5 text-[var(--text-soft)] shrink-0" aria-hidden="true" />
              {/* AI徽章 - 故宫红，与全局设计规范统一 */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 mx-1.5 rounded-full bg-primary/15 shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-primary" aria-hidden="true" />
                <span className="text-[9px] text-primary font-semibold leading-none">AI</span>
              </div>
              <span className="text-[12px] text-[var(--text-soft)] truncate">AI搜索平台全部内容...</span>
            </div>
          </Link>

          {/* 智能客服 - 固定在Header右侧，不遮挡内容 */}
          <Link
            href="/customer-service"
            aria-label="智能客服"
            className="p-2 rounded-full hover:bg-[var(--surface-sunken)] transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[var(--text-soft)]" aria-hidden="true" />
          </Link>

          {/* 消息铃铛 */}
          <Link
            href="/im/conversations"
            aria-label={hasUnread ? "消息中心，有未读消息" : "消息中心"}
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" aria-hidden="true" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            )}
          </Link>
        </div>

        {/* Tab导航栏 - 下划线指示器，底部分割线 */}
        <nav aria-label="内容分类" className="flex items-center h-10 px-4 border-b border-border">
          <div className="flex-1 flex items-center gap-6">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={() => setActiveTab(tab.name)}
                aria-current={activeTab === tab.name ? "page" : undefined}
                className={cn(
                  "relative py-2 text-[15px] font-semibold transition-all whitespace-nowrap",
                  activeTab === tab.name
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.name}
                {/* 下划线指示器 - 3px高，主色 */}
                {activeTab === tab.name && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-primary rounded-full transition-all duration-300" aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>
          
          {/* 右侧编辑入口 - 自定义Tab顺序 */}
          <button aria-label="自定义频道" className="p-1.5 rounded-full hover:bg-[var(--surface-sunken)] transition-colors">
            <Plus className="w-4 h-4 text-[var(--text-soft)]" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </header>
  )
}
