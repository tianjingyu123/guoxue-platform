"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowLeft, History, Sparkles, Send, Mic, ThumbsUp, ThumbsDown, Copy, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AIIntroCard } from "@/components/classics"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const suggestedQuestions = [
  "请总结本文的主要内容？",
  "针对本文可以提出哪些研究问题？",
  "古籍中有哪些和本文相关的论述？",
]

const relatedQuestions = [
  "《李卓吾先生批评西游记》甲本卷首题辞中提到的'魔非他，即我也'这一观点，在明代其他《西游记》评点本中是否有类似表述？",
  "《李卓吾先生批评西游记》另一刊本卷首题辞补充的对后世模拟创作的批评，具体涉及哪些明代文人的作品？",
  "《李卓吾先生批评西游记》乙本题辞中的文字异文（如'引而伸之'写为'多而伸之'），在其他明代通俗文学刊本中是否常见？",
]

export default function AIAssistantPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [liked, setLiked] = useState<Record<string, boolean | null>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // 模拟AI响应
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAIResponse(userMessage.content),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = (question: string): string => {
    if (question.includes("主要内容") || question.includes("总结")) {
      return "《周易》是中国古代哲学的重要经典，主要包含以下核心内容：\n\n1. **卦象系统**：由八卦（乾、坤、震、巽、坎、离、艮、兑）演化为六十四卦，每卦由六个爻组成。\n\n2. **阴阳哲学**：以阴阳二元对立统一的思想解释宇宙万物的变化规律。\n\n3. **占卜方法**：通过蓍草或铜钱等工具，按特定程序得出卦象，用于预测吉凶。\n\n4. **人生智慧**：蕴含修身、齐家、治国的哲理，如'天行健，君子以自强不息'等名言。"
    }
    if (question.includes("研究问题")) {
      return "针对《周易》可以提出以下研究问题：\n\n1. 《周易》的成书年代和作者问题，伏羲画卦、文王演易、孔子作传的传说是否有历史依据？\n\n2. 《周易》与西方占星术、塔罗牌等预测体系在方法论上的异同比较。\n\n3. 《周易》的数学结构——64卦与二进制的关系是否体现了古人对数学的深刻理解？\n\n4. 《周易》在中医、风水、命理等领域的应用发展史研究。"
    }
    return "感谢您的提问。根据古籍记载和学术研究，这是一个非常值得深入探讨的话题。《周易》作为群经之首，其思想内涵极为丰富，涵盖了宇宙观、人生观、方法论等多个层面。\n\n如需了解更具体的内容，您可以进一步询问特定的卦象解读、历史背景或哲学意义等方面。"
  }

  const handleQuestionClick = (question: string) => {
    setInputValue(question)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }

  const handleLike = (messageId: string, isLike: boolean) => {
    setLiked(prev => ({ ...prev, [messageId]: isLike }))
  }

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h1 className="font-medium text-base">古籍AI助手</h1>
            <p className="text-[10px] text-muted-foreground">内容由AI生成</p>
          </div>
          
          <button 
            className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center"
            aria-label="历史记录"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          // 空状态 - 展示介绍和推荐问题
          <div className="p-4 space-y-4">
            {/* 最近一次AI回复（模拟） */}
            <div className="bg-card rounded-2xl p-4 border border-border/60">
              <p className="text-sm leading-relaxed text-foreground">
                刃"的高超创作技艺——全书虽完全以虚构笔法展开，却做到了数万字内容境界不重复、主旨不偏离，兼具可读性与思想启发性，进一步印证了本篇对《西游记》艺术价值的评价。
              </p>
              {/* 操作按钮 */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 相关问题 */}
            <div className="space-y-2">
              {relatedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuestionClick(q)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border/60 hover:bg-secondary/50 hover:border-border transition-colors text-sm"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 分隔线 */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-xs text-muted-foreground">聊聊新话题</span>
              <div className="flex-1 border-t border-border/50" />
            </div>

            {/* AI介绍卡片 */}
            <AIIntroCard />

            {/* 快捷问题 */}
            <div className="space-y-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuestionClick(q)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 对话消息列表
          <div className="p-4 space-y-4">
            {messages.map(message => (
              <div key={message.id} className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "gap-3"
              )}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[85%]",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3" 
                    : "flex-1 min-w-0"
                )}>
                  {message.role === "user" ? (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  ) : (
                    <>
                      <div className="bg-card rounded-2xl rounded-tl-sm p-4 border border-border/60">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 mt-2 ml-1">
                        <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleLike(message.id, true)}
                          className={cn(
                            "p-1.5 rounded-md hover:bg-secondary transition-colors",
                            liked[message.id] === true ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleLike(message.id, false)}
                          className={cn(
                            "p-1.5 rounded-md hover:bg-secondary transition-colors",
                            liked[message.id] === false ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleCopy(message.content)}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {/* 加载状态 */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-card rounded-2xl rounded-tl-sm p-4 border border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm text-muted-foreground">正在思考...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 底部输入框 */}
      <div className="sticky bottom-0 bg-card border-t border-border p-3 safe-area-inset-bottom">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入和古籍相关的问题"
              disabled={isLoading}
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
              style={{ minHeight: "42px" }}
            />
            <button
              className="absolute right-3 bottom-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="语音输入"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            className="rounded-full w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
