"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Search, X, Send, Loader2, ArrowRight, Bot } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface AISearchResult {
  type: "circle" | "course" | "article" | "product" | "expert" | "answer"
  id: number
  title: string
  description: string
  link: string
}

interface AISearchProps {
  placeholder?: string
  context?: string // 搜索上下文，如"圈子"、"课程"等
  onClose?: () => void
  className?: string
}

// AI搜索入口按钮
export function AISearchButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20",
        "border border-primary/30 hover:border-primary/50",
        "text-primary text-xs font-medium",
        "transition-all hover:shadow-md hover:shadow-primary/10",
        className
      )}
    >
      <Sparkles className="w-3.5 h-3.5" />
      AI搜索
    </button>
  )
}

// AI搜索弹窗
export function AISearchModal({ 
  isOpen, 
  onClose, 
  placeholder = "问我任何问题...",
  context 
}: { 
  isOpen: boolean
  onClose: () => void
  placeholder?: string
  context?: string
}) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [response, setResponse] = useState("")
  const [results, setResults] = useState<AISearchResult[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsSearching(true)
    setResponse("")
    setResults([])
    setIsStreaming(true)

    // 模拟AI流式响应
    const mockResponse = context 
      ? `根据你的问题「${query}」，我在${context}相关内容中为你找到以下信息：\n\n这是一个关于${query}的专业解答。在国学传统中，${query}涉及多个层面的理解...`
      : `根据你的问题「${query}」，我为你整理了以下内容：\n\n${query}在易学体系中有着深远的意义和应用价值...`

    // 流式输出效果
    let currentIndex = 0
    const streamInterval = setInterval(() => {
      if (currentIndex < mockResponse.length) {
        setResponse(mockResponse.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(streamInterval)
        setIsStreaming(false)
        // 显示推荐结果
        setResults([
          { type: "article", id: 1, title: `${query}入门指南`, description: "系统学习的第一步", link: "/article/1" },
          { type: "course", id: 1, title: `${query}精讲课程`, description: "名师带你深入理解", link: "/course/1" },
          { type: "circle", id: 1, title: `${query}研习社`, description: "与同好交流探讨", link: "/circle/1" },
        ])
      }
    }, 30)

    setTimeout(() => {
      setIsSearching(false)
    }, 500)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      circle: { text: "圈子", color: "bg-primary/20 text-primary" },
      course: { text: "课程", color: "bg-accent/20 text-accent" },
      article: { text: "文章", color: "bg-blue-500/20 text-blue-500" },
      product: { text: "商品", color: "bg-orange-500/20 text-orange-500" },
      expert: { text: "讲师", color: "bg-purple-500/20 text-purple-500" },
      answer: { text: "问答", color: "bg-green-500/20 text-green-500" },
    }
    return labels[type] || { text: type, color: "bg-secondary text-foreground" }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 animate-in fade-in duration-200">
      <Card className="w-[90%] max-w-lg max-h-[70vh] overflow-hidden bg-card shadow-2xl animate-in slide-in-from-top-4 duration-300">
        {/* 头部 */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">AI智能搜索</h3>
            <p className="text-xs text-muted-foreground">基于国学知识库的智能问答</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 搜索输入区 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                query.trim() 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* 快捷提问 */}
          {!response && (
            <div className="flex flex-wrap gap-2 mt-3">
              {["八字如何入门", "紫微斗数准吗", "如何看风水"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); handleSearch() }}
                  className="px-3 py-1.5 text-xs bg-secondary/50 text-muted-foreground rounded-full hover:bg-secondary hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI回答区 */}
        {response && (
          <div className="p-4 max-h-80 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {response}
                  {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />}
                </p>

                {/* 推荐结果 */}
                {results.length > 0 && !isStreaming && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">为你推荐：</p>
                    {results.map((result, index) => {
                      const typeInfo = getTypeLabel(result.type)
                      return (
                        <Link
                          key={index}
                          href={result.link}
                          onClick={onClose}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <Badge className={cn("text-[10px] px-1.5 py-0 border-0", typeInfo.color)}>
                            {typeInfo.text}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground">{result.description}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="px-4 py-3 bg-secondary/30 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            AI回答基于热卜国学知识库生成，仅供参考
          </p>
        </div>
      </Card>
    </div>
  )
}

// Hook方便在任意页面使用
export function useAISearch() {
  const [isOpen, setIsOpen] = useState(false)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  
  return { isOpen, open, close }
}
