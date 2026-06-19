"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Search, Filter, ChevronDown, X, GraduationCap, Loader2, Clock, ChevronRight, Flame, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav"
import { courseApi } from "@/lib/api"
import { CourseCard } from "@/components/cards"
import { Suspense } from "react"

// 分类 - 纯文字，不带图标
const defaultCategories = [
  { id: "all", name: "全部" },
  { id: "bazi", name: "八字命理" },
  { id: "ziwei", name: "紫微斗数" },
  { id: "fengshui", name: "风水堪舆" },
  { id: "yijing", name: "易经" },
  { id: "mianxiang", name: "面相手相" },
  { id: "qimen", name: "奇门遁甲" },
  { id: "liuyao", name: "六爻预测" },
]

// 排序
const sortOptions = [
  { id: "recommend", name: "综合推荐" },
  { id: "popular", name: "最受欢迎" },
  { id: "newest", name: "最新上架" },
  { id: "price-asc", name: "价格最低" },
]

// 推荐课程Banner数据
const recommendedCourses = [
  { id: "featured-1", title: "八字命理大师班", subtitle: "零基础到精通", price: 1999, originalPrice: 3999, tag: "限时5折", image: "/images/courses/course-1.jpg", endTime: Date.now() + 2 * 24 * 60 * 60 * 1000 },
  { id: "featured-2", title: "紫微斗数精讲", subtitle: "名师亲授", price: 999, originalPrice: 1999, tag: "即将涨价", image: "/images/courses/course-2.jpg", endTime: Date.now() + 1 * 24 * 60 * 60 * 1000 },
  { id: "featured-3", title: "风水堪舆实战", subtitle: "案例教学", price: 1299, originalPrice: 2599, tag: "新课首发", image: "/images/courses/course-3.jpg", endTime: Date.now() + 3 * 24 * 60 * 60 * 1000 },
]

// 限时优惠课程
const flashSaleCourses = [
  { id: "flash-1", title: "六爻预测入门", price: 49, originalPrice: 199, discount: "2.5折", endTime: Date.now() + 3600 * 1000 * 5 },
  { id: "flash-2", title: "面相识人术", price: 69, originalPrice: 299, discount: "2.3折", endTime: Date.now() + 3600 * 1000 * 8 },
  { id: "flash-3", title: "姓名学精讲", price: 39, originalPrice: 149, discount: "2.6折", endTime: Date.now() + 3600 * 1000 * 12 },
]

// Mock数据（API未返回时使用）
const mockCourses = [
  { id: "1", title: "八字入门实战课：从零开始学命理", instructor: { id: "1", name: "周易大师", avatar: "/images/experts/expert-1.jpg" }, price: 199, originalPrice: 399, students: 2860, rating: 4.9, chapters: 48, category: "bazi", tag: "TOP1", isFree: false, cover: "/images/courses/course-1.jpg" },
  { id: "2", title: "紫微斗数命盘解读进阶", instructor: { id: "2", name: "张玄风", avatar: "/images/experts/expert-2.jpg" }, price: 299, originalPrice: 599, students: 1560, rating: 4.8, chapters: 36, category: "ziwei", tag: "新课", isFree: false, cover: "/images/courses/course-2.jpg" },
  { id: "3", title: "风水布局入门精讲", instructor: { id: "1", name: "陈风水", avatar: "/images/experts/expert-1.jpg" }, price: 0, originalPrice: 99, students: 5280, rating: 4.7, chapters: 12, category: "fengshui", tag: "免费", isFree: true, cover: "/images/courses/course-3.jpg" },
  { id: "4", title: "姓名学与起名技巧", instructor: { id: "2", name: "李国学", avatar: "/images/experts/expert-2.jpg" }, price: 149, originalPrice: 199, students: 1280, rating: 4.8, chapters: 18, category: "bazi", isFree: false, cover: "/images/courses/course-4.jpg" },
  { id: "5", title: "易经六十四卦精讲", instructor: { id: "1", name: "周易大师", avatar: "/images/experts/expert-1.jpg" }, price: 399, originalPrice: 599, students: 3560, rating: 4.9, chapters: 64, category: "yijing", tag: "热门", isFree: false, cover: "/images/courses/course-1.jpg" },
  { id: "6", title: "面相入门与识人术", instructor: { id: "2", name: "王相师", avatar: "/images/experts/expert-2.jpg" }, price: 99, originalPrice: 149, students: 2180, rating: 4.6, chapters: 15, category: "mianxiang", isFree: false, cover: "/images/courses/course-2.jpg" },
  { id: "7", title: "奇门遁甲入门班", instructor: { id: "1", name: "玄学居士", avatar: "/images/experts/expert-1.jpg" }, price: 299, originalPrice: 499, students: 980, rating: 4.8, chapters: 24, category: "qimen", tag: "高阶", isFree: false, cover: "/images/courses/course-3.jpg" },
  { id: "8", title: "六爻预测实战技法", instructor: { id: "2", name: "张玄风", avatar: "/images/experts/expert-2.jpg" }, price: 199, originalPrice: 299, students: 1520, rating: 4.7, chapters: 20, category: "liuyao", isFree: false, cover: "/images/courses/course-4.jpg" },
]

