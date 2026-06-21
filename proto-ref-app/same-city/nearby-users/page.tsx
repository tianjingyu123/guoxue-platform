"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  MapPin, 
  Settings,
  Search,
  UserCheck,
  UserPlus,
  MessageCircle,
  BadgeCheck,
  RefreshCw,
  Users,
  GraduationCap,
  Award,
  Eye,
  EyeOff,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { 
  getNearbyUsers,
  followUser,
  unfollowUser,
  getLocationPrivacySetting,
  updateLocationPrivacySetting,
  getUserTypeLabel,
  getUserTypeColor,
  formatUserDistance
} from "@/lib/api/same-city"
import type { NearbyUser, NearbyUserType, LocationPrivacySetting } from "@/lib/types/same-city"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 用户类型选项
const userTypes: { value: NearbyUserType | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <Users className="w-4 h-4" /> },
  { value: 'enthusiast', label: '爱好者', icon: <Users className="w-4 h-4" /> },
  { value: 'teacher', label: '老师', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'inheritor', label: '传承人', icon: <Award className="w-4 h-4" /> },
]

export default function NearbyUsersPage() {
  const router = useRouter()
  
  // 状态
  const [users, setUsers] = useState<NearbyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedType, setSelectedType] = useState<NearbyUserType | 'all'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [privacySetting, setPrivacySetting] = useState<LocationPrivacySetting | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set())
  
  // 当前位置（模拟）
  const [location] = useState({ latitude: 39.9087, longitude: 116.4716 })

  // 加载附近用户
  const loadUsers = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const res = await getNearbyUsers({
        latitude: location.latitude,
        longitude: location.longitude,
        type: selectedType,
        radius: 5000,
      })
      if (res.code === 200 && res.data) {
        setUsers(res.data.list)
        // 初始化关注状态
        const following = new Set(res.data.list.filter(u => u.isFollowing).map(u => u.id))
        setFollowingIds(following)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [location, selectedType])

  // 加载隐私设置
  const loadPrivacySetting = useCallback(async () => {
    const res = await getLocationPrivacySetting()
    if (res.code === 200 && res.data) {
      setPrivacySetting(res.data)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    loadPrivacySetting()
  }, [loadUsers, loadPrivacySetting])

  // 处理关注/取关
  const handleToggleFollow = async (userId: number) => {
    const isFollowing = followingIds.has(userId)
    
    if (isFollowing) {
      const res = await unfollowUser(userId)
      if (res.code === 200) {
        setFollowingIds(prev => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }
    } else {
      const res = await followUser(userId)
      if (res.code === 200) {
        setFollowingIds(prev => new Set(prev).add(userId))
      }
    }
  }

  // 处理隐私设置更新
  const handlePrivacyChange = async (key: keyof LocationPrivacySetting, value: boolean | string | number) => {
    if (!privacySetting) return
    
    const newSetting = { ...privacySetting, [key]: value }
    setPrivacySetting(newSetting)
    await updateLocationPrivacySetting({ [key]: value })
  }

  // 过滤用户（搜索）
  const filteredUsers = users.filter(user => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    return (
      user.name.toLowerCase().includes(kw) ||
      user.bio?.toLowerCase().includes(kw) ||
      user.interests.some(i => i.toLowerCase().includes(kw))
    )
  })

  // 类型图标
  const getUserTypeIcon = (type: NearbyUserType) => {
    switch (type) {
      case 'teacher':
        return <GraduationCap className="w-3 h-3" />
      case 'inheritor':
        return <Award className="w-3 h-3" />
      default:
        return <Users className="w-3 h-3" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1 -ml-1">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold">附近的人</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => loadUsers(true)}
                className={cn("p-2", refreshing && "animate-spin")}
                disabled={refreshing}
              >
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名、兴趣..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {userTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                  selectedType === type.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {type.icon}
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 用户列表 */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex gap-3">
                  <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MapPin className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">
              {searchKeyword ? '没有找到匹配的用户' : '附近暂无用户'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const isFollowing = followingIds.has(user.id)
              
              return (
                <div
                  key={user.id}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex gap-3">
                    {/* 头像 */}
                    <button
                      onClick={() => router.push(`/user/${user.id}`)}
                      className="relative flex-shrink-0"
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
                      )}
                    </button>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => router.push(`/user/${user.id}`)}
                          className="font-medium truncate hover:text-primary"
                        >
                          {user.name}
                        </button>
                        {user.verified && (
                          <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                        <span className={cn(
                          "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs",
                          getUserTypeColor(user.type)
                        )}>
                          {getUserTypeIcon(user.type)}
                          {getUserTypeLabel(user.type)}
                        </span>
                      </div>

                      {/* 认证标题 */}
                      {user.verifiedTitle && (
                        <p className="text-xs text-primary mb-1">{user.verifiedTitle}</p>
                      )}

                      {/* 简介 */}
                      {user.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {user.bio}
                        </p>
                      )}

                      {/* 兴趣标签 */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {user.commonInterests?.map(interest => (
                          <span
                            key={interest}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                        {user.interests.filter(i => !user.commonInterests?.includes(i)).slice(0, 2).map(interest => (
                          <span
                            key={interest}
                            className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>

                      {/* 底部信息 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {formatUserDistance(user.distance, user.showExactDistance)}
                          </span>
                          <span>{user.followerCount} 粉丝</span>
                          {user.lastActiveAt && (
                            <span>{user.lastActiveAt}</span>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => router.push(`/im/chat/${user.id}`)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                            className="h-8"
                            onClick={() => handleToggleFollow(user.id)}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="w-4 h-4 mr-1" />
                                {user.isMutual ? '互关' : '已关注'}
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-1" />
                                关注
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 隐私设置弹窗 */}
      {showSettings && privacySetting && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowSettings(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">位置隐私设置</h3>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground">
                  关闭
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* 附近可见开关 */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {privacySetting.visibleToNearby ? (
                    <Eye className="w-5 h-5 text-primary" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">对附近的人可见</p>
                    <p className="text-sm text-muted-foreground">
                      开启后，附近的人可以发现你
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySetting.visibleToNearby}
                  onCheckedChange={(checked) => handlePrivacyChange('visibleToNearby', checked)}
                />
              </div>

              {/* 距离精度 */}
              <div className="py-3 border-b border-border">
                <p className="font-medium mb-2">距离显示精度</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrivacyChange('distancePrecision', 'fuzzy')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm transition-colors",
                      privacySetting.distancePrecision === 'fuzzy'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    模糊（推荐）
                  </button>
                  <button
                    onClick={() => handlePrivacyChange('distancePrecision', 'exact')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm transition-colors",
                      privacySetting.distancePrecision === 'exact'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    精确
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  模糊模式下，1km内统一显示"附近"
                </p>
              </div>

              {/* 可见范围 */}
              <div className="py-3">
                <p className="font-medium mb-2">可见范围</p>
                <div className="flex gap-2 flex-wrap">
                  {[1, 3, 5, 10, 20].map(range => (
                    <button
                      key={range}
                      onClick={() => handlePrivacyChange('visibleRange', range)}
                      className={cn(
                        "py-2 px-4 rounded-lg text-sm transition-colors",
                        privacySetting.visibleRange === range
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {range}km
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  只有在此范围内的用户才能看到你
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
