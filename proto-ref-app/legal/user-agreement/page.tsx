"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  List,
  Check,
  ChevronRight,
  Clock,
  FileText,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  getLegalDocument, 
  confirmLegalDocument,
  extractTocFromHtml
} from "@/lib/api/legal"
import type { LegalDocument, LegalDocTocItem } from "@/lib/types/legal"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UserAgreementPage() {
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [toc, setToc] = useState<LegalDocTocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showToc, setShowToc] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // 加载文档
  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await getLegalDocument('user-agreement')
        if (res.code === 200 && res.data) {
          setDocument(res.data)
          // 提取目录
          const tocItems = extractTocFromHtml(res.data.content)
          setToc(tocItems)
          // 检查是否已确认
          if (res.data.confirmedAt) {
            setConfirmed(true)
            setHasScrolledToBottom(true)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    loadDocument()
  }, [])

  // 监听滚动检测是否到底部
  useEffect(() => {
    function handleScroll() {
      if (!contentRef.current || hasScrolledToBottom) return
      
      const { scrollTop, scrollHeight, clientHeight } = window.document.documentElement
      // 距离底部小于100px视为到底
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setHasScrolledToBottom(true)
      }
      
      // 检测当前活动章节
      const sections = contentRef.current.querySelectorAll('[id^="section-"]')
      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        if (rect.top <= 100 && rect.bottom > 100) {
          setActiveSection(section.id)
        }
      })
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasScrolledToBottom])

  // 跳转到指定章节
  const scrollToSection = (id: string) => {
    const element = window.document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowToc(false)
    }
  }

  // 确认阅读
  const handleConfirm = async () => {
    if (!document) return
    setConfirming(true)
    try {
      const res = await confirmLegalDocument(document.type)
      if (res.code === 200) {
        setConfirmed(true)
      }
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">文档加载失败</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.back()}
          >
            返回
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold">用户协议</h1>
          </div>
          <button
            onClick={() => setShowToc(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 文档信息 */}
      <div className="px-4 py-4 border-b border-border bg-muted/30">
        <h2 className="text-xl font-bold text-foreground">{document.title}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            版本 {document.version}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {document.effectiveDate} 生效
          </span>
        </div>
        {document.summary && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {document.summary}
          </p>
        )}
      </div>

      {/* 正文内容 */}
      <div 
        ref={contentRef}
        className="px-4 py-6 legal-content"
      >
        <div 
          className="prose prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-semibold
            prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-li:text-muted-foreground
            prose-strong:text-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: document.content }}
        />
      </div>

      {/* 底部确认按钮 */}
      {!confirmed && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
          <Button
            className="w-full"
            disabled={!hasScrolledToBottom || confirming}
            onClick={handleConfirm}
          >
            {confirming ? (
              '确认中...'
            ) : hasScrolledToBottom ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                我已阅读并同意
              </>
            ) : (
              '请阅读完整内容'
            )}
          </Button>
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              请滚动阅读完整内容后确认
            </p>
          )}
        </div>
      )}

      {/* 已确认状态 */}
      {confirmed && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 p-4 safe-area-bottom">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">您已确认阅读并同意本协议</span>
          </div>
        </div>
      )}

      {/* 目录抽屉 */}
      {showToc && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowToc(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-background shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">目录</h3>
              <button
                onClick={() => setShowToc(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {toc.length > 0 ? (
                <div className="p-2">
                  {toc.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        "hover:bg-accent",
                        item.level === 2 ? "font-medium" : "pl-6 text-muted-foreground",
                        activeSection === item.id && "bg-primary/10 text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-2">{item.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  暂无目录
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
