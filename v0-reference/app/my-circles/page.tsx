"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Plus, Users, Crown, Shield, User, Bell, ChevronRight, Flame, Settings, TrendingUp, MessageSquare, Calendar, Award } from "lucide-react"
import { cn } from "@/lib/utils"

// 我的圈子数据
const myCircles = [
  {
    id: "1",
    name: "八字命理研习社",
    cover: "https://picsum.photos/200/200?random=101",
    type: "paid",
    price: 199,
    role: "owner",
    memberCount: 1280,
    todayActive: 56,
    latestPost: "周易大师发布了新文章《八字中的十神关系详解》",
    unreadCount: 5,
    lastActive: "10分钟前",
    level: 5,
    exp: 1280,
  },
  {
    id: "2",
    name: "紫微斗数学院",
    cover: "https://picsum.photos/200/200?random=102",
    type: "paid",
    price: 299,
    role: "admin",
    memberCount: 856,
    todayActive: 32,
    latestPost: "张玄风：今天的直播课程大家记得准时参加",
    unreadCount: 12,
    lastActive: "30分钟前",
    level: 4,
    exp: 960,
  },
  {
    id: "3",
    name: "风水堪舆交流群",
    cover: "https://picsum.photos/200/200?random=103",
    type: "free",
    price: 0,
    role: "member",
    memberCount: 2560,
    todayActive: 128,
    latestPost: "陈风水分享了一个案例《商铺选址的风水要点》",
    unreadCount: 0,
    lastActive: "1小时前",
    level: 3,
    exp: 450,
  },
  {
    id: "4",
    name: "易经六十四卦研习",
    cover: "https://picsum.photos/200/200?random=104",
    type: "paid",
    price: 99,
    role: "member",
    memberCount: 680,
    todayActive: 18,
    latestPost: "今日话题：乾卦与坤卦的关系",
    unreadCount: 3,
    lastActive: "2小时前",
    level: 2,
    exp: 180,
  },
]

// 统计数据
const stats = {
  totalCircles: 4,
  asOwner: 1,
  asAdmin: 1,
  asMember: 2,
  totalPosts: 156,
  totalLikes: 2800,
  totalExp: 2870,
}

// 角色图标和颜色
const roleConfig = {
  owner: { icon: Crown, label: "圈主", color: "text-[#C9A96E]", bgColor: "bg-[#C9A96E]/10" },
  admin: { icon: Shield, label: "管理员", color: "text-[#1890FF]", bgColor: "bg-[#1890FF]/10" },
  member: { icon: User, label: "成员", color: "text-[#52C41A]", bgColor: "bg-[#52C41A]/10" },
}

