"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

// 路径到中文名称的映射
const pathNameMap: Record<string, string> = {
  // 一级目录
  "circles": "圈子",
  "circle": "圈子",
  "courses": "课程",
  "course": "课程",
  "articles": "文章",
  "article": "文章",
  "videos": "视频",
  "video": "视频",
  "live": "直播",
  "mall": "商城",
  "ebook": "电子书",
  "paipan": "排盘",
  "discover": "发现",
  "profile": "我的",
  "mine": "我的",
  "settings": "设置",
  "notifications": "消息",
  "messages": "消息",
  "orders": "订单",
  "wallet": "钱包",
  "help": "帮助中心",
  "institute": "研究院",
  "station": "驿站",
  "substation": "分站",
  "operator": "运营商",
  "teacher": "讲师",
  "search": "搜索",
  "favorites": "收藏",
  "history": "历史",
  "learning": "学习",
  "activities": "活动",
  "competitions": "赛事",
  "qa": "问答",
  "rankings": "排行榜",
  "announcements": "公告",
  "feedback": "意见反馈",
  "invite": "邀请有礼",
  "vip": "会员",
  "join": "加入",
  
  // 二级目录
  "manage": "管理",
  "detail": "详情",
  "publish": "发布",
  "edit": "编辑",
  "create": "创建",
  "members": "成员",
  "guests": "嘉宾",
  "posts": "动态",
  "comments": "评论",
  "earnings": "收益",
  "withdraw": "提现",
  "recharge": "充值",
  "transactions": "交易记录",
  "bill": "账单",
  "security": "安全中心",
  "privacy": "隐私设置",
  "about": "关于",
  "apply": "申请",
  "center": "中心",
  "list": "列表",
  "category": "分类",
  "player": "播放",
  "reader": "阅读",
  "distribution": "分配方案",
  "quota": "名额管理",
  "teachers": "老师管理",
  "team": "团队",
  "dashboard": "工作台",
  "memberships": "我的权益",
  "admin": "管理后台",
  "teacher-pool": "老师人才库",
  "teacher-demand": "课程需求",
  "member-apply": "成员申请",
  "guoxue-design": "国学设计",
}

// 不显示面包屑的页面
const hideBreadcrumbPaths = [
  "/",
  "/circles",
  "/paipan",
  "/discover",
  "/profile",
  "/splash",
  "/welcome",
  "/login",
  "/register",
]

// 获取路径段的中文名称
function getSegmentName(segment: string): string {
  // 如果是动态路由参数（如 [id]），返回空
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return ""
  }
  // 如果是纯数字ID，返回"详情"
  if (/^\d+$/.test(segment)) {
    return "详情"
  }
  return pathNameMap[segment] || segment
}

// 构建面包屑项
function buildBreadcrumbs(pathname: string): { name: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: { name: string; href: string }[] = []
  
  let currentPath = ""
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    const name = getSegmentName(segment)
    
    if (name) {
      breadcrumbs.push({
        name,
        href: currentPath,
      })
    }
  }
  
  return breadcrumbs
}

interface BreadcrumbNavProps {
  className?: string
  showHome?: boolean
  customItems?: { name: string; href: string }[]
}

export function BreadcrumbNav({ 
  className,
  showHome = true,
  customItems,
}: BreadcrumbNavProps) {
  const pathname = usePathname()
  
  // 如果在不显示面包屑的页面，返回null
  if (hideBreadcrumbPaths.includes(pathname)) {
    return null
  }
  
  const items = customItems || buildBreadcrumbs(pathname)
  
  // 如果只有一个层级，也不显示
  if (items.length <= 1) {
    return null
  }
  
  return (
    <nav 
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto",
        className
      )}
      aria-label="面包屑导航"
    >
      {showHome && (
        <>
          <Link 
            href="/" 
            className="flex items-center gap-1 hover:text-foreground transition-colors flex-shrink-0"
          >
            <Home className="w-3.5 h-3.5" />
            <span>首页</span>
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0 text-border" />
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={item.href} className="flex items-center gap-1 flex-shrink-0">
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[120px]">
                {item.name}
              </span>
            ) : (
              <>
                <Link 
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[80px]"
                >
                  {item.name}
                </Link>
                <ChevronRight className="w-3 h-3 flex-shrink-0 text-border" />
              </>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// 页面头部组件（带面包屑）
interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  showBreadcrumb?: boolean
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  showBreadcrumb = true,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {showBreadcrumb && <BreadcrumbNav className="mb-2" />}
      
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground font-serif">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
