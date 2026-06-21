"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Send, Sparkles, Trash2, Volume2, VolumeX, Zap, Phone, BookOpen, Users, ShoppingBag, Play, ChevronRight, Star, PhoneCall, PhoneOff, Mic, MicOff, Bot, Compass, MessageSquare, Lightbulb } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { ReconnectingOverlay } from "@/components/call/reconnecting-overlay"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

// 智能体数据
const agentData = {
  id: 1,
  name: "八字命理大师",
  avatar: "/placeholder.svg",
  description: "精通八字命理，可为您解读命盘、分析运势",
  tags: ["八字排盘", "运势分析", "婚姻事业"],
  pricePerChat: 0.5,
  freeQuota: 3,
  callPrice: 2,
  gradient: "from-violet-600 via-purple-500 to-indigo-600",
}

// 快捷提问
const quickQuestions = [
  "帮我看看今年的运势如何？",
  "我的八字五行缺什么？",
  "分析一下我的事业运",
  "看看我的婚姻宫情况",
  "帮我解读一下命盘",
]

// 推荐内容数据
const recommendedCourses = [
  { id: 1, title: "八字入门实战课", instructor: "周易大师", price: 199, originalPrice: 299, students: 2680, rating: 4.9 },
  { id: 2, title: "八字看婚姻专题", instructor: "玄学居士", price: 99, originalPrice: 149, students: 1520, rating: 4.8 },
  { id: 3, title: "流年运势精解", instructor: "周易大师", price: 149, originalPrice: 199, students: 1890, rating: 4.9 },
]

const recommendedCircles = [
  { id: 1, name: "八字命理研习社", members: 3280, price: 99, description: "系统学习八字命理" },
  { id: 2, name: "周易大师交流圈", members: 5620, price: 0, description: "与高手一起探讨" },
]

const recommendedProducts = [
  { id: 1, name: "八字命理入门", type: "电子书", price: 29, originalPrice: 49, sales: 856 },
  { id: 2, name: "开运水晶手链", type: "饰品", price: 168, originalPrice: 268, sales: 326 },
]

// 消息类型
interface RecommendItem {
  type: "course" | "circle" | "product" | "paipan"
  data: any
}

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isStreaming?: boolean
  recommendations?: RecommendItem[]
  isSummary?: boolean
}

