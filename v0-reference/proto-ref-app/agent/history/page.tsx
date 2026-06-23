"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Trash2, Sparkles, Bot, MoreHorizontal, X } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 对话历史数据
const initialHistory = [
  {
    id: 1,
    agentName: "八字分析师",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a",
    agentType: "命理",
    lastMessage: "根据您的八字，今年的事业运势整体呈上升趋势，尤其是下半年会有贵人相助...",
    time: "10分钟前",
    timeGroup: "今天",
    unread: 2,
    isFree: false,
  },
  {
    id: 2,
    agentName: "紫微斗数大师",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ziwei&backgroundColor=6366f1",
    agentType: "紫微",
    lastMessage: "您的命盘中紫微星坐命宫，这是非常好的格局，代表您有领导才能...",
    time: "昨天 15:30",
    timeGroup: "昨天",
    unread: 0,
    isFree: true,
  },
  {
    id: 3,
    agentName: "风水顾问",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=fengshui&backgroundColor=059669",
    agentType: "风水",
    lastMessage: "您家的客厅布局基本合理，但建议将沙发稍微往西移动一些...",
    time: "周一 09:20",
    timeGroup: "本周",
    unread: 0,
    isFree: false,
  },
  {
    id: 4,
    agentName: "姓名学专家",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c",
    agentType: "姓名",
    lastMessage: "这个名字的五行属性偏木，与您的八字喜用神相合，是个不错的选择...",
    time: "上周三",
    timeGroup: "更早",
    unread: 0,
    isFree: true,
  },
  {
    id: 5,
    agentName: "周易占卜师",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=zhouyi&backgroundColor=7c3aed",
    agentType: "占卜",
    lastMessage: "您所问之事，卦象显示近期会有转机，但需要耐心等待...",
    time: "2周前",
    timeGroup: "更早",
    unread: 0,
    isFree: false,
  },
]

export default function AgentHistoryPage() {
  const [history, setHistory] = useState(initialHistory)
  const [searchQuery, setSearchQuery] = useState("")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [swipedId, setSwipedId] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  // 搜索过滤
  const filteredHistory = history.filter(
    item =>
      item.agentName.includes(searchQuery) ||
      item.lastMessage.includes(searchQuery)
  )

  // 删除单条对话
  const handleDelete = (id: number) => {
    setHistory(prev => prev.filter(item => item.id !== id))
    setSwipedId(null)
  }

  // 清空全部
  const handleClearAll = () => {
    setHistory([])
    setShowClearConfirm(false)
    setShowMenu(false)
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/profile" />
  <h1 className="font-semibold text-base text-foreground">对话历史</h1>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-32 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50">
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    清空全部
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索对话内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 对话列表 */}
      <div className="pb-20">
        {filteredHistory.length > 0 ? (
          <div>
            {/* 按时间分组渲染 */}
            {["今天", "昨天", "本周", "更早"].map(group => {
              const groupItems = filteredHistory.filter(item => item.timeGroup === group)
              if (groupItems.length === 0) return null
              return (
                <div key={group}>
                  <div className="px-4 py-2 bg-secondary/50">
                    <span className="text-xs font-medium text-muted-foreground">{group}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {groupItems.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden"
                onTouchStart={() => setSwipedId(null)}
              >
                {/* 左滑删除按钮 */}
                <div 
                  className={cn(
                    "absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center transition-transform duration-200",
                    swipedId === item.id ? "translate-x-0" : "translate-x-full"
                  )}
                >
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs">删除</span>
                  </button>
                </div>

                {/* 对话卡片 */}
                <div
                  className={cn(
                    "relative bg-background transition-transform duration-200",
                    swipedId === item.id ? "-translate-x-20" : "translate-x-0"
                  )}
                  onClick={() => {
                    if (swipedId === item.id) {
                      setSwipedId(null)
                    } else {
                      setSwipedId(item.id)
                    }
                  }}
                >
                  <Link
                    href={`/agent/${item.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
                    onClick={(e) => {
                      if (swipedId === item.id) {
                        e.preventDefault()
                        setSwipedId(null)
                      }
                    }}
                  >
                    {/* 智能体头像 */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 ring-2 ring-accent/20">
                        <AvatarImage src={item.agentAvatar} alt={item.agentName} />
                        <AvatarFallback className="bg-accent/10 text-accent">
                          <Bot className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      {item.unread > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-medium">{item.unread}</span>
                        </div>
                      )}
                    </div>

                    {/* 对话信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{item.agentName}</span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] px-1.5 py-0 border-0",
                            item.isFree ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                          )}
                        >
                          {item.agentType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.lastMessage}</p>
                    </div>

                    {/* 时间 */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  </Link>
                </div>
              </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : history.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-accent" />
            </div>
            <p className="text-foreground font-medium mb-2">暂无对话记录</p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              去智能体广场探索各类AI助手，开启你的国学之旅
            </p>
            <Link
              href="/agents"
              className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
            >
              探索智能体广场
            </Link>
          </div>
        ) : (
          /* 搜索无结果 */
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">未找到相关对话</p>
            <p className="text-muted-foreground/70 text-xs mt-1">试试其他关键词</p>
          </div>
        )}
      </div>

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-8">
          <Card className="w-full max-w-sm p-5">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">清空全部对话</h3>
              <p className="text-sm text-muted-foreground">
                确定要清空所有对话历史吗？此操作无法撤销。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClearConfirm(false)
                  setShowMenu(false)
                }}
                className="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 bg-destructive text-white text-sm font-medium rounded-xl hover:bg-destructive/90 transition-colors"
              >
                确认清空
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
