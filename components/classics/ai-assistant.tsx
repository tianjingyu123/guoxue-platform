"use client"

import { cn } from "@/lib/utils"
import { Sparkles, Send, ThumbsUp, ThumbsDown, Copy, RotateCcw, Mic, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"

// AI 悬浮按钮
interface AIAssistantFabProps {
  onClick?: () => void
  className?: string
}

export function AIAssistantFab({ onClick, className }: AIAssistantFabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-24 right-4 z-50",
        "w-14 h-14 rounded-full",
        "classics-ai-btn", // 使用古籍专属AI配色
        "flex items-center justify-center",
        "transition-all duration-300 hover:scale-105 active:scale-95",
        "animate-ai-float",
        className
      )}
      aria-label="AI助手"
    >
      <Sparkles className="w-6 h-6 text-white" />
      {/* 光晕效果 */}
      <div className="absolute inset-0 rounded-full bg-[var(--classics-ai)]/20 animate-ping" />
    </button>
  )
}

// AI 消息气泡
interface AIMessageProps {
  content: string
  isUser?: boolean
  isLoading?: boolean
  onRegenerate?: () => void
  onCopy?: () => void
  onLike?: () => void
  onDislike?: () => void
  className?: string
}

export function AIMessage({ 
  content, 
  isUser, 
  isLoading,
  onRegenerate,
  onCopy,
  onLike,
  onDislike,
  className 
}: AIMessageProps) {
  const [liked, setLiked] = useState<boolean | null>(null)

  if (isLoading) {
    return (
      <div className={cn("flex gap-3", className)}>
        <div className="w-8 h-8 rounded-full classics-ai-btn flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 bg-card rounded-2xl rounded-tl-sm p-4 border border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[var(--classics-ai)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[var(--classics-ai)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[var(--classics-ai)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm text-muted-foreground">正在思考...</span>
          </div>
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className={cn("flex justify-end", className)}>
        <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-3", className)}>
      <div className="w-8 h-8 rounded-full classics-ai-btn flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-card rounded-2xl rounded-tl-sm p-4 border border-border/60">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{content}</p>
        </div>
        {/* 操作按钮 */}
        <div className="flex items-center gap-1 mt-2 ml-1">
          <button 
            onClick={onRegenerate}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="重新生成"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => { setLiked(true); onLike?.() }}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary transition-colors",
              liked === true ? "text-green-500" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="有帮助"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => { setLiked(false); onDislike?.() }}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary transition-colors",
              liked === false ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="没帮助"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onCopy}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="复制"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// 推荐问题
interface SuggestedQuestionProps {
  question: string
  onClick?: () => void
  className?: string
}

export function SuggestedQuestion({ question, onClick, className }: SuggestedQuestionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-xl",
        "bg-card border border-border/60",
        "hover:bg-secondary/50 hover:border-border transition-colors",
        "text-sm text-foreground",
        className
      )}
    >
      {question}
    </button>
  )
}

// AI 输入框
interface AIInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onVoice?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function AIInput({ 
  value, 
  onChange, 
  onSubmit, 
  onVoice,
  placeholder = "输入和古籍相关的问题",
  disabled,
  className 
}: AIInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className={cn(
      "flex items-end gap-2 p-3 bg-card border-t border-border",
      className
    )}>
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none rounded-2xl",
            "bg-secondary/50 border border-border/60",
            "px-4 py-2.5 pr-10",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary/50",
            "disabled:opacity-50",
            "max-h-32"
          )}
          style={{ 
            minHeight: "42px",
            height: "auto"
          }}
        />
        {onVoice && (
          <button
            onClick={onVoice}
            className="absolute right-3 bottom-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="语音输入"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        size="icon"
        className="rounded-full w-10 h-10 classics-ai-btn border-0"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}

// AI 助手介绍卡片
interface AIIntroCardProps {
  className?: string
}

export function AIIntroCard({ className }: AIIntroCardProps) {
  return (
    <div className={cn(
      "bg-[var(--classics-ai)]/5 dark:bg-[var(--classics-ai)]/10",
      "rounded-xl p-4 border border-[var(--classics-ai)]/20",
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full classics-ai-btn flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Hi~我是古籍AI助手</h3>
          <p className="text-xs text-muted-foreground">熟悉古籍内容，善于解释概念</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        有什么问题都可以问我哦！
      </p>
    </div>
  )
}
