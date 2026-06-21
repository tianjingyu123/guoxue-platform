'use client'

import Link from 'next/link'
import { ArrowLeft, Construction, Clock, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ComingSoonPageProps {
  title: string
  description?: string
  expectedDate?: string
  showNotify?: boolean
  backHref?: string
  backLabel?: string
}

export function ComingSoonPage({
  title,
  description = '我们正在努力开发中，敬请期待',
  expectedDate,
  showNotify = true,
  backHref = '/',
  backLabel = '返回首页',
}: ComingSoonPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href={backHref} className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-lg text-foreground">{title}</h1>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          {/* 图标 */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
            <Construction className="w-12 h-12 text-primary" />
          </div>

          {/* 标题 */}
          <h2 className="text-xl font-bold text-foreground mb-2">
            功能开发中
          </h2>

          {/* 描述 */}
          <p className="text-muted-foreground mb-6">
            {description}
          </p>

          {/* 预计上线时间 */}
          {expectedDate && (
            <Card className="p-4 mb-6 bg-secondary/50">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gold" />
                <span className="text-muted-foreground">预计上线时间：</span>
                <span className="font-medium text-foreground">{expectedDate}</span>
              </div>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            {showNotify && (
              <Button variant="outline" className="w-full" onClick={() => {
                // TODO: 实现订阅通知功能
                alert('感谢关注！功能上线后我们会第一时间通知您')
              }}>
                <Bell className="w-4 h-4 mr-2" />
                上线通知我
              </Button>
            )}
            <Button asChild className="w-full">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
          </div>

          {/* 装饰文字 */}
          <p className="mt-8 text-xs text-muted-foreground">
            热卜国学 · 传承智慧
          </p>
        </div>
      </main>
    </div>
  )
}
