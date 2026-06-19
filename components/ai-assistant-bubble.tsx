"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, X, Mic, Send, Sparkles, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// 推荐的智能体
const quickBots = [
  { id: "1", name: "八字大师", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a" },
  { id: "2", name: "奇门助手", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=qimen&backgroundColor=7c3aed" },
  { id: "3", name: "起名顾问", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c" },
]

// 快捷问题
const quickQuestions = [
  "帮我分析一下今年的运势",
  "如何看懂自己的八字？",
  "给宝宝起个好名字",
  "最近适合做重要决定吗？",
]

interface Props {
  defaultBotId?: string
  context?: {
    type: "paipan" | "article" | "course" | "circle"
    data?: Record<string, unknown>
  }
}

export function AiAssistantBubble({ defaultBotId, context }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [showTip, setShowTip] = useState(false)

  // 不在某些页面显示
  const hiddenPaths = ["/agent/", "/im/chat/", "/im/group-chat/"]
  const shouldHide = hiddenPaths.some(path => pathname.startsWith(path))

  // 首次访问显示提示气泡
  useEffect(() => {
    const hasShownTip = localStorage.getItem("ai_bubble_tip_shown")
    if (!hasShownTip) {
      setTimeout(() => setShowTip(true), 3000)
      setTimeout(() => {
        setShowTip(false)
        localStorage.setItem("ai_bubble_tip_shown", "true")
      }, 8000)
    }
  }, [])

  if (shouldHide) return null

  return (
    <>
      {/* 悬浮气泡按钮 */}
      {!isOpen && (
        <div className="fixed right-4 bottom-24 z-50">
          {/* 提示气泡 */}
          {showTip && (
            <div className="absolute right-14 bottom-2 bg-white rounded-xl px-3 py-2 shadow-lg border border-[#E8E3DB] animate-fade-in">
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-b border-[#E8E3DB] rotate-[-45deg]" />
              <p className="text-[12px] text-[#2C2C2C] whitespace-nowrap">
                有问题？点我问AI助手
              </p>
            </div>
          )}
          
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#A01530] shadow-lg shadow-[#C41E3A]/30 flex items-center justify-center relative group"
          >
            {/* 脉冲动画 */}
            <div className="absolute inset-0 rounded-full bg-[#C41E3A] animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#A01530] group-hover:scale-110 transition-transform" />
            <MessageCircle className="w-6 h-6 text-white relative z-10" />
            
            {/* 在线状态 */}
            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#52C41A] rounded-full border-2 border-white" />
          </button>
        </div>
      )}

      {/* 展开面板 */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
          <div className="bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-hidden">
            {/* 顶部栏 */}
            <div className="bg-gradient-to-r from-[#C41E3A] to-[#A01530] px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-[14px]">AI智能助手</h3>
                    <p className="text-white/70 text-[11px]">随时为您解答疑问</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
            </div>

            {/* 快捷入口 */}
            <div className="px-4 py-3 border-b border-[#F5F0E8]">
              <p className="text-[12px] text-[#999] mb-2">选择专业智能体</p>
              <div className="flex items-center gap-3">
                {quickBots.map(bot => (
                  <Link
                    key={bot.id}
                    href={`/agent/${bot.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-center gap-1"
                  >
                    <img src={bot.avatar} alt="" className="w-12 h-12 rounded-xl" />
                    <span className="text-[11px] text-[#666]">{bot.name}</span>
                  </Link>
                ))}
                <Link
                  href="/agents"
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#F5F0E8] flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-[#999]" />
                  </div>
                  <span className="text-[11px] text-[#999]">更多</span>
                </Link>
              </div>
            </div>

            {/* 快捷问题 */}
            <div className="px-4 py-3">
              <p className="text-[12px] text-[#999] mb-2">大家都在问</p>
              <div className="space-y-2">
                {quickQuestions.map((q, i) => (
                  <Link
                    key={i}
                    href={`/agent/1?q=${encodeURIComponent(q)}`}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 bg-[#F5F0E8] rounded-lg text-[13px] text-[#2C2C2C] hover:bg-[#EBE6DE] transition-colors"
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </div>

            {/* 输入框 */}
            <div className="px-4 py-3 border-t border-[#F5F0E8] bg-white">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-[#F5F0E8] rounded-full px-4 py-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="输入您的问题..."
                    className="flex-1 bg-transparent text-[14px] outline-none"
                  />
                  <button className="p-1">
                    <Mic className="w-5 h-5 text-[#999]" />
                  </button>
                </div>
                <Link
                  href={inputValue ? `/agent/1?q=${encodeURIComponent(inputValue)}` : "/agents"}
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#A01530] flex items-center justify-center"
                >
                  <Send className="w-5 h-5 text-white" />
                </Link>
              </div>
            </div>

            {/* 安全底部间距 */}
            <div className="h-safe-bottom bg-white" />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
