"use client"

import { cn } from "@/lib/utils"

// ============================================
// 页面包装组件 - 提供统一的页面过渡动画
// ============================================

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  // 是否应用背景装饰
  withDecor?: boolean
}

export function PageWrapper({ 
  children, 
  className,
  withDecor = false 
}: PageWrapperProps) {
  return (
    <div className={cn(
      "min-h-screen bg-[#FAF8F5] page-transition",
      className
    )}>
      {withDecor && <PageBackgroundDecor />}
      {children}
    </div>
  )
}

// 页面背景装饰 - 角落纹样
function PageBackgroundDecor() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* 左上角装饰 */}
      <svg 
        viewBox="0 0 100 100" 
        className="absolute -top-10 -left-10 w-32 h-32 text-[#C9A96E] opacity-[0.03]"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 2 A24 24 0 0 1 50 50 A24 24 0 0 0 50 98 A48 48 0 0 1 50 2" />
      </svg>
      
      {/* 右下角装饰 */}
      <svg 
        viewBox="0 0 100 100" 
        className="absolute -bottom-12 -right-12 w-40 h-40 text-[#C41E3A] opacity-[0.02]"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 2 A24 24 0 0 1 50 50 A24 24 0 0 0 50 98 A48 48 0 0 1 50 2" />
      </svg>
    </div>
  )
}

// 内容区域包装 - 带渐入效果的列表
export function ContentSection({ 
  children, 
  className,
  delay = 0
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <section 
      className={cn("card-cascade", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </section>
  )
}

// 列表项包装 - 依次进入动画
export function ListItem({ 
  children, 
  index = 0,
  className 
}: { 
  children: React.ReactNode
  index?: number
  className?: string
}) {
  return (
    <div 
      className={cn("list-item-enter", className)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {children}
    </div>
  )
}
