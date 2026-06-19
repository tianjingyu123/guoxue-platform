'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Gift, Star, TrendingUp, Clock, HelpCircle, Zap, BookOpen, MessageCircle, Share2, Calendar, ShoppingBag } from 'lucide-react'

interface PointsInfo {
  balance: number
  todayEarned: number
  monthEarned: number
  totalEarned: number
  expiringSoon: number
  expireDate?: string
}

interface GrowthInfo {
  value: number
  level: number
  levelName: string
  nextLevel: number
  nextLevelName: string
  nextLevelValue: number
  progress: number
}

interface PointsRecord {
  id: string
  type: 'income' | 'expense'
  title: string
  description: string
  points: number
  balance: number
  createdAt: string
}

interface EarnRule {
  id: string
  title: string
  description: string
  points: number
  icon: string
  limit?: string
  completed?: boolean
}

export default function PointsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'points' | 'growth'>('points')
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null)
  const [growthInfo, setGrowthInfo] = useState<GrowthInfo | null>(null)
  const [records, setRecords] = useState<PointsRecord[]>([])
  const [earnRules, setEarnRules] = useState<EarnRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPointsInfo({
        balance: 2580,
        todayEarned: 30,
        monthEarned: 450,
        totalEarned: 12680,
        expiringSoon: 200,
        expireDate: '2026-12-31'
      })
      setGrowthInfo({
        value: 3250,
        level: 4,
        levelName: '金牌学员',
        nextLevel: 5,
        nextLevelName: '钻石学员',
        nextLevelValue: 5000,
        progress: 65
      })
      setEarnRules([
        { id: '1', title: '每日签到', description: '连续签到奖励翻倍', points: 10, icon: 'calendar', limit: '每日1次', completed: true },
        { id: '2', title: '完成学习', description: '学习课程满30分钟', points: 20, icon: 'book', limit: '每日3次', completed: false },
        { id: '3', title: '发表评论', description: '发表优质课程评论', points: 15, icon: 'message', limit: '每日5次', completed: false },
        { id: '4', title: '分享内容', description: '分享课程或圈子内容', points: 10, icon: 'share', limit: '每日3次', completed: false },
        { id: '5', title: '购买课程', description: '每消费10元获1积分', points: 1, icon: 'shopping', limit: '无上限' },
        { id: '6', title: '邀请好友', description: '好友注册成功', points: 100, icon: 'gift', limit: '无上限' },
      ])
      setRecords([
        { id: '1', type: 'income', title: '每日签到', description: '连续签到第7天', points: 20, balance: 2580, createdAt: '2026-06-03 08:30' },
        { id: '2', type: 'income', title: '完成学习', description: '学习《易经入门》30分钟', points: 20, balance: 2560, createdAt: '2026-06-02 20:15' },
        { id: '3', type: 'expense', title: '积分兑换', description: '兑换优惠券', points: -100, balance: 2540, createdAt: '2026-06-02 15:00' },
        { id: '4', type: 'income', title: '发表评论', description: '课程评论获赞', points: 15, balance: 2640, createdAt: '2026-06-01 14:20' },
        { id: '5', type: 'income', title: '邀请好友', description: '好友张三注册成功', points: 100, balance: 2625, createdAt: '2026-05-30 10:00' },
      ])
      setLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'calendar': return <Calendar className="w-5 h-5" />
      case 'book': return <BookOpen className="w-5 h-5" />
      case 'message': return <MessageCircle className="w-5 h-5" />
      case 'share': return <Share2 className="w-5 h-5" />
      case 'shopping': return <ShoppingBag className="w-5 h-5" />
      case 'gift': return <Gift className="w-5 h-5" />
      default: return <Star className="w-5 h-5" />
    }
  }

  const levelColors = [
    { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
    { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-300' },
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-300' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-300' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-300' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 flex justify-center gap-8">
              <div className="w-16 h-6 bg-muted rounded animate-pulse" />
              <div className="w-16 h-6 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-40 bg-muted rounded-2xl animate-pulse" />
          <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex justify-center gap-8">
            <button
              onClick={() => setActiveTab('points')}
              className={`text-base font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'points' ? 'text-[#C41E3A] border-[#C41E3A]' : 'text-muted-foreground border-transparent'
              }`}
            >
              我的积分
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`text-base font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'growth' ? 'text-[#C41E3A] border-[#C41E3A]' : 'text-muted-foreground border-transparent'
              }`}
            >
              成长值
            </button>
          </div>
          <button onClick={() => setShowRules(true)} className="p-2 -mr-2">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {activeTab === 'points' && pointsInfo && (
        <>
          {/* Points Card */}
          <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-[#C41E3A] to-[#8B0000] rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/80 text-sm">可用积分</span>
              {pointsInfo.expiringSoon > 0 && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {pointsInfo.expiringSoon}积分将于{pointsInfo.expireDate}过期
                </span>
              )}
            </div>
            <div className="text-4xl font-bold mb-4">{pointsInfo.balance.toLocaleString()}</div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-white/60">今日获取</span>
                <span className="ml-2 text-[#C9A96E]">+{pointsInfo.todayEarned}</span>
              </div>
              <div>
                <span className="text-white/60">本月获取</span>
                <span className="ml-2 text-[#C9A96E]">+{pointsInfo.monthEarned}</span>
              </div>
              <div>
                <span className="text-white/60">累计获取</span>
                <span className="ml-2">{pointsInfo.totalEarned.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => router.push('/points/exchange')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">积分兑换</div>
                  <div className="text-xs text-muted-foreground">兑换优惠券、实物商品</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Earn Points */}
          <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-medium">赚取积分</span>
              <button
                onClick={() => setShowRules(true)}
                className="text-xs text-[#C41E3A]"
              >
                积分规则
              </button>
            </div>
            <div className="p-4 space-y-3">
              {earnRules.map(rule => (
                <div key={rule.id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    rule.completed ? 'bg-green-50' : 'bg-muted'
                  }`}>
                    {getIcon(rule.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rule.title}</span>
                      {rule.completed && (
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">已完成</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{rule.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#C41E3A]">+{rule.points}</div>
                    {rule.limit && <div className="text-xs text-muted-foreground">{rule.limit}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Points Records */}
          <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-medium">积分明细</span>
              <button
                onClick={() => router.push('/points/history')}
                className="text-xs text-[#C41E3A] flex items-center"
              >
                查看全部
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {records.map(record => (
                <div key={record.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-sm">{record.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{record.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{record.createdAt}</div>
                  </div>
                  <div className={`text-base font-medium ${
                    record.type === 'income' ? 'text-[#C41E3A]' : 'text-foreground'
                  }`}>
                    {record.type === 'income' ? '+' : ''}{record.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'growth' && growthInfo && (
        <>
          {/* Growth Card */}
          <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm">当前成长值</span>
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-white/20`}>
                {growthInfo.levelName}
              </div>
            </div>
            <div className="text-4xl font-bold mb-4">{growthInfo.value.toLocaleString()}</div>
            
            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Lv.{growthInfo.level} {growthInfo.levelName}</span>
                <span>Lv.{growthInfo.nextLevel} {growthInfo.nextLevelName}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${growthInfo.progress}%` }}
                />
              </div>
              <div className="text-xs text-white/80 mt-1 text-center">
                还需 {growthInfo.nextLevelValue - growthInfo.value} 成长值升级
              </div>
            </div>
          </div>

          {/* Level Benefits */}
          <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <span className="font-medium">等级权益</span>
            </div>
            <div className="p-4">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {[
                  { level: 1, name: '青铜学员', value: 0, benefits: ['基础功能'] },
                  { level: 2, name: '白银学员', value: 500, benefits: ['9.8折优惠', '专属客服'] },
                  { level: 3, name: '黄金学员', value: 1500, benefits: ['9.5折优惠', '优先答疑'] },
                  { level: 4, name: '金牌学员', value: 3000, benefits: ['9折优惠', '免费直播'] },
                  { level: 5, name: '钻石学员', value: 5000, benefits: ['8.5折优惠', '专属课程'] },
                  { level: 6, name: '至尊学员', value: 10000, benefits: ['8折优惠', '一对一'] },
                ].map((item, index) => {
                  const colors = levelColors[index] || levelColors[0]
                  const isCurrent = item.level === growthInfo.level
                  return (
                    <div
                      key={item.level}
                      className={`flex-shrink-0 w-28 p-3 rounded-xl border-2 ${
                        isCurrent ? `${colors.bg} ${colors.border}` : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className={`text-xs font-medium ${isCurrent ? colors.text : 'text-muted-foreground'}`}>
                        Lv.{item.level}
                      </div>
                      <div className={`text-sm font-medium mt-0.5 ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{item.value}+</div>
                      <div className="mt-2 space-y-0.5">
                        {item.benefits.map((b, i) => (
                          <div key={i} className="text-xs text-muted-foreground truncate">{b}</div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Growth Rules */}
          <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <span className="font-medium">成长值获取</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: <ShoppingBag className="w-5 h-5" />, title: '购买课程', desc: '每消费10元获得10成长值', value: '+10/10元' },
                { icon: <BookOpen className="w-5 h-5" />, title: '完成学习', desc: '完成课程章节学习', value: '+5/章节' },
                { icon: <Star className="w-5 h-5" />, title: '完成课程', desc: '完成整门课程学习', value: '+50/课程' },
                { icon: <MessageCircle className="w-5 h-5" />, title: '互动参与', desc: '发表评论、参与讨论', value: '+2/次' },
                { icon: <TrendingUp className="w-5 h-5" />, title: '连续学习', desc: '连续7天学习奖励', value: '+100' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <div className="text-sm font-medium text-amber-600">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowRules(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">积分规则</span>
                <button onClick={() => setShowRules(false)} className="text-muted-foreground">关闭</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">一、积分获取</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. 每日签到可获得10积分，连续签到可获得额外奖励</li>
                  <li>2. 学习课程满30分钟可获得20积分，每日最多3次</li>
                  <li>3. 发表优质评论可获得15积分，每日最多5次</li>
                  <li>4. 分享内容可获得10积分，每日最多3次</li>
                  <li>5. 购买课程每消费10元可获得1积分</li>
                  <li>6. 邀请好友注册成功可获得100积分</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">二、积分使用</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. 积分可在积分商城兑换优惠券、实物商品等</li>
                  <li>2. 部分课程支持积分抵扣，100积分=1元</li>
                  <li>3. 积分不可提现、不可转让</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">三、积分有效期</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. 积分自获取之日起，有效期为1年</li>
                  <li>2. 过期积分将自动清零，请及时使用</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
