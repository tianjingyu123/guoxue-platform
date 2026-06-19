"use client"

import { cn } from "@/lib/utils"
import { BookOpen, Search, Bookmark, FileText, Sparkles, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

function EmptyStateBase({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-serif text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="outline" className="rounded-full">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" className="rounded-full" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}

// 书架空状态
export function BookshelfEmpty() {
  return (
    <EmptyStateBase
      icon={<Library className="w-10 h-10 text-muted-foreground/50" />}
      title="书架空空如也"
      description="探索古籍典藏，将感兴趣的书籍加入书架"
      action={{ label: "去发现", href: "/classics/home" }}
    />
  )
}

// 搜索无结果
export function SearchEmpty({ query }: { query?: string }) {
  return (
    <EmptyStateBase
      icon={<Search className="w-10 h-10 text-muted-foreground/50" />}
      title={query ? `未找到"${query}"相关古籍` : "暂无搜索结果"}
      description="换个关键词试试，或浏览分类发现更多"
      action={{ label: "浏览分类", href: "/classics/home" }}
    />
  )
}

// 书签空状态
export function BookmarkEmpty() {
  return (
    <EmptyStateBase
      icon={<Bookmark className="w-10 h-10 text-muted-foreground/50" />}
      title="暂无书签"
      description="阅读时点击添加书签，方便下次继续阅读"
    />
  )
}

// 笔记空状态
export function NoteEmpty() {
  return (
    <EmptyStateBase
      icon={<FileText className="w-10 h-10 text-muted-foreground/50" />}
      title="暂无笔记"
      description="阅读时长按文字，可以添加批注和划线"
    />
  )
}

// 阅读历史空状态
export function ReadingHistoryEmpty() {
  return (
    <EmptyStateBase
      icon={<BookOpen className="w-10 h-10 text-muted-foreground/50" />}
      title="暂无阅读记录"
      description="开始阅读古籍，记录将自动保存"
      action={{ label: "开始阅读", href: "/classics/home" }}
    />
  )
}

// AI对话空状态
export function AIConversationEmpty() {
  return (
    <EmptyStateBase
      icon={<Sparkles className="w-10 h-10 text-muted-foreground/50" />}
      title="古籍AI助手"
      description="可以问我任何关于古籍的问题，我会尽力为你解答"
    />
  )
}

// 通用古籍列表空状态
export function ClassicsListEmpty({ category }: { category?: string }) {
  return (
    <EmptyStateBase
      icon={<BookOpen className="w-10 h-10 text-muted-foreground/50" />}
      title={category ? `暂无${category}古籍` : "暂无相关古籍"}
      description="换个分类看看，或搜索你感兴趣的古籍"
      action={{ label: "浏览全部", href: "/classics/home" }}
    />
  )
}

// 网络错误状态
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyStateBase
      icon={
        <div className="relative">
          <BookOpen className="w-10 h-10 text-muted-foreground/50" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xs">!</span>
          </div>
        </div>
      }
      title="加载失败"
      description="网络似乎出了点问题，请稍后再试"
      action={{ label: "重新加载", onClick: onRetry }}
    />
  )
}
