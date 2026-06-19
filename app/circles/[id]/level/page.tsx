"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Star, Zap, Trophy, Award, Crown, Shield, Heart, MessageCircle, BookOpen, CheckCircle, Gift, ChevronRight, Lock, Sparkles, TrendingUp, Calendar, Target } from "lucide-react"
import { cn } from "@/lib/utils"

// 等级数据
const levels = [
  { level: 1, name: "入门学徒", minXp: 0, maxXp: 100, color: "#999", icon: "student" },
  { level: 2, name: "初窥门径", minXp: 100, maxXp: 300, color: "#52C41A", icon: "leaf" },
  { level: 3, name: "略有小成", minXp: 300, maxXp: 600, color: "#1890FF", icon: "book" },
  { level: 4, name: "登堂入室", minXp: 600, maxXp: 1000, color: "#722ED1", icon: "door" },
  { level: 5, name: "炉火纯青", minXp: 1000, maxXp: 1500, color: "#FF6B35", icon: "fire" },
  { level: 6, name: "出神入化", minXp: 1500, maxXp: 2200, color: "#C41E3A", icon: "star" },
  { level: 7, name: "登峰造极", minXp: 2200, maxXp: 3000, color: "#C9A96E", icon: "mountain" },
  { level: 8, name: "一代宗师", minXp: 3000, maxXp: 999999, color: "#FFD700", icon: "crown" },
]

// 勋章数据
const badges = [
  { id: "b1", name: "阅读达人", desc: "完成阅读打卡21天", icon: BookOpen, color: "#52C41A", obtained: true, obtainedAt: "2024-01-15" },
  { id: "b2", name: "热心助人", desc: "回答问题获得100赞", icon: Heart, color: "#FF6B6B", obtained: true, obtainedAt: "2024-01-10" },
  { id: "b3", name: "笔耕不辍", desc: "发布帖子50篇", icon: MessageCircle, color: "#1890FF", obtained: true, obtainedAt: "2024-01-08" },
  { id: "b4", name: "知识分享者", desc: "原创内容被加精10次", icon: Star, color: "#C9A96E", obtained: false, progress: 7, total: 10 },
  { id: "b5", name: "问答之星", desc: "付费问答获得好评50次", icon: Trophy, color: "#722ED1", obtained: false, progress: 32, total: 50 },
  { id: "b6", name: "圈子达人", desc: "加入10个圈子", icon: Crown, color: "#FF6B35", obtained: false, progress: 5, total: 10 },
]

// 等级特权
const levelPrivileges = [
  { level: 1, privileges: ["基础功能", "每日签到"] },
  { level: 2, privileges: ["发布帖子", "参与讨论"] },
  { level: 3, privileges: ["头像挂件", "专属昵称色"] },
  { level: 4, privileges: ["优先展示", "免费精华"] },
  { level: 5, privileges: ["专属勋章", "提问折扣"] },
  { level: 6, privileges: ["圈主推荐", "专栏投稿"] },
  { level: 7, privileges: ["嘉宾申请", "活动优先"] },
  { level: 8, privileges: ["终身会员", "专属服务"] },
]

// 经验获取方式
const xpSources = [
  { icon: CheckCircle, title: "每日签到", desc: "连续签到奖励更多", xp: "+5~20", color: "#52C41A" },
  { icon: MessageCircle, title: "发布帖子", desc: "发布优质内容", xp: "+10", color: "#1890FF" },
  { icon: Star, title: "获得精华", desc: "帖子被加精", xp: "+50", color: "#C9A96E" },
  { icon: Heart, title: "获得点赞", desc: "每10个赞", xp: "+5", color: "#FF6B6B" },
  { icon: BookOpen, title: "完成打卡", desc: "参与打卡活动", xp: "+10", color: "#722ED1" },
  { icon: Trophy, title: "问答采纳", desc: "回答被采纳", xp: "+30", color: "#FF6B35" },
]

// 用户数据
const userData = {
  name: "命理学习者",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
  level: 5,
  currentXp: 1280,
  totalXp: 1500,
  joinedDays: 128,
  posts: 156,
  likes: 2800,
  badges: 3,
  rank: 28,
}

