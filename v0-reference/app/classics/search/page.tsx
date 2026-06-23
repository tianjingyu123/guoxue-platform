"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ArrowLeft, Search, X, Clock, TrendingUp, Sparkles, ChevronRight, Star } from "lucide-react"
import { FlatCover, type CoverColor } from "@/components/classics"

const searchHistoryData = ["周易", "道德经", "黄帝内经", "论语", "孙子兵法"]

const hotSearchData = [
  { keyword: "周易", isHot: true },
  { keyword: "道德经", isHot: true },
  { keyword: "滴天髓", isHot: false },
  { keyword: "子平真诠", isHot: false },
  { keyword: "黄帝内经", isHot: true },
  { keyword: "伤寒论", isHot: false },
  { keyword: "论语", isHot: true },
  { keyword: "庄子", isHot: false },
]

interface SearchResult {
  id: string
  title: string
  author: string
  dynasty: string
  description: string
  reads: number
  rating: number
  isFree: boolean
  color: CoverColor
}

const searchResultsData: SearchResult[] = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", description: "群经之首，大道之源", reads: 128600, rating: 4.9, isFree: true, color: "cream" },
  { id: "2", title: "周易正义", author: "孔颖达", dynasty: "唐", description: "疏解周易，阐明义理", reads: 45600, rating: 4.8, isFree: false, color: "brown" },
  { id: "3", title: "周易集解", author: "李鼎祚", dynasty: "唐", description: "汇集汉魏诸家易说", reads: 32100, rating: 4.7, isFree: false, color: "blue" },
  { id: "4", title: "周易本义", author: "朱熹", dynasty: "宋", description: "理学大师注解周易", reads: 58900, rating: 4.9, isFree: true, color: "green" },
  { id: "5", title: "周易参同契", author: "魏伯阳", dynasty: "汉", description: "丹道修炼之祖书", reads: 28700, rating: 4.6, isFree: false, color: "red" },
]

const searchSuggestionsData = [
  { text: "周易" }, { text: "周易正义" }, { text: "周易本义" }, { text: "周易集解" }, { text: "周易参同契" },
]

type SearchState = "initial" | "suggesting" | "results" | "empty"

