"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Mail, Phone, Shield, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getLegalDocument, confirmLegalDocument } from "@/lib/api/legal"
import type { LegalDocument } from "@/lib/types/legal"

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
          <Skeleton className="h-5 w-32" />
        </div>
      </header>
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

export default function ChildPrivacyPage() {
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [document, setDocument] = useState<LegalDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [tocItems, setTocItems] = useState<{ id: string; title: string; level: number }[]>([])
  const [activeSection, setActiveSection] = useState<string>('')

  // 加载文档
  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await getLegalDocument('child-privacy')
        if (res.code === 200 && res.data) {
          setDocument(res.data)
          setConfirmed(res.data.isConfirmed || false)
          // 提取目录
          extractToc(res.data.content)
        }
      } catch (error) {
        console.error('加载文档失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDocument()
  }, [])

  // 提取目录
  function extractToc(html: string) {
    const regex = /<h([2-3])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[2-3]>/gi
    const items: { id: string; title: string; level: number }[] = []
    let match
    while ((match = regex.exec(html)) !== null) {
      items.push({
        id: match[2],
        title: match[3],
        level: parseInt(match[1]),
      })
    }
    // 如果没有提取到，尝试从标签提取
    if (items.length === 0) {
      const defaultItems = [
        { id: 'scope', title: '适用范围', level: 2 },
        { id: 'collect', title: '信息收集', level: 2 },
        { id: 'use', title: '信息使用', level: 2 },
        { id: 'guardian', title: '监护人权利', level: 2 },
        { id: 'contact', title: '联系我们', level: 2 },
      ]
      items.push(...defaultItems)
    }
    setTocItems(items)
    if (items.length > 0) setActiveSection(items[0].id)
  }

  // 监听滚动
  useEffect(() => {
    function handleScroll() {
      if (!contentRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current
      // 检查是否滚动到底部
      if (scrollHeight - scrollTop - clientHeight < 100) {
        setScrolledToBottom(true)
      }
      // 更新当前章节
      const sections = contentRef.current.querySelectorAll('h2[id], h3[id]')
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i] as HTMLElement
        if (section.offsetTop <= scrollTop + 100) {
          setActiveSection(section.id)
          break
        }
      }
    }
    const content = contentRef.current
    if (content) {
      content.addEventListener('scroll', handleScroll)
      return () => content.removeEventListener('scroll', handleScroll)
    }
  }, [document])

  // 确认阅读
  async function handleConfirm() {
    setConfirming(true)
    try {
      const res = await confirmLegalDocument('child-privacy')
      if (res.code === 200) {
        setConfirmed(true)
      }
    } catch (error) {
      console.error('确认失败:', error)
    } finally {
      setConfirming(false)
    }
  }

  // 跳转到锚点
  function scrollToSection(id: string) {
    const element = contentRef.current?.querySelector(`#${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 rounded-full hover:bg-muted"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">儿童隐私保护</h1>
            </div>
          </div>
          {document && (
            <span className="text-xs text-muted-foreground">
              v{document.version}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 目录侧边栏 - 桌面端 */}
        <aside className="hidden md:block w-56 border-r border-border p-4 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">目录</h3>
          <nav className="space-y-1">
            {tocItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "block w-full text-left text-sm py-1.5 px-2 rounded transition-colors",
                  item.level === 3 && "pl-4",
                  activeSection === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main 
          ref={contentRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto p-4 md:p-6">
            {/* 重要提示卡片 */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">儿童隐私保护声明</p>
                  <p className="text-muted-foreground">
                    本平台高度重视儿童个人信息保护，严格遵守《儿童个人信息网络保护规定》及相关法律法规。
                    如您是未满14周岁的未成年人，请在监护人陪同下阅读本声明。
                  </p>
                </div>
              </div>
            </div>

            {/* 版本信息 */}
            {document && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <span>更新日期：{document.effectiveDate}</span>
                {document.previousVersion && (
                  <button className="text-primary hover:underline flex items-center gap-1">
                    查看历史版本
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* 文档内容 */}
            {document ? (
              <article 
                className="prose prose-sm md:prose-base max-w-none
                  prose-headings:scroll-mt-20 prose-headings:font-semibold
                  prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-li:text-muted-foreground
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: document.content }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                文档加载失败，请稍后重试
              </div>
            )}

            {/* 监护人联系方式 */}
            <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-medium mb-3">监护人联系方式</h3>
              <p className="text-sm text-muted-foreground mb-4">
                如您是未成年人的监护人，对我们处理您所监护的未成年人个人信息有任何疑问、意见或建议，
                或需要行使相关权利，请通过以下方式联系我们：
              </p>
              <div className="space-y-3">
                <a 
                  href="mailto:privacy@rebu.com"
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">邮件联系</div>
                    <div className="text-sm text-muted-foreground">privacy@rebu.com</div>
                  </div>
                </a>
                <a 
                  href="tel:400-888-8888"
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">电话联系</div>
                    <div className="text-sm text-muted-foreground">400-888-8888（工作日 9:00-18:00）</div>
                  </div>
                </a>
              </div>
            </div>

            {/* 底部确认按钮 */}
            <div className="mt-8 pb-8">
              {!confirmed ? (
                <Button
                  onClick={handleConfirm}
                  disabled={!scrolledToBottom || confirming}
                  className="w-full"
                >
                  {confirming ? '确认中...' : scrolledToBottom ? '我已阅读并理解' : '请阅读完整内容'}
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  您已于 {new Date().toLocaleDateString()} 阅读并确认本声明
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 移动端目录抽屉按钮 */}
      <div className="md:hidden fixed bottom-20 right-4 z-10">
        <details className="relative">
          <summary className="list-none cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
              <span className="text-xs font-medium">目录</span>
            </div>
          </summary>
          <div className="absolute bottom-14 right-0 w-48 bg-background border border-border rounded-lg shadow-xl p-2 max-h-64 overflow-y-auto">
            {tocItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  scrollToSection(item.id)
                }}
                className={cn(
                  "block w-full text-left text-sm py-2 px-3 rounded transition-colors",
                  item.level === 3 && "pl-5",
                  activeSection === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}
