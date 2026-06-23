"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, List, FileText, MessageCircle, X,
  ChevronRight, Clock, Check, Lock, Send, Settings, PictureInPicture2, Headphones
} from "lucide-react"
import { cn } from "@/lib/utils"
import { courseApi } from "@/lib/api"
import type { ChapterContent, Chapter, CourseNote } from "@/lib/api"

// 骨架屏
function PlayerSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <div className="aspect-video bg-zinc-900 animate-pulse" />
      <div className="p-4 space-y-4">
        <div className="h-6 bg-zinc-800 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )
}

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 主播放器组件
function PlayerContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = params.id as string
  const lessonId = searchParams.get('lesson') || ''
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const saveProgressTimer = useRef<NodeJS.Timeout | null>(null)
  
  const [content, setContent] = useState<ChapterContent | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showChapterDrawer, setShowChapterDrawer] = useState(false)
  const [showNotePanel, setShowNotePanel] = useState(false)
  const [showQuestionPanel, setShowQuestionPanel] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [questionContent, setQuestionContent] = useState("")
  const [notes, setNotes] = useState<CourseNote[]>([])
  const [showResumeToast, setShowResumeToast] = useState(false)
  const [resumePosition, setResumePosition] = useState(0)
  const [isAudioMode, setIsAudioMode] = useState(false)
  const [isPipMode, setIsPipMode] = useState(false)
  
  const controlsTimer = useRef<NodeJS.Timeout | null>(null)

  // 加载内容
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true)
      try {
        const [contentData, chaptersData] = await Promise.all([
          courseApi.chapterContent(lessonId),
          courseApi.chapters(courseId)
        ])
        setContent(contentData)
        setChapters(chaptersData)
      } catch (error) {
        // 使用模拟数据
        setContent({
          id: lessonId || "1",
          title: "第一课：八字基础概念",
          courseId,
          courseTitle: "八字命理入门精讲",
          videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
          duration: 1800,
          currentProgress: 300,
          nextLesson: { id: "2", title: "第二课：天干地支", chapterId: "ch1" },
          prevLesson: undefined
        })
        setChapters([
          {
            id: "ch1",
            title: "第一章：基础入门",
            duration: 3600,
            isFree: true,
            lessons: [
              { id: "1", title: "八字基础概念", duration: 1800, isFree: true, isCompleted: true },
              { id: "2", title: "天干地支详解", duration: 1500, isFree: true, isCompleted: false },
              { id: "3", title: "五行生克关系", duration: 1200, isFree: false, isCompleted: false },
            ]
          },
          {
            id: "ch2",
            title: "第二章：进阶应用",
            duration: 5400,
            isFree: false,
            lessons: [
              { id: "4", title: "八字排盘方法", duration: 1800, isFree: false, isCompleted: false },
              { id: "5", title: "十神详解", duration: 2000, isFree: false, isCompleted: false },
            ]
          }
        ])
      } finally {
        setIsLoading(false)
      }
    }
    loadContent()
  }, [courseId, lessonId])

  // 检查并恢复播放进度
  useEffect(() => {
    if (!content || !videoRef.current || isLoading) return
    
    const savedProgress = localStorage.getItem(`course_progress_${courseId}_${lessonId}`)
    if (savedProgress) {
      const progress = JSON.parse(savedProgress)
      if (progress.currentTime > 10 && progress.currentTime < progress.duration - 30) {
        setResumePosition(progress.currentTime)
        setShowResumeToast(true)
        setTimeout(() => setShowResumeToast(false), 5000)
      }
    }
  }, [content, courseId, lessonId, isLoading])

  // 恢复到上次播放位置
  const handleResume = () => {
    if (videoRef.current && resumePosition > 0) {
      videoRef.current.currentTime = resumePosition
      setShowResumeToast(false)
    }
  }

  // 画中画模式
  const togglePiP = async () => {
    if (!videoRef.current) return
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPipMode(false)
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture()
        setIsPipMode(true)
      }
    } catch (error) {
      console.log('PiP not supported')
    }
  }

  // 纯音频模式
  const toggleAudioMode = () => {
    setIsAudioMode(!isAudioMode)
  }

  // 自动隐藏控制栏
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    if (isPlaying) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [isPlaying])

  // 保存进度
  const saveProgress = useCallback(async () => {
    if (!content || !videoRef.current) return
    // 保存到localStorage
    localStorage.setItem(`course_progress_${courseId}_${lessonId}`, JSON.stringify({
      currentTime,
      duration,
      timestamp: Date.now()
    }))
    try {
      await courseApi.updateProgress(courseId, content.id, currentTime, duration)
    } catch (error) {
      // 静默失败
    }
  }, [courseId, lessonId, content, currentTime, duration])

  // 定期保存进度
  useEffect(() => {
    if (isPlaying) {
      saveProgressTimer.current = setInterval(saveProgress, 30000)
    }
    return () => {
      if (saveProgressTimer.current) clearInterval(saveProgressTimer.current)
    }
  }, [isPlaying, saveProgress])

  // 播放/暂停
  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
    resetControlsTimer()
  }

  // 进度条点击
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 倍速切换
  const changeSpeed = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
    setShowSpeedMenu(false)
  }

  // 切换课时
  const switchLesson = (newLessonId: string) => {
    saveProgress()
    router.push(`/courses/${courseId}/player?lesson=${newLessonId}`)
    setShowChapterDrawer(false)
  }

  // 提交笔记
  const submitNote = async () => {
    if (!noteContent.trim() || !content) return
    try {
      const note = await courseApi.addNote(courseId, {
        lessonId: content.id,
        content: noteContent,
        timestamp: currentTime
      })
      setNotes(prev => [note, ...prev])
    } catch (error) {
      // 本地添加
      setNotes(prev => [{
        id: Date.now().toString(),
        content: noteContent,
        chapterId: "ch1",
        chapterTitle: content.title,
        lessonId: content.id,
        lessonTitle: content.title,
        timestamp: currentTime,
        createdAt: new Date().toISOString()
      }, ...prev])
    }
    setNoteContent("")
    setShowNotePanel(false)
  }

  // 提交问题
  const submitQuestion = async () => {
    if (!questionContent.trim() || !content) return
    try {
      await courseApi.askQuestion(courseId, questionContent, content.id)
    } catch (error) {
      // 静默失败
    }
    setQuestionContent("")
    setShowQuestionPanel(false)
  }

  if (isLoading) return <PlayerSkeleton />

  return (
    <div className="min-h-screen bg-black text-white" onClick={resetControlsTimer}>
      {/* 视频播放器 */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="w-full h-full"
          src={content?.videoUrl}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration)
            if (content?.currentProgress) {
              e.currentTarget.currentTime = content.currentProgress
            }
          }}
          onEnded={() => {
            setIsPlaying(false)
            saveProgress()
          }}
          playsInline
        />
        
        {/* 播放器控制层 */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {/* 顶部导航 */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center gap-3">
            <button onClick={() => { saveProgress(); router.back() }} className="p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-medium truncate">{content?.title}</h1>
              <p className="text-xs text-white/60 truncate">{content?.courseTitle}</p>
            </div>
          </div>
          
          {/* 中央播放按钮 */}
          <button 
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          
          {/* 底部控制栏 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* 进度条 */}
            <div 
              ref={progressRef}
              onClick={handleProgressClick}
              className="h-1 bg-white/30 rounded-full cursor-pointer group"
            >
              <div 
                className="h-full bg-[#C41E3A] rounded-full relative"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay}>
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button onClick={() => content?.prevLesson && switchLesson(content.prevLesson.id)} disabled={!content?.prevLesson} className="disabled:opacity-30">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={() => content?.nextLesson && switchLesson(content.nextLesson.id)} disabled={!content?.nextLesson} className="disabled:opacity-30">
                  <SkipForward className="w-5 h-5" />
                </button>
                <span className="text-xs tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-xs">
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 rounded-lg py-1 min-w-[60px]">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={cn("block w-full px-3 py-1.5 text-xs text-left hover:bg-zinc-700", playbackRate === rate && "text-[#C41E3A]")}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 纯音频模式 */}
                <button 
                  onClick={toggleAudioMode}
                  className={cn("p-1 rounded", isAudioMode && "bg-[#C41E3A]")}
                  title="纯音频模式"
                >
                  <Headphones className="w-5 h-5" />
                </button>
                {/* 画中画 */}
                <button 
                  onClick={togglePiP}
                  className={cn("p-1 rounded", isPipMode && "bg-[#C41E3A]")}
                  title="画中画"
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
                <button onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 记忆播放提示 */}
        {showResumeToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-3 z-20">
            <Clock className="w-4 h-4 text-[#C41E3A]" />
            <span className="text-sm">上次看到 {formatTime(resumePosition)}</span>
            <button 
              onClick={handleResume}
              className="px-3 py-1 bg-[#C41E3A] text-white text-xs rounded-full"
            >
              继续
            </button>
            <button 
              onClick={() => setShowResumeToast(false)}
              className="text-white/60 text-xs"
            >
              从头
            </button>
          </div>
        )}
        
        {/* 纯音频模式遮罩 */}
        {isAudioMode && (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-10">
            <Headphones className="w-16 h-16 text-[#C41E3A] mb-4" />
            <p className="text-white/80 text-sm">纯音频模式</p>
            <p className="text-white/50 text-xs mt-1">已关闭视频画面，节省流量</p>
            <button 
              onClick={toggleAudioMode}
              className="mt-4 px-4 py-2 bg-white/10 rounded-full text-sm"
            >
              恢复视频
            </button>
          </div>
        )}
      </div>
      
      {/* 底部功能区 */}
      <div className="bg-zinc-900">
        {/* 当前课程信息 */}
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-medium mb-1">{content?.title}</h2>
          <p className="text-sm text-zinc-400">{content?.courseTitle}</p>
        </div>
        
        {/* 功能按钮 */}
        <div className="flex border-b border-zinc-800">
          <button 
            onClick={() => setShowChapterDrawer(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <List className="w-4 h-4" />
            <span>目录</span>
          </button>
          <button 
            onClick={() => setShowNotePanel(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>笔记</span>
          </button>
          <button 
            onClick={() => setShowQuestionPanel(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>提问</span>
          </button>
        </div>
        
        {/* 下一课提示 */}
        {content?.nextLesson && (
          <button 
            onClick={() => switchLesson(content.nextLesson!.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors"
          >
            <div>
              <p className="text-xs text-zinc-500 mb-1">下一课</p>
              <p className="text-sm">{content.nextLesson.title}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </button>
        )}
      </div>
      
      {/* 章节抽屉 */}
      {showChapterDrawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowChapterDrawer(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900 overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-medium">课程目录</h3>
              <button onClick={() => setShowChapterDrawer(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {chapters.map(chapter => (
                <div key={chapter.id}>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">{chapter.title}</h4>
                  <div className="space-y-1">
                    {chapter.lessons?.map(lesson => (
                      <button
                        key={lesson.id}
                        onClick={() => !lesson.isFree && !chapter.isFree ? null : switchLesson(lesson.id)}
                        disabled={!lesson.isFree && !chapter.isFree}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                          lesson.id === (lessonId || content?.id) ? "bg-[#C41E3A]/20 text-[#C41E3A]" : "hover:bg-zinc-800",
                          !lesson.isFree && !chapter.isFree && "opacity-50"
                        )}
                      >
                        {lesson.isCompleted ? (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : !lesson.isFree && !chapter.isFree ? (
                          <Lock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        ) : (
                          <Play className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm truncate">{lesson.title}</span>
                        <span className="text-xs text-zinc-500">{formatTime(lesson.duration)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 笔记面板 */}
      {showNotePanel && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNotePanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-medium">记笔记</h3>
              <button onClick={() => setShowNotePanel(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-xs text-zinc-500 mb-2">
                当前时间点: {formatTime(currentTime)}
              </p>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="写下你的学习笔记..."
                className="w-full h-32 bg-zinc-800 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
              />
              {notes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-zinc-500">我的笔记</p>
                  {notes.map(note => (
                    <div key={note.id} className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-[#C41E3A] mb-1">{formatTime(note.timestamp || 0)}</p>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={submitNote}
                disabled={!noteContent.trim()}
                className="w-full py-3 bg-[#C41E3A] text-white rounded-lg font-medium disabled:opacity-50"
              >
                保存笔记
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 提问面板 */}
      {showQuestionPanel && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowQuestionPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-medium">向老师提问</h3>
              <button onClick={() => setShowQuestionPanel(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                placeholder="描述你的问题，老师会尽快回复..."
                className="w-full h-32 bg-zinc-800 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
              />
            </div>
            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={submitQuestion}
                disabled={!questionContent.trim()}
                className="w-full py-3 bg-[#C41E3A] text-white rounded-lg font-medium disabled:opacity-50"
              >
                提交问题
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 导出组件
export default function CoursePlayerPage() {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <PlayerContent />
    </Suspense>
  )
}
