"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { 
  X, Users, Heart, MessageSquare, Share2, Mic, MicOff, Hand,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Volume2, VolumeX,
  Send, HelpCircle, CheckCircle2, Clock, FileText, Download, BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"

// 直播间数据
const mockRoom = {
  id: "1",
  title: "《周易》六十四卦精讲 - 第12讲：泰卦与否卦",
  hostName: "张明远",
  hostAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  hostTitle: "易学研究员",
  followers: 12800,
  viewers: 1856,
  likes: 4520,
  duration: "45:32",
  category: "易经"
}

// 课件数据
const mockSlides = [
  { id: "1", pageNum: 1, title: "第一章：泰卦概述", thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=150&fit=crop" },
  { id: "2", pageNum: 2, title: "泰卦卦象解读", thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=150&fit=crop" },
  { id: "3", pageNum: 3, title: "泰卦六爻详解", thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=150&fit=crop" },
  { id: "4", pageNum: 4, title: "否卦概述", thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=150&fit=crop" },
  { id: "5", pageNum: 5, title: "泰否对比分析", thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=150&fit=crop" },
]

// 问答数据
const initialQuestions = [
  { 
    id: "1", 
    userName: "学员A", 
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop",
    content: "泰卦和否卦的核心区别是什么？", 
    isPublic: true, 
    status: "answered" as const, 
    answer: "泰卦象征天地交泰、上下沟通，否卦象征天地不交、闭塞不通。一通一塞，正是相反相成。",
    time: "12:35"
  },
  { 
    id: "2", 
    userName: "学员B", 
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop",
    content: "否极泰来这个成语和这两卦有关系吗？", 
    isPublic: true, 
    status: "pending" as const,
    time: "12:38"
  },
  { 
    id: "3", 
    userName: "学员C", 
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop",
    content: "请问老师，泰卦在占卜中一般代表什么含义？", 
    isPublic: true, 
    status: "pending" as const,
    time: "12:42"
  },
]

// 聊天消息
const initialMessages = [
  { id: "1", userName: "易学爱好者", content: "老师讲得太清楚了", time: "12:30" },
  { id: "2", userName: "国学小白", content: "终于理解了泰卦的含义", time: "12:32" },
  { id: "3", userName: "命理研究", content: "这个课程质量真高", time: "12:34" },
]

// 资料数据
const mockFiles = [
  { id: "1", name: "泰卦与否卦详解讲义.pdf", size: "2.3MB", type: "pdf" },
  { id: "2", name: "六十四卦速查表.pdf", size: "1.5MB", type: "pdf" },
  { id: "3", name: "本课思维导图.png", size: "890KB", type: "image" },
]

function HorizontalLiveContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('id') || "1"
  
  const [currentSlide, setCurrentSlide] = useState(3)
  const [followSlide, setFollowSlide] = useState(true)
  const [showVideo, setShowVideo] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  const [activeTab, setActiveTab] = useState<"chat" | "qa" | "files" | "intro">("chat")
  const [questionTab, setQuestionTab] = useState<"pending" | "answered">("pending")
  const [questions, setQuestions] = useState(initialQuestions)
  const [messages, setMessages] = useState(initialMessages)
  
  const [newMessage, setNewMessage] = useState("")
  const [newQuestion, setNewQuestion] = useState("")
  const [isPublicQuestion, setIsPublicQuestion] = useState(true)
  
  const [micStatus, setMicStatus] = useState<"none" | "applying" | "waiting" | "connected">("none")
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(mockRoom.likes)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 模拟课件自动翻页
  useEffect(() => {
    if (!followSlide) return
    const interval = setInterval(() => {
      // 模拟讲师翻页
    }, 60000)
    return () => clearInterval(interval)
  }, [followSlide])

  // 模拟新消息
  useEffect(() => {
    const comments = ["学到了", "受益匪浅", "老师讲得好", "涨知识了", "感谢分享"]
    const users = ["玄学新人", "易道弟子", "国学迷", "命理初学", "风水爱好"]
    const interval = setInterval(() => {
      const newMsg = {
        id: Date.now().toString(),
        userName: users[Math.floor(Math.random() * users.length)],
        content: comments[Math.floor(Math.random() * comments.length)],
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev.slice(-20), newMsg])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    const msg = {
      id: Date.now().toString(),
      userName: "我",
      content: newMessage,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, msg])
    setNewMessage("")
  }

  const handleAskQuestion = () => {
    if (!newQuestion.trim()) return
    const q = {
      id: Date.now().toString(),
      userName: "我",
      userAvatar: "",
      content: newQuestion,
      isPublic: isPublicQuestion,
      status: "pending" as const,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    setQuestions(prev => [...prev, q])
    setNewQuestion("")
  }

  const handleApplyMic = () => {
    if (micStatus === "none") {
      setMicStatus("applying")
      setTimeout(() => setMicStatus("waiting"), 1000)
    } else if (micStatus === "waiting") {
      setMicStatus("none")
    } else if (micStatus === "connected") {
      setMicStatus("none")
    }
  }

  const handleLike = () => {
    if (!liked) {
      setLiked(true)
      setLikeCount(prev => prev + 1)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const filteredQuestions = questions.filter(q => q.status === questionTab)

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0f0f0f] flex flex-col lg:flex-row">
      {/* 横屏提示 - 仅手机竖屏时显示 */}
      <div className="lg:hidden fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-center text-white px-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">请将手机横屏观看</p>
          <p className="text-sm text-white/60">或使用平板/电脑获得更好的学习体验</p>
          <button 
            onClick={() => router.back()}
            className="mt-6 px-6 py-2 bg-white/10 rounded-full text-sm"
          >
            返回直播列表
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="hidden lg:flex flex-1 flex-col relative">
        {/* 顶部信息栏 */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#C41E3A]">
              <Image src={mockRoom.hostAvatar} alt={mockRoom.hostName} width={40} height={40} className="object-cover" />
            </div>
            <div>
              <h1 className="text-white text-sm font-medium line-clamp-1 max-w-md">{mockRoom.title}</h1>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <span>{mockRoom.hostName}</span>
                <span>·</span>
                <span>{mockRoom.hostTitle}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <Users className="w-4 h-4" />
              <span>{mockRoom.viewers.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#C41E3A] text-sm">
              <span className="w-2 h-2 bg-[#C41E3A] rounded-full animate-pulse" />
              <span>直播中</span>
              <span className="text-white/60 ml-1">{mockRoom.duration}</span>
            </div>
          </div>
        </div>

        {/* 视频/课件区域 */}
        <div className="flex-1 relative bg-black">
          {/* 课件展示 */}
          <div className={cn("absolute inset-0 flex items-center justify-center", showVideo ? "z-0" : "z-10")}>
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-20">☯</div>
                <p className="text-white/40 text-lg">{mockSlides[currentSlide - 1]?.title}</p>
                <p className="text-white/20 text-sm mt-2">第 {currentSlide} / {mockSlides.length} 页</p>
              </div>
            </div>
            {/* 翻页按钮 */}
            {!followSlide && (
              <>
                <button 
                  onClick={() => setCurrentSlide(prev => Math.max(1, prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setCurrentSlide(prev => Math.min(mockSlides.length, prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* 讲师视频画面 */}
          <div className={cn(
            "absolute transition-all duration-300",
            showVideo 
              ? "inset-0 z-10" 
              : "bottom-4 right-4 w-52 h-40 z-20 rounded-xl overflow-hidden shadow-2xl border border-white/10"
          )}>
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  <Image src={mockRoom.hostAvatar} alt="" width={72} height={72} className="rounded-full" />
                </div>
                <span className="text-white/40 text-sm">讲师画面</span>
              </div>
            </div>
          </div>

          {/* 切换按钮 */}
          <button 
            onClick={() => setShowVideo(!showVideo)}
            className="absolute bottom-4 left-4 z-30 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {showVideo ? '显示课件' : '显示视频'}
          </button>

          {/* 全屏按钮 */}
          <button 
            onClick={toggleFullscreen}
            className="absolute top-16 right-4 z-30 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* 音量按钮 */}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="absolute top-16 right-16 z-30 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* 连麦状态 */}
          {micStatus === "connected" && (
            <div className="absolute top-16 left-4 z-30 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
              <Mic className="w-4 h-4" />
              连麦中
              <button onClick={() => setMicStatus("none")} className="ml-2 hover:bg-white/20 rounded-full p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* 课件缩略图列表 */}
        <div className="h-20 bg-[#1a1a1a] border-t border-white/10 flex items-center px-4 gap-3 overflow-x-auto">
          {mockSlides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => { setFollowSlide(false); setCurrentSlide(idx + 1) }}
              className={cn(
                "flex-shrink-0 w-28 h-14 rounded-lg border-2 overflow-hidden transition-all relative group",
                currentSlide === idx + 1 ? "border-[#C41E3A]" : "border-transparent hover:border-white/30"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/60 text-xs">{idx + 1}</span>
              </div>
              {currentSlide === idx + 1 && (
                <div className="absolute bottom-0 inset-x-0 bg-[#C41E3A] text-white text-[10px] text-center py-0.5">
                  当前
                </div>
              )}
            </button>
          ))}
          <div className="flex-shrink-0 w-px h-10 bg-white/10" />
          <button 
            onClick={() => setFollowSlide(true)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              followSlide ? "bg-[#C41E3A] text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            )}
          >
            跟随讲师
          </button>
        </div>
      </div>

      {/* 右侧互动面板 */}
      <div className="hidden lg:flex w-80 flex-col bg-[#1a1a1a] border-l border-white/10">
        {/* Tab切换 */}
        <div className="flex border-b border-white/10">
          {[
            { key: "chat", label: "聊天" },
            { key: "qa", label: "问答" },
            { key: "files", label: "资料" },
            { key: "intro", label: "简介" },
          ].map(tab => (
            <button 
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab.key ? "text-white" : "text-white/50 hover:text-white/70"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 聊天区 */}
        {activeTab === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C41E3A]/50 to-[#C9A96E]/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">{msg.userName[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-xs">{msg.userName}</span>
                      <span className="text-white/30 text-[10px]">{msg.time}</span>
                    </div>
                    <p className="text-white/90 text-sm mt-0.5">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 底部操作区 */}
            <div className="p-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <button 
                  onClick={handleLike}
                  className={cn("flex items-center gap-1.5 text-sm", liked ? "text-[#C41E3A]" : "text-white/60")}
                >
                  <Heart className={cn("w-5 h-5", liked && "fill-current")} />
                  {likeCount.toLocaleString()}
                </button>
                <button 
                  onClick={handleApplyMic}
                  className={cn(
                    "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors",
                    micStatus === "none" ? "bg-white/10 text-white hover:bg-white/20" :
                    micStatus === "applying" ? "bg-amber-500/20 text-amber-400" :
                    micStatus === "waiting" ? "bg-blue-500/20 text-blue-400" :
                    "bg-green-500/20 text-green-400"
                  )}
                >
                  {micStatus === "none" && <><Hand className="w-4 h-4" />举手</>}
                  {micStatus === "applying" && <>申请中...</>}
                  {micStatus === "waiting" && <><Clock className="w-4 h-4" />排队中</>}
                  {micStatus === "connected" && <><MicOff className="w-4 h-4" />结束</>}
                </button>
                <button className="text-white/60 hover:text-white">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                  placeholder="发送消息..."
                  className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2.5 outline-none placeholder:text-white/40"
                />
                <button 
                  onClick={handleSendMessage}
                  className="w-10 h-10 bg-[#C41E3A] rounded-full flex items-center justify-center text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* 问答区 */}
        {activeTab === "qa" && (
          <>
            <div className="flex border-b border-white/10">
              <button 
                onClick={() => setQuestionTab("pending")}
                className={cn(
                  "flex-1 py-2.5 text-xs transition-colors",
                  questionTab === "pending" ? "text-white bg-white/5" : "text-white/50"
                )}
              >
                待解答 ({questions.filter(q => q.status === "pending").length})
              </button>
              <button 
                onClick={() => setQuestionTab("answered")}
                className={cn(
                  "flex-1 py-2.5 text-xs transition-colors",
                  questionTab === "answered" ? "text-white bg-white/5" : "text-white/50"
                )}
              >
                已解答 ({questions.filter(q => q.status === "answered").length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-white/40 text-sm">暂无{questionTab === "pending" ? "待解答" : "已解答"}问题</p>
                </div>
              ) : (
                filteredQuestions.map(q => (
                  <div key={q.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C41E3A]/50 to-[#C9A96E]/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {q.userAvatar ? (
                          <Image src={q.userAvatar} alt="" width={28} height={28} className="object-cover" />
                        ) : (
                          <span className="text-white text-xs">{q.userName[0]}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/50 text-xs">{q.userName}</span>
                          <span className="text-white/30 text-[10px]">{q.time}</span>
                          {!q.isPublic && (
                            <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded">私密</span>
                          )}
                        </div>
                        <p className="text-white text-sm mt-1">{q.content}</p>
                        {q.status === "answered" && q.answer && (
                          <div className="mt-2 pl-3 border-l-2 border-green-500">
                            <p className="text-green-400 text-xs flex items-center gap-1 mb-1">
                              <CheckCircle2 className="w-3 h-3" />
                              讲师回复
                            </p>
                            <p className="text-white/80 text-sm">{q.answer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 提问输入 */}
            <div className="p-3 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <button 
                  onClick={() => setIsPublicQuestion(true)}
                  className={cn("px-2.5 py-1 rounded-full transition-colors", isPublicQuestion ? "bg-white/10 text-white" : "text-white/50")}
                >
                  公开提问
                </button>
                <button 
                  onClick={() => setIsPublicQuestion(false)}
                  className={cn("px-2.5 py-1 rounded-full transition-colors", !isPublicQuestion ? "bg-white/10 text-white" : "text-white/50")}
                >
                  私密提问
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAskQuestion()}
                  placeholder="输入您的问题..."
                  className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2.5 outline-none placeholder:text-white/40"
                />
                <button 
                  onClick={handleAskQuestion}
                  disabled={!newQuestion.trim()}
                  className="bg-[#C41E3A] disabled:bg-white/10 disabled:text-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  提问
                </button>
              </div>
            </div>
          </>
        )}

        {/* 资料区 */}
        {activeTab === "files" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {mockFiles.map(file => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#C41E3A]/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#C41E3A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{file.name}</p>
                  <p className="text-white/40 text-xs">{file.size}</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 简介区 */}
        {activeTab === "intro" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto border-2 border-[#C41E3A]">
                <Image src={mockRoom.hostAvatar} alt="" width={80} height={80} className="object-cover" />
              </div>
              <h3 className="text-white font-medium mt-3">{mockRoom.hostName}</h3>
              <p className="text-white/50 text-sm">{mockRoom.hostTitle}</p>
              <p className="text-white/40 text-xs mt-1">{mockRoom.followers.toLocaleString()} 粉丝</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-white/70 text-xs mb-2">课程介绍</h4>
                <p className="text-white/90 text-sm leading-relaxed">{mockRoom.title}</p>
              </div>
              <div>
                <h4 className="text-white/70 text-xs mb-2">讲师简介</h4>
                <p className="text-white/70 text-sm leading-relaxed">
                  {mockRoom.hostName}，资深易学研究员，从事周易研究二十余年，著有《周易入门》《八字命理精解》等多部著作。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function HorizontalLivePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HorizontalLiveContent />
    </Suspense>
  )
}
