"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Cast, Check, Circle, Download, Heart, Share2, List,
  MessageCircle, FileText, ChevronDown, ChevronUp, Send, MoreHorizontal,
  Headphones, BookOpen, Settings, ChevronRight, Users, Sparkles, Trophy, X
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 课程数据
const courseData = {
  id: 1,
  title: "八字命理入门到精通",
  type: "video", // video | audio | text
  instructor: { name: "周易大师", avatar: "" },
  totalChapters: 12,
  completedChapters: 3,
  currentChapter: 4,
  autoPlay: true,
  chapters: [
    { id: 1, title: "第一讲：什么是八字命理", duration: "15:30", status: "completed", isFree: true },
    { id: 2, title: "第二讲：天干地支基础", duration: "22:15", status: "completed", isFree: true },
    { id: 3, title: "第三讲：五行生克关系", duration: "18:45", status: "completed", isFree: false },
    { id: 4, title: "第四讲：十神详解（上）", duration: "25:00", status: "playing", isFree: false },
    { id: 5, title: "第五讲：十神详解（下）", duration: "23:30", status: "locked", isFree: false },
    { id: 6, title: "第六讲：格局判断方法", duration: "28:15", status: "locked", isFree: false },
    { id: 7, title: "第七讲：大运流年分析", duration: "30:00", status: "locked", isFree: false },
    { id: 8, title: "第八讲：婚姻感情看法", duration: "26:45", status: "locked", isFree: false },
    { id: 9, title: "第九讲：事业财运分析", duration: "24:30", status: "locked", isFree: false },
    { id: 10, title: "第十讲：健康疾病判断", duration: "20:15", status: "locked", isFree: false },
    { id: 11, title: "第十一讲：综合案例分析", duration: "35:00", status: "locked", isFree: false },
    { id: 12, title: "第十二讲：实战练习与答疑", duration: "40:00", status: "locked", isFree: false },
  ],
  notes: [
    { id: 1, chapterId: 2, time: "05:30", content: "天干：甲乙丙丁戊己庚辛壬癸", createdAt: "2024-01-15" },
    { id: 2, chapterId: 3, time: "12:15", content: "五行相生：木生火、火生土、土生金、金生水、水生木", createdAt: "2024-01-16" },
    { id: 3, chapterId: 4, time: "08:20", content: "十神分为：正官、七杀、正印、偏印、比肩、劫财、食神、伤官、正财、偏财", createdAt: "2024-01-18" },
  ],
  questions: [
    { id: 1, chapterId: 4, user: { name: "学员小李", avatar: "" }, question: "老师，十神的记忆有什么技巧吗？", answer: "可以结合五行关系来记忆，生我者为印，我生者为食伤...", time: "2天前", likes: 12 },
    { id: 2, chapterId: 4, user: { name: "易学爱好者", avatar: "" }, question: "正官和七杀的区别是什么？", answer: "正官为阴阳异性相克，七杀为阴阳同性相克，性质上正官温和，七杀激烈...", time: "3天前", likes: 8 },
  ],
  textContent: `
    <h2>第四讲：十神详解（上）</h2>
    <p>十神是八字命理中最核心的概念之一，它描述了日干与其他七个字之间的关系。理解十神，是读懂命盘的关键。</p>
    <h3>一、什么是十神</h3>
    <p>十神是根据五行生克关系，以日干为中心，推演出的十种关系类型。分别是：</p>
    <ul>
      <li><strong>正官</strong>：克我且与我阴阳不同者</li>
      <li><strong>七杀</strong>：克我且与我阴阳相同者</li>
      <li><strong>正印</strong>：生我且与我阴阳不同者</li>
      <li><strong>偏印</strong>：生我且与我阴阳相同者</li>
      <li><strong>比肩</strong>：与我相同且阴阳相同者</li>
      <li><strong>劫财</strong>：与我相同且阴阳不同者</li>
      <li><strong>食神</strong>：我生且与我阴阳相同者</li>
      <li><strong>伤官</strong>：我生且与我阴阳不同者</li>
      <li><strong>正财</strong>：我克且与我阴阳不同者</li>
      <li><strong>偏财</strong>：我克且与我阴阳相同者</li>
    </ul>
    <h3>二、十神的基本含义</h3>
    <p>每个十神都有其特定的象征意义，在分析命盘时需要综合考虑：</p>
    <p><strong>正官</strong>代表：事业、地位、约束、规范、丈夫（女命）</p>
    <p><strong>七杀</strong>代表：权力、魄力、压力、小人、情人（女命）</p>
  `
}

