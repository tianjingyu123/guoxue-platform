'use client'

import { useState, useEffect } from 'react'
import { Crown, Check, Star, BookOpen, Bot, Radio, ShoppingBag, Gift, Zap, Shield, TrendingUp } from 'lucide-react'
import { BackButton } from '@/components/common/back-button'
import { MembershipComparison } from '@/components/membership/membership-comparison'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { DataState, SkeletonCard, SkeletonLine } from '@/components/data-state'
import { getVipCenterData, purchaseVip, toggleAutoRenew } from '@/lib/api/vip'
import type { VipCenterData, VipPlan, VipLevel } from '@/lib/types/vip'
import { usePaymentBindings } from '@/hooks/use-payment-bindings'
import { BindPaymentDialog } from '@/components/wallet/bind-payment-dialog'

// 权益图标映射
const benefitIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'crown': Crown,
  'video': Bot,
  'download': BookOpen,
  'gift': Gift,
  'book': BookOpen,
  'calculator': Zap,
  'customer-service': Shield,
  'discount': ShoppingBag,
}

// 等级颜色
const levelColors: Record<VipLevel, string> = {
  'none': 'bg-muted',
  'basic': 'bg-amber-500',
  'pro': 'bg-purple-500',
  'premium': 'bg-gradient-to-r from-amber-400 to-orange-500',
}