export default function MemberLevelPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  
  const [activeTab, setActiveTab] = useState<'level' | 'badges' | 'xp'>('level')

  const currentLevel = levels.find(l => userData.currentXp >= l.minXp && userData.currentXp < l.maxXp) || levels[levels.length - 1]
  const nextLevel = levels.find(l => l.level === currentLevel.level + 1)
  const progressToNext = nextLevel 
    ? ((userData.currentXp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
    : 100

  const tabs = [
    { id: 'level', label: '等级详情' },
    { id: 'badges', label: '我的勋章' },
    { id: 'xp', label: '获取经验' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-8">
      {/* 顶部 */}
      <div className="bg-gradient-to-br from-[#2C2C2C] to-[#1a1a1a] pt-4 pb-8">
        {/* 导航 */}
        <div className="px-4 mb-6 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white font-semibold">我的等级</h1>
          <Link href={`/circles/${circleId}/level/rank`} className="text-[12px] text-white/70 flex items-center">
            排行 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 用户等级卡片 */}
        <div className="px-4">
          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <img src={userData.avatar} alt="" className="w-16 h-16 rounded-full border-2" style={{ borderColor: currentLevel.color }} />
                <div 
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: currentLevel.color }}
                >
                  {currentLevel.level}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold text-[16px]">{userData.name}</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                    style={{ backgroundColor: currentLevel.color }}
                  >
                    Lv.{currentLevel.level} {currentLevel.name}
                  </span>
                </div>
                <div className="text-white/60 text-[12px]">
                  圈内排名 #{userData.rank} · 已加入{userData.joinedDays}天
                </div>
              </div>
            </div>

            {/* 经验进度 */}
            <div className="bg-black/20 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-[12px]">经验值</span>
                <span className="text-white text-[12px]">
                  {userData.currentXp} / {nextLevel ? nextLevel.minXp : "MAX"}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${progressToNext}%`,
                    backgroundColor: currentLevel.color
                  }}
                />
              </div>
              {nextLevel && (
                <div className="text-white/50 text-[11px] mt-1.5">
                  距离 Lv.{nextLevel.level} {nextLevel.name} 还需 {nextLevel.minXp - userData.currentXp} 经验
                </div>
              )}
            </div>

            {/* 数据统计 */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center">
                <div className="text-white font-bold text-[18px]">{userData.posts}</div>
                <div className="text-white/50 text-[11px]">发帖</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-[18px]">{userData.likes}</div>
                <div className="text-white/50 text-[11px]">获赞</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-[18px]">{userData.badges}</div>
                <div className="text-white/50 text-[11px]">勋章</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-[18px]">{userData.totalXp}</div>
                <div className="text-white/50 text-[11px]">总经验</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all",
                activeTab === tab.id 
                  ? "bg-[#2C2C2C] text-white" 
                  : "text-[#666]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 py-4">
        {/* 等级详情 */}
        {activeTab === 'level' && (
          <div className="space-y-4">
            {/* 等级进度图 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#C41E3A]" />
                <span className="font-medium text-[#2C2C2C]">等级体系</span>
              </div>
              <div className="space-y-3">
                {levels.map((level, idx) => {
                  const isCurrentLevel = level.level === currentLevel.level
                  const isPassed = level.level < currentLevel.level
                  const isLocked = level.level > currentLevel.level
                  
                  return (
                    <div 
                      key={level.level}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all",
                        isCurrentLevel && "bg-[#FAF8F5] ring-2",
                        isPassed && "opacity-60"
                      )}
                      style={isCurrentLevel ? { ringColor: level.color + "30" } : undefined}
                    >
                      <div 
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                          isLocked && "bg-[#E8E3DB] text-[#999]"
                        )}
                        style={!isLocked ? { backgroundColor: level.color } : undefined}
                      >
                        {isLocked ? <Lock className="w-4 h-4" /> : level.level}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium text-[14px]",
                            isLocked ? "text-[#999]" : "text-[#2C2C2C]"
                          )}>
                            Lv.{level.level} {level.name}
                          </span>
                          {isCurrentLevel && (
                            <span className="px-2 py-0.5 bg-[#C41E3A] text-white text-[10px] rounded-full">当前</span>
                          )}
                          {isPassed && (
                            <CheckCircle className="w-4 h-4 text-[#52C41A]" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#999]">
                          {level.minXp} - {level.maxXp === 999999 ? "∞" : level.maxXp} 经验
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 当前等级特权 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-[#C9A96E]" />
                <span className="font-medium text-[#2C2C2C]">当前等级特权</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {levelPrivileges
                  .filter(p => p.level <= currentLevel.level)
                  .flatMap(p => p.privileges)
                  .map((privilege, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#FAF8F5] rounded-lg">
                      <CheckCircle className="w-4 h-4 text-[#52C41A]" />
                      <span className="text-[13px] text-[#2C2C2C]">{privilege}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 下一等级特权 */}
            {nextLevel && (
              <div className="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl p-4 border border-[#F0E6D3]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#C9A96E]" />
                  <span className="font-medium text-[#2C2C2C]">
                    Lv.{nextLevel.level} {nextLevel.name} 解锁特权
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {levelPrivileges.find(p => p.level === nextLevel.level)?.privileges.map((privilege, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full">
                      <Lock className="w-3.5 h-3.5 text-[#C9A96E]" />
                      <span className="text-[12px] text-[#666]">{privilege}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 我的勋章 */}
        {activeTab === 'badges' && (
          <div className="space-y-4">
            {/* 已获得勋章 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#C9A96E]" />
                  <span className="font-medium text-[#2C2C2C]">已获得勋章</span>
                </div>
                <span className="text-[12px] text-[#999]">{badges.filter(b => b.obtained).length}个</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {badges.filter(b => b.obtained).map(badge => (
                  <div key={badge.id} className="flex flex-col items-center p-3 bg-[#FAF8F5] rounded-xl">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: badge.color + "15" }}
                    >
                      <badge.icon className="w-6 h-6" style={{ color: badge.color }} />
                    </div>
                    <span className="text-[12px] font-medium text-[#2C2C2C] text-center">{badge.name}</span>
                    <span className="text-[10px] text-[#999]">{badge.obtainedAt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 未获得勋章 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#999]" />
                  <span className="font-medium text-[#2C2C2C]">待解锁勋章</span>
                </div>
                <span className="text-[12px] text-[#999]">{badges.filter(b => !b.obtained).length}个</span>
              </div>
              <div className="space-y-3">
                {badges.filter(b => !b.obtained).map(badge => (
                  <div key={badge.id} className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center opacity-50"
                      style={{ backgroundColor: badge.color + "15" }}
                    >
                      <badge.icon className="w-6 h-6" style={{ color: badge.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[14px] text-[#2C2C2C]">{badge.name}</span>
                        <Lock className="w-3.5 h-3.5 text-[#999]" />
                      </div>
                      <span className="text-[12px] text-[#999]">{badge.desc}</span>
                      {badge.progress !== undefined && badge.total !== undefined && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between text-[10px] text-[#999] mb-1">
                            <span>进度</span>
                            <span>{badge.progress}/{badge.total}</span>
                          </div>
                          <div className="h-1.5 bg-[#E8E3DB] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(badge.progress / badge.total) * 100}%`,
                                backgroundColor: badge.color
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 获取经验 */}
        {activeTab === 'xp' && (
          <div className="space-y-4">
            {/* 经验获取途径 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-[#FF6B35]" />
                <span className="font-medium text-[#2C2C2C]">经验获取途径</span>
              </div>
              <div className="space-y-2">
                {xpSources.map((source, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: source.color + "15" }}
                    >
                      <source.icon className="w-5 h-5" style={{ color: source.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[14px] text-[#2C2C2C]">{source.title}</div>
                      <div className="text-[12px] text-[#999]">{source.desc}</div>
                    </div>
                    <div className="text-[14px] font-bold" style={{ color: source.color }}>
                      {source.xp}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 每日签到 */}
            <div className="bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-white" />
                  <span className="font-medium text-white">每日签到</span>
                </div>
                <span className="text-white/70 text-[12px]">已连续签到 7 天</span>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-3">
                {[5, 5, 5, 10, 10, 15, 20].map((xp, idx) => {
                  const isPassed = idx < 3
                  const isToday = idx === 3
                  return (
                    <div 
                      key={idx}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center",
                        isPassed && "bg-white/20",
                        isToday && "bg-white",
                        !isPassed && !isToday && "bg-white/10"
                      )}
                    >
                      {isPassed ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <>
                          <span className={cn(
                            "text-[10px]",
                            isToday ? "text-[#C41E3A]" : "text-white/70"
                          )}>+{xp}</span>
                          <span className={cn(
                            "text-[8px]",
                            isToday ? "text-[#C41E3A]" : "text-white/50"
                          )}>Day{idx + 1}</span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <button className="w-full py-2.5 bg-white text-[#C41E3A] font-medium rounded-lg">
                立即签到 (+10经验)
              </button>
            </div>

            {/* 经验记录 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-[#2C2C2C]">最近获得</span>
                <Link href={`/circles/${circleId}/level/history`} className="text-[12px] text-[#C41E3A]">
                  全部记录
                </Link>
              </div>
              <div className="space-y-2">
                {[
                  { title: "发布帖子", time: "今天 10:30", xp: "+10" },
                  { title: "每日签到", time: "今天 09:00", xp: "+10" },
                  { title: "获得点赞", time: "昨天 22:15", xp: "+5" },
                  { title: "完成打卡", time: "昨天 21:00", xp: "+10" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
                    <div>
                      <div className="text-[13px] text-[#2C2C2C]">{item.title}</div>
                      <div className="text-[11px] text-[#999]">{item.time}</div>
                    </div>
                    <span className="text-[14px] font-medium text-[#52C41A]">{item.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
