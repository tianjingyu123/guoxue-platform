"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Share2, MoreVertical, BookOpen, 
  ChevronRight, Download, Sparkles
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BookCard } from "@/components/classics"

// 模拟数据 - 专题合集
const collectionsData: Record<string, {
  id: string
  title: string
  description: string
  cover: string
  curator: string
  bookCount: number
  viewCount: number
  tags: string[]
  books: Array<{
    id: string
    title: string
    author: string
    dynasty: string
    description: string
    hasAI: boolean
    hasTranslation: boolean
    coverColor: "cream" | "brown" | "blue" | "green" | "gray"
  }>
}> = {
  "1": {
    id: "1",
    title: "国学经典必读",
    description: "入门必备，经典永流传。精选中华文化精髓，从周易到论语，带你走进国学的大门。",
    cover: "from-amber-100 to-amber-200",
    curator: "热卜国学编辑部",
    bookCount: 12,
    viewCount: 28600,
    tags: ["入门", "经典", "推荐"],
    books: [
      { id: "1", title: "周易", author: "伏羲", dynasty: "周", description: "群经之首，大道之源", hasAI: true, hasTranslation: true, coverColor: "cream" },
      { id: "2", title: "道德经", author: "老子", dynasty: "春秋", description: "道法自然，无为而治", hasAI: true, hasTranslation: true, coverColor: "brown" },
      { id: "3", title: "论语", author: "孔子门人", dynasty: "春秋", description: "仁义礼智，修身齐家", hasAI: true, hasTranslation: true, coverColor: "blue" },
      { id: "4", title: "孟子", author: "孟轲", dynasty: "战国", description: "性善之论，王道仁政", hasAI: true, hasTranslation: true, coverColor: "green" },
      { id: "5", title: "大学", author: "曾子", dynasty: "战国", description: "修身治国，格物致知", hasAI: true, hasTranslation: true, coverColor: "gray" },
      { id: "6", title: "中庸", author: "子思", dynasty: "战国", description: "天命之谓性，中和之道", hasAI: true, hasTranslation: true, coverColor: "cream" },
    ]
  },
  "2": {
    id: "2",
    title: "命理入门书单",
    description: "八字命理学习路径，从入门到精通。精选历代命理经典，系统学习命理之道。",
    cover: "from-purple-100 to-purple-200",
    curator: "命理研究室",
    bookCount: 8,
    viewCount: 15800,
    tags: ["命理", "八字", "进阶"],
    books: [
      { id: "10", title: "滴天髓", author: "刘基", dynasty: "明", description: "八字命理经典，字字珠玑", hasAI: true, hasTranslation: true, coverColor: "cream" },
      { id: "11", title: "子平真诠", author: "沈孝瞻", dynasty: "清", description: "格局用神，系统阐述", hasAI: true, hasTranslation: true, coverColor: "brown" },
      { id: "12", title: "穷通宝鉴", author: "余春台", dynasty: "清", description: "调候用神，实用参考", hasAI: true, hasTranslation: true, coverColor: "blue" },
      { id: "13", title: "三命通会", author: "万民英", dynasty: "明", description: "命理大全，包罗万象", hasAI: true, hasTranslation: true, coverColor: "green" },
    ]
  },
}

export default function CollectionPage() {
  const router = useRouter()
  const params = useParams()
  const collectionId = params.id as string
  
  const collection = collectionsData[collectionId] || collectionsData["1"]
  const [isAddedToShelf, setIsAddedToShelf] = useState(false)

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              className="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm"
              aria-label="分享"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  下载全部
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 封面区域 */}
      <div className={cn(
        "mx-4 rounded-2xl p-6 bg-gradient-to-br",
        collection.cover,
        "dark:from-amber-900/30 dark:to-amber-800/30"
      )}>
        <Badge variant="secondary" className="mb-3 text-[10px]">
          精选书单
        </Badge>
        <h1 className="text-xl font-bold mb-2">{collection.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {collection.description}
        </p>
        
        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span>{collection.curator}</span>
          <span>·</span>
          <span>{collection.bookCount}本</span>
          <span>·</span>
          <span>{(collection.viewCount / 10000).toFixed(1)}万人看过</span>
        </div>
        
        {/* 标签 */}
        <div className="flex items-center gap-2">
          {collection.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px] bg-white/50 dark:bg-black/20">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* 书籍预览 */}
      <div className="px-4 py-4 -mt-4">
        <div className="flex -space-x-2 mb-4">
          {collection.books.slice(0, 5).map((book, i) => (
            <div 
              key={book.id}
              className={cn(
                "w-10 h-14 rounded-sm flex items-center justify-center border-2 border-card shadow-md",
                "bg-[#f5f0e1]"
              )}
              style={{ zIndex: 5 - i }}
            >
              <span className="writing-vertical-rl text-[7px] font-serif font-bold text-[#4a3f2f]">
                {book.title.slice(0, 2)}
              </span>
            </div>
          ))}
          {collection.books.length > 5 && (
            <div className="w-10 h-14 rounded-sm bg-secondary flex items-center justify-center border-2 border-card shadow-md text-xs text-muted-foreground">
              +{collection.books.length - 5}
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button 
            className="flex-1 rounded-full"
            onClick={() => setIsAddedToShelf(!isAddedToShelf)}
            variant={isAddedToShelf ? "secondary" : "default"}
          >
            {isAddedToShelf ? "已加入书架" : "加入书架"}
          </Button>
          <Link href={`/reader/${collection.books[0]?.id || "1"}`} className="flex-1">
            <Button variant="outline" className="w-full rounded-full">
              <BookOpen className="w-4 h-4 mr-2" />
              开始阅读
            </Button>
          </Link>
        </div>
      </div>

      {/* 书籍列表 */}
      <section className="px-4 pt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">书单内容</h2>
          <span className="text-xs text-muted-foreground">{collection.books.length}本</span>
        </div>
        
        <div className="space-y-3">
          {collection.books.map((book, i) => (
            <Link key={book.id} href={`/classics/${book.id}`}>
              <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                {/* 序号 */}
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                  i < 3 ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                )}>
                  {i + 1}
                </span>
                
                {/* 封面 */}
                <div className={cn(
                  "w-10 h-14 rounded-sm flex-shrink-0 flex items-center justify-center relative",
                  "bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm"
                )}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d4c4a8] rounded-l-sm" />
                  <span className="writing-vertical-rl text-[8px] font-serif font-bold text-[#4a3f2f]">
                    {book.title.slice(0, 2)}
                  </span>
                  {book.hasAI && (
                    <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-white" />
                    </span>
                  )}
                </div>
                
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm">{book.title}</h3>
                    {book.hasTranslation && (
                      <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-700 border-0">
                        译文
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">[{book.dynasty}] {book.author}</p>
                  <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">{book.description}</p>
                </div>
                
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 相关推荐 */}
      <section className="px-4 pt-6">
        <h2 className="font-medium mb-4">相关书单</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {Object.values(collectionsData).filter(c => c.id !== collectionId).map(col => (
            <Link key={col.id} href={`/classics/collection/${col.id}`} className="flex-shrink-0">
              <Card className={cn(
                "w-48 overflow-hidden",
                "border-border/60"
              )}>
                <div className={cn("h-20 p-3 bg-gradient-to-br", col.cover)}>
                  <h3 className="font-medium text-sm">{col.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{col.description}</p>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{col.bookCount}本</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
