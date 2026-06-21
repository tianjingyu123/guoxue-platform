"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Home, Compass, Users, ShoppingBag, User, Menu, Search, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// 断点定义
export const BREAKPOINTS = {
  mobile: 0,      // < 768px
  tablet: 768,    // 768-1024px
  desktop: 1024,  // 1024-1440px
  wide: 1440,     // >= 1440px
} as const

export type DeviceType = "mobile" | "tablet" | "desktop" | "wide"

// 响应式上下文
interface ResponsiveContextType {
  deviceType: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  isFoldable: boolean
  screenWidth: number
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const ResponsiveContext = createContext<ResponsiveContextType | null>(null)

export function useResponsive() {
  const context = useContext(ResponsiveContext)
  if (!context) {
    return {
      deviceType: "mobile" as DeviceType,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isWide: false,
      isFoldable: false,
      screenWidth: 375,
      sidebarCollapsed: false,
      toggleSidebar: () => {},
    }
  }
  return context
}

// 导航项配置
const navItems = [
  { id: "home", label: "首页", icon: Home, href: "/" },
  { id: "circle", label: "圈子", icon: Users, href: "/circle" },
  { id: "paipan", label: "排盘", icon: Compass, href: "/paipan", highlight: true },
  { id: "discover", label: "发现", icon: ShoppingBag, href: "/discover" },
  { id: "profile", label: "我的", icon: User, href: "/profile" },
]

// PC端侧边栏
function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  
  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname.startsWith("/circle")) return "circle"
    if (pathname.startsWith("/paipan")) return "paipan"
    if (pathname.startsWith("/discover") || pathname.startsWith("/mall")) return "discover"
    if (pathname.startsWith("/profile")) return "profile"
    return "home"
  }
  
  const activeTab = getActiveTab()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40",
        "hidden lg:flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">热</span>
            </div>
            <span className="font-serif font-bold text-lg text-sidebar-foreground">热卜国学</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">热</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("text-sidebar-foreground/70 hover:text-sidebar-foreground", collapsed && "hidden")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                item.highlight && !isActive && "text-primary"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", item.highlight && "text-primary")} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* 折叠按钮 */}
      {collapsed && (
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </aside>
  )
}

// 移动端底部导航
function MobileBottomNav() {
  const pathname = usePathname()
  
  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname.startsWith("/circle")) return "circle"
    if (pathname.startsWith("/paipan")) return "paipan"
    if (pathname.startsWith("/discover") || pathname.startsWith("/mall")) return "discover"
    if (pathname.startsWith("/profile")) return "profile"
    return "home"
  }
  
  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isPaipan = tab.highlight
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
                isPaipan && "relative -mt-4"
              )}
            >
              {isPaipan ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs mt-1 text-primary font-medium">{tab.label}</span>
                </div>
              ) : (
                <>
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-accent" : "text-muted-foreground")} />
                  <span className={cn("text-xs transition-colors", isActive ? "text-accent font-medium" : "text-muted-foreground")}>
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

// PC端顶部栏
function DesktopHeader({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 bg-card/95 backdrop-blur-lg border-b border-border z-30",
        "hidden lg:flex items-center justify-between px-6 transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-56"
      )}
    >
      {/* 搜索框 */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索课程、圈子、文章..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-4 ml-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </Button>
        <Link href="/profile">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </Link>
      </div>
    </header>
  )
}

// 响应式布局提供者
export function ResponsiveLayoutProvider({ children }: { children: ReactNode }) {
  const [deviceType, setDeviceType] = useState<DeviceType>("mobile")
  const [screenWidth, setScreenWidth] = useState(375)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isFoldable, setIsFoldable] = useState(false)

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      setScreenWidth(width)
      
      // 检测折叠屏（宽高比变化较大）
      const aspectRatio = window.innerWidth / window.innerHeight
      setIsFoldable(aspectRatio > 0.5 && aspectRatio < 0.7)

      if (width < BREAKPOINTS.tablet) {
        setDeviceType("mobile")
      } else if (width < BREAKPOINTS.desktop) {
        setDeviceType("tablet")
      } else if (width < BREAKPOINTS.wide) {
        setDeviceType("desktop")
      } else {
        setDeviceType("wide")
      }
    }

    updateDeviceType()
    window.addEventListener("resize", updateDeviceType)
    return () => window.removeEventListener("resize", updateDeviceType)
  }, [])

  const contextValue: ResponsiveContextType = {
    deviceType,
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop" || deviceType === "wide",
    isWide: deviceType === "wide",
    isFoldable,
    screenWidth,
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
  }

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  )
}

// 主布局组件
interface ResponsiveLayoutProps {
  children: ReactNode
  showNav?: boolean
  showHeader?: boolean
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
  className?: string
}

export function ResponsiveLayout({
  children,
  showNav = true,
  showHeader = true,
  maxWidth = "lg",
  className,
}: ResponsiveLayoutProps) {
  const { isDesktop, sidebarCollapsed, toggleSidebar } = useResponsive()

  const maxWidthClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-full",
  }

  return (
    <ResponsiveLayoutProvider>
      <div className="min-h-screen bg-background">
        {/* PC端侧边栏 */}
        {showNav && isDesktop && (
          <DesktopSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        )}

        {/* PC端顶部栏 */}
        {showHeader && isDesktop && (
          <DesktopHeader sidebarCollapsed={sidebarCollapsed} />
        )}

        {/* 主内容区 */}
        <main
          className={cn(
            "transition-all duration-300",
            isDesktop && showNav && (sidebarCollapsed ? "lg:ml-16" : "lg:ml-56"),
            isDesktop && showHeader && "lg:pt-16",
            !isDesktop && showNav && "pb-20",
            className
          )}
        >
          <div className={cn(
            "mx-auto",
            !isDesktop && "max-w-lg",
            isDesktop && maxWidthClasses[maxWidth]
          )}>
            {children}
          </div>
        </main>

        {/* 移动端底部导航 */}
        {showNav && !isDesktop && <MobileBottomNav />}
      </div>
    </ResponsiveLayoutProvider>
  )
}

// 响应式网格组件
interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  mobileCols?: 1 | 2
  tabletCols?: 2 | 3 | 4
  desktopCols?: 3 | 4 | 5 | 6
  gap?: "sm" | "md" | "lg"
}

export function ResponsiveGrid({
  children,
  className,
  mobileCols = 2,
  tabletCols = 3,
  desktopCols = 4,
  gap = "md",
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-3 md:gap-4",
    lg: "gap-4 md:gap-6",
  }

  const colClasses = {
    mobile: {
      1: "grid-cols-1",
      2: "grid-cols-2",
    },
    tablet: {
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
    },
    desktop: {
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
      6: "lg:grid-cols-6",
    },
  }

  return (
    <div
      className={cn(
        "grid",
        colClasses.mobile[mobileCols],
        colClasses.tablet[tabletCols],
        colClasses.desktop[desktopCols],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

// 响应式详情页布局
interface ResponsiveDetailLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
  stickyTop?: number
  className?: string
}

export function ResponsiveDetailLayout({
  children,
  sidebar,
  stickyTop = 80,
  className,
}: ResponsiveDetailLayoutProps) {
  const { isDesktop } = useResponsive()

  if (!isDesktop || !sidebar) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn("flex gap-6", className)}>
      {/* 主内容区 */}
      <div className="flex-1 min-w-0">{children}</div>
      
      {/* 侧边栏 */}
      <aside
        className="w-80 flex-shrink-0 hidden lg:block"
        style={{ position: "sticky", top: stickyTop, height: "fit-content" }}
      >
        {sidebar}
      </aside>
    </div>
  )
}
