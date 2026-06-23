"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Search, Grid3X3, List, MoreVertical, Clock,
  BookOpen, Trash2, Plus, FolderPlus, ChevronRight, Edit3, Sparkles
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { FlatCover, coverColorForBook } from "@/components/classics"
import { AchievementMoment } from "@/components/common/achievement-moment"
import type { AchievementData } from "@/lib/types/achievement"

// 模拟数据 - 书架书籍
const bookshelfData = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", progress: 32, hasAI: true, hasTranslation: true, lastReadAt: "2024-01-15", coverColor: "cream" as const },
  { id: "2", title: "道德经", author: "老子", dynasty: "春秋", progress: 68, hasAI: true, hasTranslation: true, lastReadAt: "2024-01-14", coverColor: "brown" as const },
  { id: "3", title: "黄帝内经", author: "佚名", dynasty: "战国", progress: 15, hasAI: true, hasTranslation: true, lastReadAt: "2024-01-13", coverColor: "blue" as const },
  { id: "4", title: "论语", author: "孔子门人", dynasty: "春秋", progress: 45, hasAI: true, hasTranslation: true, lastReadAt: "2024-01-12", coverColor: "green" as const },
  { id: "5", title: "滴天髓", author: "刘基", dynasty: "明", progress: 8, hasAI: true, hasTranslation: true, lastReadAt: "2024-01-10", coverColor: "gray" as const },
  { id: "6", title: "大学", author: "曾子", dynasty: "战国", progress: 100, hasAI: true, hasTranslation: true, lastReadAt: "2024-01-09", coverColor: "brown" as const },
]

// 读完古籍 → 读后小结成就数据
function buildSummaryData(book: { title: string; author: string; dynasty: string }): AchievementData {
  return {
    type: "summary",
    userName: "林清欢",
    subject: book.title,
    date: "2026-06-15",
    stats: [
      { label: "阅读时长", value: "9h" },
      { label: "阅读天数", value: "14天" },
      { label: "划线笔记", value: "32" },
    ],
    aiComment: `读完《${book.title}》，[${book.dynasty}] ${book.author}之作，受益匪浅，余味悠长。`,
  }
}

// 模拟数据 - 阅读历史
const readingHistoryData = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", chapter: "乾卦", readAt: "今天 14:30", coverColor: "cream" as const },
  { id: "2", title: "道德经", author: "老子", dynasty: "春秋", chapter: "第四十二章", readAt: "昨天 20:15", coverColor: "brown" as const },
  { id: "3", title: "论语", author: "孔子门人", dynasty: "春秋", chapter: "学而篇", readAt: "3天前", coverColor: "green" as const },
]

// 模拟数据 - 分组
const groupsData = [
  { id: "1", name: "命理研究", count: 5, color: "amber" },
  { id: "2", name: "道家经典", count: 3, color: "emerald" },
  { id: "3", name: "养生必读", count: 4, color: "blue" },
]

// 书架平面书封 - 与古籍馆整体风格统一，含阅读进度
function BookshelfCover({ book, onSummary }: { book: { title: string; author: string; dynasty: string; progress: number; hasAI?: boolean }; onSummary?: () => void }) {
  const finished = book.progress >= 100
  return (
    <div>
      <div className="relative">
        <FlatCover
          title={book.title}
          label={book.dynasty}
          coverColor={coverColorForBook(book.title)}
          className="w-full shadow-md"
          titleClassName="text-base"
        />
        {book.hasAI && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-black/30 text-white backdrop-blur-sm">
            AI
          </span>
        )}
        {finished && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-[#c41e3a] text-white">
            已读完
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] font-medium text-foreground truncate">{book.title}</p>
      {finished ? (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSummary?.()
          }}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium"
          style={{ background: "#c9a96e1f", color: "#8a6d2f" }}
        >
          <Sparkles className="w-3 h-3" />
          读后小结
        </button>
      ) : book.progress > 0 ? (
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[#c41e3a] dark:bg-amber-500 rounded-full" style={{ width: `${Math.min(book.progress, 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{book.progress}%</span>
        </div>
      ) : null}
    </div>
  )
}

