'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Search, ChevronRight, Star, Flame, 
  TrendingUp, Sparkles, Crown, BadgeCheck, Grid3X3,
  Calendar, Compass, Heart, PenTool, Moon, Scan, Hand, MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState } from '@/components/data-state'
import { getBotMarketplaceData, getBotList, formatHotScore } from '@/lib/api/bots'
import type { BotItem, BotCategory, BotMarketplaceData } from '@/lib/types/bots'

// 分类图标映射
const categoryIcons: Record<string, React.ReactNode> = {
  'all': <Grid3X3 className="w-4 h-4" />,
  'bazi': <Calendar className="w-4 h-4" />,
  'fengshui': <Compass className="w-4 h-4" />,
  'health': <Heart className="w-4 h-4" />,
  'divination': <Sparkles className="w-4 h-4" />,
  'naming': <PenTool className="w-4 h-4" />,
  'dream': <Moon className="w-4 h-4" />,
  'face': <Scan className="w-4 h-4" />,
  'palm': <Hand className="w-4 h-4" />,
  'other': <MoreHorizontal className="w-4 h-4" />,
}

export default function BotsPage() {
  const router = useRouter()
  const [marketplaceData, setMarketplaceData] = useState<BotMarketplaceData | null>(null)
  const [botList, setBotList] = useState<BotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<BotCategory>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // 加载广场首页数据
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await getBotMarketplaceData()
        if (res.code === 200) {
          setMarketplaceData(res.data)
          setBotList(res.data.hotBots)
        } else {
          setError(res.message)
        }
      } catch {
        setError('加载失败，请重试')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 切换分类加载列表
  const handleCategoryChange = async (category: BotCategory) => {
    setSelectedCategory(category)
    setListLoading(true)
    try {
      const res = await getBotList(category)
      if (res.code === 200) {
        setBotList(res.data.list)
      }
    } finally {
      setListLoading(false)
    }
  }

  // 跳转Bot对话
  const handleBotClick = (botId: number) => {
    router.push(`/bots/chat/${botId}`)
  }

  // 骨架屏
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="bg-gradient-to-r from-[#C41E3A] to-[#A01830] text-white p-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-8 h-8 rounded-full bg-white/20" />
            <Skeleton className="h-6 w-32 bg-white/20" />
          </div>
          <Skeleton className="h-10 w-full rounded-full bg-white/20" />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <DataState
      loading={false}
      error={error}
      onRetry={() => window.location.reload()}
    >
      <div className="min-h-screen bg-[#FAF8F5]">
        {/* 顶部导航 */}
        <div className="bg-gradient-to-r from-[#C41E3A] to-[#A01830] text-white">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  智能体广场
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => router.push('/agents/ranking')}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                排行榜
              </Button>
            </div>

            {/* 搜索框 */}
            <div 
              className="flex items-center bg-white/20 rounded-full px-4 py-2 cursor-pointer"
              onClick={() => setShowSearch(true)}
            >
              <Search className="w-4 h-4 text-white/70 mr-2" />
              <span className="text-white/70 text-sm">搜索智能体...</span>
            </div>
          </div>

          {/* 分类Tab */}
          <div className="px-4 pb-4 pt-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {marketplaceData?.categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`flex-shrink-0 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-white text-[#C41E3A]'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  onClick={() => handleCategoryChange(cat.id)}
                >
                  {categoryIcons[cat.id]}
                  <span className="ml-1">{cat.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Banner 轮播 */}
        {marketplaceData?.banners && marketplaceData.banners.length > 0 && (
          <div className="px-4 -mt-2">
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src={marketplaceData.banners[0].image}
                alt="Banner"
                className="w-full h-32 object-cover"
              />
            </div>
          </div>
        )}

        {/* 热门推荐 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#C41E3A]" />
              热门智能体
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#C41E3A] text-sm"
              onClick={() => handleCategoryChange('all')}
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Bot 卡片网格 */}
          {listLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {botList.map(bot => (
                <div
                  key={bot.id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleBotClick(bot.id)}
                >
                  {/* 头像和标签 */}
                  <div className="relative mb-3">
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-14 h-14 rounded-xl mx-auto"
                    />
                    {bot.isOfficial && (
                      <div className="absolute -top-1 -right-1">
                        <BadgeCheck className="w-5 h-5 text-[#C41E3A] fill-[#C41E3A]/20" />
                      </div>
                    )}
                    {bot.isNew && (
                      <Badge className="absolute -top-1 -left-1 bg-green-500 text-white text-[10px] px-1">
                        NEW
                      </Badge>
                    )}
                  </div>

                  {/* 名称 */}
                  <h3 className="font-medium text-gray-900 text-center text-sm mb-1 truncate">
                    {bot.name}
                  </h3>

                  {/* 描述 */}
                  <p className="text-xs text-gray-500 text-center line-clamp-2 mb-2 min-h-[32px]">
                    {bot.description}
                  </p>

                  {/* 评分和热度 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[#C9A96E]">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{bot.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Flame className="w-3 h-3" />
                      <span>{formatHotScore(bot.useCount)}</span>
                    </div>
                  </div>

                  {/* 价格标签 */}
                  <div className="mt-2 text-center">
                    {bot.isFree ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">
                        免费使用
                      </Badge>
                    ) : (
                      <Badge className="bg-[#C9A96E] text-white text-[10px]">
                        <Crown className="w-3 h-3 mr-0.5" />
                        {bot.price}元/次
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新上线Bot */}
        {marketplaceData?.newBots && marketplaceData.newBots.length > 0 && (
          <div className="p-4 pt-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A96E]" />
                新上线
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {marketplaceData.newBots.map(bot => (
                <div
                  key={bot.id}
                  className="flex-shrink-0 w-32 bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer"
                  onClick={() => handleBotClick(bot.id)}
                >
                  <img
                    src={bot.avatar}
                    alt={bot.name}
                    className="w-12 h-12 rounded-xl mx-auto mb-2"
                  />
                  <h3 className="text-sm font-medium text-center truncate">{bot.name}</h3>
                  <p className="text-[10px] text-gray-400 text-center mt-1">{bot.categoryName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI 推荐 Feed */}
        {marketplaceData?.feedCards && marketplaceData.feedCards.length > 0 && (
          <div className="p-4 pt-0">
            <h2 className="font-bold text-gray-900 mb-3">为你推荐</h2>
            <div className="space-y-3">
              {marketplaceData.feedCards.map(card => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer"
                  onClick={() => router.push(card.link)}
                >
                  {card.type === 'bot_recommend' && card.bot && (
                    <div className="flex items-center gap-3">
                      <img
                        src={card.bot.avatar}
                        alt={card.bot.name}
                        className="w-12 h-12 rounded-xl"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{card.bot.name}</span>
                          {card.bot.isRecommended && (
                            <Badge className="bg-[#C41E3A] text-white text-[10px]">推荐</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{card.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  )}

                  {card.type === 'hot_topic' && card.topic && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <Flame className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">#{card.topic.name}</div>
                        <p className="text-sm text-gray-500">{card.topic.discussCount}人讨论</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  )}

                  {card.type === 'user_story' && card.story && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={card.story.user.avatar}
                          alt={card.story.user.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm text-gray-600">{card.story.user.name}</span>
                        <Badge variant="outline" className="text-[10px]">使用了{card.story.botName}</Badge>
                      </div>
                      <p className="text-gray-700 text-sm">{card.story.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部安全间距 */}
        <div className="h-20" />

        {/* 搜索弹层 */}
        {showSearch && (
          <div className="fixed inset-0 bg-white z-50">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索智能体..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  className="text-[#C41E3A]"
                  onClick={() => {
                    // 执行搜索
                    router.push(`/bots/search?q=${encodeURIComponent(searchKeyword)}`)
                  }}
                >
                  搜索
                </Button>
              </div>
              {/* 热门搜索 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">热门搜索</h3>
                <div className="flex flex-wrap gap-2">
                  {['八字', '起名', '风水', '塔罗', '解梦', '养生'].map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSearchKeyword(tag)
                        router.push(`/bots/search?q=${encodeURIComponent(tag)}`)
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DataState>
  )
}
