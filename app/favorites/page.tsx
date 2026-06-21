"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart, Users, Play, FileText, ShoppingBag, Radio, GraduationCap, Trash2, Check, RefreshCw } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import { 
  getFavorites, 
  getFavoriteStats, 
  removeFavorite, 
  removeFavorites,
  getFavoriteTabs,
  getFavoriteTypeColor,
  getFavoriteLink,
  getFavoriteTypeName
} from "@/lib/api/favorites"
import type { FavoriteItem, FavoriteType, FavoriteTab, FavoriteStats } from "@/lib/types/favorites"

// 类型图标映射
const typeIcons: Record<FavoriteType, React.ComponentType<{ className?: string }>> = {
  course: Play,
  circle: Users,
  article: FileText,
  product: ShoppingBag,
  live: Radio,
  teacher: GraduationCap,
}

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<FavoriteType | 'all'>('all')
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [tabs, setTabs] = useState<FavoriteTab[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  // 加载统计数据
  const loadStats = useCallback(async () => {
    const response = await getFavoriteStats()
    if (response.code === 200 && response.data) {
      setTabs(getFavoriteTabs(response.data))
    }
  }, [])

  // 加载收藏列表
  const loadFavorites = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page
    if (reset) {
      setIsLoading(true)
    }

    const response = await getFavorites({
      type: activeTab,
      page: currentPage,
      pageSize: 10,
    })

    if (response.code === 200 && response.data) {
      if (reset) {
        setFavorites(response.data.list)
      } else {
        setFavorites(prev => [...prev, ...response.data!.list])
      }
      setHasMore(response.data.hasMore)
      setPage(currentPage + 1)
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }, [activeTab, page])

  // 初始加载
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Tab 切换时重新加载
  useEffect(() => {
    setPage(1)
    loadFavorites(true)
  }, [activeTab])

  // 下拉刷新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPage(1)
    await Promise.all([loadStats(), loadFavorites(true)])
  }

  // 切换选择
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // 删除单个
  const handleRemove = async (id: number) => {
    const response = await removeFavorite(id)
    if (response.code === 200) {
      setFavorites(prev => prev.filter(f => f.id !== id))
      // 更新统计
      loadStats()
      toast.success('已取消收藏')
    } else {
      toast.error(response.message || '操作失败')
    }
  }

  // 批量删除
  const handleBatchRemove = async () => {
    if (selectedIds.length === 0) return

    const response = await removeFavorites(selectedIds)
    if (response.code === 200) {
      setFavorites(prev => prev.filter(f => !selectedIds.includes(f.id)))
      setSelectedIds([])
      setIsEditMode(false)
      // 更新统计
      loadStats()
      toast.success(`已取消${response.data?.successCount}个收藏`)
    } else {
      toast.error(response.message || '操作失败')
    }
  }

  // 全选
  const handleSelectAll = () => {
    if (selectedIds.length === favorites.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(favorites.map(f => f.id))
    }
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">我的收藏</h1>
          <button 
            onClick={() => {
              setIsEditMode(!isEditMode)
              setSelectedIds([])
            }}
            className="text-sm text-primary"
          >
            {isEditMode ? "完成" : "管理"}
          </button>
        </div>

        {/* 分类Tab */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.name}
              <span className="ml-1 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 刷新按钮 */}
      <div className="flex justify-center py-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
          {isRefreshing ? '刷新中...' : '下拉刷新'}
        </button>
      </div>

      {/* 收藏列表 */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          // 骨架屏
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="flex gap-3 p-3">
              <div className="w-16 h-16 rounded-lg bg-secondary animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-4 w-full bg-secondary rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-secondary rounded animate-pulse" />
              </div>
            </Card>
          ))
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">暂无收藏内容</p>
            <Link href="/discover" className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm">
              去发现
            </Link>
          </div>
        ) : (
          <>
            {favorites.map(item => {
              const Icon = typeIcons[item.type]
              return (
                <div key={item.id} className="flex items-center gap-3">
                  {/* 选择框 */}
                  {isEditMode && (
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedIds.includes(item.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedIds.includes(item.id) && <Check className="w-4 h-4 text-primary-foreground" />}
                    </button>
                  )}

                  <Link href={getFavoriteLink(item)} className="flex-1">
                    <Card className={cn(
                      "flex gap-3 p-3 hover:bg-secondary/50 transition-colors",
                      item.isInvalid && "opacity-60"
                    )}>
                      {/* 封面 */}
                      <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                        {item.cover ? (
                          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-6 h-6 text-muted-foreground/60" />
                          </div>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-[10px] px-1.5 py-0", getFavoriteTypeColor(item.type))}>
                            {getFavoriteTypeName(item.type)}
                          </Badge>
                          {item.isInvalid && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              已失效
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {item.collectedAt.split(' ')[0]}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm text-foreground line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.subtitle}</p>
                        <div className="flex items-center justify-between mt-1">
                          {item.price > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">¥{item.price}</span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-xs text-muted-foreground line-through">
                                  ¥{item.originalPrice}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">免费</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>

                  {/* 单个删除（非编辑模式） */}
                  {!isEditMode && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}

            {/* 加载更多 */}
            {hasMore && (
              <button
                onClick={() => loadFavorites()}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                加载更多
              </button>
            )}
          </>
        )}
      </div>

      {/* 底部操作栏（编辑模式） */}
      {isEditMode && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleSelectAll}
              className="text-sm text-primary"
            >
              {selectedIds.length === favorites.length ? '取消全选' : '全选'}
            </button>
            <button
              onClick={handleBatchRemove}
              className="flex items-center gap-2 px-6 py-2 bg-destructive text-destructive-foreground rounded-full text-sm"
            >
              <Trash2 className="w-4 h-4" />
              删除 ({selectedIds.length})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
