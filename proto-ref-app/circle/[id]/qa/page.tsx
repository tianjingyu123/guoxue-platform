"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, MessageCircle, Eye, Clock, Check, HelpCircle, 
  ChevronRight, Image as ImageIcon, X, Loader2, Coins
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { cn } from "@/lib/utils"
import { useCoinBalance } from "@/hooks/use-coin-balance"
import { InsufficientBalanceDialog } from "@/components/wallet/insufficient-balance-dialog"

// 问答数据
const qaList = [
  {
    id: 1,
    asker: { name: "匿名用户", avatar: "" },
    question: "八字中日主偏弱，是否一定要补强？有没有弱而不补反而更好的情况？",
    images: [],
    askTime: "2小时前",
    answerer: { name: "周易大师", avatar: "", role: "圈主" },
    answer: "这是一个很好的问题。八字论命，并非简单的强弱补泄。有些格局如「从格」，日主极弱反而要顺其势，补强反为不美...",
    answerTime: "1小时前",
    status: "answered",
    viewCount: 128,
    viewPrice: 1,
    questionPrice: 10,
  },
  {
    id: 2,
    asker: { name: "匿名用户", avatar: "" },
    question: "请问紫微斗数中的「四化」如何理解？特别是化忌在不同宫位的含义有什么区别？",
    images: [],
    askTime: "5小时前",
    answerer: { name: "张玄风", avatar: "", role: "嘉宾" },
    answer: "四化是紫微斗数的精髓，化禄主福、化权主权、化科主名、化忌主烦。化忌在不同宫位的影响...",
    answerTime: "3小时前",
    status: "answered",
    viewCount: 256,
    viewPrice: 2,
    questionPrice: 20,
  },
  {
    id: 3,
    asker: { name: "匿名用户", avatar: "" },
    question: "风水布局中，客厅沙发背后是窗户怎么化解？",
    images: [],
    askTime: "1天前",
    answerer: { name: "周易大师", avatar: "", role: "圈主" },
    answer: null,
    answerTime: null,
    status: "pending",
    viewCount: 0,
    viewPrice: 1,
    questionPrice: 10,
  },
  {
    id: 4,
    asker: { name: "匿名用户", avatar: "" },
    question: "八字中的「桃花」和「红鸾」有什么区别？对感情的影响一样吗？",
    images: [],
    askTime: "2天前",
    answerer: { name: "周易大师", avatar: "", role: "圈主" },
    answer: "桃花与红鸾虽都主感情桃花，但性质不同。桃花多指异性缘、人缘，有正桃花和烂桃花之分...",
    answerTime: "1天前",
    status: "answered",
    viewCount: 512,
    viewPrice: 1,
    questionPrice: 10,
  },
]

// 可提问对象
const answerers = [
  { id: 1, name: "周易大师", avatar: "", role: "圈主", price: 10, responseRate: 98, avgTime: "2小时内" },
  { id: 2, name: "张玄风", avatar: "", role: "嘉宾", price: 20, responseRate: 95, avgTime: "4小时内" },
  { id: 3, name: "李易安", avatar: "", role: "嘉宾", price: 15, responseRate: 90, avgTime: "6小时内" },
]

