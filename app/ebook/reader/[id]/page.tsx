"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  ArrowLeft,
  Settings,
  Bookmark,
  BookmarkCheck,
  Sun,
  Moon,
  Minus,
  Plus,
  List,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Share2,
  Download,
  Highlighter,
  PenLine,
  X,
  CheckCircle,
  Crown,
  BookOpen,
  Star,
  Type,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { CommentSheet, type ClassicComment } from "@/components/classics"

const EBOOK_ACCENT = "#2563eb"

// 本章书友讨论
const CHAPTER_COMMENTS: ClassicComment[] = [
  {
    id: "rc1", user: "问道者", time: "1天前", likes: 42, liked: false, chapter: "第一章 八字基础概论",
    content: "天干地支这段讲得太清楚了，六十甲子循环的图配上文字一下就理解了。基础打牢很重要。",
    replies: [
      { id: "rc1r1", user: "五行客", content: "相生相克我是这样记的：生我者为印，克我者为官。", time: "20小时前", likes: 9 },
    ],
  },
  {
    id: "rc2", user: "青衫", time: "2天前", likes: 27, liked: false, chapter: "第一章 八字基础概论",
    content: "『日干是八字的核心，代表命主本人』这句是关键，后面所有推断都围绕日主展开。",
    replies: [],
  },
  {
    id: "rc3", user: "半卷闲书", time: "3天前", likes: 15, liked: false, chapter: "第一章 八字基础概论",
    content: "请教各位，年柱代表1-16岁运程，那如果年柱受克是不是说明童年运势不佳？",
    replies: [
      { id: "rc3r1", user: "问道者", content: "不能单看一柱，要结合整体格局综合判断。", time: "2天前", likes: 6 },
    ],
  },
]

const chapterContent = {
  id: "1",
  bookId: "1",
  title: "第一章 八字基础概论",
  content: `八字，又称四柱，是中国传统命理学的核心内容。它以一个人出生的年、月、日、时为基础，用天干地支组合成四柱八个字，故称"八字"。

一、什么是八字

八字命理学是一门古老的预测学，通过分析一个人出生时的年、月、日、时所对应的天干地支，来推断其一生的吉凶祸福、性格特点、事业发展等。

在中国传统文化中，八字命理学占有重要地位，它不仅是预测学的一种，更是一种认识自我、了解命运的工具。

二、天干与地支

天干共有十个，分别是：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。

地支共有十二个，分别是：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。

天干与地支两两组合，形成六十甲子，循环往复，纪录时间的流逝。

三、五行基础

五行是八字命理学的基础理论，包括：木、火、土、金、水五种元素。

五行之间存在着相生相克的关系：
• 相生：木生火，火生土，土生金，金生水，水生木
• 相克：木克土，土克水，水克火，火克金，金克木

理解五行的生克关系，是学习八字命理的第一步。

四、八字的构成

八字由四柱组成，每柱包含一个天干和一个地支：

年柱：代表祖上、父母宫，也代表1-16岁的运程

月柱：代表父母、兄弟宫，也代表17-32岁的运程

日柱：代表自己和配偶，是八字的核心

时柱：代表子女宫，也代表48岁以后的运程

日干是八字的核心，代表命主本人，又称为"日主"或"日元"。

五、学习建议

学习八字命理需要循序渐进，建议按以下步骤进行：

熟记天干地支及其阴阳属性

理解五行生克制化的原理

掌握十神的定义和作用

学习格局的取用方法

通过实例不断练习

只有打好基础，才能在命理学的道路上走得更远。`,
  totalChapters: 7,
  currentChapter: 1,
}

const chapters = [
  { id: "1", title: "第一章 八字基础概论", current: true },
  { id: "2", title: "第二章 天干地支详解", current: false },
  { id: "3", title: "第三章 五行生克制化", current: false },
  { id: "4", title: "第四章 十神定位与作用", current: false },
  { id: "5", title: "第五章 格局取用神", current: false },
  { id: "6", title: "第六章 大运流年断法", current: false },
  { id: "7", title: "第七章 实例精解", current: false },
]

const relatedBooks = [
  { id: "2", title: "紫微斗数入门", author: "紫微居士", price: 58, coverColor: "#1a4731" },
  { id: "3", title: "六爻预测实战", author: "陈易卦", price: 68, coverColor: "#4a1942" },
  { id: "4", title: "风水学基础", author: "张天师", price: 88, coverColor: "#3d1f00" },
]

type Theme = "light" | "sepia" | "dark"

interface Highlight {
  id: string
  text: string
  color: string
  note?: string
  chapterId: string
  position: number
}

