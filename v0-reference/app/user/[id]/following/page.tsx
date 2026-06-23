"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/common/back-button"
import { Search, BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"

// 模拟关注/粉丝数据
const mockUsers = [
  {
    id: "1",
    name: "王明理",
    avatar: "/avatars/avatar1.jpg",
    bio: "易学研究者，专注八字命理",
    isVerified: true,
    isFollowing: true,
    tags: ["八字命理", "风水"],
  },
  {
    id: "2", 
    name: "张玄学",
    avatar: "/avatars/avatar2.jpg",
    bio: "紫微斗数研究十五年",
    isVerified: false,
    isFollowing: true,
    tags: ["紫微斗数"],
  },
  {
    id: "3",
    name: "李国风",
    avatar: "/avatars/avatar3.jpg",
    bio: "传统文化推广者，道家文化爱好者",
    isVerified: true,
    isFollowing: false,
    tags: ["道家文化", "易经"],
  },
  {
    id: "4",
    name: "陈易经",
    avatar: "/avatars/avatar4.jpg",
    bio: "周易研究会会员，擅长六爻预测",
    isVerified: false,
    isFollowing: true,
    tags: ["六爻", "周易"],
  },
  {
    id: "5",
    name: "赵风水",
    avatar: "/avatars/avatar5.jpg",
    bio: "风水堪舆实战派，从业二十年",
    isVerified: true,
    isFollowing: false,
    tags: ["风水堪舆"],
  },
]

// 加载状态
function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">加载中...</div>
    </div>
  )
}

// 主组件
function UserFollowingPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<"following" | "followers">(
    tabParam === "followers" ? "followers" : "following"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState(mockUsers)
  
  useEffect(() => {
    if (tabParam === "followers") {
      setActiveTab("followers")
    }
  }, [tabParam])

  const filteredUsers = users.filter(user => 
    user.name.includes(searchQuery) || user.bio.includes(searchQuery)
  )

  const toggleFollow = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user
    ))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">社交关系</h1>
          <div className="w-9" />
        </div>
        
        {/* Tab 切换 */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("following")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === "following" ? "text-primary" : "text-muted-foreground"
            )}
          >
            关注
            {activeTab === "following" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("followers")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === "followers" ? "text-primary" : "text-muted-foreground"
            )}
          >
            粉丝
            {activeTab === "followers" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* 搜索框 */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索用户"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* 用户列表 */}
      <div className="divide-y divide-border">
        {filteredUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-4">
            <Link href={`/user/${user.id}`}>
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1 min-w-0">
              <Link href={`/user/${user.id}`} className="flex items-center gap-1">
                <span className="font-medium text-foreground">{user.name}</span>
                {user.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary" />
                )}
              </Link>
              <p className="text-sm text-muted-foreground truncate">{user.bio}</p>
              <div className="flex items-center gap-1 mt-1">
                {user.tags.slice(0, 2).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => toggleFollow(user.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                user.isFollowing
                  ? "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {user.isFollowing ? "已关注" : "关注"}
            </button>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">暂无{activeTab === "following" ? "关注" : "粉丝"}</p>
        </div>
      )}
    </div>
  )
}

// 导出组件
export default function UserFollowingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UserFollowingPageContent />
    </Suspense>
  )
}
