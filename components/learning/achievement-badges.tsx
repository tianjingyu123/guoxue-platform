"use client"

import { useState } from "react"
import { 
  Trophy, Star, Flame, BookOpen, Award, Crown, Zap, Target,
  GraduationCap, Medal, Sparkles, Lock, CheckCircle2, Clock,
  TrendingUp, Users, MessageCircle, Heart, Calendar
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BadgeUnlock, type BadgeUnlockData, type UnlockIconName, type UnlockRarity } from "@/components/common/badge-unlock"

interface AchievementBadge {
  id: string
  name: string
  description: string
  icon: keyof typeof badgeIcons
  rarity: "common" | "rare" | "epic" | "legendary"
  category: "learning" | "social" | "streak" | "milestone" | "special"
  unlocked: boolean
  unlockedAt?: string
  progress?: number
  total?: number
}

const badgeIcons = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  book: BookOpen,
  award: Award,
  crown: Crown,
  zap: Zap,
  target: Target,
  graduation: GraduationCap,
  medal: Medal,
  sparkles: Sparkles,
  trending: TrendingUp,
  users: Users,
  message: MessageCircle,
  heart: Heart,
  calendar: Calendar,
}

const rarityConfig = {
  common: { 
    label: "普通", 
    bgGradient: "from-slate-400/20 to-slate-500/20",
    borderColor: "border-slate-400/30",
    textColor: "text-slate-500",
    glowColor: ""
  },
  rare: { 
    label: "稀有", 
    bgGradient: "from-blue-400/20 to-blue-500/20",
    borderColor: "border-blue-400/30",
    textColor: "text-blue-500",
    glowColor: "shadow-blue-500/20"
  },
  epic: { 
    label: "史诗", 
    bgGradient: "from-purple-400/20 to-purple-500/20",
    borderColor: "border-purple-400/30",
    textColor: "text-purple-500",
    glowColor: "shadow-purple-500/30"
  },
  legendary: { 
    label: "传说", 
    bgGradient: "from-amber-400/20 via-orange-400/20 to-red-400/20",
    borderColor: "border-amber-400/50",
    textColor: "text-amber-500",
    glowColor: "shadow-amber-500/40"
  },
}

const categoryConfig = {
  learning: { label: "学习", color: "text-blue-500" },
  social: { label: "社交", color: "text-green-500" },
  streak: { label: "坚持", color: "text-orange-500" },
  milestone: { label: "里程碑", color: "text-purple-500" },
  special: { label: "特殊", color: "text-amber-500" },
}

interface AchievementBadgesProps {
  badges: AchievementBadge[]
  showAll?: boolean
  className?: string
}

