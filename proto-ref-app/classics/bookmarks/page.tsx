"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Bookmark, Trash2, Share2, MoreVertical,
  ChevronRight, BookOpen, Clock, Search
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 模拟数据 - 书签
const bookmarksData = [
  {
    id: "1",
    bookId: "1",
    bookTitle: "周易",
    bookAuthor: "伏羲",
    dynasty: "周",
    chapter: "乾卦",
    content: "天行健，君子以自强不息。",
    page: 12,
    createdAt: "2024-01-15 14:30",
    color: "amber",
  },
  {
    id: "2",
    bookId: "1",
    bookTitle: "周易",
    bookAuthor: "伏羲",
    dynasty: "周",
    chapter: "坤卦",
    content: "地势坤，君子以厚德载物。",
    page: 28,
    createdAt: "2024-01-15 15:20",
    color: "blue",
  },
  {
    id: "3",
    bookId: "2",
    bookTitle: "道德经",
    bookAuthor: "老子",
    dynasty: "春秋",
    chapter: "第一章",
    content: "道可道，非常道。名可名，非常名。",
    page: 1,
    createdAt: "2024-01-14 10:15",
    color: "green",
  },
  {
    id: "4",
    bookId: "3",
    bookTitle: "论语",
    bookAuthor: "孔子门人",
    dynasty: "春秋",
    chapter: "学而篇",
    content: "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？",
    page: 5,
    createdAt: "2024-01-13 09:00",
    color: "purple",
  },
]

// 按书籍分组
const groupByBook = (bookmarks: typeof bookmarksData) => {
  const groups: Record<string, typeof bookmarksData> = {}
  bookmarks.forEach(bm => {
    if (!groups[bm.bookId]) {
      groups[bm.bookId] = []
    }
    groups[bm.bookId].push(bm)
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

export default function BookmarksPage() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [bookmarks, setBookmarks] = useState(bookmarksData)
  const [viewMode, setViewMode] = useState<"timeline" | "book">("timeline")

  const filteredBookmarks = bookmarks.filter(bm =>
    bm.content.includes(searchValue) ||
    bm.bookTitle.includes(searchValue) ||
    bm.chapter.includes(searchValue)
  )

  const groupedBookmarks = groupByBook(filteredBookmarks)

  const handleDelete = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(bm => bm.id !== id))
  }, [])

  const handleBatchDelete = useCallback(() => {
    setBookmarks(prev => prev.filter(bm => !selectedIds.has(bm.id)))
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
    amber: "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700",
    blue: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
    green: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
    purple: "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
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
            <h1 className="font-medium">我的书签</h1>
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
              placeholder="搜索书签内容..."
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

      {/* 书签列表 */}
      <div className="p-4">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">暂无书签</h3>
            <p className="text-sm text-muted-foreground mb-4">
              阅读时长按文字可添加书签
            </p>
            <Link href="/classics/home">
              <Button variant="outline" className="rounded-full">
                去阅读
              </Button>
            </Link>
          </div>
        ) : viewMode === "timeline" ? (
          /* 时间线视图 */
          <div className="space-y-3">
            {filteredBookmarks.map(bm => (
              <Card 
                key={bm.id}
                className={cn(
                  "p-4 border-l-4 transition-all",
                  colorClasses[bm.color] || colorClasses.amber,
                  isSelectMode && "cursor-pointer",
                  selectedIds.has(bm.id) && "ring-2 ring-primary"
                )}
                onClick={() => isSelectMode && handleToggleSelect(bm.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 书籍信息 */}
                    <div className="flex items-center gap-2 mb-2">
                      <Link 
                        href={`/classics/${bm.bookId}`}
                        className="text-sm font-medium hover:text-primary transition-colors"
                        onClick={e => isSelectMode && e.preventDefault()}
                      >
                        《{bm.bookTitle}》
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {bm.chapter} · 第{bm.page}页
                      </span>
                    </div>
                    
                    {/* 书签内容 */}
                    <p className="text-sm leading-relaxed mb-2 font-serif">
                      {bm.content}
                    </p>
                    
                    {/* 时间 */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {bm.createdAt}
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  {!isSelectMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                          onClick={() => handleDelete(bm.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* 按书籍分组视图 */
          <div className="space-y-4">
            {groupedBookmarks.map(group => (
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
                    <span className="text-xs">{group.count}个书签</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
                
                {/* 书签列表 */}
                <div className="space-y-2 pl-4 border-l-2 border-border/60 ml-4">
                  {group.items.map(bm => (
                    <Card 
                      key={bm.id}
                      className={cn(
                        "p-3 border-l-2 bg-card/50",
                        colorClasses[bm.color] || colorClasses.amber,
                        isSelectMode && "cursor-pointer",
                        selectedIds.has(bm.id) && "ring-2 ring-primary"
                      )}
                      onClick={() => isSelectMode && handleToggleSelect(bm.id)}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {bm.chapter} · 第{bm.page}页
                      </p>
                      <p className="text-sm font-serif line-clamp-2">{bm.content}</p>
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
