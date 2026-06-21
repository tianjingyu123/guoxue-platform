import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { HomeFeed, PaipanGuideCard, MarketingCard } from "@/components/home-feed"
import { FloatingAssistant } from "@/components/floating-assistant"
import { HomeBanner, defaultBanners } from "@/components/home/home-banner"
import { QuickEntryGrid } from "@/components/home/quick-entry-grid"
import { Home, Users, Compass, Sparkles, User, Search, Bell } from "lucide-react"
import { DailyVerse } from "@/components/common/daily-verse"

// 控制顶部固定大卡的显隐（后端配置化时替换为接口数据）
const SHOW_MARKETING_CARD = true  // 营销活动卡 - 运营可关闭
const SHOW_PAIPAN_CARD    = true  // 排盘工具引导卡

const desktopNav = [
  { href: "/", label: "首页", icon: Home, active: true },
  { href: "/circles", label: "圈子", icon: Users },
  { href: "/paipan", label: "排盘工具", icon: Compass, accent: true },
  { href: "/discover", label: "发现", icon: Sparkles },
  { href: "/profile", label: "我的", icon: User },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 今日小语 · 每日首次打开的文化仪式感（自动收起） */}
      <DailyVerse />
      {/* 移动端布局 */}
      <div className="lg:hidden max-w-lg mx-auto relative">
        <AppHeader />
        <main className="overflow-y-auto pt-[88px]">
          {/* Banner轮播 */}
          <HomeBanner banners={defaultBanners} />
          {/* 10宫格功能入口 */}
          <QuickEntryGrid />
          {/* 排盘工具引导大卡 - 固定在宫格导航正下方，只出现一次 */}
          {SHOW_PAIPAN_CARD && (
            <div className="px-[5px] sm:px-3 pt-[6px]">
              <PaipanGuideCard />
            </div>
          )}
          {/* 营销/活动入口大卡 - 运营可控，紧随排盘卡之后 */}
          {SHOW_MARKETING_CARD && (
            <div className="px-[5px] sm:px-3">
              <MarketingCard />
            </div>
          )}
          {/* AI推荐Feed流 - 单一连贯瀑布流，不被全宽卡片打断 */}
          <HomeFeed />
        </main>
        <FloatingAssistant />
        <BottomNav />
      </div>

      {/* 桌面端布局 - 带侧边栏 */}
      <div className="hidden lg:flex">
        {/* 左侧固定侧边栏 */}
        <aside className="fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-sidebar-border z-40 flex flex-col">
          <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <a href="/" className="flex items-center gap-2" aria-label="热卜国学首页">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm" aria-hidden="true">热</span>
              </div>
              <span className="font-serif font-bold text-lg text-sidebar-foreground">热卜国学</span>
            </a>
          </div>
          <nav className="flex-1 py-4 px-2 space-y-1" aria-label="主导航">
            {desktopNav.map(({ href, label, icon: Icon, active, accent }) => (
              <a
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                    : accent
                      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary hover:bg-sidebar-accent transition-colors"
                      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                }
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-medium">{label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="ml-56 flex-1 min-h-screen">
          {/* 顶部搜索栏 */}
          <header className="sticky top-0 h-16 bg-card/95 backdrop-blur-lg border-b border-border z-30 flex items-center justify-between px-6">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <label htmlFor="desktop-search" className="sr-only">AI搜索平台全部内容</label>
                <input
                  id="desktop-search"
                  type="search"
                  placeholder="AI搜索平台全部内容..."
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <a href="/im/conversations" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="消息中心，有未读消息">
                <Bell className="w-5 h-5 text-foreground" aria-hidden="true" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" aria-hidden="true" />
              </a>
              <a href="/profile" className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center" aria-label="我的主页">
                <User className="w-4 h-4 text-primary" aria-hidden="true" />
              </a>
            </div>
          </header>

          <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
              <HomeBanner banners={defaultBanners} />
            </div>
            <div className="mb-6">
              <QuickEntryGrid />
            </div>
            {/* 排盘引导大卡 + 营销卡 - 固定在宫格下方 */}
            {SHOW_PAIPAN_CARD && <div className="mb-3"><PaipanGuideCard /></div>}
            {SHOW_MARKETING_CARD && <div className="mb-6"><MarketingCard /></div>}
            <HomeFeed />
          </div>
        </main>

        <FloatingAssistant />
      </div>
    </div>
  )
}