// 推荐课程数据
const recommendedCourses = [
  { id: 2, title: "紫微斗数精讲", instructor: "张玄风", price: 299, students: 856, image: "" },
  { id: 3, title: "八字进阶实战", instructor: "周易大师", price: 399, students: 1024, image: "" },
  { id: 4, title: "风水堪舆入门", instructor: "陈风水", price: 199, students: 628, image: "" },
]

// 推荐圈子数据
const recommendedCircles = [
  { id: 1, name: "八字命理研习社", members: 1280, description: "一起探讨命理学问" },
  { id: 2, name: "周易大师圈", members: 3560, description: "讲师专属交流圈" },
]

// 太极加载动画
function TaijiLoader() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-12 h-12 animate-spin">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
          <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" className="fill-primary" />
          <circle cx="50" cy="26" r="6" className="fill-background" />
          <circle cx="50" cy="74" r="6" className="fill-primary" />
        </svg>
      </div>
    </div>
  )
}

export default function LearnPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState<"chapters" | "notes" | "questions">("chapters")
  const [currentChapter, setCurrentChapter] = useState(courseData.chapters[3])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(35) // 播放进度百分比
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [showChapterList, setShowChapterList] = useState(true)
  const [newNote, setNewNote] = useState("")
  const [newQuestion, setNewQuestion] = useState("")
  const [autoPlay, setAutoPlay] = useState(courseData.autoPlay)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
  
  // 检查是否完成全部课程
  const isAllCompleted = courseData.chapters.every(c => c.status === "completed")
  
  // 切换章节
  const switchChapter = (chapter: typeof courseData.chapters[0]) => {
    if (chapter.status === "locked" && !chapter.isFree) return
    setIsLoading(true)
    setTimeout(() => {
      setCurrentChapter(chapter)
      setProgress(0)
      setIsPlaying(true)
      setIsLoading(false)
    }, 800)
  }
  
  // 上一节/下一节
  const goToChapter = (direction: "prev" | "next") => {
    const currentIndex = courseData.chapters.findIndex(c => c.id === currentChapter.id)
    const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex >= 0 && targetIndex < courseData.chapters.length) {
      const targetChapter = courseData.chapters[targetIndex]
      if (targetChapter.status !== "locked" || targetChapter.isFree) {
        switchChapter(targetChapter)
      }
    }
  }
  
  // 获取章节状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4 text-green-500" />
      case "playing":
        return <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
      default:
        return <Circle className="w-3 h-3 text-muted-foreground" />
    }
  }
  
  // 图文课程渲染
  if (courseData.type === "text") {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton />
            <h1 className="font-medium text-sm text-foreground line-clamp-1 flex-1 mx-4 text-center">
              {courseData.title}
            </h1>
            <button className="p-2 rounded-full hover:bg-secondary">
              <List className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </header>
        
        {/* 图文内容 */}
        <main className="pt-14 pb-20 px-4">
          <article 
            className="prose prose-sm max-w-none py-6 text-foreground
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-4
              prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: courseData.textContent }}
          />
        </main>
        
        {/* 底部操作栏 */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => goToChapter("prev")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <SkipBack className="w-4 h-4" /> 上一节
              </button>
              <button 
                onClick={() => goToChapter("next")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                下一节 <SkipForward className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsFavorited(!isFavorited)}
                className={cn("p-2 rounded-full", isFavorited ? "text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <Heart className={cn("w-5 h-5", isFavorited && "fill-primary")} />
              </button>
              <button className="p-2 rounded-full text-muted-foreground hover:text-foreground">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 视频/音频课程渲染
  return (
    <div className="min-h-screen bg-background">
      {/* 播放器区域 */}
      <div className={cn(
        "relative bg-black",
        courseData.type === "video" ? "aspect-video" : "h-64"
      )}>
        {/* 返回按钮 */}
        <Link 
          href={`/course/${params.id}`}
  className="absolute top-4 left-4 z-20"
  >
  <BackButton overlay />
  </Link>
        
        {/* 加载状态 */}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <TaijiLoader />
          </div>
        ) : courseData.type === "video" ? (
          /* 视频播放器 */
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 to-black/60">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>
          </div>
        ) : (
          /* 音频播放器 */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-secondary to-background p-6">
            <div className="w-32 h-32 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 shadow-lg">
              <Headphones className="w-16 h-16 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">正在播放</p>
            <h3 className="font-medium text-foreground text-center line-clamp-2">{currentChapter.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">支持后台播放</p>
          </div>
        )}
        
        {/* 播放控制条 */}
        {!isLoading && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {/* 进度条 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-white/80 w-10">
                {Math.floor(progress * 0.25)}:{String(Math.floor((progress * 15) % 60)).padStart(2, "0")}
              </span>
              <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-white/80 w-10 text-right">{currentChapter.duration}</span>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full hover:bg-white/10"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                
                {/* 倍速选择 */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 rounded text-xs text-white bg-white/20 hover:bg-white/30"
                  >
                    {playbackSpeed}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-card rounded-lg shadow-lg overflow-hidden">
                      {speeds.map(speed => (
                        <button
                          key={speed}
                          onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false) }}
                          className={cn(
                            "block w-full px-4 py-2 text-sm text-left hover:bg-secondary",
                            playbackSpeed === speed ? "text-primary" : "text-foreground"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {courseData.type === "video" && (
                  <>
                    <button className="p-2 rounded-full hover:bg-white/10">
                      <Cast className="w-5 h-5 text-white" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-white/10">
                      <Maximize className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 当前章节信息 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-foreground line-clamp-1">{currentChapter.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              学习进度 {Math.round((courseData.completedChapters / courseData.totalChapters) * 100)}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input 
                type="checkbox" 
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              自动连播
            </label>
          </div>
        </div>
      </div>
      
      {/* Tab切换 */}
      <div className="flex border-b border-border">
        {[
          { id: "chapters", label: "目录", icon: List },
          { id: "notes", label: "笔记", icon: FileText },
          { id: "questions", label: "问答", icon: MessageCircle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id 
                ? "text-primary border-primary" 
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === "notes" && courseData.notes.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {courseData.notes.length}
              </Badge>
            )}
          </button>
        ))}
      </div>
      
      {/* Tab内容 */}
      <div className="pb-20">
        {/* 目录Tab */}
        {activeTab === "chapters" && (
          <div className="divide-y divide-border">
            {courseData.chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  chapter.id === currentChapter.id ? "bg-primary/5" : "hover:bg-secondary/50",
                  chapter.status === "locked" && !chapter.isFree && "opacity-50 cursor-not-allowed"
                )}
              >
                <button
                  onClick={() => switchChapter(chapter)}
                  disabled={chapter.status === "locked" && !chapter.isFree}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-6 flex items-center justify-center">
                    {getStatusIcon(chapter.status)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        chapter.id === currentChapter.id ? "text-primary font-medium" : "text-foreground"
                      )}>
                        {chapter.title}
                      </span>
                      {chapter.isFree && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-0">
                          试看
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{chapter.duration}</span>
                  </div>
                </button>
                <button 
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
                  onClick={(e) => { e.stopPropagation() }}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* 笔记Tab */}
        {activeTab === "notes" && (
          <div>
            {/* 添加笔记 */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="记录学习心得..."
                  className="flex-1 px-3 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  disabled={!newNote.trim()}
                >
                  保存
                </button>
              </div>
            </div>
            
            {/* 笔记列表 */}
            {courseData.notes.length > 0 ? (
              <div className="divide-y divide-border">
                {courseData.notes.map(note => {
                  const chapter = courseData.chapters.find(c => c.id === note.chapterId)
                  return (
                    <div key={note.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {chapter?.title.slice(0, 10)}...
                        </Badge>
                        <span className="text-xs text-primary">{note.time}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{note.createdAt}</span>
                      </div>
                      <p className="text-sm text-foreground">{note.content}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">暂无笔记</p>
                <p className="text-muted-foreground/70 text-xs mt-1">学习时记录重点，方便复习</p>
              </div>
            )}
          </div>
        )}
        
        {/* 问答Tab */}
        {activeTab === "questions" && (
          <div>
            {/* 发起提问 */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="向老师提问..."
                  className="flex-1 px-3 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  disabled={!newQuestion.trim()}
                >
                  提问
                </button>
              </div>
            </div>
            
            {/* 问答列表 */}
            {courseData.questions.length > 0 ? (
              <div className="divide-y divide-border">
                {courseData.questions.map(qa => (
                  <div key={qa.id} className="p-4">
                    {/* 问题 */}
                    <div className="flex gap-3 mb-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={qa.user.avatar} alt={qa.user.name} />
                        <AvatarFallback className="bg-secondary text-xs">{qa.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{qa.user.name}</span>
                          <span className="text-xs text-muted-foreground">{qa.time}</span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{qa.question}</p>
                      </div>
                    </div>
                    
                    {/* 回答 */}
                    {qa.answer && (
                      <div className="ml-11 p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                            老师回复
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{qa.answer}</p>
                      </div>
                    )}
                    
                    {/* 互动 */}
                    <div className="flex items-center gap-4 mt-2 ml-11">
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Heart className="w-3.5 h-3.5" /> {qa.likes}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">暂无问答</p>
                <p className="text-muted-foreground/70 text-xs mt-1">有问题随时向老师提问</p>
              </div>
            )}
          </div>
        )}
        
        {/* 猜你喜欢推荐位 */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm text-foreground">猜你喜欢</span>
            </div>
            <Link href="/courses" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              更多课程 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommendedCourses.map(course => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="flex-shrink-0 w-36"
              >
                <Card className="overflow-hidden hover:bg-secondary/50 transition-colors">
                  <div className="aspect-[4/3] bg-secondary flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-accent/60" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-foreground line-clamp-2">{course.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{course.instructor}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-primary font-medium">¥{course.price}</span>
                      <span className="text-[10px] text-muted-foreground">{course.students}人学习</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      {/* 学习完成弹窗 */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[90%] max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* 头部庆祝 */}
            <div className="relative bg-gradient-to-br from-accent via-accent/80 to-primary p-6 text-center">
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="absolute top-3 right-3 p-1 rounded-full bg-black/20 hover:bg-black/30"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">恭喜完成学习!</h3>
              <p className="text-sm text-white/80 mt-1">你已完成《{courseData.title}》全部课程</p>
            </div>
            
            {/* 推荐内容 */}
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">继续提升，推荐你学习</p>
              
              {/* 进阶课程 */}
              <Link href="/course/3" className="block mb-3">
                <Card className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">八字进阶实战课</p>
                    <p className="text-xs text-muted-foreground">周易大师 · 进阶课程</p>
                    <p className="text-xs text-primary mt-0.5">¥399</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Card>
              </Link>
              
              {/* 推荐圈子 */}
              <p className="text-xs text-muted-foreground mb-2">加入圈子，与同好交流</p>
              {recommendedCircles.map(circle => (
                <Link key={circle.id} href={`/circles/${circle.id}`} className="block mb-2">
                  <Card className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{circle.name}</p>
                      <p className="text-xs text-muted-foreground">{circle.members}成员</p>
                    </div>
                    <button className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      加入
                    </button>
                  </Card>
                </Link>
              ))}
            </div>
            
            {/* 底部按钮 */}
            <div className="px-4 pb-4">
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="w-full py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                返回课程
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => goToChapter("prev")}
              disabled={currentChapter.id === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <SkipBack className="w-4 h-4" /> 上一节
            </button>
            <button 
              onClick={() => goToChapter("next")}
              disabled={currentChapter.id === courseData.chapters.length}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              下一节 <SkipForward className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFavorited(!isFavorited)}
              className={cn("p-2 rounded-full", isFavorited ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Heart className={cn("w-5 h-5", isFavorited && "fill-primary")} />
            </button>
            <button className="p-2 rounded-full text-muted-foreground hover:text-foreground">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