export default function MyCirclesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "owner" | "admin" | "member">("all")
  
  const filteredCircles = myCircles.filter(circle => {
    if (activeFilter !== "all" && circle.role !== activeFilter) return false
    if (searchQuery && !circle.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  
  const totalUnread = myCircles.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-[17px] font-semibold text-[#2C2C2C]">我的圈子</h1>
          <Link href="/circles" className="text-[13px] text-[#C41E3A]">发现更多</Link>
        </div>
      </div>

      {/* 数据概览卡片 */}
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-br from-[#C41E3A] to-[#A01530] rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">我的圈子数据</span>
            <Link href="/circles/stats" className="text-[12px] text-white/70 flex items-center">
              详情 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[22px] font-bold">{stats.totalCircles}</div>
              <div className="text-[11px] text-white/70">已加入</div>
            </div>
            <div>
              <div className="text-[22px] font-bold">{stats.totalPosts}</div>
              <div className="text-[11px] text-white/70">发帖数</div>
            </div>
            <div>
              <div className="text-[22px] font-bold">{stats.totalLikes > 1000 ? `${(stats.totalLikes/1000).toFixed(1)}k` : stats.totalLikes}</div>
              <div className="text-[11px] text-white/70">获赞数</div>
            </div>
            <div>
              <div className="text-[22px] font-bold">{stats.totalExp}</div>
              <div className="text-[11px] text-white/70">总经验</div>
            </div>
          </div>
          {/* 身份分布 */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-around text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="font-medium">{stats.asOwner}</span>
              </div>
              <div className="text-[10px] text-white/60">圈主</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Shield className="w-4 h-4 text-blue-300" />
                <span className="font-medium">{stats.asAdmin}</span>
              </div>
              <div className="text-[10px] text-white/60">管理员</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <User className="w-4 h-4 text-green-300" />
                <span className="font-medium">{stats.asMember}</span>
              </div>
              <div className="text-[10px] text-white/60">成员</div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              placeholder="搜索圈子"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-white rounded-full border border-[#E8E3DB] text-[13px] focus:outline-none focus:border-[#C41E3A]/50"
            />
          </div>
        </div>
        
        {/* 筛选Tab */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: "all", label: "全部", count: stats.totalCircles },
            { id: "owner", label: "我创建的", count: stats.asOwner },
            { id: "admin", label: "我管理的", count: stats.asAdmin },
            { id: "member", label: "我加入的", count: stats.asMember },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1",
                activeFilter === tab.id
                  ? "bg-[#C41E3A] text-white"
                  : "bg-white text-[#666] border border-[#E8E3DB]"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[10px] px-1.5 rounded-full",
                activeFilter === tab.id ? "bg-white/20" : "bg-[#F5F0E8]"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 圈子列表 */}
      <div className="px-4 pt-2 space-y-3">
        {filteredCircles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-[#999]" />
            </div>
            <p className="text-[#999] text-[14px] mb-2">暂无圈子</p>
            <Link href="/circles" className="text-[#C41E3A] text-[13px]">
              去发现圈子
            </Link>
          </div>
        ) : (
          filteredCircles.map(circle => {
            const RoleIcon = roleConfig[circle.role as keyof typeof roleConfig].icon
            const roleInfo = roleConfig[circle.role as keyof typeof roleConfig]
            
            return (
              <Link key={circle.id} href={`/circles/${circle.id}`}>
                <div className="bg-white rounded-xl p-4 shadow-sm active:bg-[#F9F6F2] transition-colors">
                  <div className="flex items-start gap-3">
                    {/* 圈子封面 */}
                    <div className="relative">
                      <img 
                        src={circle.cover} 
                        alt={circle.name} 
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      {circle.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-medium">
                            {circle.unreadCount > 99 ? '99+' : circle.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* 圈子信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[15px] text-[#2C2C2C] truncate">{circle.name}</h3>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5",
                          roleInfo.bgColor, roleInfo.color
                        )}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-[#999]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {circle.memberCount}人
                        </span>
                        {circle.todayActive > 0 && (
                          <span className="flex items-center gap-1 text-[#FF6B35]">
                            <Flame className="w-3.5 h-3.5" />
                            今日{circle.todayActive}动态
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[12px] text-[#666] mt-1.5 line-clamp-1">{circle.latestPost}</p>
                      
                      {/* 等级和经验 */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded">
                          Lv.{circle.level}
                        </span>
                        <div className="flex-1 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#C41E3A] to-[#FF6B35] rounded-full"
                            style={{ width: `${(circle.exp % 500) / 5}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#999]">{circle.exp}exp</span>
                      </div>
                    </div>
                    
                    {/* 右侧操作 */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[11px] text-[#BBB]">{circle.lastActive}</span>
                      {circle.role === "owner" && (
                        <Link 
                          href={`/circles/${circle.id}/manage`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-[#F5F0E8] text-[#666]"
                        >
                          <Settings className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* 快捷入口 */}
      <div className="px-4 pt-6 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Link href="/circles/create" className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 mx-auto bg-[#C41E3A]/10 rounded-xl flex items-center justify-center mb-2">
              <Plus className="w-5 h-5 text-[#C41E3A]" />
            </div>
            <span className="text-[12px] text-[#2C2C2C]">创建圈子</span>
          </Link>
          <Link href="/circles/activities" className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 mx-auto bg-[#FF6B35]/10 rounded-xl flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <span className="text-[12px] text-[#2C2C2C]">我的活动</span>
          </Link>
          <Link href="/circles/badges" className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 mx-auto bg-[#C9A96E]/10 rounded-xl flex items-center justify-center mb-2">
              <Award className="w-5 h-5 text-[#C9A96E]" />
            </div>
            <span className="text-[12px] text-[#2C2C2C]">我的勋章</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
