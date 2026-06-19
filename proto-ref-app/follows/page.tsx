"use client"

import { useState, useMemo } from "react"
import { BackButton } from "@/components/common/back-button"
import { Search, BadgeCheck, UserPlus, UserMinus, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 模拟用户数据
const followingUsers = [
  { id: 1, name: "玄易大师", avatar: "", bio: "国学研究者，专注八字命理30年", isVerified: true, isFollowing: true },
  { id: 2, name: "子平先生", avatar: "", bio: "《渊海子平》研究专家，授课千余场", isVerified: true, isFollowing: true },
  { id: 3, name: "紫微学堂", avatar: "", bio: "紫微斗数教学，通俗易懂", isVerified: false, isFollowing: true },
  { id: 4, name: "风水堪舆师", avatar: "", bio: "环境风水咨询，阳宅布局", isVerified: true, isFollowing: true },
  { id: 5, name: "易学爱好者小王", avatar: "", bio: "学习中，欢迎交流", isVerified: false, isFollowing: true },
]

const followerUsers = [
  { id: 6, name: "命理学徒", avatar: "", bio: "正在学习八字命理", isVerified: false, isFollowing: false },
  { id: 7, name: "国学新手", avatar: "", bio: "对传统文化很感兴趣", isVerified: false, isFollowing: true },
  { id: 8, name: "道法自然", avatar: "", bio: "道家文化爱好者，修身养性", isVerified: true, isFollowing: false },
  { id: 9, name: "周易研习社", avatar: "", bio: "周易研究小组，共同进步", isVerified: false, isFollowing: false },
  { id: 10, name: "玄门弟子", avatar: "", bio: "跟随师父学习中", isVerified: false, isFollowing: true },
  { id: 11, name: "易经初学者", avatar: "", bio: "刚开始接触易经", isVerified: false, isFollowing: false },
]

type TabType = "following" | "followers"

export default function FollowsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("following")
  const [searchQuery, setSearchQuery] = useState("")
  const [followingState, setFollowingState] = useState<Record<number, boolean>>(() => {
    const state: Record<number, boolean> = {}
    followingUsers.forEach(u => { state[u.id] = true })
    followerUsers.forEach(u => { state[u.id] = u.isFollowing })
    return state
  })

  const currentList = activeTab === "following" ? followingUsers : followerUsers

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    return currentList.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [currentList, searchQuery])

  const toggleFollow = (userId: number) => {
    setFollowingState(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const followingCount = followingUsers.length
  const followerCount = followerUsers.length

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-14 px-4">
  <BackButton fallbackPath="/profile" />
  <h1 className="font-semibold text-base text-foreground">社交关系</h1>
          <div className="w-9" />
        </div>

        {/* Tab切换 */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("following")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === "following" ? "text-primary" : "text-muted-foreground"
            )}
          >
            关注 {followingCount}
            {activeTab === "following" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("followers")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === "followers" ? "text-primary" : "text-muted-foreground"
            )}
          >
            粉丝 {followerCount}
            {activeTab === "followers" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索用户"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </header>

      {/* 用户列表 */}
      <div className="divide-y divide-border">
        {filteredList.length > 0 ? (
          filteredList.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
              {/* 头像 + 用户信息 - 点击跳转 */}
              <Link href={`/user/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm text-foreground truncate">{user.name}</span>
                    {user.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{user.bio}</p>
                </div>
              </Link>

              {/* 操作按钮 */}
              <Button
                variant={followingState[user.id] ? "outline" : "default"}
                size="sm"
                onClick={() => toggleFollow(user.id)}
                className={cn(
                  "h-8 px-4 text-xs font-medium rounded-full flex-shrink-0",
                  followingState[user.id] 
                    ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/5" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {followingState[user.id] ? (
                  <>
                    <UserMinus className="w-3.5 h-3.5 mr-1" />
                    已关注
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    {activeTab === "followers" ? "回关" : "关注"}
                  </>
                )}
              </Button>
            </div>
          ))
        ) : (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm text-center">
              {searchQuery ? (
                "没有找到相关用户"
              ) : activeTab === "following" ? (
                "还没有关注任何人"
              ) : (
                "还没有粉丝"
              )}
            </p>
            {!searchQuery && (
              <Link href="/discover">
                <Button variant="outline" size="sm" className="mt-4 rounded-full">
                  {activeTab === "following" ? "去发现更多用户" : "分享内容吸引粉丝"}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 底部安全区 */}
      <div className="h-8" />
    </div>
  )
}
