"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, Phone, MessageCircle, Eye, Lock, ChevronRight, 
  Sparkles, Star, Clock, FileQuestion, Video, Users
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { cn } from "@/lib/utils"
import { useCoinBalance } from "@/hooks/use-coin-balance"
import { InsufficientBalanceDialog } from "@/components/wallet/insufficient-balance-dialog"

// 圈主/首席嘉宾数据
const mainExpert = {
  id: 1,
  name: "周易大师",
  avatar: "",
  title: "圈主 · 资深命理师",
  intro: "从业20年，精通八字、紫微、风水，已为超过10000+用户提供专业命理咨询服务",
  rating: 4.9,
  consultCount: 3680,
  responseRate: 98,
  askPrice: 50,
  callPrice: 10,
}

// 达人团队数据
const experts = [
  { id: 2, name: "张玄风", avatar: "", specialty: "紫微斗数", rating: 4.8, callPrice: 8, askPrice: 30, isOnline: true },
  { id: 3, name: "陈风水", avatar: "", specialty: "风水堪舆", rating: 4.7, callPrice: 6, askPrice: 20, isOnline: true },
  { id: 4, name: "李易安", avatar: "", specialty: "姓名学", rating: 4.9, callPrice: 10, askPrice: 50, isOnline: false },
  { id: 5, name: "王命理", avatar: "", specialty: "八字精批", rating: 4.6, callPrice: 5, askPrice: 15, isOnline: true },
  { id: 6, name: "赵国学", avatar: "", specialty: "六爻预测", rating: 4.8, callPrice: 8, askPrice: 35, isOnline: false },
]

// 精选问答数据
const featuredQAs = [
  {
    id: 1,
    asker: { name: "匿名用户", avatar: "" },
    question: "看看我今年的运势如何？事业和感情方面有什么需要注意的吗",
    expert: { id: 1, name: "周易大师", avatar: "" },
    answerPreview: "从你的八字来看，今年是你的偏财年，事业上会有不少机遇，但要注意把握时机。上半年工作压力较大，但到了下半年会有明显转机...",
    isAnswered: true,
    viewCount: 1280,
    viewPrice: 1,
    createdAt: "2小时前",
    tags: ["八字", "年运"],
  },
  {
    id: 2,
    asker: { name: "匿名用户", avatar: "" },
    question: "我和对象的八字合不合？明年适合结婚吗",
    expert: { id: 2, name: "张玄风", avatar: "" },
    answerPreview: "根据你们双方的八字分析，整体来说相合度较高。从日干五行来看，你们属于相生关系，这是非常好的组合...",
    isAnswered: true,
    viewCount: 856,
    viewPrice: 2,
    createdAt: "5小时前",
    tags: ["合婚", "姻缘"],
  },
  {
    id: 3,
    asker: { name: "匿名用户", avatar: "" },
    question: "想请老师帮忙看看我家的风水布局，最近总感觉诸事不顺",
    expert: { id: 3, name: "陈风水", avatar: "" },
    answerPreview: "",
    isAnswered: false,
    viewCount: 0,
    viewPrice: 2,
    createdAt: "30分钟前",
    tags: ["风水", "布局"],
  },
  {
    id: 4,
    asker: { name: "匿名用户", avatar: "" },
    question: "帮我分析一下这个名字对孩子的运势影响",
    expert: { id: 4, name: "李易安", avatar: "" },
    answerPreview: "这个名字从五格数理来看，天格、人格、地格都比较理想。特别是人格数为15，属于福寿双全的吉数...",
    isAnswered: true,
    viewCount: 520,
    viewPrice: 1,
    createdAt: "1天前",
    tags: ["姓名", "起名"],
  },
]

// 我的订单数据
const myOrders = {
  pendingQuestions: 2,
  pendingCalls: 1,
}

