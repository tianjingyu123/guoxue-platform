'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MessageCircle, Filter, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataState } from '@/components/data-state'
import { getReceivedComments, replyComment, getTargetUrl, getTargetTypeName } from '@/lib/api/comments'
import type { ReceivedCommentItem } from '@/lib/types/comments'

export default function ReceivedCommentsPage() {
  const router = useRouter()
  const [comments, setComments] = useState<ReceivedCommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unreplied'>('all')
  const [unrepliedCount, setUnrepliedCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // 回复弹窗状态
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyingComment, setReplyingComment] = useState<ReceivedCommentItem | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)

  // 加载数据
  const fetchComments = async (pageNum: number = 1, isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }
      
      const res = await getReceivedComments(pageNum, 20, filter)
      
      if (res.code === 200 && res.data) {
        if (isLoadMore) {
          setComments(prev => [...prev, ...res.data.list])
        } else {
          setComments(res.data.list)
        }
        setUnrepliedCount(res.data.unrepliedCount)
        setHasMore(res.data.hasMore)
        setPage(pageNum)
      } else {
        setError(res.message || '加载失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchComments(1)
  }, [filter])

  // 打开回复弹窗
  const handleOpenReply = (comment: ReceivedCommentItem) => {
    setReplyingComment(comment)
    setReplyContent('')
    setReplyDialogOpen(true)
  }

  // 提交回复
  const handleSubmitReply = async () => {
    if (!replyingComment || !replyContent.trim()) return
    
    setReplying(true)
    try {
      const res = await replyComment(replyingComment.id, replyContent.trim())
      if (res.code === 200 && res.data) {
        // 更新本地数据
        setComments(prev => prev.map(c => {
          if (c.id === replyingComment.id) {
            return {
              ...c,
              isReplied: true,
              myReply: {
                content: replyContent.trim(),
                createdAt: res.data.createdAt
              }
            }
          }
          return c
        }))
        setUnrepliedCount(prev => Math.max(0, prev - 1))
        setReplyDialogOpen(false)
      }
    } catch {
      // 错误处理
    } finally {
      setReplying(false)
    }
  }

  // 跳转到内容页
  const handleGoToContent = (comment: ReceivedCommentItem) => {
    const url = getTargetUrl(comment.myContent.type, comment.myContent.id)
    router.push(`${url}?commentId=${comment.id}`)
  }

  // 加载更多
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchComments(page + 1, true)
    }
  }

  // 骨架屏
  const renderSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-4 w-12 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-[#C41E3A] text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">收到的评论</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 relative">
                <Filter className="w-5 h-5" />
                {filter === 'unreplied' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#C9A96E] rounded-full" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'text-[#C41E3A]' : ''}
              >
                全部评论
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilter('unreplied')}
                className={filter === 'unreplied' ? 'text-[#C41E3A]' : ''}
              >
                未回复 {unrepliedCount > 0 && `(${unrepliedCount})`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* 筛选标签 */}
        <div className="flex gap-2 px-4 pb-3">
          <Badge 
            variant={filter === 'all' ? 'default' : 'outline'}
            className={`cursor-pointer ${
              filter === 'all' 
                ? 'bg-white text-[#C41E3A]' 
                : 'bg-transparent border-white/50 text-white/80'
            }`}
            onClick={() => setFilter('all')}
          >
            全部
          </Badge>
          <Badge 
            variant={filter === 'unreplied' ? 'default' : 'outline'}
            className={`cursor-pointer ${
              filter === 'unreplied' 
                ? 'bg-white text-[#C41E3A]' 
                : 'bg-transparent border-white/50 text-white/80'
            }`}
            onClick={() => setFilter('unreplied')}
          >
            待回复 {unrepliedCount > 0 && `(${unrepliedCount})`}
          </Badge>
        </div>
      </header>

      {/* 评论列表 */}
      <DataState
        loading={loading}
        error={error}
        empty={comments.length === 0}
        loadingSkeleton={renderSkeleton()}
        emptyIcon={<MessageCircle className="w-12 h-12 text-gray-300" />}
        emptyText={filter === 'unreplied' ? '暂无待回复的评论' : '暂无新评论'}
        onRetry={() => fetchComments(1)}
      >
        <div className="p-4 space-y-3 pb-20">
          {comments.map(comment => (
            <div 
              key={comment.id} 
              className={`bg-white rounded-lg p-4 ${!comment.isReplied ? 'border-l-4 border-[#C41E3A]' : ''}`}
            >
              {/* 评论者信息 */}
              <div className="flex gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={comment.commenter.avatar} />
                  <AvatarFallback className="bg-[#C41E3A]/10 text-[#C41E3A]">
                    {comment.commenter.nickname.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {comment.commenter.nickname}
                    </span>
                    {comment.commenter.level && (
                      <Badge variant="outline" className="text-xs text-[#C9A96E] border-[#C9A96E]/30">
                        Lv.{comment.commenter.level}
                      </Badge>
                    )}
                    {!comment.isReplied && (
                      <Badge className="bg-[#C41E3A] text-white text-xs">
                        待回复
                      </Badge>
                    )}
                  </div>
                  
                  {/* 评论内容 */}
                  <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                  
                  {/* 评论时间 */}
                  <p className="text-xs text-gray-400 mt-2">
                    {comment.createdAt}
                  </p>
                  
                  {/* 我的内容 */}
                  <div 
                    className="mt-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleGoToContent(comment)}
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      评论了我的{getTargetTypeName(comment.myContent.type)}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-1">
                      {comment.myContent.title}
                    </p>
                  </div>
                  
                  {/* 我的回复（如果有） */}
                  {comment.myReply && (
                    <div className="mt-3 p-3 bg-[#C41E3A]/5 rounded-lg border-l-2 border-[#C41E3A]">
                      <p className="text-xs text-[#C41E3A] mb-1">我的回复</p>
                      <p className="text-sm text-gray-700">
                        {comment.myReply.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {comment.myReply.createdAt}
                      </p>
                    </div>
                  )}
                  
                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    {!comment.isReplied && (
                      <Button 
                        size="sm" 
                        className="bg-[#C41E3A] hover:bg-[#A01830] text-white"
                        onClick={() => handleOpenReply(comment)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        回复
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-[#C9A96E] text-[#C9A96E] hover:bg-[#C9A96E]/10"
                      onClick={() => handleGoToContent(comment)}
                    >
                      查看原文
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 加载更多 */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="border-[#C41E3A] text-[#C41E3A]"
              >
                {loadingMore ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
          
          {!hasMore && comments.length > 0 && (
            <p className="text-center text-gray-400 text-sm py-4">
              已显示全部评论
            </p>
          )}
        </div>
      </DataState>

      {/* 回复弹窗 */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>回复评论</span>
              <button 
                onClick={() => setReplyDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          
          {replyingComment && (
            <div className="space-y-4">
              {/* 原评论 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={replyingComment.commenter.avatar} />
                    <AvatarFallback className="text-xs">
                      {replyingComment.commenter.nickname.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {replyingComment.commenter.nickname}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {replyingComment.content}
                </p>
              </div>
              
              {/* 回复输入 */}
              <Textarea
                placeholder="写下你的回复..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                rows={4}
                className="resize-none focus:border-[#C41E3A] focus:ring-[#C41E3A]/20"
              />
              
              <p className="text-xs text-gray-400 text-right">
                {replyContent.length}/500
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReplyDialogOpen(false)}
            >
              取消
            </Button>
            <Button 
              className="bg-[#C41E3A] hover:bg-[#A01830] text-white"
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || replying}
            >
              {replying ? (
                '发送中...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  发送
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