// 骨架屏
function CourseSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="aspect-[3/4] bg-[#F2EFEA]" />
            <div className="p-2.5 space-y-2">
              <div className="h-4 bg-[#F2EFEA] rounded w-full" />
              <div className="h-3 bg-[#F2EFEA] rounded w-2/3" />
              <div className="h-4 bg-[#F2EFEA] rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CoursesListContent() {
  const searchParams = useSearchParams()
  const initCategory = searchParams.get("category") ?? "all"
  const initSort = searchParams.get("sort") ?? "recommend"
  const initFree = searchParams.get("filter") === "free"

  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState(initCategory)
  const [activeSort, setActiveSort] = useState(initSort)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [onlyFree, setOnlyFree] = useState(initFree)
  const [categories, setCategories] = useState(defaultCategories)
  
  // 推荐课程轮播
  const [currentBanner, setCurrentBanner] = useState(0)
  
  // 限时秒杀倒计时
  const [flashCountdowns, setFlashCountdowns] = useState<{ [key: string]: { h: number, m: number, s: number } }>({})
  
  // 数据状态
  const [courses, setCourses] = useState<typeof mockCourses>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 10
  
  // 下拉刷新状态
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // ��载分类
  useEffect(() => {
    courseApi.getCategories().then(data => {
      if (data && data.length > 0) {
        setCategories([{ id: "all", name: "全部" }, ...data])
      }
    }).catch(() => {})
  }, [])

  // 推荐课程轮播自动切换
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % recommendedCourses.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // 限时秒杀倒计时
  useEffect(() => {
    const updateCountdowns = () => {
      const now = Date.now()
      const newCountdowns: { [key: string]: { h: number, m: number, s: number } } = {}
      flashSaleCourses.forEach(course => {
        const remaining = Math.max(0, course.endTime - now)
        const h = Math.floor(remaining / (1000 * 60 * 60))
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((remaining % (1000 * 60)) / 1000)
        newCountdowns[course.id] = { h, m, s }
      })
      setFlashCountdowns(newCountdowns)
    }
    updateCountdowns()
    const timer = setInterval(updateCountdowns, 1000)
    return () => clearInterval(timer)
  }, [])

  // 加载课程数据
  const loadCourses = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
      setPage(1)
    }
    
    try {
      const result = await courseApi.list({
        category: activeCategory === "all" ? undefined : activeCategory,
        page: refresh ? 1 : page,
        pageSize,
        sort: activeSort,
      })
      
      if (result && result.data) {
        if (refresh) {
          setCourses(result.data)
        } else {
          setCourses(prev => [...prev, ...result.data])
        }
        setHasMore(result.data.length === pageSize)
      }
    } catch {
      // API失败时使用mock数据
      if (refresh || courses.length === 0) {
        setCourses(mockCourses)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
      setLoadingMore(false)
    }
  }, [activeCategory, activeSort, page, courses.length])

  // 初始加载
  useEffect(() => {
    setIsLoading(true)
    setCourses([])
    setPage(1)
    loadCourses(true)
  }, [activeCategory, activeSort])

  // 加载更多
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setPage(p => p + 1)
  }, [loadingMore, hasMore])

  useEffect(() => {
    if (page > 1) {
      loadCourses(false)
    }
  }, [page])

  // 滚动加载更多
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadMore()
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadMore])

  // 下拉刷新手势
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return
    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current
    if (distance > 0) {
      setIsPulling(true)
      setPullDistance(Math.min(distance * 0.5, 80))
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 50 && !isRefreshing) {
      loadCourses(true)
    }
    setIsPulling(false)
    setPullDistance(0)
  }

  // 过滤
  const filteredCourses = courses
    .filter(course => {
      const matchSearch = searchQuery === "" || course.title.includes(searchQuery) || course.instructor.name.includes(searchQuery)
      const matchFree = !onlyFree || course.isFree
      return matchSearch && matchFree
    })

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#FAF8F5] pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {(isPulling || isRefreshing) && (
        <div 
          className="flex items-center justify-center bg-[#FAF8F5] overflow-hidden transition-all"
          style={{ height: isRefreshing ? 50 : pullDistance }}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-[#C41E3A] animate-spin" />
          ) : (
            <span className="text-[12px] text-[#999999]">
              {pullDistance > 50 ? "松开刷新" : "下拉刷新"}
            </span>
          )}
        </div>
      )}

      {/* 顶部 - 与平台风格统一 */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E8E0D5]">
        <div className="flex items-center gap-3 px-4 h-12">
          <BackButton fallbackPath="/discover" />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索课程、讲师"
              className="w-full h-8 pl-9 pr-4 bg-[#F2EFEA] border border-[#E5E0D8] rounded-full text-sm text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:border-[#C41E3A]/30"
            />
          </div>
        </div>

        {/* 分类Tab - 纯文字横向滑动 */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-[#C41E3A] text-white"
                  : "bg-white text-[#666666] border border-[#E8E0D5]"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* 排序筛选栏 */}
      <div className="sticky top-[92px] z-30 bg-[#FAF8F5] border-b border-[#E8E0D5]">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1 text-[13px] font-medium text-[#2C2C2C]"
              >
                {sortOptions.find(s => s.id === activeSort)?.name}
                <ChevronDown className={cn("w-4 h-4 transition-transform", showSortMenu && "rotate-180")} />
              </button>
              {showSortMenu && (
                <div className="absolute top-full left-0 mt-2 w-28 bg-white border border-[#E8E0D5] rounded-lg shadow-lg overflow-hidden z-50">
                  {sortOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setActiveSort(option.id); setShowSortMenu(false) }}
                      className={cn("w-full px-3 py-2 text-[13px] text-left hover:bg-[#F5F1EB]", activeSort === option.id && "text-[#C41E3A] bg-[#C41E3A]/5")}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => setOnlyFree(!onlyFree)}
              className={cn("text-[13px]", onlyFree ? "text-[#C41E3A] font-medium" : "text-[#666666]")}
            >
              免费
            </button>
          </div>
          <button onClick={() => setShowFilter(true)} className="flex items-center gap-1 text-[13px] text-[#666666]">
            <Filter className="w-4 h-4" />筛选
          </button>
        </div>
      </div>

      {/* 推荐课程轮播Banner */}
      <div className="px-4 pt-3">
        <div className="relative rounded-xl overflow-hidden h-32">
          {recommendedCourses.map((course, index) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                index === currentBanner ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#C41E3A] to-[#8B0000]" />
              <div className="relative h-full flex items-center justify-between px-4">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-yellow-400 text-[#8B0000] text-[10px] font-bold rounded">{course.tag}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-0.5">{course.title}</h3>
                  <p className="text-white/80 text-xs mb-2">{course.subtitle}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-yellow-300">¥{course.price}</span>
                    <span className="text-xs text-white/60 line-through">¥{course.originalPrice}</span>
                  </div>
                </div>
                <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg">
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                </div>
              </div>
            </Link>
          ))}
          {/* 轮播指示器 */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {recommendedCourses.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  index === currentBanner ? "w-4 bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 限时秒杀区域 */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-bold text-[#2C2C2C]">限时秒杀</span>
            <div className="flex items-center gap-1 ml-2">
              <Clock className="w-3.5 h-3.5 text-[#C41E3A]" />
              <span className="text-xs text-[#C41E3A]">抢购中</span>
            </div>
          </div>
          <Link href="/courses/flash-sale" className="flex items-center text-xs text-[#999999]">
            更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
          {flashSaleCourses.map(course => {
            const countdown = flashCountdowns[course.id] || { h: 0, m: 0, s: 0 }
            return (
              <Link key={course.id} href={`/course/${course.id}`} className="flex-shrink-0 w-28">
                <div className="bg-white rounded-xl p-2.5 shadow-sm">
                  <div className="text-center mb-2">
                    <span className="text-lg font-bold text-[#C41E3A]">¥{course.price}</span>
                    <span className="text-[10px] text-[#999999] line-through ml-1">¥{course.originalPrice}</span>
                  </div>
                  <p className="text-[11px] text-[#2C2C2C] text-center line-clamp-1 mb-2">{course.title}</p>
                  {/* 倒计时 */}
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="w-5 h-5 bg-[#2C2C2C] text-white text-[10px] rounded flex items-center justify-center font-mono">
                      {String(countdown.h).padStart(2, '0')}
                    </span>
                    <span className="text-[#2C2C2C] text-xs font-bold">:</span>
                    <span className="w-5 h-5 bg-[#2C2C2C] text-white text-[10px] rounded flex items-center justify-center font-mono">
                      {String(countdown.m).padStart(2, '0')}
                    </span>
                    <span className="text-[#2C2C2C] text-xs font-bold">:</span>
                    <span className="w-5 h-5 bg-[#C41E3A] text-white text-[10px] rounded flex items-center justify-center font-mono animate-pulse">
                      {String(countdown.s).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="px-2 py-0.5 bg-[#FFF0F0] text-[#C41E3A] text-[10px] rounded-full">{course.discount}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 课程列表标题 */}
      <div className="px-4 mt-4 mb-2 flex items-center gap-2">
        <Flame className="w-4 h-4 text-[#FF6B35]" />
        <span className="font-medium text-[#2C2C2C] text-sm">全部课程</span>
      </div>

      {/* 课程列表 - 统一双列瀑布流，3:4竖版封面 */}
      <div className="px-4 pt-3">
        {isLoading ? (
          <CourseSkeleton />
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <GraduationCap className="w-16 h-16 text-[#E8E0D5] mb-4" />
            <p className="text-[#999999]">暂无相关课程</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  variant="feed"
                  data={{
                    id: course.id,
                    title: course.title,
                    cover: course.cover,
                    price: course.price,
                    originalPrice: course.originalPrice,
                    free: course.isFree,
                    students: course.students,
                    lessons: course.chapters,
                    rating: course.rating,
                    teacher: course.instructor.name,
                    teacherAvatar: course.instructor.avatar,
                    tag: course.tag === "新课" ? "新品" : course.tag,
                  }}
                />
              ))}
            </div>
            
            {/* 加载更多 */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-[#C41E3A] animate-spin mr-2" />
                <span className="text-[13px] text-[#999999]">加载中...</span>
              </div>
            )}
            {!hasMore && courses.length > 0 && (
              <div className="text-center py-4 text-[13px] text-[#999999]">
                已经到底了
              </div>
            )}
          </>
        )}
      </div>

      {/* 筛选弹窗 */}
      {showFilter && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#2C2C2C]">筛选</h3>
              <button onClick={() => setShowFilter(false)}>
                <X className="w-5 h-5 text-[#999999]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[13px] font-medium text-[#2C2C2C] mb-2">价格区间</p>
                <div className="flex flex-wrap gap-2">
                  {["全部", "免费", "0-100", "100-300", "300以上"].map(range => (
                    <button key={range} className="px-3 py-1.5 text-[12px] bg-[#F5F1EB] text-[#666666] rounded-full hover:bg-[#C41E3A]/10 hover:text-[#C41E3A]">
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#2C2C2C] mb-2">课程时长</p>
                <div className="flex flex-wrap gap-2">
                  {["全部", "5小时内", "5-10小时", "10小时以上"].map(duration => (
                    <button key={duration} className="px-3 py-1.5 text-[12px] bg-[#F5F1EB] text-[#666666] rounded-full hover:bg-[#C41E3A]/10 hover:text-[#C41E3A]">
                      {duration}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex gap-3">
              <button className="flex-1 py-2.5 border border-[#E8E0D5] rounded-full text-[13px] text-[#666666]">重置</button>
              <button onClick={() => setShowFilter(false)} className="flex-1 py-2.5 bg-[#C41E3A] text-white rounded-full text-[13px] font-medium">确定</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function CoursesListPage() {
  return (
    <Suspense fallback={null}>
      <CoursesListContent />
    </Suspense>
  )
}
