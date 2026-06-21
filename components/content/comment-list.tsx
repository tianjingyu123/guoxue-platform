"use client"

import { useState, useRef, useEffect } from "react"
import { Heart, MessageCircle, Send, X, ChevronDown, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Comment } from "@/lib/api"

interface CommentListProps {
  contentId: string
  comments: Comment[]
  total: number
  onLoadMore: () => void
  onAddComment: (content: string, replyTo?: string) => Promise<void>
  onLikeComment: (commentId: string) => void
  hasMore: boolean
  loading: boolean
}

export function CommentList({
  contentId,
  comments,
  total,
  onLoadMore,
  onAddComment,
  onLikeComment,
  hasMore,
  loading,
}: CommentListProps) {
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!inputValue.trim() || submitting) return
    
    setSubmitting(true)
    try {
      await onAddComment(inputValue.trim(), replyTo?.id)
      setInputValue("")
      setReplyTo(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = (comment: Comment) => {
    setReplyTo({ id: comment.id, name: comment.author.name })
    inputRef.current?.focus()
  }

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }

  return (
    <div className="bg-white">
      {/* 评论头部 */}
      <div className="px-4 py-3 border-b border-[#F0EBE3] flex items-center justify-between">
        <span className="font-medium text-[#2C2C2C]">评论 ({total})</span>
        <button className="text-[12px] text-[#999999]">按热度</button>
      </div>

      {/* 评论列表 */}
      <div className="divide-y divide-[#F5F0E8]">
        {comments.map((comment) => (
          <div key={comment.id} className="px-4 py-3">
            {/* 主评论 */}
            <div className="flex gap-3">
              <img 
                src={comment.author.avatar || "/images/default-avatar.png"} 
                alt={comment.author.name}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-[#2C2C2C]">{comment.author.name}</span>
                  <span className="text-[11px] text-[#999999]">{comment.createdAt}</span>
                </div>
                <p className="text-[14px] text-[#333333] leading-relaxed mb-2">{comment.content}</p>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onLikeComment(comment.id)}
                    className={cn(
                      "flex items-center gap-1 text-[12px]",
                      comment.isLiked ? "text-[#C41E3A]" : "text-[#999999]"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", comment.isLiked && "fill-current")} />
                    {comment.likes > 0 && comment.likes}
                  </button>
                  <button 
                    onClick={() => handleReply(comment)}
                    className="flex items-center gap-1 text-[12px] text-[#999999]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    回复
                  </button>
                  <button className="ml-auto text-[#999999]">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* 楼中楼回复 */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 bg-[#FAF8F5] rounded-lg p-3 space-y-3">
                    {(expandedReplies.has(comment.id) ? comment.replies : comment.replies.slice(0, 2)).map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <img 
                          src={reply.author.avatar || "/images/default-avatar.png"} 
                          alt={reply.author.name}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px]">
                            <span className="font-medium text-[#2C2C2C]">{reply.author.name}</span>
                            <span className="text-[#666666] mx-1">:</span>
                            <span className="text-[#333333]">{reply.content}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-[#999999]">{reply.createdAt}</span>
                            <button 
                              onClick={() => handleReply(reply)}
                              className="text-[11px] text-[#999999]"
                            >
                              回复
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 展开更多回复 */}
                    {comment.replyCount && comment.replyCount > 2 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-1 text-[12px] text-[#C41E3A]"
                      >
                        {expandedReplies.has(comment.id) ? (
                          <>收起回复</>
                        ) : (
                          <>
                            展开{comment.replyCount - 2}条回复
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-4 text-[13px] text-[#999999] border-t border-[#F0EBE3]"
        >
          {loading ? "加载中..." : "加载更多评论"}
        </button>
      )}

      {/* 评论输入框 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0EBE3] px-4 py-3 pb-safe z-50">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-2 py-1 bg-[#F5F0E8] rounded text-[12px]">
            <span className="text-[#666666]">回复 @{replyTo.name}</span>
            <button onClick={() => setReplyTo(null)}>
              <X className="w-4 h-4 text-[#999999]" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={replyTo ? `回复 @${replyTo.name}` : "写评论..."}
            className="flex-1 h-10 px-4 bg-[#F5F0E8] rounded-full text-[14px] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || submitting}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              inputValue.trim() 
                ? "bg-[#C41E3A] text-white" 
                : "bg-[#F0EBE3] text-[#CCCCCC]"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// 评论骨架屏
export function CommentSkeleton() {
  return (
    <div className="bg-white">
      <div className="px-4 py-3 border-b border-[#F0EBE3]">
        <div className="h-5 w-20 bg-[#F2EFEA] rounded animate-pulse" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-4 py-3 animate-pulse">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F2EFEA]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-[#F2EFEA] rounded" />
              <div className="h-4 w-full bg-[#F2EFEA] rounded" />
              <div className="h-4 w-3/4 bg-[#F2EFEA] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
