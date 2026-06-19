"use client"

import { useState, useEffect, useCallback } from "react"
import { BackButton } from "@/components/common/back-button"
import { Clock, Play, FileText, ShoppingBag, Users, Trash2, Check, BookOpen, Bot } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DataState } from "@/components/data-state"
import { getHistory, deleteHistory, clearAllHistory } from "@/lib/api"
import type { HistoryGroup, HistoryItemType } from "@/lib/types/history"

const typeIcons: Record<HistoryItemType, React.ComponentType<{ className?: string }>> = {
  course: Play,
  article: FileText,
  product: ShoppingBag,
  circle: Users,
  classic: BookOpen,
  agent: Bot,
}

const typeLabels: Record<HistoryItemType, string> = {
  course: "课程",
  article: "文章",
  product: "商品",
  circle: "圈子",
  classic: "古籍",
  agent: "智能体",
}

const typeColors: Record<HistoryItemType, string> = {
  course: "bg-blue-500/10 text-blue-600",
  article: "bg-purple-500/10 text-purple-600",
  product: "bg-orange-500/10 text-orange-600",
  circle: "bg-green-500/10 text-green-600",
  classic: "bg-amber-500/10 text-amber-600",
  agent: "bg-pink-500/10 text-pink-600",
}

export default function HistoryPage() {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryGroup[]>([])

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getHistory()
      if (res.code === 200) {
        setHistory(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch (err) {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleDelete = async () => {
    const res = await deleteHistory(selectedIds)
    if (res.code === 200) {
      setHistory(prev => prev.map(group => ({
        ...group,
        items: group.items.filter(item => !selectedIds.includes(item.id))
      })).filter(group => group.items.length > 0))
      setSelectedIds([])
      setIsEditMode(false)
    }
  }

  const handleClearAll = async () => {
    if (confirm("确定要清空全部浏览历史吗？")) {
      const res = await clearAllHistory()
      if (res.code === 200) {
        setHistory([])
      }
    }
  }

  const getTypeUrl = (type: HistoryItemType, id: number) => {
    switch (type) {
      case "course": return `/learn/${id}`
      case "article": return `/article/${id}`
      case "product": return `/mall/product/${id}`
      case "circle": return `/circle/${id}/home`
      case "classic": return `/classics/${id}`
      case "agent": return `/agent/${id}`
      default: return "#"
    }
  }

  const allItems = history.flatMap(g => g.items)

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">浏览历史</h1>
          <div className="flex items-center gap-2">
            {!isEditMode && history.length > 0 && (
              <button onClick={handleClearAll} className="text-sm text-muted-foreground">
                清空
              </button>
            )}
            {history.length > 0 && (
              <button 
                onClick={() => {
                  setIsEditMode(!isEditMode)
                  setSelectedIds([])
                }}
                className="text-sm text-primary"
              >
                {isEditMode ? "完成" : "管理"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 历史列表 */}
      <div className="p-4">
        <DataState
          isLoading={loading}
          isError={!!error}
          isEmpty={history.length === 0}
          errorMessage={error || undefined}
          emptyMessage="暂无浏览历史"
          onRetry={fetchData}
        >
          {history.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">{group.date}</h2>
              <div className="space-y-2">
                {group.items.map(item => {
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

                      <Link href={getTypeUrl(item.type, item.id)} className="flex-1">
                        <Card className="flex gap-3 p-3 hover:bg-secondary/50 transition-colors">
                          {/* 图标 */}
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-muted-foreground/60" />
                          </div>

                          {/* 信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className={cn("text-[10px] px-1.5 py-0", typeColors[item.type])}>
                                {typeLabels[item.type]}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{item.time}</span>
                            </div>
                            <h3 className="font-medium text-sm text-foreground line-clamp-1">{item.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                            
                            {/* 课程进度条 */}
                            {item.type === "course" && item.progress !== undefined && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                  <span>学习进度</span>
                                  <span>{item.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </DataState>
      </div>

      {/* 底部操作栏（编辑模式） */}
      {isEditMode && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedIds(allItems.map(i => i.id))}
              className="text-sm text-primary"
            >
              全选
            </button>
            <button
              onClick={handleDelete}
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
