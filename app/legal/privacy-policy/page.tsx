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

export default function PrivacyPolicyPage() {
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [toc, setToc] = useState<LegalDocTocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showToc, setShowToc] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')
  const [confirming, setConfirming] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // 加载文档
  useEffect(() => {
    loadDocument()
  }, [])

  // 监听滚动到底部
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return
      
      const { scrollTop, scrollHeight, clientHeight } = window.document.documentElement
      const threshold = 100
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        setHasScrolledToBottom(true)
      }
      
      // 更新当前激活的章节
      const sections = contentRef.current.querySelectorAll('[id]')
      let currentSection = ''
      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        if (rect.top <= 100) {
          currentSection = section.id
        }
      })
      if (currentSection) {
        setActiveSection(currentSection)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function loadDocument() {
    try {
      const res = await getLegalDocument('privacy-policy')
      if (res.code === 200 && res.data) {
        setDocument(res.data)
        // 提取目录
        const tocItems = extractTocFromHtml(res.data.htmlContent)
        setToc(tocItems)
      }
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (confirming) return
    setConfirming(true)
    try {
      const res = await confirmLegalDocument('privacy-policy')
      if (res.code === 200) {
        setDocument(prev => prev ? { ...prev, hasConfirmed: true, confirmedAt: new Date().toISOString() } : prev)
      }
    } catch (error) {
      console.error('Failed to confirm:', error)
    } finally {
      setConfirming(false)
    }
  }

  function scrollToSection(id: string) {
    const element = window.document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowToc(false)
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
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            返回
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 导航栏 */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{document.title}</h1>
          </div>
          <button
            onClick={() => setShowToc(true)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 文档信息 */}
      <div className="px-4 py-4 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            版本 {document.version}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            更新于 {document.updatedAt}
          </span>
        </div>
        {document.hasConfirmed && document.confirmedAt && (
          <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            您已于 {new Date(document.confirmedAt).toLocaleDateString()} 确认阅读
          </div>
        )}
      </div>

      {/* 文档内容 */}
      <div 
        ref={contentRef}
        className="px-4 py-6 prose prose-sm max-w-none
          prose-headings:text-foreground prose-headings:font-semibold
          prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
          prose-strong:text-foreground prose-strong:font-medium
          prose-ul:text-muted-foreground prose-ul:my-4
          prose-li:my-1
        "
        dangerouslySetInnerHTML={{ __html: document.htmlContent }}
      />

      {/* 底部确认按钮 */}
      {document.requireConfirm && !document.hasConfirmed && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-inset-bottom">
          <Button
            className="w-full h-12 text-base"
            disabled={!hasScrolledToBottom || confirming}
            onClick={handleConfirm}
          >
            {confirming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                确认中...
              </span>
            ) : hasScrolledToBottom ? (
              <span className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                我已阅读并同意
              </span>
            ) : (
              '请阅读完整内容后确认'
            )}
          </Button>
          {!hasScrolledToBottom && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              请滚动阅读全部内容
            </p>
          )}
        </div>
      )}

      {/* 目录侧边栏 */}
      {showToc && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩 */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowToc(false)}
          />
          
          {/* 目录面板 */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-background shadow-xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">目录</h3>
              <button
                onClick={() => setShowToc(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-64px)]">
              {toc.map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "w-full text-left py-2 px-3 rounded-lg transition-colors text-sm",
                    "hover:bg-muted",
                    item.level === 3 && "pl-6",
                    item.level === 4 && "pl-9",
                    activeSection === item.id 
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="flex items-center justify-between">
                    {item.title}
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
