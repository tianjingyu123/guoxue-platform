"use client"

import { useState, use } from "react"
import { 
  ChevronLeft, BookOpen, Bookmark, List, Settings, Moon, Sun,
  MessageSquare, Volume2, Search, Users, Type, Minus, Plus,
  ChevronRight, X, PenLine, Highlighter, Copy, Share2, Headphones,
  Sparkles, Send, PlayCircle, PauseCircle, SkipBack, SkipForward
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { CommentSheet, type ClassicComment } from "@/components/classics"

// 本章书友讨论（示例）
const CHAPTER_COMMENTS: ClassicComment[] = [
  {
    id: "ch1", user: "问道者", time: "1天前", likes: 42, liked: false, chapter: "卷一·论五行生克",
    content: "『金生水，水生木』这段相生相克讲得太清楚了。以前总记混，配着这章的图谱一下就理顺了。",
    replies: [
      { id: "ch1r1", user: "五行客", content: "相生好记，相克可以记『隔一位相克』。", time: "20小时前", likes: 9 },
    ],
  },
  {
    id: "ch2", user: "青衫", time: "2天前", likes: 27, liked: false, chapter: "卷一·论五行生克",
    content: "『中和为贵』是全章的眼。强者宜抑、弱者宜扶，看似讲命理，其实也是做人的分寸。",
    replies: [],
  },
  {
    id: "ch3", user: "半卷闲书", time: "3天前", likes: 15, liked: false, chapter: "卷一·论五行生克",
    content: "请教各位，『得时俱为旺论，失令便作衰看』这里的『时』具体指月令吗？",
    replies: [
      { id: "ch3r1", user: "问道者", content: "对，主要看月令，但也要结合通根透干综合判断。", time: "2天前", likes: 6 },
    ],
  },
]

// 模拟古籍内容
const bookContent = {
  id: 1,
  title: "渊海子平",
  author: "徐子平",
  chapters: [
    { id: 1, title: "卷一·论五行生克", current: true },
    { id: 2, title: "卷一·论天干地支" },
    { id: 3, title: "卷二·论十神" },
    { id: 4, title: "卷二·论格局" },
    { id: 5, title: "卷三·论用神" },
    { id: 6, title: "卷三·论大运流年" },
    { id: 7, title: "卷四·论合化" },
    { id: 8, title: "卷四·论刑冲破害" },
  ],
  content: `夫五行者，金木水火土也。其相生也，金生水，水生木，木生火，火生土，土生金。其相克也，金克木，木克土，土克水，水克火，火克金。

盖闻天地之道，阴阳五行而已。五行之中，各有阴阳。阳者刚也，阴者柔也。刚柔相济，阴阳相配，然后和而成物。

论曰：金居西方，其性刚，其情烈，其味辛，其色白。木居东方，其性仁，其情直，其味酸，其色青。水居北方，其性智，其情善，其味咸，其色黑。火居南方，其性礼，其情急，其味苦，其色赤。土居中央，其性信，其情厚，其味甘，其色黄。

五行各有所主：
甲乙东方木，丙丁南方火，戊己中央土，庚辛西方金，壬癸北方水。
寅卯东方木，巳午南方火，申酉西方金，亥子北方水，辰戌丑未四季土。

凡推命之法，以日干为主。年为本，月为提纲，日为身，时为归结。以月令定格局，以日干论强弱。强者宜抑，弱者宜扶。抑之不过，扶之不及，是以中和为贵也。

古人云：得时俱为旺论，失令便作衰看。又云：旺者宜泄宜克，衰者喜生喜扶。此不易之理也。

然有旺而不旺者，衰而不衰者，不可以一概而论。盖五行之气，有进有退，有虚有实。进者方长，退者将消；实者充盈，虚者空乏。是以论命之道，贵乎活看，不可执一而论也。`
}

type ThemeType = 'paper' | 'sepia' | 'dark' | 'green'

const themes: { id: ThemeType; name: string; bg: string; text: string }[] = [
  { id: 'paper', name: '宣纸', bg: 'reader-paper', text: 'text-stone-800' },
  { id: 'sepia', name: '羊皮', bg: 'reader-sepia', text: 'text-amber-900' },
  { id: 'dark', name: '夜间', bg: 'reader-dark', text: 'text-stone-300' },
  { id: 'green', name: '护眼', bg: 'reader-green', text: 'text-emerald-900' },
]

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [showHeader, setShowHeader] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAITools, setShowAITools] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [theme, setTheme] = useState<ThemeType>('paper')
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(2)
  const [isVertical, setIsVertical] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [showTextMenu, setShowTextMenu] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [aiMessages, setAiMessages] = useState<{role: "user" | "ai", content: string}[]>([
    { role: "ai", content: "你好！我是古籍智能助手。我可以帮你解读本书内容，回答关于原文的问题，也可以为你提供白话翻译。请问有什么可以帮助你的？" }
  ])
  const [aiInput, setAiInput] = useState("")

  const sendAIMessage = () => {
    if (!aiInput.trim()) return
    setAiMessages(prev => [...prev, { role: "user", content: aiInput }])
    setTimeout(() => {
      let reply = "这是一个很好的问题！"
      if (aiInput.includes("翻译") || aiInput.includes("白话")) {
        reply = "【白话翻译】\n\n所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。\n\n天地之间的道理，不过是阴阳五行而已。五行之中，各有阴阳之分。阳者刚强，阴者柔顺。刚柔相济，阴阳相配，然后才能和谐而成就万物。"
      } else if (aiInput.includes("五行")) {
        reply = "【五行解读】\n\n五行是中国古代哲学的核心概念之一，指金、木、水、火、土五种基本物质或能量。\n\n在命理学中，五行各有其性质特点：\n• 金：性刚、情烈、味辛、色白，居西方\n• 木：性仁、情直、味酸、色青，居东方\n• 水：性智、情善、味咸、色黑，居北方\n• 火：性礼、情急、味苦、色赤，居南方\n• 土：性信、情厚、味甘、色黄，居中央\n\n五行相生相克，构成了宇宙万物变化的基本规律。"
      } else {
        reply = "关于这个问题，《渊海子平》中提到：命理推演以日干为主，年柱为本，月柱为提纲，日柱为身，时柱为归结。\n\n推命的核心在于把握「中和」二字——强者宜抑，弱者宜扶，不可偏废。你还有什么想了解的吗？"
      }
      setAiMessages(prev => [...prev, { role: "ai", content: reply }])
    }, 800)
    setAiInput("")
  }

  const currentTheme = themes.find(t => t.id === theme) || themes[0]
  const progress = 12

  // 模拟书签
  const bookmarks = [
    { id: 1, chapter: "卷一·论五行生克", position: "第3段", note: "重要概念" },
    { id: 2, chapter: "卷二·论十神", position: "第1段", note: "" },
  ]

  // 模拟笔记
  const notes = [
    { id: 1, text: "金居西方，其性刚", note: "金的基本属性", color: "yellow" },
    { id: 2, text: "以日干为主", note: "推命核心法则", color: "green" },
  ]

  const handleTextSelect = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString())
      setShowTextMenu(true)
    }
  }

  const toggleMenu = () => {
    setShowMenu(!showMenu)
    setShowChapters(false)
    setShowSettings(false)
    setShowBookmarks(false)
    setShowNotes(false)
  }

  return (
    <div className={cn("min-h-screen flex flex-col", currentTheme.bg)}>
      {/* 顶部信息栏 */}
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 safe-area-pt">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/classics/${id}`}>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif font-medium text-foreground">{bookContent.title}</h1>
                <p className="text-xs text-muted-foreground">阅读进度 {progress}%</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className={cn("w-9 h-9", showAudioPlayer && "text-primary")} onClick={() => setShowAudioPlayer(!showAudioPlayer)}>
                <Headphones className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9" style={showAIChat ? { color: "var(--classics-ai)" } : undefined} onClick={() => setShowAIChat(!showAIChat)}>
                <Sparkles className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className={cn("w-9 h-9 relative", showComments && "text-primary")} onClick={() => setShowComments(true)} aria-label="本章讨论">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#c41e3a]" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9">
                <Bookmark className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* 听书播放器 */}
      {showAudioPlayer && (
        <div className="fixed top-[60px] left-0 right-0 z-40 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {isPlaying ? <PauseCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate mb-1">卷一·论五行生克</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-80">02:34</span>
                  <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-white rounded-full" />
                  </div>
                  <span className="text-[10px] opacity-80">08:15</span>
                </div>
              </div>
              <button onClick={() => setPlaybackSpeed(playbackSpeed >= 2 ? 0.5 : playbackSpeed + 0.25)} className="px-2 py-1 text-xs bg-white/20 rounded flex-shrink-0">
                {playbackSpeed}x
              </button>
              <button onClick={() => setShowAudioPlayer(false)} className="p-1 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI智能助手对话 */}
      {showAIChat && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAIChat(false)}>
          <div className="absolute bottom-0 left-0 right-0 h-[70vh] bg-card rounded-t-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--classics-ai), var(--classics-ai-soft))" }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">古籍智能助手</h3>
                  <p className="text-[10px] text-muted-foreground">AI解读 · 白话翻译 · 智能问答</p>
                </div>
              </div>
              <button onClick={() => setShowAIChat(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--classics-ai), var(--classics-ai-soft))" }}>
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-border">
              {["翻译本章", "解释五行", "总结要点", "提出问题"].map(q => (
                <button key={q} onClick={() => setAiInput(q)} className="flex-shrink-0 px-3 py-1.5 bg-secondary rounded-full text-xs hover:bg-secondary/80">
                  {q}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAIMessage()}
                  placeholder="问我任何关于本书的问题..."
                  className="flex-1 h-10 px-4 bg-secondary rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={sendAIMessage} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 核心阅读区 */}
      <main 
        className={cn(
          "flex-1 px-4 md:px-8 py-20 max-w-3xl mx-auto w-full",
          showHeader ? "pt-24" : "pt-8",
          isVertical && "h-screen overflow-x-auto"
        )}
        onClick={() => {
          setShowHeader(!showHeader)
          if (showMenu) setShowMenu(false)
        }}
        onMouseUp={handleTextSelect}
      >
        <article 
          className={cn(
            "font-serif leading-relaxed reader-selection",
            currentTheme.text,
            isVertical && "vertical-text h-full"
          )}
          style={{ 
            fontSize: `${fontSize}px`, 
            lineHeight: lineHeight,
          }}
        >
          <h2 className="text-xl font-bold mb-6 text-center">卷一·论五行生克</h2>
          {bookContent.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-justify indent-8">
              {paragraph}
            </p>
          ))}
        </article>

        {/* 文白对照翻译 */}
        {showTranslation && (
          <div className="mt-8 p-4 bg-secondary/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="bg-primary/20 text-primary">AI白话翻译</Badge>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowTranslation(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。
            </p>
          </div>
        )}
      </main>

      {/* 选中文字菜单 */}
      {showTextMenu && selectedText && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-xl p-2 flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-9 px-3 gap-2">
            <Highlighter className="w-4 h-4 text-yellow-500" />
            <span className="text-xs">划线</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            <span className="text-xs">笔记</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 gap-2">
            <Search className="w-4 h-4 text-accent" />
            <span className="text-xs">查词</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-xs">翻译</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 gap-2">
            <Copy className="w-4 h-4" />
            <span className="text-xs">复制</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-7 h-7 ml-1"
            onClick={() => { setShowTextMenu(false); setSelectedText("") }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* AI辅助工具按钮 */}
      <button 
        onClick={(e) => { e.stopPropagation(); setShowAITools(!showAITools) }}
        className="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center z-40"
      >
        <BookOpen className="w-5 h-5" />
      </button>

      {/* AI工具面板 */}
      {showAITools && (
        <div className="fixed bottom-40 right-4 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-48">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: MessageSquare, label: "文白翻译", action: () => setShowTranslation(true) },
              { icon: Search, label: "智能查词" },
              { icon: Type, label: "一键句读" },
              { icon: Users, label: "人物图谱" },
              { icon: Volume2, label: "AI听书" },
            ].map((tool) => (
              <button 
                key={tool.label}
                onClick={() => { tool.action?.(); setShowAITools(false) }}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <tool.icon className="w-5 h-5 text-primary" />
                <span className="text-xs text-foreground">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 底部菜单栏 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-3xl mx-auto flex items-center justify-around h-14">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowChapters(!showChapters); setShowSettings(false); setShowBookmarks(false); setShowNotes(false) }}
            className={cn("flex flex-col items-center gap-0.5 p-2", showChapters && "text-primary")}
          >
            <List className="w-5 h-5" />
            <span className="text-[10px]">目录</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowBookmarks(!showBookmarks); setShowSettings(false); setShowChapters(false); setShowNotes(false) }}
            className={cn("flex flex-col items-center gap-0.5 p-2", showBookmarks && "text-primary")}
          >
            <Bookmark className="w-5 h-5" />
            <span className="text-[10px]">书签</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); setShowSettings(false); setShowChapters(false); setShowBookmarks(false) }}
            className={cn("flex flex-col items-center gap-0.5 p-2", showNotes && "text-primary")}
          >
            <PenLine className="w-5 h-5" />
            <span className="text-[10px]">笔记</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'paper' : 'dark') }}
            className="flex flex-col items-center gap-0.5 p-2"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-[10px]">{theme === 'dark' ? '日间' : '夜间'}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setShowChapters(false); setShowBookmarks(false); setShowNotes(false) }}
            className={cn("flex flex-col items-center gap-0.5 p-2", showSettings && "text-primary")}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">设置</span>
          </button>
        </div>
      </nav>

      {/* 章节目录面板 */}
      {showChapters && (
        <div className="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border max-h-[60vh] overflow-y-auto safe-area-pb">
          <div className="max-w-3xl mx-auto p-4">
            <h3 className="font-medium text-foreground mb-3">章节目录</h3>
            <div className="space-y-1">
              {bookContent.chapters.map((chapter) => (
                <button 
                  key={chapter.id}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                    chapter.current 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {chapter.title}
                  {chapter.current && <Badge variant="secondary" className="ml-2 text-[10px]">当前</Badge>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 书签面板 */}
      {showBookmarks && (
        <div className="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border max-h-[60vh] overflow-y-auto safe-area-pb">
          <div className="max-w-3xl mx-auto p-4">
            <h3 className="font-medium text-foreground mb-3">我的书签</h3>
            {bookmarks.length > 0 ? (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <Bookmark className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{bookmark.chapter}</p>
                      <p className="text-xs text-muted-foreground">{bookmark.position}</p>
                      {bookmark.note && <p className="text-xs text-accent mt-1">{bookmark.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">暂无书签</p>
            )}
          </div>
        </div>
      )}

      {/* 笔记面板 */}
      {showNotes && (
        <div className="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border max-h-[60vh] overflow-y-auto safe-area-pb">
          <div className="max-w-3xl mx-auto p-4">
            <h3 className="font-medium text-foreground mb-3">划线与笔记</h3>
            {notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-secondary/50">
                    <p className={cn(
                      "text-sm font-medium",
                      note.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-green-500/20 text-green-200',
                      "px-1 rounded inline"
                    )}>
                      {note.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">{note.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">暂无笔记</p>
            )}
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border safe-area-pb">
          <div className="max-w-3xl mx-auto p-4 space-y-5">
            {/* 背景主题 */}
            <div>
              <h4 className="text-xs text-muted-foreground mb-2">背景主题</h4>
              <div className="flex gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                      t.bg,
                      t.text,
                      theme === t.id ? "ring-2 ring-primary" : "opacity-70"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 字号 */}
            <div>
              <h4 className="text-xs text-muted-foreground mb-2">字号</h4>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 h-2 bg-secondary rounded-full relative">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary rounded-full"
                    style={{ width: `${((fontSize - 14) / 12) * 100}%` }}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setFontSize(Math.min(26, fontSize + 2))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-8">{fontSize}</span>
              </div>
            </div>

            {/* 行距 */}
            <div>
              <h4 className="text-xs text-muted-foreground mb-2">行距</h4>
              <div className="flex gap-2">
                {[1.5, 1.8, 2, 2.2].map((h) => (
                  <button
                    key={h}
                    onClick={() => setLineHeight(h)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm border transition-all",
                      lineHeight === h 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* 竖排 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">竖排阅读</span>
              <button
                onClick={() => setIsVertical(!isVertical)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  isVertical ? "bg-primary" : "bg-secondary"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  isVertical ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 本章书友讨论抽屉 */}
      <CommentSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        title={bookContent.title}
        scope="chapter"
        initialComments={CHAPTER_COMMENTS}
      />
    </div>
  )
}