export default function CircleQAPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState<"all" | "answered" | "pending">("all")
  const [showAskModal, setShowAskModal] = useState(false)
  const [selectedAnswerer, setSelectedAnswerer] = useState<typeof answerers[0] | null>(null)
  const [questionTitle, setQuestionTitle] = useState("")
  const [questionDetail, setQuestionDetail] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const { balance, isEnough } = useCoinBalance()
  const [showInsufficient, setShowInsufficient] = useState(false)

  const tabs = [
    { id: "all", label: "全部", count: qaList.length },
    { id: "answered", label: "已回答", count: qaList.filter(q => q.status === "answered").length },
    { id: "pending", label: "待回答", count: qaList.filter(q => q.status === "pending").length },
  ]

  const filteredQA = qaList.filter(qa => {
    if (activeTab === "all") return true
    return qa.status === activeTab
  })

  const handleSubmitQuestion = async () => {
    if (!selectedAnswerer || !questionTitle.trim()) return
    // 国学币余额不足时引导充值
    if (!isEnough(selectedAnswerer.price)) {
      setShowAskModal(false)
      setShowInsufficient(true)
      return
    }
    setIsSubmitting(true)
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setShowAskModal(false)
    setShowSuccessModal(true)
    // 重置表单
    setSelectedAnswerer(null)
    setQuestionTitle("")
    setQuestionDetail("")
  }

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton />
  <h1 className="font-semibold text-base text-foreground">付费问答</h1>
          <button 
            onClick={() => setShowAskModal(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            我要提问
          </button>
        </div>

        {/* 筛选Tab */}
        <div className="flex items-center gap-4 px-4 h-10 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "relative pb-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className="ml-1 text-xs">({tab.count})</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 问答列表 */}
      <div className="px-4 py-4 space-y-3">
        {filteredQA.length > 0 ? (
          filteredQA.map(qa => (
            <Link key={qa.id} href={`/circle/${params.id}/qa/${qa.id}`}>
              <Card className="p-4 hover:bg-secondary/30 transition-colors">
                {/* 提问者信息 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={qa.asker.avatar} alt={qa.asker.name} />
                      <AvatarFallback className="bg-secondary text-muted-foreground text-[10px]">匿</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{qa.asker.name}</span>
                    <span className="text-xs text-muted-foreground/60">{qa.askTime}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-[10px] px-1.5 py-0 border-0",
                      qa.status === "answered" 
                        ? "bg-green-500/10 text-green-500" 
                        : "bg-orange-500/10 text-orange-500"
                    )}
                  >
                    {qa.status === "answered" ? "已回答" : "待回答"}
                  </Badge>
                </div>

                {/* 问题内容 */}
                <div className="mb-3">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">{qa.question}</p>
                  </div>
                </div>

                {/* 回答内容 */}
                {qa.status === "answered" && qa.answer && (
                  <div className="pl-6 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={qa.answerer.avatar} alt={qa.answerer.name} />
                        <AvatarFallback className="bg-accent/20 text-accent text-[10px]">
                          {qa.answerer.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">{qa.answerer.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/10 text-accent border-0">
                        {qa.answerer.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{qa.answer}</p>
                  </div>
                )}

                {/* 底部数据 */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {qa.viewCount}人围观
                    </span>
                    {qa.status === "answered" && (
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-accent" />
                        {qa.viewPrice}币围观
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">还没有人提问</p>
            <p className="text-muted-foreground/70 text-xs mt-1">成为第一个提问者吧</p>
            <button 
              onClick={() => setShowAskModal(true)}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full"
            >
              我要提问
            </button>
          </div>
        )}
      </div>

      {/* 提问弹窗 */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-lg bg-card rounded-t-2xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <button onClick={() => setShowAskModal(false)} className="text-sm text-muted-foreground">
                取消
              </button>
              <h3 className="font-semibold text-base text-foreground">发起提问</h3>
              <div className="w-10" />
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-56px-80px)] p-4 space-y-4">
              {/* 选择提问对象 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  选择提问对象 <span className="text-primary">*</span>
                </label>
                <div className="space-y-2">
                  {answerers.map(person => (
                    <Card 
                      key={person.id}
                      className={cn(
                        "p-3 cursor-pointer transition-all",
                        selectedAnswerer?.id === person.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-secondary/50"
                      )}
                      onClick={() => setSelectedAnswerer(person)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={person.avatar} alt={person.name} />
                          <AvatarFallback className="bg-accent/20 text-accent">
                            {person.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{person.name}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/10 text-accent border-0">
                              {person.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>回复率 {person.responseRate}%</span>
                            <span>平均 {person.avgTime}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-primary font-semibold text-sm">{person.price}币</div>
                          <div className="text-[10px] text-muted-foreground">提问价格</div>
                        </div>
                        {selectedAnswerer?.id === person.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 问题标题 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  问题标题 <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  placeholder="请简要描述你的问题"
                  maxLength={50}
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{questionTitle.length}/50</p>
              </div>

              {/* 问题详情 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  详细描述 <span className="text-muted-foreground text-xs">(选填)</span>
                </label>
                <textarea
                  value={questionDetail}
                  onChange={(e) => setQuestionDetail(e.target.value)}
                  placeholder="请详细描述你的问题，提供更多背景信息有助于获得更精准的回答"
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{questionDetail.length}/500</p>
              </div>

              {/* 匿名设置 */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">匿名提问</p>
                  <p className="text-xs text-muted-foreground">其他用户将无法看到你的身份</p>
                </div>
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    "w-12 h-7 rounded-full transition-colors relative",
                    isAnonymous ? "bg-primary" : "bg-secondary"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    isAnonymous ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              {/* 费用说明 */}
              {selectedAnswerer && (
                <Card className="p-3 bg-accent/5 border-accent/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">提问费用</span>
                    <span className="text-lg font-bold text-primary">{selectedAnswerer.price} 国学币</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    提问后若7天内未获回答，费用将自动退还
                  </p>
                </Card>
              )}
            </div>

            {/* 底部操作 */}
            <div className="px-4 py-4 border-t border-border bg-card safe-area-pb">
              <button
                onClick={handleSubmitQuestion}
                disabled={!selectedAnswerer || !questionTitle.trim() || isSubmitting}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  selectedAnswerer && questionTitle.trim() && !isSubmitting
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    确认支付并提问
                    {selectedAnswerer && <span>({selectedAnswerer.price}币)</span>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提问成功弹窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[85%] max-w-sm bg-card rounded-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">提问成功</h3>
            <p className="text-sm text-muted-foreground mb-6">
              你的问题已提交，请耐心等待回答。回答后会通过消息通知你。
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      <InsufficientBalanceDialog
        open={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        required={selectedAnswerer?.price ?? 0}
        balance={balance ?? 0}
      />
    </div>
  )
}
