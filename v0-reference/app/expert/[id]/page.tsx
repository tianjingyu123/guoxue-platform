"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, Share2, Star, MessageCircle, Phone, Clock, 
  CheckCircle, Image as ImageIcon, Send, X, Sparkles,
  Calendar, ThumbsUp, ChevronRight
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { cn } from "@/lib/utils"

// 达人数据
const expertData = {
  id: 1,
  name: "周易大师",
  avatar: "",
  title: "资深命理师",
  verified: true,
  certifications: ["平台认证讲师", "八字命理专家"],
  background: "",
  intro: "从事命理研究20余年，师承多位名家，擅长八字精批、流年运势、婚姻感情、事业财运分析。已为超过5000位缘主提供咨询服务，好评如潮。",
  daysJoined: 365,
  answeredCount: 1280,
  goodRate: 98,
  responseTime: "通常1小时内回复",
  tags: ["八字精批", "流年运势", "婚姻感情", "事业财运", "起名改名"],
  // 服务价格
  services: {
    textQuestion: { price: 30, unit: "次", description: "文字/图文提问，24小时内回复" },
    voiceCall: { priceRange: [10, 40], unit: "分钟", description: "实时音频连麦，即问即答" },
    videoCall: { priceRange: [20, 60], unit: "分钟", description: "视频连麦，面对面交流" },
  },
  // 时间档位
  callDurations: [15, 30, 45, 60],
  // 评价
  reviews: [
    { id: 1, user: "匿***", avatar: "", rating: 5, content: "大师分析得很准确，对我今年的运势讲解很详细，还给了很多建议，非常感谢！", time: "3天前", helpful: 28 },
    { id: 2, user: "缘***", avatar: "", rating: 5, content: "连麦咨询体验很好，大师很有耐心，解答了我很多疑惑，物超所值。", time: "1周前", helpful: 45 },
    { id: 3, user: "易***", avatar: "", rating: 5, content: "八字分析专业，指出了我命中的一些问题，还给了化解方法，非常实用。", time: "2周前", helpful: 32 },
    { id: 4, user: "道***", avatar: "", rating: 4, content: "回复很快，分析也很到位，就是希望能更详细一些。", time: "3周前", helpful: 15 },
  ],
  // 历史问答
  historyQA: [
    { id: 1, question: "1995年农历五月初五出生，今年事业运势如何？", previewAnswer: "从你的八字来看，今年事业方面会有不错的机遇...", viewCount: 156, price: 1 },
    { id: 2, question: "最近感情不顺，想问问什么时候能遇到正缘？", previewAnswer: "根据你的命盘，感情宫位显示...", viewCount: 203, price: 1 },
  ],
  isOnline: true,
}