export default function EbookReaderPage() {
  const [showControls, setShowControls] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [progress, setProgress] = useState(15)
  const [selectedText, setSelectedText] = useState("")
  const [noteText, setNoteText] = useState("")
  const [showTextActions, setShowTextActions] = useState(false)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [highlightColor, setHighlightColor] = useState("#fef08a")
  const [isLastChapter] = useState(chapterContent.currentChapter === chapterContent.totalChapters)

  const themeConfig = {
    light: { bg: "bg-white", text: "text-gray-800", secondary: "text-gray-500", surface: "bg-white", border: "border-gray-200" },
    sepia: { bg: "bg-[#f5f0e5]", text: "text-[#5c4a3a]", secondary: "text-[#8b7355]", surface: "bg-[#f5f0e5]", border: "border-[#d4c4a8]" },
    dark: { bg: "bg-[#1a1815]", text: "text-[#c5c0b8]", secondary: "text-[#7a756d]", surface: "bg-[#242220]", border: "border-[#3d3a37]" },
  }

  const cfg = themeConfig[theme]

  const handleContentClick = () => {
    if (!showMenu && !showSettings && !showNoteInput) {
      const sel = window.getSelection()?.toString().trim()
      if (sel && sel.length > 0) {
        setSelectedText(sel)
        setShowTextActions(true)
        setShowControls(false)
      } else {
        setShowTextActions(false)
        setSelectedText("")
        setShowControls((v) => !v)
      }
    }
  }

  const closeAllPanels = () => {
    setShowMenu(false)
    setShowSettings(false)
    setShowNoteInput(false)
    setShowTextActions(false)
    setSelectedText("")
  }

  const addHighlight = (color: string) => {
    if (!selectedText) return
    setHighlights((prev) => [
      ...prev,
      { id: Date.now().toString(), text: selectedText, color, chapterId: chapterContent.id, position: Date.now() },
    ])
    setShowTextActions(false)
    setSelectedText("")
  }

  const addNote = () => {
    if (!selectedText) return
    setHighlights((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: selectedText,
        color: "#bfdbfe",
        note: noteText,
        chapterId: chapterContent.id,
        position: Date.now(),
      },
    ])
    setShowNoteInput(false)
    setNoteText("")
    setSelectedText("")
  }

  const highlightColors = [
    { color: "#fef08a", label: "黄色" },
    { color: "#bbf7d0", label: "绿色" },
    { color: "#fecaca", label: "红色" },
    { color: "#bfdbfe", label: "蓝色" },
  ]

  return (
    <div className={cn("min-h-screen transition-colors duration-300", cfg.bg)}>
      {/* Top bar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-transform duration-300",
          showControls ? "translate-y-0" : "-translate-y-full",
          theme === "dark" ? "bg-[#242220]/95" : "bg-white/95",
          "backdrop-blur-sm border-b", cfg.border
        )}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/ebook/1" className={cn("p-1.5 -ml-1.5 rounded-lg transition-all", theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100")}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={cn("font-medium text-sm truncate max-w-[50%]", cfg.text)}>{chapterContent.title}</h1>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={cn("p-2 rounded-lg transition-all", theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100")}
            >
              {isBookmarked
                ? <BookmarkCheck className="w-5 h-5 text-[var(--ebook-primary)]" />
                : <Bookmark className="w-5 h-5" />
              }
            </button>
            <button
              onClick={() => { closeAllPanels(); setShowComments(true); }}
              className={cn("relative p-2 rounded-lg transition-all", theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100")}
              aria-label="本章讨论"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: EBOOK_ACCENT }} />
            </button>
            <button className={cn("p-2 rounded-lg transition-all", theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100")}>
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Reading content */}
      <main
        onClick={handleContentClick}
        className="px-5 sm:px-8 md:px-14 lg:px-24 py-20 max-w-3xl mx-auto select-text"
        style={{ userSelect: "text" }}
      >
        <article>
          <h1 className={cn("font-semibold text-xl mb-8 text-center", cfg.text)}>
            {chapterContent.title}
          </h1>
          <div
            className={cn("leading-relaxed whitespace-pre-line", cfg.text)}
            style={{ fontSize: `${fontSize}px`, lineHeight }}
          >
            {chapterContent.content}
          </div>
        </article>

        {/* Chapter nav */}
        <div className={cn("flex items-center justify-between mt-14 pt-6 border-t", cfg.border)}>
          <Button variant="outline" className="gap-1" disabled={chapterContent.currentChapter <= 1}>
            <ChevronLeft className="w-4 h-4" />上一章
          </Button>
          <span className={cn("text-sm", cfg.secondary)}>
            {chapterContent.currentChapter} / {chapterContent.totalChapters}
          </span>
          {isLastChapter ? (
            <Button
              className="gap-1 bg-[var(--ebook-primary)] text-white"
              onClick={() => setShowFinishModal(true)}
            >
              读完了
              <CheckCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="outline" className="gap-1">
              下一章<ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>

      {/* Text selection action bar */}
      {showTextActions && selectedText && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className={cn(
            "flex items-center gap-1 px-2 py-2 rounded-2xl shadow-xl border",
            theme === "dark" ? "bg-[#2a2826] border-[#3d3a37]" : "bg-white border-gray-200"
          )}>
            {highlightColors.map((hc) => (
              <button
                key={hc.color}
                onClick={() => addHighlight(hc.color)}
                className="w-8 h-8 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                style={{ background: hc.color }}
                title={`${hc.label}划线`}
              />
            ))}
            <div className={cn("w-px h-6 mx-1", theme === "dark" ? "bg-white/20" : "bg-gray-200")} />
            <button
              onClick={() => { setShowNoteInput(true); setShowTextActions(false); }}
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                theme === "dark" ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600")}
            >
              <PenLine className="w-3.5 h-3.5" />
              笔记
            </button>
            <button
              onClick={closeAllPanels}
              className={cn("p-1.5 rounded-lg transition-all", theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100")}
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={closeAllPanels} />
          <div className={cn(
            "fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl p-5",
            theme === "dark" ? "bg-[#242220]" : "bg-white"
          )}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            {selectedText && (
              <div className={cn("text-xs px-3 py-2 rounded-lg mb-3 line-clamp-2", theme === "dark" ? "bg-white/10 text-gray-400" : "bg-slate-50 text-slate-500")}>
                "{selectedText}"
              </div>
            )}
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="写下你的想法..."
              rows={4}
              className={cn(
                "w-full rounded-xl px-4 py-3 text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-[var(--ebook-primary)]",
                theme === "dark" ? "bg-white/10 border-white/20 text-gray-200 placeholder:text-gray-500" : "bg-slate-50 border-slate-200 text-gray-800"
              )}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={closeAllPanels}>取消</Button>
              <Button className="flex-1 bg-[var(--ebook-primary)]" onClick={addNote}>保存笔记</Button>
            </div>
          </div>
        </>
      )}

      {/* Bottom control bar */}
      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
          showControls ? "translate-y-0" : "translate-y-full",
          theme === "dark" ? "bg-[#242220]/95" : "bg-white/95",
          "backdrop-blur-sm border-t", cfg.border
        )}
      >
        {/* Progress */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3">
            <span className={cn("text-xs w-8", cfg.secondary)}>{progress}%</span>
            <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} max={100} step={1} className="flex-1" />
            <span className={cn("text-xs w-14 text-right", cfg.secondary)}>
              {chapterContent.currentChapter}/{chapterContent.totalChapters}章
            </span>
          </div>
        </div>

        {/* Function buttons */}
        <div className="flex items-center justify-around py-3">
          <button
            onClick={() => { closeAllPanels(); setShowMenu(true); }}
            className={cn("flex flex-col items-center gap-1 px-3 py-1 transition-colors", cfg.secondary)}
          >
            <List className="w-5 h-5" />
            <span className="text-[10px]">目录</span>
          </button>
          <button
            onClick={() => { closeAllPanels(); setShowSettings(true); }}
            className={cn("flex flex-col items-center gap-1 px-3 py-1 transition-colors", cfg.secondary)}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">设置</span>
          </button>
          <button
            onClick={() => {
              const sel = window.getSelection()?.toString().trim()
              if (sel) { setSelectedText(sel); setShowTextActions(true); }
            }}
            className={cn("flex flex-col items-center gap-1 px-3 py-1 transition-colors", cfg.secondary)}
          >
            <Highlighter className="w-5 h-5" />
            <span className="text-[10px]">划线</span>
          </button>
          <button
            onClick={() => {
              const sel = window.getSelection()?.toString().trim()
              if (sel) { setSelectedText(sel); setShowNoteInput(true); }
            }}
            className={cn("flex flex-col items-center gap-1 px-3 py-1 transition-colors", cfg.secondary)}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">笔记</span>
          </button>
          <button className={cn("flex flex-col items-center gap-1 px-3 py-1 transition-colors", cfg.secondary)}>
            <Share2 className="w-5 h-5" />
            <span className="text-[10px]">分享</span>
          </button>
        </div>
      </footer>

      {/* Table of contents panel */}
      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={closeAllPanels} />
          <div className={cn("fixed left-0 top-0 bottom-0 w-72 z-50 overflow-y-auto", theme === "dark" ? "bg-[#1a1815]" : "bg-white")}>
            <div className={cn("sticky top-0 px-4 py-4 border-b", theme === "dark" ? "bg-[#1a1815] border-[#3d3a37]" : "bg-white border-gray-200")}>
              <div className="flex items-center justify-between">
                <h2 className={cn("font-semibold", cfg.text)}>目录</h2>
                <button onClick={closeAllPanels}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <p className={cn("text-xs mt-1", cfg.secondary)}>{highlights.length} 条划线 · {highlights.filter(h => h.note).length} 条笔记</p>
            </div>
            <div className="py-1">
              {chapters.map((chapter, index) => (
                <button
                  key={chapter.id}
                  className={cn(
                    "w-full text-left px-4 py-3.5 text-sm transition-colors flex items-center gap-3",
                    chapter.current
                      ? "bg-[var(--ebook-primary)]/8 text-[var(--ebook-primary)] font-medium"
                      : cn(cfg.text, "hover:bg-slate-50")
                  )}
                  onClick={closeAllPanels}
                >
                  <span className={cn("text-xs w-5 text-center", chapter.current ? "text-[var(--ebook-primary)]" : cfg.secondary)}>
                    {index + 1}
                  </span>
                  {chapter.title}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Settings panel */}
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={closeAllPanels} />
          <div className={cn("fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl", theme === "dark" ? "bg-[#1a1815]" : "bg-white")}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="p-5 space-y-6">
              {/* Font size */}
              <div>
                <p className={cn("text-sm font-medium mb-3", cfg.text)}>字体大小</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center", theme === "dark" ? "bg-white/10" : "bg-gray-100")}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className={cn("text-lg font-semibold", cfg.text)}>{fontSize}px</span>
                  </div>
                  <button
                    onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center", theme === "dark" ? "bg-white/10" : "bg-gray-100")}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Line height */}
              <div>
                <p className={cn("text-sm font-medium mb-3", cfg.text)}>行间距</p>
                <div className="flex gap-2">
                  {[1.5, 1.8, 2.0, 2.4].map((lh) => (
                    <button
                      key={lh}
                      onClick={() => setLineHeight(lh)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                        lineHeight === lh
                          ? "bg-[var(--ebook-primary)] text-white"
                          : theme === "dark" ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <p className={cn("text-sm font-medium mb-3", cfg.text)}>阅读主题</p>
                <div className="flex gap-2">
                  {[
                    { id: "light" as Theme, label: "日间", bg: "bg-white", icon: <Sun className="w-4 h-4 text-amber-500" />, text: "text-gray-800" },
                    { id: "sepia" as Theme, label: "护眼", bg: "bg-[#f5f0e5]", icon: <Type className="w-4 h-4 text-[#8b7355]" />, text: "text-[#5c4a3a]" },
                    { id: "dark" as Theme, label: "夜间", bg: "bg-[#1a1815]", icon: <Moon className="w-4 h-4 text-gray-400" />, text: "text-gray-300" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border-2 transition-all",
                        t.bg,
                        theme === t.id ? "border-[var(--ebook-primary)]" : "border-transparent"
                      )}
                    >
                      {t.icon}
                      <span className={cn("text-sm font-medium", t.text)}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Finish & recommend modal */}
      {showFinishModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowFinishModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-5 pb-safe-bottom">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[var(--ebook-primary)]/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-[var(--ebook-primary)]" />
              </div>
              <h3 className="font-bold text-lg text-[var(--ebook-text)]">恭喜读完本书！</h3>
              <p className="text-sm text-[var(--ebook-text-soft)] mt-1">你已经读完《八字命理精解》</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400 cursor-pointer hover:scale-110 transition-transform" />
                ))}
              </div>
              <p className="text-xs text-[var(--ebook-text-soft)] mt-1">给本书评分</p>
            </div>

            <p className="text-sm font-semibold text-[var(--ebook-text)] mb-3">读完此书的人还读了</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
              {relatedBooks.map((rb) => (
                <Link key={rb.id} href={`/ebook/${rb.id}`} className="flex-shrink-0 w-20" onClick={() => setShowFinishModal(false)}>
                  <div
                    className="w-full aspect-[2/3] rounded-lg shadow-md mb-1.5 relative overflow-hidden"
                    style={{ background: rb.coverColor }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                      <p className="text-white/80 text-[10px] text-center font-medium leading-snug line-clamp-3">{rb.title}</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-[var(--ebook-text)] line-clamp-1">{rb.title}</p>
                  <p className="text-[var(--ebook-price)] text-[11px] font-bold">¥{rb.price}</p>
                </Link>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/ebook/bookshelf">
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  去书架
                </Link>
              </Button>
              <Button className="flex-1 bg-[var(--ebook-primary)] hover:bg-[var(--ebook-primary)]/90">
                <Share2 className="w-4 h-4 mr-1.5" />
                分享读后感
              </Button>
            </div>
          </div>
        </>
      )}

      {/* 本章书友讨论抽屉 */}
      <CommentSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        title={chapterContent.title}
        scope="chapter"
        initialComments={CHAPTER_COMMENTS}
        accentColor={EBOOK_ACCENT}
      />
    </div>
  )
}
