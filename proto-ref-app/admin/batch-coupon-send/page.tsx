"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Ticket, 
  Users, 
  Clock, 
  AlertTriangle,
  Check,
  ChevronDown,
  Search,
  Calendar,
  Gift,
  Target,
  Filter,
  Eye,
  Send,
  X,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// 优惠券类型
interface Coupon {
  id: number
  name: string
  type: 'discount' | 'cash' | 'shipping'
  value: number
  minOrder: number
  stock: number
  expireAt: string
}

// 用户筛选条件
interface UserFilter {
  type: 'all' | 'level' | 'register_time' | 'consumption' | 'uid_list'
  levels?: string[]
  registerStart?: string
  registerEnd?: string
  minConsumption?: number
  maxConsumption?: number
  uidList?: string
}

// 发放配置
interface SendConfig {
  couponId: number | null
  userFilter: UserFilter
  sendTime: 'now' | 'scheduled'
  scheduledTime?: string
  perUserLimit: number
  totalLimit?: number
}

// Mock 优惠券数据
const mockCoupons: Coupon[] = [
  { id: 1, name: '新人专享满100减20', type: 'cash', value: 20, minOrder: 100, stock: 1000, expireAt: '2026-07-31' },
  { id: 2, name: '会员8折优惠券', type: 'discount', value: 80, minOrder: 50, stock: 500, expireAt: '2026-06-30' },
  { id: 3, name: '满200减50大额券', type: 'cash', value: 50, minOrder: 200, stock: 200, expireAt: '2026-08-15' },
  { id: 4, name: '免运费券', type: 'shipping', value: 0, minOrder: 0, stock: 2000, expireAt: '2026-12-31' },
]

// 会员等级
const memberLevels = [
  { value: 'normal', label: '普通用户' },
  { value: 'vip1', label: 'VIP1' },
  { value: 'vip2', label: 'VIP2' },
  { value: 'vip3', label: 'VIP3' },
  { value: 'svip', label: 'SVIP' },
]

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