export default function ExpertProfilePage() {
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [questionTitle, setQuestionTitle] = useState("")
  const [questionContent, setQuestionContent] = useState("")
  const [selectedDuration, setSelectedDuration] = useState(30)
  const [callType, setCallType] = useState<"voice" | "video">("voice")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitQuestion = () => {
    if (!questionTitle.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setShowQuestionModal(false)
      setQuestionTitle("")
      setQuestionContent("")
    }, 1500)
  }

  const calculateCallPrice = () => {
    const service = callType === "voice" ? expertData.services.voiceCall : expertData.services.videoCall
    const minPrice = service.priceRange[0] * selectedDuration
    const maxPrice = service.priceRange[1] * selectedDuration
    return { min: minPrice, max: maxPrice, perMinute: service.priceRange }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部背景和返回 */}
      <div className="relative">
        {/* 背景图 */}
        <div className="h-48 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary" />
        
        {/* 顶部导航 */}
        <header className="absolute top-0 left-0 right-0 z-10 safe-area-pt">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton overlay fallbackPath="/circle/1/consult" />
            <button className="p-2 rounded-full bg-black/20 backdrop-blur-sm">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>

        {/* 达人信息卡片 */}
        <div className="absolute -bottom-20 left-4 right-4">
          <Card className="p-4">
            <div className="flex gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 ring-4 ring-background">
                  <AvatarImage src={expertData.avatar} alt={expertData.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {expertData.name[0]}
                  </AvatarFallback>
                </Avatar>
                {expertData.isOnline && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-lg text-foreground">{expertData.name}</h1>
                  {expertData.verified && (
                    <Badge className="bg-accent/20 text-accent border-0 text-[10px] px-1.5">
                      <CheckCircle className="w-3 h-3 mr-0.5" />认证
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{expertData.title}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {expertData.certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="pt-24 px-4 space-y-4">
        {/* 数据统计 */}
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-foreground">{expertData.daysJoined}</p>
              <p className="text-xs text-muted-foreground">入驻天数</p>
            </div>
            <div>
              <p className="text-xl font-bold text-primary">{expertData.answeredCount}</p>
              <p className="text-xs text-muted-foreground">已解答</p>
            </div>
            <div>
              <p className="text-xl font-bold text-accent">{expertData.goodRate}%</p>
              <p className="text-xs text-muted-foreground">好评率</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{expertData.responseTime}</span>
          </div>
        </Card>

        {/* 个人简介 */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm text-foreground mb-2">个人简介</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{expertData.intro}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {expertData.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-secondary text-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>

        {/* 服务类型与价格 */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3">咨询服务</h2>
          <div className="space-y-3">
            {/* 图文提问 */}
            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
              onClick={() => setShowQuestionModal(true)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">图文提问</p>
                  <p className="text-xs text-muted-foreground">{expertData.services.textQuestion.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{expertData.services.textQuestion.price}币</p>
                <p className="text-[10px] text-muted-foreground">/{expertData.services.textQuestion.unit}</p>
              </div>
            </div>

            {/* 音频连麦 */}
            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
              onClick={() => { setCallType("voice"); setShowCallModal(true) }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">音频连麦</p>
                  <p className="text-xs text-muted-foreground">{expertData.services.voiceCall.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-accent">
                  {expertData.services.voiceCall.priceRange[0]}-{expertData.services.voiceCall.priceRange[1]}币
                </p>
                <p className="text-[10px] text-muted-foreground">/{expertData.services.voiceCall.unit}</p>
              </div>
            </div>

            {/* 视频连麦 */}
            <div 
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
              onClick={() => { setCallType("video"); setShowCallModal(true) }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">视频连麦</p>
                  <p className="text-xs text-muted-foreground">{expertData.services.videoCall.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-500">
                  {expertData.services.videoCall.priceRange[0]}-{expertData.services.videoCall.priceRange[1]}币
                </p>
                <p className="text-[10px] text-muted-foreground">/{expertData.services.videoCall.unit}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 历史问答 */}
        {expertData.historyQA.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-foreground">精选问答</h2>
              <Link href={`/expert/${expertData.id}/qa`} className="text-xs text-primary flex items-center gap-0.5">
                查看全部 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {expertData.historyQA.map((qa) => (
                <div key={qa.id} className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-sm text-foreground font-medium line-clamp-2">{qa.question}</p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 blur-[2px]">{qa.previewAnswer}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">{qa.viewCount}人围观</span>
                    <button className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full hover:bg-accent/20 transition-colors">
                      {qa.price}币围观
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 用户评价 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-foreground">用户评价</h2>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-sm font-medium text-foreground">4.9</span>
              <span className="text-xs text-muted-foreground">({expertData.reviews.length}条)</span>
            </div>
          </div>
          <div className="space-y-4">
            {expertData.reviews.map((review) => (
              <div key={review.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={review.avatar} />
                      <AvatarFallback className="bg-secondary text-xs">{review.user[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{review.user}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "w-3 h-3",
                          i < review.rating ? "text-accent fill-accent" : "text-muted-foreground"
                        )} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{review.time}</span>
                  <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <ThumbsUp className="w-3 h-3" />
                    有帮助({review.helpful})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 px-4 h-16">
          <button 
            onClick={() => setShowQuestionModal(true)}
            className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            向TA提问
          </button>
          <button 
            onClick={() => { setCallType("voice"); setShowCallModal(true) }}
            className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            立即连麦
          </button>
        </div>
      </div>

      {/* 提问弹窗 */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-h-[85vh] bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <button onClick={() => setShowQuestionModal(false)} className="text-muted-foreground">
                取消
              </button>
              <h3 className="font-semibold text-foreground">向{expertData.name}提问</h3>
              <div className="w-10" />
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">问题标题 *</label>
                <input
                  type="text"
                  placeholder="简要描述你的问题"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={50}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{questionTitle.length}/50</p>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">详细描述</label>
                <textarea
                  placeholder="补充出生信息、具体问题等，越详细回答越精准..."
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-32"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{questionContent.length}/500</p>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">上传图片（选填）</label>
                <div className="flex gap-2">
                  <button className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">添加图片</span>
                  </button>
                </div>
              </div>
              
              <Card className="p-3 bg-accent/5 border-accent/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">提问费用</span>
                  <span className="font-bold text-accent">{expertData.services.textQuestion.price} 国学币</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">支付后问题将发送给{expertData.name}，通常24小时内回复</p>
              </Card>
            </div>
            
            <div className="px-4 py-4 border-t border-border">
              <button 
                onClick={handleSubmitQuestion}
                disabled={!questionTitle.trim() || isSubmitting}
                className={cn(
                  "w-full py-3 font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                  questionTitle.trim() && !isSubmitting
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    支付中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    确认支付并提问
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 连麦弹窗 */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-h-[80vh] bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <button onClick={() => setShowCallModal(false)} className="text-muted-foreground">
                取消
              </button>
              <h3 className="font-semibold text-foreground">{callType === "voice" ? "音频" : "视频"}连麦</h3>
              <div className="w-10" />
            </div>
            
            <div className="p-4 space-y-4">
              {/* 连麦类型切换 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCallType("voice")}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-medium transition-colors",
                    callType === "voice"
                      ? "bg-accent text-white"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  音频连麦
                </button>
                <button
                  onClick={() => setCallType("video")}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-medium transition-colors",
                    callType === "video"
                      ? "bg-green-500 text-white"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  视频连麦
                </button>
              </div>
              
              {/* 时长选择 */}
              <div>
                <label className="text-sm text-muted-foreground mb-3 block">选择通话时长</label>
                <div className="grid grid-cols-4 gap-2">
                  {expertData.callDurations.map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setSelectedDuration(duration)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-medium transition-colors",
                        selectedDuration === duration
                          ? callType === "voice" ? "bg-accent text-white" : "bg-green-500 text-white"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {duration}分钟
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 价格说明 */}
              <Card className="p-4 bg-secondary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">单价</span>
                  <span className="text-sm text-foreground">
                    {calculateCallPrice().perMinute[0]}-{calculateCallPrice().perMinute[1]} 币/分钟
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">时长</span>
                  <span className="text-sm text-foreground">{selectedDuration} 分钟</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-medium text-foreground">预计费用</span>
                  <span className={cn(
                    "font-bold text-lg",
                    callType === "voice" ? "text-accent" : "text-green-500"
                  )}>
                    {calculateCallPrice().min}-{calculateCallPrice().max} 币
                  </span>
                </div>
              </Card>
              
              <p className="text-[10px] text-muted-foreground text-center">
                实际费用按通话时长计算，超时部分按分钟收费
              </p>
            </div>
            
            <div className="px-4 py-4 border-t border-border">
              <button 
                className={cn(
                  "w-full py-3 font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                  callType === "voice"
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "bg-green-500 text-white hover:bg-green-500/90"
                )}
              >
                <Phone className="w-4 h-4" />
                {expertData.isOnline ? "立即发起连麦" : "预约连麦时间"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