// 成就徽章展示组件
export function AchievementBadges({ badges, showAll = false, className }: AchievementBadgesProps) {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null)
  const [replay, setReplay] = useState<BadgeUnlockData | null>(null)
  
  const unlockedBadges = badges.filter(b => b.unlocked)
  const lockedBadges = badges.filter(b => !b.unlocked)
  const displayBadges = showAll ? badges : badges.slice(0, 8)

  return (
    <div className={className}>
      {/* 成就统计 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="font-semibold text-foreground">成就徽章</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          已解锁 {unlockedBadges.length}/{badges.length}
        </Badge>
      </div>

      {/* 徽章网格 */}
      <div className="grid grid-cols-4 gap-3">
        {displayBadges.map((badge) => {
          const IconComponent = badgeIcons[badge.icon]
          const rarity = rarityConfig[badge.rarity]
          
          return (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={cn(
                "relative aspect-square rounded-xl p-2 flex flex-col items-center justify-center transition-all",
                "border-2",
                badge.unlocked 
                  ? cn(
                      `bg-gradient-to-br ${rarity.bgGradient}`,
                      rarity.borderColor,
                      rarity.glowColor && `shadow-lg ${rarity.glowColor}`,
                      "hover:scale-105"
                    )
                  : "bg-muted/30 border-muted/50 opacity-50"
              )}
            >
              {/* 稀有度指示器 */}
              {badge.unlocked && badge.rarity !== "common" && (
                <div className={cn(
                  "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                  badge.rarity === "rare" && "bg-blue-500",
                  badge.rarity === "epic" && "bg-purple-500",
                  badge.rarity === "legendary" && "bg-gradient-to-br from-amber-400 to-orange-500"
                )}>
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              
              {/* 图标 */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                badge.unlocked 
                  ? `bg-gradient-to-br ${rarity.bgGradient}`
                  : "bg-muted"
              )}>
                {badge.unlocked ? (
                  <IconComponent className={cn("w-4 h-4", rarity.textColor)} />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              {/* 名称 */}
              <span className={cn(
                "text-[10px] text-center line-clamp-1",
                badge.unlocked ? "text-foreground" : "text-muted-foreground"
              )}>
                {badge.name}
              </span>

              {/* 进度指示器 */}
              {!badge.unlocked && badge.progress !== undefined && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/50 rounded-full"
                      style={{ width: `${(badge.progress / (badge.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 徽章详情弹窗 */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <Card 
            className="w-full max-w-xs p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const IconComponent = badgeIcons[selectedBadge.icon]
              const rarity = rarityConfig[selectedBadge.rarity]
              const category = categoryConfig[selectedBadge.category]
              
              return (
                <>
                  {/* 徽章展示 */}
                  <div className="flex flex-col items-center mb-4">
                    <div className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center mb-3",
                      selectedBadge.unlocked
                        ? cn(`bg-gradient-to-br ${rarity.bgGradient}`, "border-2", rarity.borderColor, rarity.glowColor && `shadow-xl ${rarity.glowColor}`)
                        : "bg-muted border-2 border-muted"
                    )}>
                      {selectedBadge.unlocked ? (
                        <IconComponent className={cn("w-10 h-10", rarity.textColor)} />
                      ) : (
                        <Lock className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-foreground">{selectedBadge.name}</h3>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-[10px]", rarity.textColor, `bg-${rarity.textColor}/10 border-0`)}>
                        {rarity.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {category.label}
                      </Badge>
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {selectedBadge.description}
                  </p>

                  {/* 状态 */}
                  {selectedBadge.unlocked ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-sm text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>已于 {selectedBadge.unlockedAt} 解锁</span>
                      </div>
                      <button
                        onClick={() => {
                          setReplay({
                            title: "重温解锁时刻",
                            name: selectedBadge.name,
                            description: selectedBadge.description,
                            icon: selectedBadge.icon as UnlockIconName,
                            rarity: selectedBadge.rarity as UnlockRarity,
                          })
                          setSelectedBadge(null)
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium text-white active:opacity-90"
                        style={{ background: "#c41e3a" }}
                      >
                        <Sparkles className="w-4 h-4" />
                        重温解锁时刻
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedBadge.progress !== undefined && (
                        <>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>完成进度</span>
                            <span>{selectedBadge.progress}/{selectedBadge.total}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(selectedBadge.progress / (selectedBadge.total || 1)) * 100}%` }}
                            />
                          </div>
                        </>
                      )}
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        继续努力，即将解锁此成就!
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </Card>
        </div>
      )}

      <BadgeUnlock
        open={replay !== null}
        data={replay || { name: "", description: "", icon: "award" }}
        onClose={() => setReplay(null)}
        claimLabel="收下"
      />
    </div>
  )
}

// 预设徽章数据
export const presetBadges: AchievementBadge[] = [
  // 学习类
  { id: "first_course", name: "初识国学", description: "完成第一节课程学习", icon: "book", rarity: "common", category: "learning", unlocked: true, unlockedAt: "2024-01-10" },
  { id: "ten_courses", name: "勤学好问", description: "累计学习10节课程", icon: "graduation", rarity: "rare", category: "learning", unlocked: true, unlockedAt: "2024-01-20" },
  { id: "fifty_courses", name: "学富五车", description: "累计学习50节课程", icon: "award", rarity: "epic", category: "learning", unlocked: false, progress: 28, total: 50 },
  { id: "hundred_courses", name: "博学多才", description: "累计学习100节课程", icon: "crown", rarity: "legendary", category: "learning", unlocked: false, progress: 28, total: 100 },
  
  // 坚持类
  { id: "streak_7", name: "初心不改", description: "连续学习7天", icon: "flame", rarity: "common", category: "streak", unlocked: true, unlockedAt: "2024-01-15" },
  { id: "streak_30", name: "持之以恒", description: "连续学习30天", icon: "flame", rarity: "rare", category: "streak", unlocked: false, progress: 12, total: 30 },
  { id: "streak_100", name: "百日精进", description: "连续学习100天", icon: "flame", rarity: "legendary", category: "streak", unlocked: false, progress: 12, total: 100 },
  
  // 社交类
  { id: "first_comment", name: "畅所欲言", description: "发表第一条评论", icon: "message", rarity: "common", category: "social", unlocked: true, unlockedAt: "2024-01-12" },
  { id: "helpful", name: "热心助人", description: "回答被采纳10次", icon: "heart", rarity: "rare", category: "social", unlocked: false, progress: 3, total: 10 },
  { id: "influencer", name: "意见领袖", description: "获得1000个点赞", icon: "trending", rarity: "epic", category: "social", unlocked: false, progress: 156, total: 1000 },
  
  // 里程碑
  { id: "bazi_basic", name: "八字入门", description: "完成八字基础课程", icon: "medal", rarity: "rare", category: "milestone", unlocked: true, unlockedAt: "2024-01-18" },
  { id: "ziwei_basic", name: "紫微初识", description: "完成紫微斗数入门", icon: "star", rarity: "rare", category: "milestone", unlocked: false },
  
  // 特殊
  { id: "early_bird", name: "早起的鸟", description: "连续7天早上6点前学习", icon: "zap", rarity: "epic", category: "special", unlocked: false, progress: 2, total: 7 },
  { id: "night_owl", name: "夜猫学者", description: "深夜12点后完成课程", icon: "sparkles", rarity: "rare", category: "special", unlocked: true, unlockedAt: "2024-01-08" },
  { id: "first_year", name: "周年纪念", description: "加入平台满一年", icon: "calendar", rarity: "legendary", category: "special", unlocked: false },
  { id: "vip_member", name: "尊贵会员", description: "成为VIP会员", icon: "crown", rarity: "epic", category: "special", unlocked: true, unlockedAt: "2024-01-01" },
]