export default function BookshelfPage() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [books, setBooks] = useState(bookshelfData)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [summaryBook, setSummaryBook] = useState<AchievementData | null>(null)

  const filteredBooks = books.filter(book =>
    book.title.includes(searchValue) ||
    book.author.includes(searchValue)
  )

  const handleRemoveFromShelf = useCallback((id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id))
  }, [])

  const handleBatchRemove = useCallback(() => {
    setBooks(prev => prev.filter(book => !selectedIds.has(book.id)))
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

  const colorClasses: Record<string, string> = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  }

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
            <h1 className="font-medium">我的书房</h1>
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
                  onClick={handleBatchRemove}
                  disabled={selectedIds.size === 0}
                >
                  移除 ({selectedIds.size})
                </Button>
              </>
            ) : (
              <>
                <Link href="/classics/search">
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Search className="w-4 h-4" />
                  </Button>
                </Link>
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
                    <DropdownMenuItem>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      新建分组
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 标签页 */}
      <Tabs defaultValue="shelf" className="w-full">
        <div className="px-4 pt-3 pb-2 border-b border-border/60">
          <TabsList className="w-full bg-secondary/50 p-0.5 h-9">
            <TabsTrigger value="shelf" className="flex-1 text-xs h-8">
              书架
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs h-8">
              浏览历史
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 书架 */}
        <TabsContent value="shelf" className="mt-0">
          {/* 分组筛选 */}
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveGroup(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors",
                activeGroup === null 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
              )}
            >
              全部
            </button>
            {groupsData.map(group => (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1",
                  activeGroup === group.id 
                    ? colorClasses[group.color]
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {group.name}
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-0.5">
                  {group.count}
                </Badge>
              </button>
            ))}
            <button className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 视图切换 */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              共 <span className="text-foreground font-medium">{filteredBooks.length}</span> 本
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded", viewMode === "grid" ? "bg-secondary" : "")}
                aria-label="网格视图"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded", viewMode === "list" ? "bg-secondary" : "")}
                aria-label="列表视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 书籍列表 */}
          <div className="px-4">
            {filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">书架是空的</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  去古籍馆探索感兴趣的古籍吧
                </p>
                <Link href="/classics/home">
                  <Button className="rounded-full">
                    探索古籍
                  </Button>
                </Link>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-3 gap-3">
                {filteredBooks.map((book) => (
                  <div 
                    key={book.id} 
                    className={cn(
                      "relative",
                      isSelectMode && "cursor-pointer",
                      selectedIds.has(book.id) && "ring-2 ring-primary rounded-lg"
                    )}
                    onClick={() => isSelectMode && handleToggleSelect(book.id)}
                  >
                    {isSelectMode ? (
                      <BookshelfCover book={book} />
                    ) : (
                      <Link href={`/classics/${book.id}`} className="block">
                        <BookshelfCover book={book} onSummary={() => setSummaryBook(buildSummaryData(book))} />
                      </Link>
                    )}
                    {isSelectMode && selectedIds.has(book.id) && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                        <span className="text-[10px] text-white">✓</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* 添加更多 - 实心卡片 */}
                <Link href="/classics/home" className="block">
                  <div className="aspect-[3/4] rounded-2xl bg-muted/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground active:scale-[0.98] transition-transform">
                    <Plus className="w-6 h-6" />
                    <span className="text-xs">添加</span>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <Card 
                    key={book.id}
                    className={cn(
                      "p-3 flex items-center gap-3 transition-all",
                      isSelectMode && "cursor-pointer",
                      selectedIds.has(book.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => isSelectMode && handleToggleSelect(book.id)}
                  >
                    {/* 小封面 */}
                    <div className={cn(
                      "w-12 h-16 rounded-sm flex-shrink-0 flex items-center justify-center",
                      "bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm"
                    )}>
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d4c4a8] rounded-l-sm" />
                      <span className="writing-vertical-rl text-[9px] font-serif font-bold text-[#4a3f2f]">
                        {book.title.slice(0, 3)}
                      </span>
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/classics/${book.id}`}
                        className="font-medium text-sm hover:text-primary transition-colors"
                        onClick={e => isSelectMode && e.preventDefault()}
                      >
                        {book.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">[{book.dynasty}] {book.author}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${book.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{book.progress}%</span>
                      </div>
                    </div>
                    
                    {/* 操作 */}
                    {!isSelectMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <BookOpen className="w-4 h-4 mr-2" />
                            继续阅读
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit3 className="w-4 h-4 mr-2" />
                            移动分组
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleRemoveFromShelf(book.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            移出书架
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 浏览历史 */}
        <TabsContent value="history" className="mt-0 p-4">
          <div className="space-y-3">
            {readingHistoryData.map((item) => (
              <Link key={item.id} href={`/reader/${item.id}`}>
                <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                  {/* 小封面 */}
                  <div className={cn(
                    "w-10 h-14 rounded-sm flex-shrink-0 flex items-center justify-center relative",
                    "bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm"
                  )}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d4c4a8] rounded-l-sm" />
                    <span className="writing-vertical-rl text-[8px] font-serif font-bold text-[#4a3f2f]">
                      {item.title.slice(0, 2)}
                    </span>
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.chapter}</p>
                  </div>
                  
                  {/* 时间 */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {item.readAt}
                  </div>
                </Card>
              </Link>
            ))}
            
            {readingHistoryData.length > 0 && (
              <Button variant="ghost" className="w-full text-muted-foreground text-xs">
                清空历史记录
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AchievementMoment
        open={summaryBook !== null}
        data={summaryBook || buildSummaryData({ title: "", author: "", dynasty: "" })}
        onClose={() => setSummaryBook(null)}
        continueLabel="继续探索古籍"
        editableComment
      />
    </div>
  )
}