export default function BatchCouponSendPage() {
  const router = useRouter()
  
  // 状态
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [config, setConfig] = useState<SendConfig>({
    couponId: null,
    userFilter: { type: 'all' },
    sendTime: 'now',
    perUserLimit: 1,
  })
  const [showCouponSelect, setShowCouponSelect] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewData, setPreviewData] = useState<{ userCount: number; totalBudget: number } | null>(null)
  
  // 加载优惠券列表
  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      setCoupons(mockCoupons)
      setLoading(false)
    }
    loadData()
  }, [])
  
  // 选中的优惠券
  const selectedCoupon = useMemo(() => {
    return coupons.find(c => c.id === config.couponId)
  }, [coupons, config.couponId])
  
  // 预览计算
  const handlePreview = async () => {
    if (!config.couponId) return
    
    // 模拟计算
    await new Promise(resolve => setTimeout(resolve, 500))
    
    let userCount = 0
    switch (config.userFilter.type) {
      case 'all':
        userCount = 12580
        break
      case 'level':
        userCount = (config.userFilter.levels?.length || 0) * 2000
        break
      case 'register_time':
        userCount = 3500
        break
      case 'consumption':
        userCount = 1800
        break
      case 'uid_list':
        const uids = config.userFilter.uidList?.split(/[\n,]/).filter(Boolean) || []
        userCount = uids.length
        break
    }
    
    const coupon = selectedCoupon
    const totalBudget = coupon?.type === 'cash' ? userCount * config.perUserLimit * coupon.value : 0
    
    setPreviewData({ userCount, totalBudget })
    setShowPreview(true)
  }
  
  // 确认发放
  const handleSend = async () => {
    setSending(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSending(false)
    setShowConfirm(false)
    setShowPreview(false)
    
    // 跳转成功页或返回
    router.push('/admin/coupons')
  }
  
  // 更新筛选条件
  const updateFilter = (updates: Partial<UserFilter>) => {
    setConfig(prev => ({
      ...prev,
      userFilter: { ...prev.userFilter, ...updates }
    }))
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">批量发放优惠券</h1>
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        {/* 选择优惠券 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-primary" />
            <h2 className="font-medium">选择优惠券</h2>
            <span className="text-xs text-destructive">*</span>
          </div>
          
          <button
            onClick={() => setShowCouponSelect(true)}
            className="w-full flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {selectedCoupon ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{selectedCoupon.name}</p>
                  <p className="text-xs text-muted-foreground">
                    库存 {selectedCoupon.stock} | 有效期至 {selectedCoupon.expireAt}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">请选择要发放的优惠券</span>
            )}
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* 目标用户筛选 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-medium">目标用户</h2>
          </div>
          
          {/* 筛选类型 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { type: 'all', label: '全部用户', icon: Users },
              { type: 'level', label: '按会员等级', icon: Gift },
              { type: 'register_time', label: '按注册时间', icon: Calendar },
              { type: 'consumption', label: '按消费金额', icon: Filter },
              { type: 'uid_list', label: '指定用户', icon: Search },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => updateFilter({ type: item.type as UserFilter['type'] })}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                  config.userFilter.type === item.type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
          
          {/* 筛选条件详情 */}
          {config.userFilter.type === 'level' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">选择会员等级</p>
              <div className="flex flex-wrap gap-2">
                {memberLevels.map(level => (
                  <button
                    key={level.value}
                    onClick={() => {
                      const levels = config.userFilter.levels || []
                      const newLevels = levels.includes(level.value)
                        ? levels.filter(l => l !== level.value)
                        : [...levels, level.value]
                      updateFilter({ levels: newLevels })
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      config.userFilter.levels?.includes(level.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {config.userFilter.type === 'register_time' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">注册开始日期</label>
                <Input
                  type="date"
                  value={config.userFilter.registerStart || ''}
                  onChange={e => updateFilter({ registerStart: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">注册结束日期</label>
                <Input
                  type="date"
                  value={config.userFilter.registerEnd || ''}
                  onChange={e => updateFilter({ registerEnd: e.target.value })}
                />
              </div>
            </div>
          )}
          
          {config.userFilter.type === 'consumption' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">最低消费(元)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={config.userFilter.minConsumption || ''}
                    onChange={e => updateFilter({ minConsumption: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">最高消费(元)</label>
                  <Input
                    type="number"
                    placeholder="不限"
                    value={config.userFilter.maxConsumption || ''}
                    onChange={e => updateFilter({ maxConsumption: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
          
          {config.userFilter.type === 'uid_list' && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                输入用户UID（每行一个或用逗号分隔）
              </label>
              <Textarea
                placeholder="例如：&#10;10001&#10;10002&#10;10003"
                rows={4}
                value={config.userFilter.uidList || ''}
                onChange={e => updateFilter({ uidList: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                已输入 {(config.userFilter.uidList?.split(/[\n,]/).filter(Boolean) || []).length} 个用户
              </p>
            </div>
          )}
        </div>
        
        {/* 发放时间 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-medium">发放时间</h2>
          </div>
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setConfig(prev => ({ ...prev, sendTime: 'now' }))}
              className={cn(
                "flex-1 py-2 rounded-lg border transition-colors",
                config.sendTime === 'now'
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50"
              )}
            >
              立即发放
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, sendTime: 'scheduled' }))}
              className={cn(
                "flex-1 py-2 rounded-lg border transition-colors",
                config.sendTime === 'scheduled'
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50"
              )}
            >
              定时发放
            </button>
          </div>
          
          {config.sendTime === 'scheduled' && (
            <Input
              type="datetime-local"
              value={config.scheduledTime || ''}
              onChange={e => setConfig(prev => ({ ...prev, scheduledTime: e.target.value }))}
            />
          )}
        </div>
        
        {/* 发放限制 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="font-medium">发放限制</h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">每人限领数量</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.perUserLimit}
                onChange={e => setConfig(prev => ({ ...prev, perUserLimit: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">发放总量限制（选填）</label>
              <Input
                type="number"
                placeholder="不限"
                value={config.totalLimit || ''}
                onChange={e => setConfig(prev => ({ ...prev, totalLimit: Number(e.target.value) || undefined }))}
              />
            </div>
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            优惠券发放后不可撤销，请仔细核对发放条件和数量。大批量发放可能需要较长时间处理。
          </p>
        </div>
      </div>
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePreview}
            disabled={!config.couponId}
          >
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (!previewData) {
                handlePreview().then(() => setShowConfirm(true))
              } else {
                setShowConfirm(true)
              }
            }}
            disabled={!config.couponId}
          >
            <Send className="w-4 h-4 mr-2" />
            确认发放
          </Button>
        </div>
      </div>
      
      {/* 优惠券选择弹窗 */}
      {showCouponSelect && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-background rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">选择优惠券</h3>
              <button onClick={() => setShowCouponSelect(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {coupons.map(coupon => (
                <button
                  key={coupon.id}
                  onClick={() => {
                    setConfig(prev => ({ ...prev, couponId: coupon.id }))
                    setShowCouponSelect(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                    config.couponId === coupon.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {coupon.type === 'discount' ? `${coupon.value / 10}折` : 
                       coupon.type === 'cash' ? `¥${coupon.value}` : '免邮'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{coupon.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {coupon.minOrder > 0 ? `满${coupon.minOrder}可用` : '无门槛'} · 库存{coupon.stock} · 有效期至{coupon.expireAt}
                    </p>
                  </div>
                  {config.couponId === coupon.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 预览弹窗 */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background rounded-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-center">发放预览</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">目标用户数</p>
                <p className="text-3xl font-bold text-primary">{previewData.userCount.toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">优惠券</p>
                  <p className="font-medium text-sm">{selectedCoupon?.name}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">每人限领</p>
                  <p className="font-medium">{config.perUserLimit}张</p>
                </div>
              </div>
              
              {previewData.totalBudget > 0 && (
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    预计最大预算：<span className="font-bold">¥{previewData.totalBudget.toLocaleString()}</span>
                  </p>
                </div>
              )}
              
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>实际发放数量取决于优惠券库存和用户是否已领取。</p>
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>
                返回修改
              </Button>
              <Button className="flex-1" onClick={() => setShowConfirm(true)}>
                确认发放
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 二次确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background rounded-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">确认发放优惠券？</h3>
              <p className="text-muted-foreground text-sm">
                即将向 <span className="text-foreground font-medium">{previewData?.userCount.toLocaleString()}</span> 位用户发放优惠券，
                此操作不可撤销。
              </p>
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowConfirm(false)}
                disabled={sending}
              >
                取消
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? '发放中...' : '确认发放'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