function fmtReads(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

function ResultRow({ book }: { book: SearchResult }) {
  return (
    <Link
      href={`/classics/${book.id}`}
      className="flex gap-4 p-4 bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform"
    >
      <FlatCover title={book.title.slice(0, 4)} label={book.dynasty} coverColor={book.color} className="w-14 flex-shrink-0" titleClassName="text-[11px]" />
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[16px] text-foreground">{book.title}</h3>
            {book.isFree && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">免费</span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-1 line-clamp-1">{book.description}</p>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground/70 mt-1">
          <span>{book.author} · {book.dynasty}</span>
          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{book.rating}</span>
          <span>{fmtReads(book.reads)}人读</span>
        </div>
      </div>
    </Link>
  )
}

export default function ClassicsSearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [searchValue, setSearchValue] = useState("")
  const [searchState, setSearchState] = useState<SearchState>("initial")
  const [searchHistory, setSearchHistory] = useState<string[]>(searchHistoryData)
  const [suggestions, setSuggestions] = useState<typeof searchSuggestionsData>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setSearchValue(value)
    if (value.trim()) {
      setSuggestions(searchSuggestionsData.filter((s) => s.text.includes(value)))
      setSearchState("suggesting")
    } else {
      setSuggestions([])
      setSearchState("initial")
    }
  }, [])

  const handleSearch = useCallback(
    (keyword?: string) => {
      const kw = keyword || searchValue.trim()
      if (!kw) return
      setIsSearching(true)
      setSearchValue(kw)
      setSearchHistory((prev) => [kw, ...prev.filter((h) => h !== kw)].slice(0, 10))
      setTimeout(() => {
        const filtered = searchResultsData.filter(
          (r) => r.title.includes(kw) || r.author.includes(kw) || r.description.includes(kw),
        )
        setResults(filtered)
        setSearchState(filtered.length > 0 ? "results" : "empty")
        setIsSearching(false)
      }, 400)
    },
    [searchValue],
  )

  const handleClear = useCallback(() => {
    setSearchValue("")
    setSuggestions([])
    setResults([])
    setSearchState("initial")
    inputRef.current?.focus()
  }, [])

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background">
      {/* 搜索头部 - 苹果式毛玻璃 */}
      <header className="sticky top-0 z-50 bg-[#f4f2ee]/80 dark:bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-3 sm:px-6 h-14 max-w-screen-xl mx-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
            aria-label="返回"
          >
            <ArrowLeft className="w-[22px] h-[22px] text-foreground" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
            <input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜书名、作者、朝代或门类"
              className="w-full h-10 pl-10 pr-10 rounded-full bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-black/[0.04] dark:ring-white/5 focus:ring-2 focus:ring-[#c41e3a]/30"
            />
            {searchValue && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
                aria-label="清除"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Link
            href="/classics/ai-assistant"
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(150deg, #c8324c, #9e1b30)" }}
            aria-label="AI 助手"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </Link>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-5 sm:px-6 py-4">
        {/* 初始态 */}
        {searchState === "initial" && (
          <div className="space-y-7">
            {searchHistory.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-[15px] font-semibold text-foreground">搜索历史</h2>
                  </div>
                  <button onClick={() => setSearchHistory([])} className="text-[13px] text-muted-foreground">清空</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((kw, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearch(kw)}
                      className="h-8 px-3.5 rounded-full bg-card text-[13px] text-foreground ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-95 transition-transform"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-4 h-4 text-[#c41e3a] dark:text-amber-400" />
                <h2 className="text-[15px] font-semibold text-foreground">热门搜索</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {hotSearchData.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(item.keyword)}
                    className={cn(
                      "h-8 px-3.5 rounded-full text-[13px] transition-transform active:scale-95",
                      item.isHot
                        ? "bg-[#c41e3a]/10 text-[#c41e3a] dark:bg-amber-400/15 dark:text-amber-400 font-medium"
                        : "bg-card text-foreground ring-1 ring-black/[0.04] dark:ring-white/5",
                    )}
                  >
                    {item.keyword}
                    {item.isHot && <span className="ml-1 text-[10px] font-bold">HOT</span>}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-foreground">为你推荐</h2>
                <Link href="/classics/home" className="text-[13px] text-muted-foreground flex items-center">
                  更多<ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {searchResultsData.slice(0, 3).map((book) => (
                  <ResultRow key={book.id} book={book} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 搜索建议 */}
        {searchState === "suggesting" && suggestions.length > 0 && (
          <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSearch(s.text)}
                className={cn("w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors text-left", i > 0 && "border-t border-border/60")}
              >
                <Search className="w-[18px] h-[18px] text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-[15px] text-foreground">
                  {s.text.split(searchValue).map((part, pi, arr) => (
                    <span key={pi}>
                      {part}
                      {pi < arr.length - 1 && <span className="text-[#c41e3a] dark:text-amber-400 font-medium">{searchValue}</span>}
                    </span>
                  ))}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        )}

        {/* 搜索中 */}
        {isSearching && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[#c41e3a] dark:border-amber-400 border-t-transparent rounded-full" />
          </div>
        )}

        {/* 结果 */}
        {!isSearching && searchState === "results" && (
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              共找到 <span className="text-foreground font-semibold tabular-nums">{results.length}</span> 部古籍
            </p>
            <div className="space-y-3">
              {results.map((book) => (
                <ResultRow key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}

        {/* 空态 */}
        {!isSearching && searchState === "empty" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="w-16 h-16 rounded-full bg-card ring-1 ring-black/[0.04] dark:ring-white/5 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </span>
            <h3 className="text-[16px] font-semibold text-foreground mb-1">未找到相关古籍</h3>
            <p className="text-[13px] text-muted-foreground mb-5">换个关键词试试，或让 AI 助手帮你找</p>
            <Link
              href="/classics/ai-assistant"
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-white text-[14px] font-semibold shadow-sm active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(150deg, #c8324c, #9e1b30)" }}
            >
              <Sparkles className="w-4 h-4" />询问 AI 助手
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
