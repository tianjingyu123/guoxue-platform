'use client'

import Link from 'next/link'
import { Home, Search, ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* 国学风格的404图标 */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center">
          {/* 太极图 */}
          <svg viewBox="0 0 100 100" className="w-20 h-20 opacity-30">
            <circle cx="50" cy="50" r="48" className="fill-primary" />
            <path d="M50 2 A24 24 0 0 1 50 50 A24 24 0 0 0 50 98 A48 48 0 0 1 50 2" className="fill-background" />
            <circle cx="50" cy="26" r="8" className="fill-primary" />
            <circle cx="50" cy="74" r="8" className="fill-background" />
          </svg>
        </div>
        {/* 404数字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-serif font-bold text-primary">404</span>
        </div>
      </div>

      {/* 标题 */}
      <h1 className="text-2xl font-serif font-bold text-foreground mb-2 text-center">
        页面未找到
      </h1>
      
      {/* 国学风格的描述 */}
      <p className="text-muted-foreground text-center mb-2 max-w-md">
        「众里寻他千百度，蓦然回首，那人却在灯火阑珊处」
      </p>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
        您访问的页面可能已移动或不存在
      </p>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/search">
            <Search className="w-4 h-4 mr-2" />
            搜索内容
          </Link>
        </Button>
      </div>

      {/* 推荐链接 */}
      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground mb-4">或许您在寻找：</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/courses"
            className="px-4 py-2 bg-secondary rounded-full text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            精品课程
          </Link>
          <Link
            href="/circles"
            className="px-4 py-2 bg-secondary rounded-full text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            国学圈子
          </Link>
          <Link
            href="/paipan"
            className="px-4 py-2 bg-secondary rounded-full text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            在线排盘
          </Link>
          <Link
            href="/shop"
            className="px-4 py-2 bg-secondary rounded-full text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            国学商城
          </Link>
        </div>
      </div>

      {/* 返回按钮 */}
      <button
        onClick={() => typeof window !== 'undefined' && window.history.back()}
        className="mt-8 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" />
        返回上一页
      </button>
    </div>
  )
}
