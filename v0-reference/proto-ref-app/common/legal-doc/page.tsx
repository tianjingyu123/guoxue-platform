"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Check, ChevronRight, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getLegalDocument, confirmLegalDocument, extractTocFromHtml, getLegalDocTypeLabel } from "@/lib/api/legal"
import type { LegalDocument, LegalDocTocItem, LegalDocType } from "@/lib/types/legal"

function LegalDocContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = (searchParams.get("type") || "user-agreement") as LegalDocType
  
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [toc, setToc] = useState<LegalDocTocItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [showToc, setShowToc] = useState(false)
  
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDocument()
  }, [type])

  const loadDocument = async () => {
    setIsLoading(true)
    try {
      const response = await getLegalDocument(type)
      if (response.code === 200 && response.data) {
        setDocument(response.data)
        setToc(extractTocFromHtml(response.data.htmlContent))
        // 如果已确认或不需要确认，则视为已滚动完毕
        if (!response.data.requireConfirm || response.data.hasConfirmed) {
          setHasScrolledToBottom(true)
        }
      }
    } catch {
      toast.error("加载失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 监听滚动到底部
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
    if (isBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true)
    }
  }

  // 跳转到锚点
  const scrollToAnchor = (id: string) => {
    const element = document.getElementById(id)
    if (element && contentRef.current) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setShowToc(false)
  }

  // 确认已阅读
  const handleConfirm = async () => {
    if (!document) return
    setIsConfirming(true)
    try {
      const response = await confirmLegalDocument(type)
      if (response.code === 200) {
        toast.success("已确认")
        setDocument({ ...document, hasConfirmed: true })
        setTimeout(() => router.back(), 500)
      }
    } catch {
      toast.error("确认失败")
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground">文档不存在</p>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  const needConfirm = document.requireConfirm && !document.hasConfirmed

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <BackButton fallbackPath="/settings" />
          <h1 className="font-semibold text-base">{document.title}</h1>
          {toc.length > 0 && (
            <button 
              onClick={() => setShowToc(!showToc)}
              className="text-sm text-primary"
            >
              目录
            </button>
          )}
        </div>
      </header>

      {/* 目录侧边栏 */}
      {showToc && toc.length > 0 && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setShowToc(false)}
          />
          <div className="fixed top-14 right-0 bottom-0 w-64 bg-background z-40 border-l shadow-lg overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-3">目录</h3>
              <div className="space-y-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToAnchor(item.id)}
                    className={cn(
                      "w-full text-left py-2 px-3 rounded-lg text-sm hover:bg-secondary transition-colors flex items-center gap-2",
                      item.level === 2 ? "font-medium" : "pl-6 text-muted-foreground"
                    )}
                  >
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    <span className="line-clamp-1">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 文档信息 */}
      <div className="px-4 py-3 border-b bg-secondary/30">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>版本：{document.version}</span>
          <span>生效日期：{document.effectiveDate}</span>
          <span>更新时间：{document.updatedAt}</span>
        </div>
        {document.hasConfirmed && (
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
            <Check className="w-3 h-3" />
            <span>您已于 {document.confirmedAt || "之前"} 确认</span>
          </div>
        )}
      </div>

      {/* 正文内容 */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        onScroll={handleScroll}
      >
        <article 
          className="prose prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-semibold
            prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-3
            prose-strong:text-foreground
            prose-ul:my-3 prose-ul:text-muted-foreground
            prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: document.htmlContent }}
        />
        
        {/* 底部间距 */}
        <div className="h-24" />
      </div>

      {/* 底部确认按钮 */}
      {needConfirm && (
        <div className="sticky bottom-0 border-t bg-background p-4 safe-area-inset-bottom">
          <Button
            className="w-full h-12 rounded-xl"
            disabled={!hasScrolledToBottom || isConfirming}
            onClick={handleConfirm}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                确认中...
              </>
            ) : hasScrolledToBottom ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                我已阅读并同意
              </>
            ) : (
              "请阅读完整内容"
            )}
          </Button>
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              请滚动到页面底部后确认
            </p>
          )}
        </div>
      )}

      {/* 非确认模式底部 */}
      {!needConfirm && (
        <div className="sticky bottom-0 border-t bg-background p-4 safe-area-inset-bottom">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => router.back()}
          >
            返回
          </Button>
        </div>
      )}
    </div>
  )
}

export default function LegalDocPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <LegalDocContent />
    </Suspense>
  )
}
