"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ChevronLeft, Search, X, Filter, Clock, FileText, Users, 
  BookOpen, ShoppingBag, User, SlidersHorizontal, RotateCcw,
  ChevronDown, Check, Calendar
} from "lucide-react"

interface FilterState {
  keyword: string
  timeRange: string
  contentType: string[]
  author: string
  circle: string
  category: string
  sortBy: string
}

const defaultFilters: FilterState = {
  keyword: '',
  timeRange: 'all',
  contentType: [],
  author: '',
  circle: '',
  category: '',
  sortBy: 'relevance'
}

const timeRangeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近一周' },
  { value: 'month', label: '最近一月' },
  { value: 'year', label: '最近一年' },
  { value: 'custom', label: '自定义' }
]

const contentTypeOptions = [
  { value: 'article', label: '文章', icon: FileText },
  { value: 'post', label: '动态', icon: Users },
  { value: 'course', label: '课程', icon: BookOpen },
  { value: 'product', label: '商品', icon: ShoppingBag },
  { value: 'user', label: '用户', icon: User },
  { value: 'video', label: '视频', icon: FileText }
]

const categoryOptions = [
  { value: '', label: '全部分类' },
  { value: 'yijing', label: '易经' },
  { value: 'fengshui', label: '风水' },
  { value: 'bazi', label: '八字' },
  { value: 'meihua', label: '梅花' },
  { value: 'liuyao', label: '六爻' },
  { value: 'qimen', label: '奇门' }
]

const sortOptions = [
  { value: 'relevance', label: '相关度' },
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最热门' },
  { value: 'comments', label: '评论最多' }
]

interface SearchResultItem {
  id: string
  type: string
  title: string
  summary: string
  cover?: string
  author?: { name: string; avatar: string }
  createdAt: string
  stats?: { views?: number; likes?: number; comments?: number }
}

function AdvancedSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    keyword: searchParams.get('keyword') || ''
  })
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  // Mock search
  const performSearch = useCallback(() => {
    if (!filters.keyword.trim()) return
    setLoading(true)
    setTimeout(() => {
      setResults([
        {
          id: '1',
          type: 'article',
          title: `${filters.keyword}入门指南`,
          summary: `关于${filters.keyword}的详细讲解，从基础概念到实际应用...`,
          cover: '/placeholder.svg?height=120&width=160',
          author: { name: '易学大师', avatar: '/placeholder.svg?height=32&width=32' },
          createdAt: '2024-01-15',
          stats: { views: 1234, likes: 89, comments: 23 }
        },
        {
          id: '2',
          type: 'course',
          title: `${filters.keyword}实战课程`,
          summary: `系统学习${filters.keyword}，掌握核心技巧...`,
          cover: '/placeholder.svg?height=120&width=160',
          author: { name: '国学名师', avatar: '/placeholder.svg?height=32&width=32' },
          createdAt: '2024-01-10',
          stats: { views: 5678, likes: 456, comments: 78 }
        },
        {
          id: '3',
          type: 'post',
          title: `分享我的${filters.keyword}学习心得`,
          summary: `经过三个月的学习，终于有了一些感悟...`,
          author: { name: '学习者小王', avatar: '/placeholder.svg?height=32&width=32' },
          createdAt: '2024-01-20',
          stats: { views: 234, likes: 45, comments: 12 }
        }
      ])
      setTotal(156)
      setLoading(false)
    }, 500)
  }, [filters])

  useEffect(() => {
    if (filters.keyword) {
      performSearch()
    }
  }, [filters, performSearch])

  const updateFilter = (key: keyof FilterState, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleContentType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      contentType: prev.contentType.includes(type)
        ? prev.contentType.filter(t => t !== type)
        : [...prev.contentType, type]
    }))
  }

  const resetFilters = () => {
    setFilters({ ...defaultFilters, keyword: filters.keyword })
  }

  const getActiveFilters = () => {
    const active: { key: keyof FilterState; label: string; value: string }[] = []
    if (filters.timeRange !== 'all') {
      const option = timeRangeOptions.find(o => o.value === filters.timeRange)
      if (option) active.push({ key: 'timeRange', label: option.label, value: filters.timeRange })
    }
    filters.contentType.forEach(type => {
      const option = contentTypeOptions.find(o => o.value === type)
      if (option) active.push({ key: 'contentType', label: option.label, value: type })
    })
    if (filters.author) {
      active.push({ key: 'author', label: `作者: ${filters.author}`, value: filters.author })
    }
    if (filters.circle) {
      active.push({ key: 'circle', label: `圈子: ${filters.circle}`, value: filters.circle })
    }
    if (filters.category) {
      const option = categoryOptions.find(o => o.value === filters.category)
      if (option) active.push({ key: 'category', label: option.label, value: filters.category })
    }
    if (filters.sortBy !== 'relevance') {
      const option = sortOptions.find(o => o.value === filters.sortBy)
      if (option) active.push({ key: 'sortBy', label: `排序: ${option.label}`, value: filters.sortBy })
    }
    return active
  }

  const removeFilter = (key: keyof FilterState, value?: string) => {
    if (key === 'contentType' && value) {
      toggleContentType(value)
    } else if (key === 'timeRange') {
      updateFilter('timeRange', 'all')
    } else if (key === 'sortBy') {
      updateFilter('sortBy', 'relevance')
    } else {
      updateFilter(key, '')
    }
  }

  const activeFilters = getActiveFilters()

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof FileText> = {
      article: FileText,
      post: Users,
      course: BookOpen,
      product: ShoppingBag,
      user: User,
      video: FileText
    }
    const Icon = icons[type] || FileText
    return <Icon className="w-4 h-4" />
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      article: '文章',
      post: '动态',
      course: '课程',
      product: '商品',
      user: '用户',
      video: '视频'
    }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-[#FAF8F5] rounded-full px-4 py-2">
            <Search className="w-4 h-4 text-[#999999]" />
            <input
              type="text"
              value={filters.keyword}
              onChange={e => updateFilter('keyword', e.target.value)}
              placeholder="搜索内容..."
              className="flex-1 bg-transparent text-sm text-[#2C2C2C] outline-none"
            />
            {filters.keyword && (
              <button onClick={() => updateFilter('keyword', '')} className="p-0.5">
                <X className="w-4 h-4 text-[#999999]" />
              </button>
            )}
          </div>
          <button
            onClick={() => filters.keyword && performSearch()}
            className="text-[#C41E3A] font-medium text-sm"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-1 text-[#C41E3A]">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-sm font-medium whitespace-nowrap">筛选</span>
          </div>

          {/* Time Range */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'time' ? null : 'time')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              filters.timeRange !== 'all'
                ? 'bg-[#C41E3A]/10 border-[#C41E3A] text-[#C41E3A]'
                : 'bg-[#FAF8F5] border-transparent text-[#666666]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeRangeOptions.find(o => o.value === filters.timeRange)?.label || '时间'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeFilter === 'time' ? 'rotate-180' : ''}`} />
          </button>

          {/* Content Type */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'type' ? null : 'type')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              filters.contentType.length > 0
                ? 'bg-[#C41E3A]/10 border-[#C41E3A] text-[#C41E3A]'
                : 'bg-[#FAF8F5] border-transparent text-[#666666]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>类型{filters.contentType.length > 0 ? `(${filters.contentType.length})` : ''}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeFilter === 'type' ? 'rotate-180' : ''}`} />
          </button>

          {/* Category */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'category' ? null : 'category')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              filters.category
                ? 'bg-[#C41E3A]/10 border-[#C41E3A] text-[#C41E3A]'
                : 'bg-[#FAF8F5] border-transparent text-[#666666]'
            }`}
          >
            <span>{filters.category ? categoryOptions.find(o => o.value === filters.category)?.label : '分类'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeFilter === 'category' ? 'rotate-180' : ''}`} />
          </button>

          {/* Sort */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'sort' ? null : 'sort')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              filters.sortBy !== 'relevance'
                ? 'bg-[#C41E3A]/10 border-[#C41E3A] text-[#C41E3A]'
                : 'bg-[#FAF8F5] border-transparent text-[#666666]'
            }`}
          >
            <span>{sortOptions.find(o => o.value === filters.sortBy)?.label || '排序'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeFilter === 'sort' ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Dropdown */}
        {activeFilter && (
          <div className="px-4 py-3 border-t border-[#E8E3DB] bg-[#FAF8F5]">
            {activeFilter === 'time' && (
              <div className="flex flex-wrap gap-2">
                {timeRangeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      updateFilter('timeRange', option.value)
                      setActiveFilter(null)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      filters.timeRange === option.value
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white text-[#666666] border border-[#E8E3DB]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {activeFilter === 'type' && (
              <div className="grid grid-cols-3 gap-2">
                {contentTypeOptions.map(option => {
                  const Icon = option.icon
                  const isSelected = filters.contentType.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleContentType(option.value)}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-[#C41E3A] text-white'
                          : 'bg-white text-[#666666] border border-[#E8E3DB]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  )
                })}
              </div>
            )}

            {activeFilter === 'category' && (
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      updateFilter('category', option.value)
                      setActiveFilter(null)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      filters.category === option.value
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white text-[#666666] border border-[#E8E3DB]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {activeFilter === 'sort' && (
              <div className="flex flex-wrap gap-2">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      updateFilter('sortBy', option.value)
                      setActiveFilter(null)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      filters.sortBy === option.value
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white text-[#666666] border border-[#E8E3DB]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Filters Tags */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            <span className="text-xs text-[#999999] whitespace-nowrap">已选:</span>
            {activeFilters.map((filter, index) => (
              <span
                key={`${filter.key}-${filter.value}-${index}`}
                className="flex items-center gap-1 px-2 py-1 bg-[#C41E3A]/10 text-[#C41E3A] rounded text-xs whitespace-nowrap"
              >
                {filter.label}
                <button
                  onClick={() => removeFilter(filter.key, filter.key === 'contentType' ? filter.value : undefined)}
                  className="p-0.5 hover:bg-[#C41E3A]/20 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-[#999999] whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              重置
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-24 h-16 bg-[#E8E3DB] rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#E8E3DB] rounded w-3/4" />
                    <div className="h-3 bg-[#E8E3DB] rounded w-full" />
                    <div className="h-3 bg-[#E8E3DB] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#666666]">
                共找到 <span className="text-[#C41E3A] font-medium">{total}</span> 条结果
              </span>
            </div>
            <div className="space-y-3">
              {results.map(item => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/${item.type}s/${item.id}`)}
                  className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex gap-3">
                    {item.cover && (
                      <img
                        src={item.cover}
                        alt=""
                        className="w-24 h-16 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded text-xs">
                          {getTypeIcon(item.type)}
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      <h3 className="font-medium text-[#2C2C2C] line-clamp-1 mb-1">{item.title}</h3>
                      <p className="text-sm text-[#666666] line-clamp-2">{item.summary}</p>
                      {item.author && (
                        <div className="flex items-center gap-2 mt-2">
                          <img
                            src={item.author.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-xs text-[#999999]">{item.author.name}</span>
                          <span className="text-xs text-[#999999]">{item.createdAt}</span>
                          {item.stats && (
                            <span className="text-xs text-[#999999]">
                              {item.stats.views}阅读 · {item.stats.likes}赞
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : filters.keyword ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-[#E8E3DB] rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-[#999999]" />
            </div>
            <p className="text-[#666666] mb-2">未找到相关结果</p>
            <p className="text-sm text-[#999999]">试试调整筛选条件或更换关键词</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-[#E8E3DB] rounded-full flex items-center justify-center mb-4">
              <Filter className="w-10 h-10 text-[#999999]" />
            </div>
            <p className="text-[#666666] mb-2">输入关键词开始搜索</p>
            <p className="text-sm text-[#999999]">使用筛选条件精确查找内容</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdvancedSearchContent />
    </Suspense>
  )
}
