'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Trash2, 
  BookOpen, 
  Video, 
  Radio, 
  FileText, 
  ShoppingBag,
  Play,
  X,
  Clock,
  Calendar
} from 'lucide-react'

interface HistoryItem {
  id: string
  type: 'course' | 'video' | 'live' | 'article' | 'product' | 'circle'
  title: string
  cover?: string
  progress?: number
  duration?: number
  viewedAt: string
}

interface HistoryGroup {
  date: string
  label: string
  items: HistoryItem[]
}

const typeConfig = {
  course: { icon: BookOpen, label: '课程', color: 'bg-blue-500' },
  video: { icon: Video, label: '视频', color: 'bg-pink-500' },
  live: { icon: Radio, label: '直播', color: 'bg-red-500' },
  article: { icon: FileText, label: '文章', color: 'bg-green-500' },
  product: { icon: ShoppingBag, label: '商品', color: 'bg-orange-500' },
  circle: { icon: BookOpen, label: '圈子', color: 'bg-purple-500' },
}

export default function BrowseHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>([])
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setTimeout(() => {
      setHistoryGroups([
        {
          date: '2024-01-15',
          label: '今天',
          items: [
            { id: '1', type: 'course', title: '周易入门：从零开始学习易经', cover: '/api/placeholder/120/80', progress: 45, duration: 3600, viewedAt: '14:30' },
            { id: '2', type: 'video', title: '梅花易数实战案例分析', cover: '/api/placeholder/120/80', progress: 100, duration: 1200, viewedAt: '12:15' },
            { id: '3', type: 'article', title: '八字命理中的十神详解', viewedAt: '10:20' },
          ]
        },
        {
          date: '2024-01-14',
          label: '昨天',
          items: [
            { id: '4', type: 'live', title: '风水布局直播答疑', cover: '/api/placeholder/120/80', viewedAt: '20:00' },
            { id: '5', type: 'product', title: '开光铜葫芦摆件', cover: '/api/placeholder/120/80', viewedAt: '16:45' },
          ]
        },
        {
          date: '2024-01-12',
          label: '1月12日',
          items: [
            { id: '6', type: 'course', title: '六爻预测高级班', cover: '/api/placeholder/120/80', progress: 30, duration: 7200, viewedAt: '19:30' },
            { id: '7', type: 'circle', title: '易学爱好者交流圈', cover: '/api/placeholder/120/80', viewedAt: '15:00' },
            { id: '8', type: 'article', title: '紫微斗数入门指南', viewedAt: '11:20' },
          ]
        },
      ])
      setLoading(false)
    }, 800)
  }, [])

  const handleDelete = (itemId: string) => {
    setHistoryGroups(prev => prev.map(group => ({
      ...group,
      items: group.items.filter(item => item.id !== itemId)
    })).filter(group => group.items.length > 0))
    setDeletingId(null)
  }

  const handleClearAll = () => {
    setHistoryGroups([])
    setShowClearConfirm(false)
  }

  const handleItemClick = (item: HistoryItem) => {
    const routes: Record<string, string> = {
      course: `/courses/${item.id}`,
      video: `/videos/${item.id}`,
      live: `/live/${item.id}`,
      article: `/articles/${item.id}`,
      product: `/shop/product/${item.id}`,
      circle: `/circles/${item.id}`,
    }
    router.push(routes[item.type] || '/')
  }

  const formatProgress = (progress: number, duration: number) => {
    if (progress >= 100) return '已看完'
    const watched = Math.floor((progress / 100) * duration)
    const minutes = Math.floor(watched / 60)
    return `已观看 ${minutes} 分钟`
  }

  const totalCount = historyGroups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">浏览历史</h1>
          {totalCount > 0 ? (
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-red-500"
            >
              清空
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {totalCount > 0 && (
        <div className="px-4 py-3 bg-muted/50 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>共 {totalCount} 条记录</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>近30天</span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="p-4 space-y-6">
          {[1, 2].map(g => (
            <div key={g} className="space-y-3">
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-24 h-16 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : historyGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Clock className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">暂无浏览记录</p>
          <p className="text-sm text-muted-foreground">去发现更多精彩内容吧</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm"
          >
            去逛逛
          </button>
        </div>
      ) : (
        <div className="pb-safe">
          {historyGroups.map(group => (
            <div key={group.date} className="mb-6">
              {/* Date Header */}
              <div className="px-4 py-2 sticky top-14 bg-background/95 backdrop-blur-sm z-[5]">
                <span className="text-sm font-medium text-muted-foreground">{group.label}</span>
              </div>

              {/* Items */}
              <div className="px-4 space-y-3">
                {group.items.map(item => {
                  const config = typeConfig[item.type]
                  const Icon = config.icon
                  const isDeleting = deletingId === item.id

                  return (
                    <div 
                      key={item.id}
                      className={`relative overflow-hidden transition-all duration-300 ${
                        isDeleting ? 'translate-x-[-80px]' : ''
                      }`}
                    >
                      <div 
                        className="flex gap-3 bg-card rounded-xl p-3 cursor-pointer active:bg-muted/50 transition-colors"
                        onClick={() => !isDeleting && handleItemClick(item)}
                        onTouchStart={() => setDeletingId(item.id)}
                      >
                        {/* Cover / Icon */}
                        {item.cover ? (
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img src={item.cover} alt="" className="w-full h-full object-cover" />
                            {item.progress !== undefined && item.progress < 100 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                <div 
                                  className="h-full bg-primary"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            )}
                            {item.type === 'video' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`w-16 h-16 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${config.color} text-white flex-shrink-0`}>
                              {config.label}
                            </span>
                            <h3 className="text-sm font-medium line-clamp-2 flex-1">{item.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{item.viewedAt}</span>
                            {item.progress !== undefined && item.duration && (
                              <>
                                <span>·</span>
                                <span className={item.progress >= 100 ? 'text-green-500' : ''}>
                                  {formatProgress(item.progress, item.duration)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Continue Button */}
                        {item.progress !== undefined && item.progress < 100 && (
                          <button 
                            className="self-center px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleItemClick(item)
                            }}
                          >
                            继续
                          </button>
                        )}
                      </div>

                      {/* Delete Button (Swipe) */}
                      <button
                        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center text-white"
                        style={{ transform: isDeleting ? 'translateX(0)' : 'translateX(100%)' }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load More Hint */}
          <div className="text-center py-6 text-sm text-muted-foreground">
            仅展示近30天的浏览记录
          </div>
        </div>
      )}

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-card rounded-2xl w-[80%] max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">清空浏览历史</h3>
              <p className="text-sm text-muted-foreground">
                确定要清空所有浏览记录吗？此操作不可恢复
              </p>
            </div>
            <div className="flex border-t border-border">
              <button
                className="flex-1 py-3.5 text-muted-foreground"
                onClick={() => setShowClearConfirm(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3.5 text-red-500 font-medium border-l border-border"
                onClick={handleClearAll}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to cancel delete */}
      {deletingId && (
        <div 
          className="fixed inset-0 z-[1]"
          onClick={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}