export default function CircleConsultPage() {
  const [activeTab, setActiveTab] = useState<"all" | "answered" | "pending">("all")
  const [viewingAnswerId, setViewingAnswerId] = useState<number | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedQA, setSelectedQA] = useState<typeof featuredQAs[0] | null>(null)
  const { balance, isEnough } = useCoinBalance()
  const [showInsufficient, setShowInsufficient] = useState(false)

  const filteredQAs = featuredQAs.filter(qa => {
    if (activeTab === "all") return true
    if (activeTab === "answered") return qa.isAnswered
    if (activeTab === "pending") return !qa.isAnswered
    return true
  })

  const handleViewAnswer = (qa: typeof featuredQAs[0]) => {
    if (qa.isAnswered) {
      setSelectedQA(qa)
      setShowPayModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-12">
          <BackButton fallbackPath="/circle/1/home" />
          <h1 className="font-semibold text-base text-foreground">付费咨询</h1>
          <Link href="/circles/1/consult/orders" className="relative p-2 -mr-2">
            <FileQuestion className="w-5 h-5 text-muted-foreground" />
            {(myOrders.pendingQuestions + myOrders.pendingCalls) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {myOrders.pendingQuestions + myOrders.pendingCalls}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* 圈主Banner咨询区 */}
      <div className="p-4">
        <Card className="overflow-hidden bg-gradient-to-br from-accent/20 via-primary/10 to-accent/5 border-accent/30">
          <div className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-accent/50">
                <AvatarImage src={mainExpert.avatar} alt={mainExpert.name} />
                <AvatarFallback className="bg-accent/20 text-accent text-lg font-bold">
                  {mainExpert.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-foreground">{mainExpert.name}</h2>
                  <Badge className="bg-accent text-white text-[10px] px-1.5 py-0 border-0">V</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{mainExpert.title}</p>
                <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{mainExpert.intro}</p>
                
                {/* 数据统计 */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-xs text-foreground font-medium">{mainExpert.rating}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{mainExpert.consultCount}次咨询</span>
                  <span className="text-xs text-muted-foreground">{mainExpert.responseRate}%回复率</span>
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-3 mt-4">
              <Link 
                href={`/circle/1/consult/ask?expert=${mainExpert.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                提问 {mainExpert.askPrice}币
              </Link>
              <Link 
                href={`/circle/1/consult/call?expert=${mainExpert.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Video className="w-4 h-4" />
                连麦 {mainExpert.callPrice}币/分钟
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* 达人推荐区 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm text-foreground">专家团 · 为你解惑</h3>
          </div>
          <Link href="/circles/1/consult/experts" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            全部 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {experts.map(expert => (
            <Link
              key={expert.id}
              href={`/circle/1/consult/expert/${expert.id}`}
              className="flex-shrink-0 w-32"
            >
              <Card className="p-3 hover:bg-secondary/50 transition-colors">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={expert.avatar} alt={expert.name} />
                      <AvatarFallback className="bg-secondary text-foreground">
                        {expert.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {expert.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                    <Badge className="absolute -top-1 -right-1 bg-accent text-white text-[8px] px-1 py-0 border-0">V</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-2">{expert.name}</p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1 bg-secondary">
                    {expert.specialty}
                  </Badge>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-[10px] text-muted-foreground">{expert.rating}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 w-full">
                    <button className="flex-1 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded hover:bg-primary/20 transition-colors">
                      连麦{expert.callPrice}币
                    </button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 精选问答区 */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">精选问答</h3>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            {[
              { key: "all", label: "全部" },
              { key: "answered", label: "已回答" },
              { key: "pending", label: "待回答" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pb-4">
          {filteredQAs.map(qa => (
            <Card key={qa.id} className="p-4 hover:bg-secondary/30 transition-colors">
              {/* 提问者信息 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={qa.asker.avatar} alt={qa.asker.name} />
                    <AvatarFallback className="bg-secondary text-muted-foreground text-xs">匿</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{qa.asker.name}</span>
                  <span className="text-xs text-muted-foreground/60">{qa.createdAt}</span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-1.5 py-0 border-0",
                    qa.isAnswered 
                      ? "bg-green-500/10 text-green-600" 
                      : "bg-orange-500/10 text-orange-600"
                  )}
                >
                  {qa.isAnswered ? "已回答" : "待回答"}
                </Badge>
              </div>

              {/* 问题内容 */}
              <p className="text-sm text-foreground font-medium mb-2">{qa.question}</p>
              
              {/* 标签 */}
              <div className="flex items-center gap-1.5 mb-3">
                {qa.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* 回答预览 */}
              {qa.isAnswered && (
                <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={qa.expert.avatar} alt={qa.expert.name} />
                      <AvatarFallback className="bg-accent/20 text-accent text-[10px]">
                        {qa.expert.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground">{qa.expert.name}</span>
                    <Badge className="bg-accent text-white text-[8px] px-1 py-0 border-0">V</Badge>
                  </div>
                  
                  {viewingAnswerId === qa.id ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{qa.answerPreview}</p>
                  ) : (
                    <div className="relative">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 blur-[2px]">
                        {qa.answerPreview}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 rounded">
                        <button 
                          onClick={() => handleViewAnswer(qa)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90 transition-colors"
                        >
                          <Lock className="w-3 h-3" />
                          {qa.viewPrice}币围观
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 底部数据 */}
              {qa.isAnswered && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-xs">{qa.viewCount}人围观</span>
                  </div>
                  <Link 
                    href={`/circle/1/consult/qa/${qa.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    查看详情
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center justify-around px-4 h-14">
          <Link 
            href="/circles/1/consult/my-questions"
            className="flex flex-col items-center gap-0.5 relative"
          >
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">我的提问</span>
            {myOrders.pendingQuestions > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {myOrders.pendingQuestions}
              </span>
            )}
          </Link>
          <Link 
            href="/circles/1/consult/my-calls"
            className="flex flex-col items-center gap-0.5 relative"
          >
            <Video className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">连麦记录</span>
            {myOrders.pendingCalls > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {myOrders.pendingCalls}
              </span>
            )}
          </Link>
          <Link 
            href="/circles/1/consult/ask"
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            发起提问
          </Link>
        </div>
      </div>

      {/* 围观支付弹窗 */}
      {showPayModal && selectedQA && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-foreground">围观答案</h3>
                <button 
                  onClick={() => setShowPayModal(false)}
                  className="p-1 rounded-full hover:bg-secondary"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground rotate-90" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <Card className="p-3 bg-secondary/50 mb-4">
                <p className="text-sm text-foreground font-medium line-clamp-2">{selectedQA.question}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="bg-accent/20 text-accent text-[10px]">
                      {selectedQA.expert.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{selectedQA.expert.name} 已回答</span>
                </div>
              </Card>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">围观价格</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">{selectedQA.viewPrice}</span>
                  <span className="text-sm text-muted-foreground">国学币</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                <Users className="w-3.5 h-3.5" />
                <span>已有 {selectedQA.viewCount} 人围观</span>
              </div>

              <button 
                onClick={() => {
                  if (!isEnough(selectedQA.viewPrice)) {
                    setShowPayModal(false)
                    setShowInsufficient(true)
                    return
                  }
                  setViewingAnswerId(selectedQA.id)
                  setShowPayModal(false)
                }}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                确认支付 {selectedQA.viewPrice} 币
              </button>
              
              <p className="text-center text-[10px] text-muted-foreground mt-3">
                支付后可查看完整回答内容
              </p>
            </div>
          </div>
        </div>
      )}

      <InsufficientBalanceDialog
        open={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        required={selectedQA?.viewPrice ?? 0}
        balance={balance ?? 0}
      />
    </div>
  )
}
