"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Clock, Sparkles } from "lucide-react"
import { Suspense } from "react"

function ComingSoonContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolName = searchParams.get("name") || "此功能"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card shrink-0">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold">{toolName}</h1>
        <div className="w-6" />
      </header>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Clock className="w-12 h-12 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">开发中</h2>
        <p className="text-muted-foreground text-center mb-8">
          {toolName}正在紧锣密鼓地开发中<br />敬请期待
        </p>

        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-4 py-2 rounded-full">
          <Sparkles className="w-4 h-4" />
          <span>即将上线</span>
        </div>

        <button
          onClick={() => router.back()}
          className="mt-8 px-8 py-3 bg-primary text-white font-medium rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all"
        >
          返回首页
        </button>
      </main>
    </div>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  )
}
