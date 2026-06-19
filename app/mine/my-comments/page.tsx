"use client"

import { useState, useEffect, useCallback } from "react"
import { BackButton } from "@/components/common/back-button"
import { MessageSquare, Trash2, Check, FileText, Play, Video, ShoppingBag, Users, HelpCircle, ChevronRight, Heart, MessageCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { DataState } from "@/components/data-state"
import { getMyComments, deleteComment, deleteComments, getTargetUrl, getTargetTypeName } from "@/lib/api/comments"
import type { CommentItem, CommentTargetType } from "@/lib/types/comments"

// 目标类型图标映射
const typeIcons: Record<CommentTargetType, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  course: Play,
  video: Video,
  product: ShoppingBag,
  circle_post: Users,
  question: HelpCircle,
}

// 目标类型颜色映射
const typeColors: Record<CommentTargetType, string> = {
  article: "bg-purple-500/10 text-purple-600",
  course: "bg-blue-500/10 text-blue-600",
  video: "bg-pink-500/10 text-pink-600",
  product: "bg-orange-500/10 text-orange-600",
  circle_post: "bg-green-500/10 text-green-600",
  question: "bg-amber-500/10 text-amber-600",
}

export default function MyCommentsPage() {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [swipedId, setSwipedId] = useState<number | null>(null)

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMyComments()
      if (res.code === 200) {
        setComments(res.data.list)
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

  // 切换选择
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // 删除单个评论
  const handleDeleteOne = async (id: number) => {
    if (confirm("确定要删除这条评论吗？")) {
      const res = await deleteComment(id)
      if (res.code === 200) {
        setComments(prev => prev.filter(c => c.id !== id))
        setSwipedId(null)
      }
    }
  }

  // 批量删除评论
  const handleBatchDelete = async () => {
    if (confirm(`确定要删除选中的 ${selectedIds.length} 条评论吗？`)) {
      const res = await deleteComments(selectedIds)
      if (res.code === 200) {
        setComments(prev => prev.filter(c => !selectedIds.includes(c.id)))
        setSelectedIds([])
        setIsEditMode(false)
      }
    }
  }

  // 处理左滑
  const handleSwipe = (id: number) => {
    setSwipedId(swipedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">我的评论</h1>
          <div className="flex items-center gap-2">
            {comments.length > 0 && (
              <button 
                onClick={() => {
                  setIsEditMode(!isEditMode)
                  setSelectedIds([])
                  setSwipedId(null)
                }}
                className="text-sm text-primary"
              >
                {isEditMode ? "完成" : "管理"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 评论列表 */}
      <div className="p-4">
        <DataState
          isLoading={loading}
          isError={!!error}
          isEmpty={comments.length === 0}
          errorMessage={error || undefined}
          emptyMessage="暂无评论记录"
          onRetry={fetchData}
        >
          <div className="space-y-3">
            {comments.map(comment => {
              const Icon = typeIcons[comment.target.type]
              const isSwiped = swipedId === comment.id
              
              return (
                <div key={comment.id} className="flex items-stretch gap-3">
                  {/* 选择框（编辑模式） */}
                  {isEditMode && (
                    <button
                      onClick={() => toggleSelect(comment.id)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 self-center transition-colors",
                        selectedIds.includes(comment.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedIds.includes(comment.id) && <Check className="w-4 h-4 text-primary-foreground" />}
                    </button>
                  )}

                  {/* 卡片容器（支持左滑） */}
                  <div className="flex-1 relative overflow-hidden rounded-xl">
                    <div 
                      className={cn(
                        "transition-transform duration-200",
                        isSwiped && !isEditMode && "-translate-x-20"
                      )}
                      onClick={() => !isEditMode && handleSwipe(comment.id)}
                    >
                      <Card className="p-4">
                        {/* 评论内容 */}
                        <p className="text-sm text-foreground line-clamp-2 mb-3">
                          {comment.content}
                        </p>

                        {/* 目标内容 */}
                        <Link 
                          href={getTargetUrl(comment.target.type, comment.target.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="block"
                        >
                          <div className="flex gap-3 p-3 bg-secondary/50 rounded-lg hover:bg-secondary/80 transition-colors">
                            {/* 封面图 */}
                            {comment.target.cover ? (
                              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                                <Image
                                  src={comment.target.cover}
                                  alt={comment.target.title}
                                  width={56}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-muted-foreground/60" />
                              </div>
                            )}

                            {/* 内容信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn("text-[10px] px-1.5 py-0", typeColors[comment.target.type])}>
                                  {getTargetTypeName(comment.target.type)}
                                </Badge>
                              </div>
                              <h4 className="text-sm font-medium text-foreground line-clamp-1">
                                {comment.target.title}
                              </h4>
                            </div>

                            <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                          </div>
                        </Link>

                        {/* 底部信息 */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Heart className="w-3.5 h-3.5" />
                              {comment.likeCount}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageCircle className="w-3.5 h-3.5" />
                              {comment.replyCount}
                            </span>
                            {comment.hasReply && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                                有回复
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* 左滑删除按钮 */}
                    {!isEditMode && (
                      <button
                        onClick={() => handleDeleteOne(comment.id)}
                        className={cn(
                          "absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center transition-opacity",
                          isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1 text-destructive-foreground">
                          <Trash2 className="w-5 h-5" />
                          <span className="text-xs">删除</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DataState>
      </div>

      {/* 底部操作栏（编辑模式） */}
      {isEditMode && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedIds(comments.map(c => c.id))}
              className="text-sm text-primary"
            >
              全选
            </button>
            <button
              onClick={handleBatchDelete}
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
