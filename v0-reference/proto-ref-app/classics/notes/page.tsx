"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, FileText, Trash2, Share2, MoreVertical,
  ChevronRight, BookOpen, Clock, Search, Edit3, Tag
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 模拟数据 - 笔记
const notesData = [
  {
    id: "1",
    bookId: "1",
    bookTitle: "周易",
    bookAuthor: "伏羲",
    dynasty: "周",
    chapter: "乾卦",
    originalText: "天行健，君子以自强不息。",
    noteContent: "这句话强调的是效法天道的刚健运行，君子应当自强进取，永不停歇。在现代社会，这种精神依然有重要的指导意义。",
    tags: ["人生哲理", "自强"],
    page: 12,
    createdAt: "2024-01-15 14:30",
    updatedAt: "2024-01-15 16:20",
  },
  {
    id: "2",
    bookId: "2",
    bookTitle: "道德经",
    bookAuthor: "老子",
    dynasty: "春秋",
    chapter: "第一章",
    originalText: "道可道，非常道。名可名，非常名。",
    noteContent: "老子开篇即点明'道'的不可言说性。真正的大道是超越语言文字的，任何试图用语言定义的'道'都不是永恒的道。这与佛教'不可说'的理念相通。",
    tags: ["道家", "哲学"],
    page: 1,
    createdAt: "2024-01-14 10:15",
    updatedAt: "2024-01-14 10:15",
  },
  {
    id: "3",
    bookId: "3",
    bookTitle: "论语",
    bookAuthor: "孔子门人",
    dynasty: "春秋",
    chapter: "学而篇",
    originalText: "学而时习之，不亦说乎？",
    noteContent: "学习不仅是获取知识，更重要的是'时习'——在合适的时机反复实践。'说'通'悦'，是内心深处的喜悦。",
    tags: ["学习方法", "儒家"],
    page: 5,
    createdAt: "2024-01-13 09:00",
    updatedAt: "2024-01-13 11:30",
  },
]

// 按书籍分组
const groupByBook = (notes: typeof notesData) => {
  const groups: Record<string, typeof notesData> = {}
  notes.forEach(note => {
    if (!groups[note.bookId]) {
      groups[note.bookId] = []
    }
    groups[note.bookId].push(note)
  })
  return Object.entries(groups).map(([bookId, items]) => ({
    bookId,
    bookTitle: items[0].bookTitle,
    bookAuthor: items[0].bookAuthor,
    dynasty: items[0].dynasty,
    count: items.length,
    items,
  }))
}

export default function NotesPage() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [notes, setNotes] = useState(notesData)
  const [viewMode, setViewMode] = useState<"timeline" | "book">("timeline")

  const filteredNotes = notes.filter(note =>
    note.noteContent.includes(searchValue) ||
    note.originalText.includes(searchValue) ||
    note.bookTitle.includes(searchValue) ||
    note.tags.some(t => t.includes(searchValue))
  )

  const groupedNotes = groupByBook(filteredNotes)

  const handleDelete = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id))
  }, [])

  const handleBatchDelete = useCallback(() => {
    setNotes(prev => prev.filter(note => !selectedIds.has(note.id)))
    setSelectedIds(new Set())
    setIsSelectMode(false)
  }, [selectedIds])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-medium">我的笔记</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isSelectMode ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIsSelectMode(false)
                    setSelectedIds(new Set())
                  }}
                >
                  取消
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                >
                  删除 ({selectedIds.size})
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsSelectMode(true)}>
                    批量管理
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* 搜索和视图切换 */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="搜索笔记内容..."
              className="pl-9 h-9 bg-secondary border-0 rounded-full text-sm"
            />
          </div>
          <div className="flex bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                viewMode === "timeline" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              时间线
            </button>
            <button
              onClick={() => setViewMode("book")}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                viewMode === "book" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              按书籍
            </button>
          </div>
        </div>
      </header>

      {/* 笔记列表 */}
      <div className="p-4">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">暂无笔记</h3>
            <p className="text-sm text-muted-foreground mb-4">
              阅读时选中文字可添加笔记
            </p>
            <Link href="/classics/home">
              <Button variant="outline" className="rounded-full">
                去阅读
              </Button>
            </Link>
          </div>
        ) : viewMode === "timeline" ? (
          /* 时间线视图 */
          <div className="space-y-4">
            {filteredNotes.map(note => (
              <Card 
                key={note.id}
                className={cn(
                  "p-4 transition-all",
                  isSelectMode && "cursor-pointer",
                  selectedIds.has(note.id) && "ring-2 ring-primary"
                )}
                onClick={() => isSelectMode && handleToggleSelect(note.id)}
              >
                {/* 书籍信息 */}
                <div className="flex items-center justify-between mb-3">
                  <Link 
                    href={`/classics/${note.bookId}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                    onClick={e => isSelectMode && e.preventDefault()}
                  >
                    <span className="text-sm font-medium">《{note.bookTitle}》</span>
                    <span className="text-xs text-muted-foreground">
                      {note.chapter} · 第{note.page}页
                    </span>
                  </Link>
                  
                  {!isSelectMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit3 className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="w-4 h-4 mr-2" />
                          分享
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BookOpen className="w-4 h-4 mr-2" />
                          跳转阅读
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                {/* 原文引用 */}
                <div className="pl-3 border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-900/20 rounded-r-lg py-2 pr-3 mb-3">
                  <p className="text-sm font-serif text-amber-800 dark:text-amber-200">
                    {note.originalText}
                  </p>
                </div>
                
                {/* 笔记内容 */}
                <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                  {note.noteContent}
                </p>
                
                {/* 标签和时间 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {note.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {note.updatedAt}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* 按书籍分组视图 */
          <div className="space-y-4">
            {groupedNotes.map(group => (
              <div key={group.bookId}>
                {/* 书籍标题 */}
                <Link 
                  href={`/classics/${group.bookId}`}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-2 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-11 rounded bg-gradient-to-b from-amber-100 to-amber-50 flex items-center justify-center shadow-sm">
                      <span className="writing-vertical-rl text-[8px] font-serif font-bold text-amber-800">
                        {group.bookTitle.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">《{group.bookTitle}》</h3>
                      <p className="text-xs text-muted-foreground">[{group.dynasty}] {group.bookAuthor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-xs">{group.count}条笔记</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
                
                {/* 笔记列表 */}
                <div className="space-y-2 pl-4 border-l-2 border-border/60 ml-4">
                  {group.items.map(note => (
                    <Card 
                      key={note.id}
                      className={cn(
                        "p-3 bg-card/50",
                        isSelectMode && "cursor-pointer",
                        selectedIds.has(note.id) && "ring-2 ring-primary"
                      )}
                      onClick={() => isSelectMode && handleToggleSelect(note.id)}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {note.chapter} · 第{note.page}页
                      </p>
                      <p className="text-sm font-serif text-amber-700 dark:text-amber-300 mb-2 line-clamp-1">
                        {note.originalText}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {note.noteContent}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