// 推荐卡片组件 - 课程
function CourseRecommendCard({ course }: { course: typeof recommendedCourses[0] }) {
  return (
    <Link href={`/course/${course.id}`} className="block">
      <Card className="flex gap-3 p-3 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10 hover:border-primary/30 transition-colors card-press">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
          <Play className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground line-clamp-1">{course.title}</p>
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary flex-shrink-0 border-0">推荐</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{course.instructor} · {course.students}人已学</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-bold text-primary">¥{course.price}</span>
            <span className="text-xs text-muted-foreground line-through">¥{course.originalPrice}</span>
            <div className="flex items-center gap-0.5 ml-auto">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs text-muted-foreground">{course.rating}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 推荐卡片组件 - 圈子
function CircleRecommendCard({ circle }: { circle: typeof recommendedCircles[0] }) {
  return (
    <Link href={`/circles/${circle.id}`} className="block">
      <Card className="flex gap-3 p-3 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border-emerald-500/10 hover:border-emerald-500/30 transition-colors card-press">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground line-clamp-1">{circle.name}</p>
            {circle.price === 0 && <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-0">免费</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{circle.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{circle.members}成员</span>
            {circle.price > 0 && <span className="text-sm font-bold text-primary">¥{circle.price}</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
      </Card>
    </Link>
  )
}

// 推荐卡片组件 - 商品
function ProductRecommendCard({ product }: { product: typeof recommendedProducts[0] }) {
  return (
    <Link href={`/mall/product/${product.id}`} className="block">
      <Card className="flex gap-3 p-3 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/10 hover:border-amber-500/30 transition-colors card-press">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{product.type} · 已售{product.sales}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-primary">¥{product.price}</span>
            <span className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 排盘工具入口卡片
function PaipanToolCard() {
  return (
    <Link href="/paipan" className="block">
      <Card className="p-3 bg-primary/5 border-primary/20 hover:border-primary/40 transition-colors card-press">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">立即排盘</p>
            <p className="text-xs text-muted-foreground">使用八字排盘工具生成命盘</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  )
}

// 推荐区块组件
function RecommendationBlock({ recommendations }: { recommendations: RecommendItem[] }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-accent animate-pulse" />
        为您推荐
      </p>
      {recommendations.map((item, index) => {
        if (item.type === "course") {
          return <CourseRecommendCard key={index} course={item.data} />
        } else if (item.type === "circle") {
          return <CircleRecommendCard key={index} circle={item.data} />
        } else if (item.type === "product") {
          return <ProductRecommendCard key={index} product={item.data} />
        } else if (item.type === "paipan") {
          return <PaipanToolCard key={index} />
        }
        return null
      })}
    </div>
  )
}

// 对话总结卡片
function ConversationSummary({ messages }: { messages: Message[] }) {
  const userMessages = messages.filter(m => m.role === "user")
  const topics = ["运势分析", "事业规划"]
  
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-accent" />
        <h4 className="font-medium text-sm">对话总结</h4>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>本次对话共{userMessages.length}个问题，涉及：</p>
        <div className="flex flex-wrap gap-1.5">
          {topics.map((topic, i) => (
            <Badge key={i} variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
              {topic}
            </Badge>
          ))}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">相关推荐</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {recommendedCourses.slice(0, 2).map(course => (
            <Link key={course.id} href={`/course/${course.id}`} className="flex-shrink-0">
              <div className="w-32 p-2 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors">
                <p className="text-xs font-medium line-clamp-1">{course.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">¥{course.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default function AgentChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [freeRemaining, setFreeRemaining] = useState(agentData.freeQuota)
  const [showMenu, setShowMenu] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [callRecommendation, setCallRecommendation] = useState<RecommendItem | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 欢迎消息
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 0,
      role: "assistant",
      content: `您好！我是${agentData.name}，精通八字命理学，拥有多年实战经验。

我可以为您提供以下服务：
- 八字命盘排盘与解读
- 流年运势分析
- 婚姻事业预测
- 五行调理建议

请告诉我您的出生年月日时（公历或农历均可），我来为您详细分析。`,
      timestamp: new Date(),
      recommendations: [{ type: "paipan", data: null }],
    }
    setMessages([welcomeMessage])
  }, [])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 通话中监听���络断连
  useEffect(() => {
    if (!isInCall) return
    const handleOffline = () => setIsReconnecting(true)
    window.addEventListener("offline", handleOffline)
    return () => window.removeEventListener("offline", handleOffline)
  }, [isInCall])

  // 通话计时（重连期间暂停计时计费）
  useEffect(() => {
    if (isInCall && !isReconnecting) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1
          if (newDuration % 30 === 0 && newDuration > 0) {
            const randomCourse = recommendedCourses[Math.floor(Math.random() * recommendedCourses.length)]
            setCallRecommendation({ type: "course", data: randomCourse })
            setTimeout(() => setCallRecommendation(null), 8000)
          }
          return newDuration
        })
      }, 1000)
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
      // 仅在真正结束通话时清零，重连暂停期间保留时长
      if (!isInCall) setCallDuration(0)
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [isInCall, isReconnecting])

  // 格式化通话时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 模拟流式输出
  const simulateStreaming = (fullText: string, messageId: number, recommendations?: RecommendItem[]) => {
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        const charsToAdd = Math.min(3, fullText.length - currentIndex)
        currentIndex += charsToAdd
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: fullText.slice(0, currentIndex), isStreaming: currentIndex < fullText.length }
              : msg
          )
        )
      } else {
        clearInterval(interval)
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId ? { ...msg, isStreaming: false, recommendations } : msg
          )
        )
        setIsTyping(false)
      }
    }, 25)
  }

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return

    const userMessage: Message = {
      id: messages.length,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    if (freeRemaining > 0) {
      setFreeRemaining(prev => prev - 1)
    }

    setTimeout(() => {
      const { text, recommendations } = generateResponse(inputValue.trim())
      const assistantMessage: Message = {
        id: messages.length + 1,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      }
      setMessages(prev => [...prev, assistantMessage])
      simulateStreaming(text, messages.length + 1, recommendations)
    }, 600)
  }

  // 生成回复（模拟）
  const generateResponse = (question: string): { text: string; recommendations?: RecommendItem[] } => {
    if (question.includes("运势") || question.includes("今年")) {
      return {
        text: `根据您提供的信息，让我来分析一下您的运势：

【2024年整体运势】
今年流年甲辰，天干甲木生助，地支辰土为财库，整体运势呈上升趋势。

【事业运】
上半年贵人运旺，适合拓展人脉、寻求合作机会。下半年需稳中求进，不宜冒进。

【财运】
正财稳定，偏财有小进。建议以稳健投资为主，避免高风险操作。

如果您想更深入地了解流年运势的变化规律，我推荐您学习以下课程：`,
        recommendations: [
          { type: "course", data: recommendedCourses[2] },
          { type: "circle", data: recommendedCircles[0] },
        ]
      }
    } else if (question.includes("五行") || question.includes("缺")) {
      return {
        text: `关于五行分析，我需要您提供准确的出生信息：

【所需信息】
1. 出生年份（公历）
2. 出生月份
3. 出生日期
4. 出生时辰（如知道的话）

有了这些信息，我可以为您排出完整八字命盘，分析五行旺衰，判断喜用神。

您可以使用排盘工具快速生成命盘：`,
        recommendations: [
          { type: "paipan", data: null },
          { type: "course", data: recommendedCourses[0] },
        ]
      }
    } else if (question.includes("事业")) {
      return {
        text: `关于事业运的分析：

【事业宫位】
八字中以月柱为事业宫，结合日主强弱、官杀星的配置来综合判断。

【一般建议】
1. 身强者适合独立创业或担任领导职位
2. 身弱者适合稳定工作或与人合作
3. 食伤生财格局利于技术、创意类工作
4. 官杀旺者适合体制内或管理岗位

如需针对性分析，请提供您的八字信息。同时，如果您对事业规划有更多疑问，也欢迎加入我们的交流圈：`,
        recommendations: [
          { type: "circle", data: recommendedCircles[1] },
        ]
      }
    } else if (question.includes("婚姻") || question.includes("感情")) {
      return {
        text: `关于婚姻宫的分析：

【婚姻宫位】
八字中以日支为婚姻宫，代表配偶和婚姻状态。

【影响因素】
1. 日支所坐十神（正财、正官等）
2. 日支与其他地支的刑冲合害
3. 大运流年对婚姻宫的影响

请提供您的出生信息，我可以为您详细分析婚姻运势：`,
        recommendations: [
          { type: "course", data: recommendedCourses[1] },
          { type: "paipan", data: null },
        ]
      }
    } else if (question.includes("化解") || question.includes("调理")) {
      return {
        text: `关于命理调理和化解：

【调理原则】
1. 五行补缺：通过颜色、方位、饰品等补充所缺五行
2. 流年趋避：了解不利时段，提前规避风险
3. 风水调整：居家办公环境的布局优化
4. 心态调整：顺应天时，积极面对

具体的调理方案需要根据您的八字来定制。另外，一些开运饰品也可以起到辅助作用：`,
        recommendations: [
          { type: "product", data: recommendedProducts[1] },
          { type: "course", data: recommendedCourses[2] },
        ]
      }
    }
    
    return {
      text: `感谢您的提问！

为了给您更准确的命理分析，我需要了解以下信息：

1. **出生日期**：公历年月日
2. **出生时辰**：如早上7点、下午3点等
3. **出生地点**：用于校正真太阳时

有了这些信息，我可以为您排出精准的八字命盘。您也可以先使用排盘工具：`,
      recommendations: [
        { type: "paipan", data: null },
        { type: "course", data: recommendedCourses[0] },
      ]
    }
  }

  // 快捷提问
  const handleQuickQuestion = (question: string) => {
    setInputValue(question)
    inputRef.current?.focus()
  }

  // 清除上下文
  const handleClearContext = () => {
    setMessages([{
      id: 0,
      role: "assistant",
      content: `对话已重置。您好！我是${agentData.name}，有什么可以帮您的？`,
      timestamp: new Date(),
    }])
    setShowMenu(false)
    setShowSummary(false)
  }

  // 开始/结束通话
  const toggleCall = () => {
    if (isInCall) {
      setIsInCall(false)
      const endCallMessage: Message = {
        id: messages.length,
        role: "assistant",
        content: `通话已结束，本次通话时长 ${formatDuration(callDuration)}，消费 ¥${(callDuration / 60 * agentData.callPrice).toFixed(2)}。

感谢您的咨询！如果您还有疑问，可以继续文字沟通，或者查看以下学习资源：`,
        timestamp: new Date(),
        recommendations: [
          { type: "course", data: recommendedCourses[Math.floor(Math.random() * recommendedCourses.length)] },
          { type: "circle", data: recommendedCircles[0] },
        ]
      }
      setMessages(prev => [...prev, endCallMessage])
    } else {
      setIsInCall(true)
    }
  }

  // 生成对话总结
  const handleGenerateSummary = () => {
    setShowSummary(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* 语音通话界面 */}
      {isInCall && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
          {/* 动态背景 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* 通话信息 */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
            {/* 头像 - 带动态光环 */}
            <div className="relative mb-6">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-md opacity-50 animate-spin-slow" />
              <Avatar className="w-28 h-28 ring-4 ring-white/20 relative">
                <AvatarImage src={agentData.avatar} alt={agentData.name} />
                <AvatarFallback className={cn("bg-gradient-to-br text-white text-3xl", agentData.gradient)}>
                  <Bot className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              {/* 在线指示器 */}
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-1">{agentData.name}</h2>
            <p className="text-white/60 text-sm mb-4 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              通话中
            </p>
            
            {/* 通话时长和费用 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-3 mb-8">
              <p className="text-3xl font-mono text-white text-center">{formatDuration(callDuration)}</p>
              <p className="text-white/60 text-xs text-center mt-1">
                ¥{agentData.callPrice}/分钟 · 已消费 ¥{(callDuration / 60 * agentData.callPrice).toFixed(2)}
              </p>
            </div>

            {/* 语音波形动画 */}
            <div className="flex items-center gap-1 mb-8">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1 bg-gradient-to-t from-primary to-accent rounded-full animate-soundwave"
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>

            {/* 通话中推荐卡片 */}
            {callRecommendation && (
              <div className="absolute bottom-40 left-4 right-4 animate-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-3">
                  <p className="text-white/80 text-xs mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" /> 为您推荐
                  </p>
                  <Link href={`/course/${callRecommendation.data.id}`} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white/80" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{callRecommendation.data.title}</p>
                      <p className="text-white/60 text-xs">¥{callRecommendation.data.price}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </Link>
                </Card>
              </div>
            )}
          </div>

          {/* 通话控制按钮 */}
          <div className="pb-12 px-8 safe-area-pb relative z-10">
            <div className="flex items-center justify-center gap-8">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  isMicMuted ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                )}
              >
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button 
                onClick={toggleCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  isMuted ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                )}
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>

            {/* 网络状态（点击模拟断连，便于演示重连流程） */}
            <button
              onClick={() => setIsReconnecting(true)}
              className="mx-auto mt-4 flex items-center gap-1.5 text-white/40 text-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              网络正常 · 点此模拟断连
            </button>
          </div>

          {/* 网络断连重连浮层 */}
          <ReconnectingOverlay
            open={isReconnecting}
            onReconnected={() => setIsReconnecting(false)}
            onEndCall={() => { setIsReconnecting(false); toggleCall(); }}
          />
        </div>
      )}

      {/* 顶部导航栏 - AI科技感 */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background via-background to-background/80 backdrop-blur-xl border-b border-border/50 safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/agents" />
          
          <div className="flex items-center gap-3">
            {/* 头像 - 带动态边框 */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-full opacity-75 blur-sm animate-pulse" />
              <Avatar className="w-9 h-9 relative ring-2 ring-background">
                <AvatarImage src={agentData.avatar} alt={agentData.name} />
                <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs", agentData.gradient)}>
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              {/* 在线状态 */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-foreground">{agentData.name}</h1>
              <p className="text-[10px] text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                在线
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "p-2 rounded-full transition-colors",
                isMuted ? "text-muted-foreground hover:bg-secondary" : "text-accent hover:bg-accent/10"
              )}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={toggleCall}
              className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 -mr-2 hover:bg-secondary rounded-full transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <button
                    onClick={handleGenerateSummary}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <Lightbulb className="w-4 h-4" />
                    生成对话总结
                  </button>
                  <button
                    onClick={handleClearContext}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors border-t border-border"
                  >
                    <Trash2 className="w-4 h-4" />
                    清除上下文
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 消耗提示 - 渐变背景 */}
      <div className="px-4 py-2 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>剩余免费次数：<span className="text-accent font-bold">{freeRemaining}</span> 次</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />{agentData.pricePerChat}元/次
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />{agentData.callPrice}元/分钟
            </span>
          </div>
        </div>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {message.role === "assistant" && (
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                  <AvatarImage src={agentData.avatar} alt={agentData.name} />
                  <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs", agentData.gradient)}>
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            <div className={cn(
              "max-w-[85%]",
              message.role === "user" && "flex flex-col items-end"
            )}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
                    : "bg-card text-foreground rounded-bl-md border border-border"
                )}
              >
                <p className={cn(
                  "whitespace-pre-wrap",
                  message.isStreaming && "streaming-cursor"
                )}>
                  {message.content}
                </p>
              </div>
              
              {/* 推荐卡片区域 */}
              {message.role === "assistant" && message.recommendations && !message.isStreaming && (
                <RecommendationBlock recommendations={message.recommendations} />
              )}
            </div>
          </div>
        ))}

        {/* 正在输入提示 - 三个跳动圆点 */}
        {isTyping && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-primary/20">
              <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs", agentData.gradient)}>
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-card text-foreground rounded-2xl rounded-bl-md border border-border px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* 对话总结 */}
        {showSummary && messages.length > 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ConversationSummary messages={messages} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷提问标签 */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent" />
            快捷提问
          </p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="px-3 py-1.5 bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary/10 hover:to-accent/10 text-foreground text-xs rounded-full transition-all border border-transparent hover:border-primary/20"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 底部输入区 - 科技感边框 */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/50 p-4 safe-area-pb">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入您的问题..."
              rows={1}
              className="relative w-full px-4 py-3 bg-secondary/80 text-foreground text-sm rounded-2xl resize-none focus:outline-none focus:bg-secondary placeholder:text-muted-foreground"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          此内容由AI生成，仅供参考，不构成专业建议
        </p>
      </div>

      {/* 动画样式 */}
      <style jsx global>{`
        @keyframes soundwave {
          0%, 100% { height: 8px; }
          50% { height: 40px; }
        }
        .animate-soundwave {
          animation: soundwave 0.5s ease-in-out infinite alternate;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .streaming-cursor::after {
          content: '|';
          animation: blink 0.7s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
