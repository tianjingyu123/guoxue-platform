"use client"

import { Home, Compass, Users, ShoppingBag, User } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

// 太极图图标 - 与顶部LOGO保持一致的样式
function TaijiIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={cn("w-7 h-7", className)}
    >
      {/* 红色底圆 */}
      <circle cx="12" cy="12" r="11" fill="#C41E3A" />
      {/* 白色S形阴鱼 */}
      <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#FAF8F5" />
      {/* 阳中阴点 - 白色半内的红点 */}
      <circle cx="12" cy="6.5" r="2" fill="#C41E3A" />
      {/* 阴中阳点 - 红色半内的白点 */}
      <circle cx="12" cy="17.5" r="2" fill="#FAF8F5" />
    </svg>
  )
}

const tabs = [
  { id: "home", label: "首页", icon: Home, href: "/" },
  { id: "circle", label: "圈子", icon: Users, href: "/circles" },
  { id: "paipan", label: "排盘", icon: null, href: "/paipan" },
  { id: "discover", label: "发现", icon: ShoppingBag, href: "/discover" },
  { id: "profile", label: "我的", icon: User, href: "/profile" },
]

export function BottomNav() {
  const pathname = usePathname()
  
  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname.startsWith("/circle") || pathname.startsWith("/circles") || pathname.startsWith("/my-circles")) return "circle"
    if (pathname.startsWith("/paipan")) return "paipan"
    if (pathname.startsWith("/discover") || pathname.startsWith("/mall") || pathname.startsWith("/courses") || pathname.startsWith("/books") || pathname.startsWith("/agents")) return "discover"
    if (pathname.startsWith("/profile") || pathname.startsWith("/mine")) return "profile"
    return "home"
  }
  
  const activeTab = getActiveTab()
  
  return (
    <nav
      aria-label="底部主导航"
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-pb shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      {/* 高度112rpx(56px)，增加点击区域 */}
      <div className="flex items-center justify-around h-[56px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isPaipan = tab.id === "paipan"
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all duration-200"
            >
              {isPaipan ? (
                // 排盘中心按钮 - 凸起设计，强调核心功能
                <div className="flex flex-col items-center -mt-5">
                  {/* 太极图容器 - 白色背景圆形托底，增加阴影层级 */}
                  <div className={cn(
                    "relative w-[44px] h-[44px] flex items-center justify-center rounded-full",
                    "bg-card shadow-[0_2px_12px_rgba(196,30,58,0.25)]",
                    isActive && "taiji-breathing-glow"
                  )}>
                    {/* 选中时缓慢自转9秒周期 */}
                    <div className={cn(isActive && "taiji-slow-rotate")} aria-hidden="true">
                      <TaijiIcon className="w-[32px] h-[32px]" />
                    </div>
                  </div>
                  {/* 文字 - 22rpx约11px，font-weight:700 */}
                  <span className={cn(
                    "text-[11px] mt-1 font-bold",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {tab.label}
                  </span>
                </div>
              ) : (
                // 普通导航项 - 图标52rpx约22px
                <>
                  {Icon && (
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "w-[22px] h-[22px] transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      fill={isActive ? "currentColor" : "none"}
                    />
                  )}
                  {/* 文字 - 22rpx约11px，font-weight:700 */}
                  <span
                    className={cn(
                      "text-[11px] font-bold transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
