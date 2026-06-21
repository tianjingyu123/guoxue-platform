"use client"

import { useRouter } from "next/navigation"
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  const router = useRouter()

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const quickLinks = [
    { label: '首页', href: '/', icon: Home },
    { label: '发现', href: '/discover', icon: Search },
    { label: '帮助中心', href: '/help', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 主要内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* 404 大号文字 */}
        <div className="relative mb-6">
          {/* 背景装饰 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-primary/5" />
          </div>
          
          {/* 404 数字 */}
          <h1 className="relative text-[120px] font-bold text-primary leading-none tracking-tighter">
            404
          </h1>
        </div>

        {/* 副标题 */}
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          页面不存在
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-xs">
          您访问的页面可能已被移除、名称已更改或暂时不可用
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button 
            onClick={() => router.push('/')}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <Button 
            variant="outline"
            onClick={handleGoBack}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回上一页
          </Button>
        </div>

        {/* 分隔线 */}
        <div className="flex items-center gap-4 my-8 w-full max-w-xs">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">或者</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 快捷链接 */}
        <div className="w-full max-w-xs">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            您可以访问以下页面
          </p>
          <div className="flex justify-center gap-2">
            {quickLinks.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                onClick={() => router.push(link.href)}
                className="text-muted-foreground hover:text-foreground"
              >
                <link.icon className="w-4 h-4 mr-1" />
                {link.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 底部装饰 - 山水意境 */}
      <div className="h-32 relative overflow-hidden">
        <svg 
          viewBox="0 0 400 100" 
          className="absolute bottom-0 left-0 w-full h-full text-primary/10"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* 远山 */}
          <path 
            d="M0 100 L0 60 Q50 40 100 55 Q150 70 200 45 Q250 20 300 50 Q350 80 400 40 L400 100 Z" 
            fill="currentColor" 
            opacity="0.3"
          />
          {/* 近山 */}
          <path 
            d="M0 100 L0 75 Q80 55 150 70 Q220 85 280 60 Q340 35 400 65 L400 100 Z" 
            fill="currentColor" 
            opacity="0.5"
          />
          {/* 最近的山 */}
          <path 
            d="M0 100 L0 85 Q100 70 200 80 Q300 90 400 75 L400 100 Z" 
            fill="currentColor" 
            opacity="0.7"
          />
        </svg>
      </div>

      {/* 错误代码提示 */}
      <div className="text-center py-4 text-xs text-muted-foreground/50">
        错误代码: 404 | 如需帮助请联系客服
      </div>
    </div>
  )
}