export default function VIPPage() {
  const [data, setData] = useState<VipCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedLevel, setSelectedLevel] = useState<VipLevel>('pro')
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null)
  const [showPaySheet, setShowPaySheet] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | 'unionpay' | 'huifu'>('wechat')
  const { isBound } = usePaymentBindings()
  const [showBindDialog, setShowBindDialog] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [autoRenewLoading, setAutoRenewLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getVipCenterData()
      if (res.code === 200) {
        setData(res.data)
        // 默认选中当前等级或专业会员
        const defaultLevel = res.data.status.level !== 'none' ? res.data.status.level : 'pro'
        setSelectedLevel(defaultLevel)
        // 默认选中推荐套餐
        const currentGroup = res.data.planGroups.find(g => g.level === defaultLevel)
        const popularPlan = currentGroup?.plans.find(p => p.popular)
        setSelectedPlan(popularPlan || currentGroup?.plans[0] || null)
      } else {
        setError(res.message)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLevel = (level: VipLevel) => {
    setSelectedLevel(level)
    const group = data?.planGroups.find(g => g.level === level)
    const popularPlan = group?.plans.find(p => p.popular)
    setSelectedPlan(popularPlan || group?.plans[0] || null)
  }

  const handleSelectPlan = (plan: VipPlan) => {
    setSelectedPlan(plan)
  }

  const handlePurchase = async () => {
    if (!selectedPlan) return

    // 所选第三方支付渠道未绑定时，引导用户先绑定
    if (!isBound(paymentMethod)) {
      setShowPaySheet(false)
      setShowBindDialog(true)
      return
    }

    setPurchasing(true)
    try {
      const res = await purchaseVip({ planId: selectedPlan.id, paymentMethod })
      if (res.code === 200) {
        toast.success('购买成功', { description: `会员有效期至 ${res.data.expireAt}` })
        setShowPaySheet(false)
        loadData()
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error('购买失败')
    } finally {
      setPurchasing(false)
    }
  }

  const handleToggleAutoRenew = async (enabled: boolean) => {
    setAutoRenewLoading(true)
    try {
      const res = await toggleAutoRenew(enabled)
      if (res.code === 200) {
        toast.success(res.message)
        if (data) {
          setData({ ...data, status: { ...data.status, autoRenew: enabled } })
        }
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setAutoRenewLoading(false)
    }
  }

  // 骨架屏
  const renderSkeleton = () => (
    <div className="min-h-screen bg-background pb-24">
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-accent/20 via-accent/10 to-transparent pointer-events-none" />
      <header className="sticky top-0 z-40 bg-transparent safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="w-10" />
          <SkeletonLine className="w-24 h-5" />
          <div className="w-10" />
        </div>
      </header>
      <div className="relative z-10 px-4 space-y-6">
        <SkeletonCard className="h-44" />
        <div>
          <SkeletonLine className="w-20 h-5 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} className="h-32" />)}
          </div>
        </div>
        <div>
          <SkeletonLine className="w-24 h-5 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} className="h-20" />)}
          </div>
        </div>
      </div>
    </div>
  )

  // 获取当前选中的套餐组
  const currentPlanGroup = data?.planGroups.find(g => g.level === selectedLevel)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部金色渐变背景 */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-accent/20 via-accent/10 to-transparent pointer-events-none" />
      
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-transparent safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-lg text-foreground">会员中心</h1>
          <Link href="/vip/records" className="text-sm text-primary">
            购买记录
          </Link>
        </div>
      </header>

      <DataState
        loading={loading}
        error={error}
        empty={!data}
        skeleton={renderSkeleton()}
        onRetry={loadData}
      >
        {data && (
          <div className="relative z-10 px-4 space-y-6">
            {/* 会员卡片 */}
            <Card className="p-6 bg-gradient-to-br from-accent via-accent/90 to-primary/80 border-0 shadow-xl shadow-accent/20 overflow-hidden relative">
              {/* 装饰图案 */}
              <div className="absolute -right-10 -top-10 w-40 h-40 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-white">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" />
                </svg>
              </div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {data.status.level !== 'none' ? data.status.levelName : '热卜国学VIP'}
                      </h2>
                      {data.status.level !== 'none' && (
                        <Badge className="bg-white/20 text-white border-0">
                          {data.status.level.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/70">
                      {data.status.level !== 'none' 
                        ? (data.status.isExpired 
                            ? '会员已过期' 
                            : `有效期至 ${data.status.expireAt}，还剩 ${data.status.daysLeft} 天`)
                        : '解锁全部特权，畅享国学智慧'}
                    </p>
                  </div>
                </div>
                
                {/* 核心数据 */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">500+</p>
                    <p className="text-xs text-white/70">免费课程</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">无限</p>
                    <p className="text-xs text-white/70">AI对话</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{data.status.points}</p>
                    <p className="text-xs text-white/70">会员积分</p>
                  </div>
                </div>

                {/* 自动续费 */}
                {data.status.level !== 'none' && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                    <span className="text-sm text-white/80">自动续费</span>
                    <Switch
                      checked={data.status.autoRenew}
                      onCheckedChange={handleToggleAutoRenew}
                      disabled={autoRenewLoading}
                      className="data-[state=checked]:bg-white/30"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* 等级选择 */}
            <div>
              <h3 className="font-semibold text-base text-foreground mb-3">选择等级</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {data.planGroups.map(group => (
                  <Button
                    key={group.level}
                    variant={selectedLevel === group.level ? 'default' : 'outline'}
                    className={cn(
                      'flex-shrink-0',
                      selectedLevel === group.level && levelColors[group.level]
                    )}
                    onClick={() => handleSelectLevel(group.level)}
                  >
                    {group.levelName}
                  </Button>
                ))}
              </div>
              {currentPlanGroup && (
                <p className="text-sm text-muted-foreground mt-2">{currentPlanGroup.description}</p>
              )}
            </div>

            {/* 套餐选择 */}
            <div>
              <h3 className="font-semibold text-base text-foreground mb-3">选择套餐</h3>
              <div className="grid grid-cols-3 gap-3">
                {currentPlanGroup?.plans.map(plan => (
                  <Card
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                      'p-3 cursor-pointer transition-all relative overflow-hidden',
                      selectedPlan?.id === plan.id
                        ? 'border-2 border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    {/* 标签 */}
                    {plan.popular && (
                      <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-medium rounded-bl-lg bg-accent text-accent-foreground">
                        推荐
                      </div>
                    )}
                    {plan.discount && !plan.popular && (
                      <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-medium rounded-bl-lg bg-destructive text-destructive-foreground">
                        {plan.discount}
                      </div>
                    )}
                    
                    <p className="font-medium text-sm text-foreground text-center">{plan.durationName}</p>
                    <div className="flex items-baseline justify-center gap-0.5 mt-2">
                      <span className="text-xs text-muted-foreground">¥</span>
                      <span className="text-2xl font-bold text-primary">{plan.price}</span>
                    </div>
                    {plan.originalPrice > plan.price && (
                      <p className="text-xs text-muted-foreground line-through text-center mt-1">
                        ¥{plan.originalPrice}
                      </p>
                    )}
                    <p className="text-xs text-accent text-center mt-1">
                      ¥{plan.dailyPrice}/天
                    </p>
                    
                    {/* 选中指示 */}
                    {selectedPlan?.id === plan.id && (
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-3 h-3 text-accent-foreground" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* 会员权益 */}
            <div>
              <h3 className="font-semibold text-base text-foreground mb-3">会员专属权益</h3>
              <div className="grid grid-cols-2 gap-3">
                {data.benefits.map((benefit) => {
                  const Icon = benefitIcons[benefit.icon] || Gift
                  const available = benefit.levels.includes(selectedLevel)
                  return (
                    <Card
                      key={benefit.id}
                      className={cn(
                        'p-3',
                        available ? 'bg-accent/5 border-accent/30' : 'opacity-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          available ? 'bg-accent/20' : 'bg-secondary'
                        )}>
                          <Icon className={cn(
                            'w-5 h-5',
                            available ? 'text-accent' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{benefit.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* 权益对比 */}
            <div>
              <h3 className="font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                权益对比
              </h3>
              <MembershipComparison onSelectVIP={() => setShowPaySheet(true)} />
            </div>

            {/* 用户评价 */}
            <div>
              <h3 className="font-semibold text-base text-foreground mb-3">会员评价</h3>
              <div className="space-y-3">
                {[
                  { name: '易*明', avatar: '易', content: '开通年度会员后，学习效率提升很多，课程质量很高！', days: 128 },
                  { name: '张*华', avatar: '张', content: 'AI智能体太好用了，排盘解读很专业，物超所值。', days: 56 },
                ].map((review, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-accent">{review.avatar}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-foreground">{review.name}</span>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{review.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">已开通{review.days}天</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 常见问题 */}
            <div>
              <h3 className="font-semibold text-base text-foreground mb-3">常见问题</h3>
              <Card className="divide-y divide-border">
                {[
                  { q: '开通后可以退款吗？', a: '会员服务一经开通，暂不支持退款，请确认后购买。' },
                  { q: '会员可以多设备登录吗？', a: '同一账号最多支持3台设备同时登录。' },
                  { q: '会员到期后权益还在吗？', a: '到期后会员权益将失效，但已下载的内容可继续保留。' },
                ].map((faq, index) => (
                  <div key={index} className="p-3">
                    <p className="font-medium text-sm text-foreground">{faq.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}
      </DataState>

      {/* 底部购买栏 */}
      {data && selectedPlan && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb z-50">
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-muted-foreground">¥</span>
                <span className="text-3xl font-bold text-primary">{selectedPlan.price}</span>
                <span className="text-sm text-muted-foreground">/{selectedPlan.durationName}</span>
              </div>
              <p className="text-xs text-muted-foreground line-through">
                原价 ¥{selectedPlan.originalPrice}
              </p>
            </div>
            <Button
              onClick={() => setShowPaySheet(true)}
              className="px-8 h-12 rounded-full bg-gradient-to-r from-accent to-primary text-white font-medium shadow-lg shadow-accent/30"
            >
              {data.status.level === selectedLevel && !data.status.isExpired ? '续费' : '立即开通'}
            </Button>
          </div>
        </div>
      )}

      {/* 支付方式选择 */}
      <Sheet open={showPaySheet} onOpenChange={setShowPaySheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>选择支付方式</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {selectedPlan && (
              <div className="text-center mb-4 pb-4 border-b">
                <p className="text-sm text-muted-foreground">{selectedPlan.levelName} · {selectedPlan.durationName}</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  <span className="text-lg">¥</span>{selectedPlan.price}
                </p>
              </div>
            )}
            
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
              <div className="space-y-3">
                <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="wechat" />
                  <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">微</div>
                  <span>微信支付</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="alipay" />
                  <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">支</div>
                  <span>支付宝</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="unionpay" />
                  <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">云</div>
                  <span>云闪付</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="huifu" />
                  <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">汇</div>
                  <span>汇付天下</span>
                </Label>
              </div>
            </RadioGroup>

            <Button 
              className="w-full mt-6" 
              size="lg"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? '处理中...' : '确认支付'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <BindPaymentDialog
        open={showBindDialog}
        onClose={() => setShowBindDialog(false)}
        channel={paymentMethod}
      />
    </div>
  )
}
