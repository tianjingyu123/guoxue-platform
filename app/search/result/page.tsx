"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ChevronLeft, Search, X, Sparkles, ChevronDown, ChevronUp,
  FileText, Users, BookOpen, ShoppingBag, User, Play,
  Heart, MessageCircle, Star, TrendingUp
} from "lucide-react"

type TabType = 'all' | 'content' | 'circle' | 'course' | 'product' | 'user'

const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: '综合', icon: Search },
  { key: 'content', label: '内容', icon: FileText },
  { key: 'circle', label: '圈子', icon: Users },
  { key: 'course', label: '课程', icon: BookOpen },
  { key: 'product', label: '商品', icon: ShoppingBag },
  { key: 'user', label: '用户', icon: User },
]

// 来源页面 → 默认Tab 映射（从课程页搜索默认落"课程"Tab）
const fromToTab: Record<string, TabType> = {
  course: 'course',
  mall: 'product',
  shop: 'product',
  circle: 'circle',
  classics: 'content',
}

function SearchResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const from = searchParams.get('from') || ''

  const [searchValue, setSearchValue] = useState(keyword)
  const [activeTab, setActiveTab] = useState<TabType>(fromToTab[from] || 'all')
  const [loading, setLoading] = useState(true)
  const [aiExpanded, setAiExpanded] = useState(true)

  // Mock AI summary
  const aiSummary = {
    summary: `关于"${keyword}"的搜索结果显示，这是国学领域的重要概念。根据平台内容分析，相关课程和文章主要涵盖基础理论、实践应用和案例分析三个方面。`,
    keyPoints: [
      '基础理论知识体系完整',
      '实践案例丰富详实',
      '多位名师深度讲解',
    ],
    relatedQuestions: ['如何入门学习？', '有哪些经典书籍推荐？', '实际应用场景有哪些？'],
  }

  // Mock search results
  const results = {
    contents: [
      { id: '1', type: 'article' as const, title: `深入解读${keyword}的核心要义`, summary: '本文从多个角度深入分析，帮助读者全面理解其内涵与外延...', cover: '', author: { id: '1', name: '张老师', avatar: '' }, likes: 328, comments: 56, createdAt: '2024-01-15' },
      { id: '2', type: 'video' as const, title: `${keyword}入门必看教程`, summary: '零基础小白也能快速上手，系统学习核心知识点...', cover: '', author: { id: '2', name: '李讲师', avatar: '' }, likes: 892, comments: 124, createdAt: '2024-01-10' },
      { id: '3', type: 'post' as const, title: `我学习${keyword}三年的心得体会`, summary: '分享我的学习历程和一些实用的学习方法...', cover: '', author: { id: '3', name: '老学员', avatar: '' }, likes: 156, comments: 38, createdAt: '2024-01-08' },
    ],
    circles: [
      { id: '1', name: `${keyword}研习社`, cover: '', description: '专注于国学知识的深度探讨与交流', memberCount: 12580, postCount: 3420 },
      { id: '2', name: `${keyword}爱好者`, cover: '', description: '志同道合的朋友一起学习成长', memberCount: 8960, postCount: 2180 },
    ],
    courses: [
      { id: '1', title: `${keyword}系统精讲课`, cover: '', price: 299, originalPrice: 599, teacher: '王教授', studentCount: 5680, rating: 4.9 },
      { id: '2', title: `${keyword}实战应用班`, cover: '', price: 199, originalPrice: 399, teacher: '赵讲师', studentCount: 3240, rating: 4.8 },
      { id: '3', title: `${keyword}高级研修课`, cover: '', price: 499, originalPrice: 999, teacher: '钱大师', studentCount: 1890, rating: 4.9 },
    ],
    products: [
      { id: '1', name: `${keyword}经典教材`, cover: '', price: 68, originalPrice: 98, sales: 2380 },
      { id: '2', name: `${keyword}学习工具套装`, cover: '', price: 128, originalPrice: 198, sales: 1560 },
    ],
    users: [
      { id: '1', name: '国学大师张三', avatar: '', bio: '专注国学研究30年，著有多部畅销书籍', followers: 128000, isFollowed: false },
      { id: '2', name: '李老师讲国学', avatar: '', bio: '每日分享国学智慧，让传统文化走进生活', followers: 86000, isFollowed: true },
    ],
  }

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [keyword, activeTab])

  const handleSearch = () => {
    if (searchValue.trim() && searchValue !== keyword) {
      router.push(`/search/result?keyword=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const highlightKeyword = (text: string) => {
    if (!keyword) return text
    const regex = new RegExp(`(${keyword})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      part.toLowerCase() === keyword.toLowerCase() 
        ? <span key={i} className="text-[#C41E3A] font-medium">{part}</span>
        : part
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索课程、圈子、商品..."
              className="w-full h-10 pl-10 pr-10 rounded-full bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
            {searchValue && (
              <button
                onClick={() => setSearchValue('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4 text-[#999999]" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="text-[#C41E3A] text-sm font-medium whitespace-nowrap"
          >
            搜索
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[#C41E3A] border-[#C41E3A]'
                  : 'text-[#666666] border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* AI Summary */}
            {activeTab === 'all' && (
              <div className="p-4">
                <div className="bg-gradient-to-br from-[#C41E3A]/5 to-[#C9A96E]/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setAiExpanded(!aiExpanded)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#C9A96E] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-[#2C2C2C]">AI智能总结</span>
                    </div>
                    {aiExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#666666]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#666666]" />
                    )}
                  </button>
                  
                  {aiExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-sm text-[#666666] leading-relaxed">
                        {aiSummary.summary}
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-[#999999]">核心要点</p>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.keyPoints.map((point, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-white rounded-full text-xs text-[#666666]"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-[#999999]">相关问题</p>
                        <div className="space-y-1">
                          {aiSummary.relatedQuestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => router.push(`/search/result?keyword=${encodeURIComponent(q)}`)}
                              className="block text-sm text-[#C41E3A] hover:underline"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            <div className="px-4 space-y-4">
              {/* Content Results */}
              {(activeTab === 'all' || activeTab === 'content') && results.contents.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#2C2C2C]">相关内容</h3>
                      <button
                        onClick={() => setActiveTab('content')}
                        className="text-xs text-[#C41E3A]"
                      >
                        查看全部
                      </button>
                    </div>
                  )}
                  {results.contents.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(item.type === 'video' ? `/videos/${item.id}` : `/articles/${item.id}`)}
                      className="bg-white rounded-2xl p-4 active:bg-gray-50"
                    >
                      <div className="flex gap-3">
                        {item.cover && (
                          <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex-shrink-0 flex items-center justify-center">
                            {item.type === 'video' && <Play className="w-6 h-6 text-[#C41E3A]" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === 'video' && (
                              <span className="px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-[10px] rounded">视频</span>
                            )}
                            {item.type === 'article' && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded">文章</span>
                            )}
                            {item.type === 'post' && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[10px] rounded">帖子</span>
                            )}
                          </div>
                          <h4 className="font-medium text-[#2C2C2C] text-sm line-clamp-1">
                            {highlightKeyword(item.title)}
                          </h4>
                          <p className="text-xs text-[#999999] line-clamp-2 mt-1">
                            {highlightKeyword(item.summary)}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[#999999]">{item.author.name}</span>
                            <div className="flex items-center gap-3 text-xs text-[#999999]">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />{item.likes}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />{item.comments}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Circle Results */}
              {(activeTab === 'all' || activeTab === 'circle') && results.circles.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#2C2C2C]">相关圈子</h3>
                      <button
                        onClick={() => setActiveTab('circle')}
                        className="text-xs text-[#C41E3A]"
                      >
                        查看全部
                      </button>
                    </div>
                  )}
                  {results.circles.map((circle) => (
                    <div
                      key={circle.id}
                      onClick={() => router.push(`/circles/${circle.id}`)}
                      className="bg-white rounded-2xl p-4 flex items-center gap-3 active:bg-gray-50"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-[#C41E3A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#2C2C2C]">
                          {highlightKeyword(circle.name)}
                        </h4>
                        <p className="text-xs text-[#999999] line-clamp-1 mt-0.5">
                          {circle.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#999999]">
                          <span>{formatNumber(circle.memberCount)}成员</span>
                          <span>{formatNumber(circle.postCount)}帖子</span>
                        </div>
                      </div>
                      <button className="px-4 py-1.5 bg-[#C41E3A] text-white text-xs rounded-full">
                        加入
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Course Results */}
              {(activeTab === 'all' || activeTab === 'course') && results.courses.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#2C2C2C]">相关课程</h3>
                      <button
                        onClick={() => setActiveTab('course')}
                        className="text-xs text-[#C41E3A]"
                      >
                        查看全部
                      </button>
                    </div>
                  )}
                  <div className={activeTab === 'course' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                    {results.courses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className={`bg-white rounded-2xl overflow-hidden active:bg-gray-50 ${
                          activeTab === 'course' ? '' : 'flex gap-3 p-4'
                        }`}
                      >
                        <div className={`bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex items-center justify-center ${
                          activeTab === 'course' ? 'aspect-[4/3]' : 'w-24 h-16 rounded-lg flex-shrink-0'
                        }`}>
                          <BookOpen className="w-8 h-8 text-[#C41E3A]" />
                        </div>
                        <div className={activeTab === 'course' ? 'p-3' : 'flex-1 min-w-0'}>
                          <h4 className="font-medium text-[#2C2C2C] text-sm line-clamp-2">
                            {highlightKeyword(course.title)}
                          </h4>
                          <p className="text-xs text-[#999999] mt-1">{course.teacher}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-[#C9A96E] fill-[#C9A96E]" />
                              <span className="text-xs text-[#C9A96E]">{course.rating}</span>
                            </div>
                            <span className="text-xs text-[#999999]">{formatNumber(course.studentCount)}人学习</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[#C41E3A] font-bold">¥{course.price}</span>
                            {course.originalPrice && (
                              <span className="text-xs text-[#999999] line-through">¥{course.originalPrice}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Results */}
              {(activeTab === 'all' || activeTab === 'product') && results.products.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#2C2C2C]">相关商品</h3>
                      <button
                        onClick={() => setActiveTab('product')}
                        className="text-xs text-[#C41E3A]"
                      >
                        查看全部
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {results.products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => router.push(`/mall/product/${product.id}`)}
                        className="bg-white rounded-2xl overflow-hidden active:bg-gray-50"
                      >
                        <div className="aspect-square bg-gradient-to-br from-[#C41E3A]/10 to-[#C9A96E]/10 flex items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-[#C41E3A]/50" />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-[#2C2C2C] text-sm line-clamp-2">
                            {highlightKeyword(product.name)}
                          </h4>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[#C41E3A] font-bold">¥{product.price}</span>
                              {product.originalPrice && (
                                <span className="text-xs text-[#999999] line-through">¥{product.originalPrice}</span>
                              )}
                            </div>
                            <span className="text-xs text-[#999999]">{product.sales}人购买</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Results */}
              {(activeTab === 'all' || activeTab === 'user') && results.users.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#2C2C2C]">相关用户</h3>
                      <button
                        onClick={() => setActiveTab('user')}
                        className="text-xs text-[#C41E3A]"
                      >
                        查看全部
                      </button>
                    </div>
                  )}
                  {results.users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => router.push(`/user/${user.id}`)}
                      className="bg-white rounded-2xl p-4 flex items-center gap-3 active:bg-gray-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 flex items-center justify-center">
                        <User className="w-6 h-6 text-[#C41E3A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#2C2C2C]">
                          {highlightKeyword(user.name)}
                        </h4>
                        {user.bio && (
                          <p className="text-xs text-[#999999] line-clamp-1 mt-0.5">{user.bio}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-[#999999]">
                          <TrendingUp className="w-3 h-3" />
                          <span>{formatNumber(user.followers)}粉丝</span>
                        </div>
                      </div>
                      <button
                        className={`px-4 py-1.5 text-xs rounded-full ${
                          user.isFollowed
                            ? 'bg-gray-100 text-[#666666]'
                            : 'bg-[#C41E3A] text-white'
                        }`}
                      >
                        {user.isFollowed ? '已关注' : '关注'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && 
                results.contents.length === 0 && 
                results.circles.length === 0 && 
                results.courses.length === 0 && 
                results.products.length === 0 && 
                results.users.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium">没有找到相关内容</p>
                  <p className="text-sm text-muted-foreground mt-1">换个关键词，或试试下面的热门搜索</p>
                  {/* 热门搜索引导 - 不让用户走进死胡同 */}
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {['八字入门', '紫微斗数', '风水布局', '奇门遁甲', '六爻预测'].map((kw) => (
                      <button
                        key={kw}
                        onClick={() => router.push(`/search/result?keyword=${encodeURIComponent(kw)}`)}
                        className="px-3 py-1.5 bg-secondary text-sm text-foreground rounded-full hover:bg-secondary/70 transition-colors"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
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
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SearchResultPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SearchResultContent />
    </Suspense>
  )
}
