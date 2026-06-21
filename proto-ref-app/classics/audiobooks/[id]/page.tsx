'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Heart, Share2, List, Repeat, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 模拟有声书数据（真实场景由 id 请求接口）
const audioBookData: Record<string, {
  title: string; author: string; narrator: string; dynasty: string
  chapters: { id: number; title: string; duration: string }[]
}> = {
  default: {
    title: '道德经',
    author: '老子',
    narrator: '青山先生',
    dynasty: '春秋',
    chapters: [
      { id: 1, title: '第一章·道可道', duration: '08:15' },
      { id: 2, title: '第二章·天下皆知', duration: '07:42' },
      { id: 3, title: '第三章·不尚贤', duration: '06:58' },
      { id: 4, title: '第四章·道冲', duration: '05:30' },
      { id: 5, title: '第五章·天地不仁', duration: '06:12' },
      { id: 6, title: '第六章·谷神不死', duration: '04:48' },
    ],
  },
}

export default function AudioBookPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const book = audioBookData[id] || audioBookData.default

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [liked, setLiked] = useState(false)
  const [showChapters, setShowChapters] = useState(false)

  // 模拟播放进度
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 0 : prev + 0.4))
    }, 200)
    return () => clearInterval(timer)
  }, [isPlaying])

  const chapter = book.chapters[currentChapter]

  const playChapter = (index: number) => {
    setCurrentChapter(index)
    setProgress(0)
    setIsPlaying(true)
    setShowChapters(false)
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-background flex flex-col">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-gradient-to-b from-[#f5f0e6] to-[#faf8f5] dark:from-amber-950/80 dark:to-background">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm" aria-label="返回">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-serif text-base font-bold text-amber-900 dark:text-amber-200">听书</span>
        <button onClick={() => {}} className="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm" aria-label="分享">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-8">
        {/* 旋转唱片封面 */}
        <div className={cn(
          "relative w-56 h-56 rounded-full bg-gradient-to-br from-[#2a2118] to-[#4a3a28] flex items-center justify-center shadow-[0_8px_30px_rgba(80,60,30,0.3)]",
          isPlaying && "audiobook-spin"
        )}>
          <style>{`
            @keyframes audiobook-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .audiobook-spin { animation: audiobook-rotate 8s linear infinite; }
          `}</style>
          {/* 唱片纹理 */}
          <div className="absolute inset-4 rounded-full border border-amber-100/10" />
          <div className="absolute inset-8 rounded-full border border-amber-100/10" />
          {/* 中心古书封面 */}
          <div className="w-24 h-32 rounded-[3px] bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] border border-[#d0c0a0]/50 shadow-lg relative overflow-hidden flex items-center justify-center">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#d4c4a8]" />
            <div className="writing-vertical-rl">
              {book.title.split('').map((char, i) => (
                <span key={i} className="text-base font-serif font-bold text-[#3d3225]">{char}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 书名 + 朗读者 */}
        <div className="text-center mt-8">
          <h1 className="font-serif text-2xl font-bold text-amber-900 dark:text-amber-200">{book.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{book.dynasty} · {book.author} 著 · {book.narrator} 朗读</p>
          <p className="text-sm text-foreground/80 mt-3 font-medium">{chapter.title}</p>
        </div>

        {/* 进度条 */}
        <div className="w-full max-w-md mt-8">
          <div className="h-1.5 bg-[#e5ddd0] dark:bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-600 rounded-full transition-all duration-200 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-muted-foreground tabular-nums">
            <span>{Math.floor((progress / 100) * 8)}:{String(Math.floor(((progress / 100) * 495) % 60)).padStart(2, '0')}</span>
            <span>{chapter.duration}</span>
          </div>
        </div>

        {/* 播放控制 */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button onClick={() => setSpeed(speed >= 2 ? 0.5 : speed + 0.5)} className="text-sm font-medium text-amber-800 dark:text-amber-300 w-12">
            {speed}x
          </button>
          <button onClick={() => playChapter(Math.max(0, currentChapter - 1))} aria-label="上一章">
            <SkipBack className="w-7 h-7 text-foreground" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-amber-600 hover:bg-amber-700 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
          </button>
          <button onClick={() => playChapter(Math.min(book.chapters.length - 1, currentChapter + 1))} aria-label="下一章">
            <SkipForward className="w-7 h-7 text-foreground" />
          </button>
          <button onClick={() => setLiked(!liked)} className="w-12 flex justify-center" aria-label="喜欢">
            <Heart className={cn("w-6 h-6", liked ? "fill-red-500 text-red-500" : "text-foreground")} />
          </button>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-center gap-8 mt-8 mb-4">
          <button onClick={() => setShowChapters(true)} className="flex flex-col items-center gap-1 text-muted-foreground">
            <List className="w-5 h-5" />
            <span className="text-[11px]">目录</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Repeat className="w-5 h-5" />
            <span className="text-[11px]">循环</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Moon className="w-5 h-5" />
            <span className="text-[11px]">定时</span>
          </button>
        </div>
      </main>

      {/* 章节目录抽屉 */}
      {showChapters && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowChapters(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-card rounded-t-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-medium">目录 · 共{book.chapters.length}章</h3>
              <button onClick={() => setShowChapters(false)} className="text-sm text-muted-foreground">关闭</button>
            </div>
            <div className="overflow-y-auto p-2">
              {book.chapters.map((ch, index) => (
                <button
                  key={ch.id}
                  onClick={() => playChapter(index)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors",
                    index === currentChapter ? "bg-amber-50 dark:bg-amber-950/30" : "hover:bg-secondary/50"
                  )}
                >
                  <span className={cn("text-sm", index === currentChapter ? "text-amber-700 dark:text-amber-300 font-medium" : "text-foreground")}>
                    {ch.title}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{ch.duration}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
