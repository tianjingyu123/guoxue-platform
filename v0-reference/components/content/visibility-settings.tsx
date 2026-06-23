"use client"

import { useState } from "react"
import { Lock, Globe, Users, Coins, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// 模拟用户管理的圈子
export const mockManagedCircles = [
  { id: "1", name: "八字命理研习社", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=circle1", members: 12580, role: "owner" },
  { id: "2", name: "风水堪舆交流群", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=circle2", members: 8920, role: "admin" },
  { id: "3", name: "紫微斗数学习班", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=circle3", members: 5630, role: "owner" },
  { id: "4", name: "国学经典研读会", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=circle4", members: 3280, role: "admin" },
]

export type Visibility = 'circle_only' | 'platform_wide'
export type PaymentType = 'free' | 'paid' | 'member_free'

interface VisibilitySettingsProps {
  circleId: string
  visibility: Visibility
  paymentType: PaymentType
  price: number
  onCircleChange: (circleId: string) => void
  onVisibilityChange: (visibility: Visibility) => void
  onPaymentTypeChange: (paymentType: PaymentType) => void
  onPriceChange: (price: number) => void
  errors?: Record<string, string>
  showCircleSelector?: boolean
  contentType?: 'article' | 'course' | 'post' | 'live'
}

// 圈子选择器弹窗
interface CircleSelectorProps {
  isOpen: boolean
  onClose: () => void
  selectedCircleId: string
  onSelect: (circleId: string) => void
}

export function CircleSelectorModal({ isOpen, onClose, selectedCircleId, onSelect }: CircleSelectorProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full bg-foreground rounded-t-3xl max-h-[60vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={onClose} className="text-white/60">取消</button>
          <span className="font-medium text-white">选择圈子</span>
          <span className="w-8" />
        </div>
        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
          <p className="text-xs text-white/50 mb-2">仅显示您管理的圈子（圈主/管理员）</p>
          {mockManagedCircles.map(circle => (
            <button
              key={circle.id}
              onClick={() => {
                onSelect(circle.id)
                onClose()
              }}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                selectedCircleId === circle.id
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <img src={circle.avatar} alt="" className="w-12 h-12 rounded-xl" />
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{circle.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    circle.role === 'owner' ? 'bg-gold/20 text-gold' : 'bg-info/20 text-info'
                  }`}>
                    {circle.role === 'owner' ? '圈主' : '管理员'}
                  </span>
                </div>
                <p className="text-white/50 text-xs mt-1">{circle.members.toLocaleString()} 成员</p>
              </div>
              {selectedCircleId === circle.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 圈子选择按钮
export function CircleSelector({ 
  circleId, 
  onCircleChange, 
  error 
}: { 
  circleId: string
  onCircleChange: (id: string) => void
  error?: string 
}) {
  const [showPicker, setShowPicker] = useState(false)
  const selectedCircle = mockManagedCircles.find(c => c.id === circleId)

  return (
    <>
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-3 block">
          发布到圈子 <span className="text-primary">*</span>
        </label>
        <p className="text-xs text-white/50 mb-3">内容将发布到所选圈子，由圈主管理权限</p>
        
        <button
          onClick={() => setShowPicker(true)}
          className={`w-full px-4 py-3 rounded-xl border bg-white/5 flex items-center justify-between ${
            error ? "border-primary" : "border-white/10"
          }`}
        >
          {selectedCircle ? (
            <div className="flex items-center gap-3">
              <img src={selectedCircle.avatar} alt="" className="w-8 h-8 rounded-lg" />
              <div className="text-left">
                <span className="text-white text-sm">{selectedCircle.name}</span>
                <p className="text-white/40 text-xs">{selectedCircle.members.toLocaleString()} 成员</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white/40" />
              <span className="text-white/40">选择要发布的圈子</span>
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-white/40" />
        </button>
        {error && <p className="text-xs text-primary mt-2">{error}</p>}
      </div>

      <CircleSelectorModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        selectedCircleId={circleId}
        onSelect={onCircleChange}
      />
    </>
  )
}

// 可见范围选择
export function VisibilitySelector({
  visibility,
  onVisibilityChange
}: {
  visibility: Visibility
  onVisibilityChange: (v: Visibility) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-white mb-3 block">可见范围</label>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onVisibilityChange('circle_only')}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            visibility === "circle_only" 
              ? "border-primary bg-primary/10" 
              : "border-white/10 bg-white/5"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center mb-2",
            visibility === "circle_only" ? "bg-primary text-white" : "bg-white/10 text-white/60"
          )}>
            <Lock className="w-4 h-4" />
          </div>
          <h3 className={cn("font-medium text-sm", visibility === "circle_only" ? "text-primary" : "text-white")}>
            仅圈内可见
          </h3>
          <p className="text-[10px] text-white/50 mt-1">仅圈子成员可查看</p>
        </button>
        
        <button
          onClick={() => onVisibilityChange('platform_wide')}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            visibility === "platform_wide" 
              ? "border-primary bg-primary/10" 
              : "border-white/10 bg-white/5"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center mb-2",
            visibility === "platform_wide" ? "bg-primary text-white" : "bg-white/10 text-white/60"
          )}>
            <Globe className="w-4 h-4" />
          </div>
          <h3 className={cn("font-medium text-sm", visibility === "platform_wide" ? "text-primary" : "text-white")}>
            全平台可见
          </h3>
          <p className="text-[10px] text-white/50 mt-1">所有用户可发现查看</p>
        </button>
      </div>
    </div>
  )
}

// 付费设置
export function PaymentSettings({
  visibility,
  paymentType,
  price,
  onPaymentTypeChange,
  onPriceChange,
  priceError,
  contentType = 'article'
}: {
  visibility: Visibility
  paymentType: PaymentType
  price: number
  onPaymentTypeChange: (p: PaymentType) => void
  onPriceChange: (price: number) => void
  priceError?: string
  contentType?: 'article' | 'course' | 'post' | 'live'
}) {
  const contentLabel = {
    article: '阅读',
    course: '学习',
    post: '查看',
    live: '观看'
  }[contentType]

  return (
    <div>
      <label className="text-sm font-medium text-white mb-3 block">付费设置</label>
      <div className="space-y-3">
        {/* 免费 */}
        <button
          onClick={() => onPaymentTypeChange('free')}
          className={cn(
            "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
            paymentType === "free" 
              ? "border-primary bg-primary/10" 
              : "border-white/10 bg-white/5"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            paymentType === "free" ? "bg-green-500 text-white" : "bg-white/10 text-white/60"
          )}>
            <span className="text-lg font-bold">免</span>
          </div>
          <div className="flex-1">
            <h3 className={cn("font-medium text-sm", paymentType === "free" ? "text-white" : "text-white/80")}>
              免费
            </h3>
            <p className="text-[11px] text-white/50 mt-0.5">所有人免费{contentLabel}</p>
          </div>
          {paymentType === "free" && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </button>

        {/* 付费（全平台可见时才显示） */}
        {visibility === 'platform_wide' && (
          <button
            onClick={() => onPaymentTypeChange('paid')}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
              paymentType === "paid" 
                ? "border-primary bg-primary/10" 
                : "border-white/10 bg-white/5"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              paymentType === "paid" ? "bg-gold text-white" : "bg-white/10 text-white/60"
            )}>
              <Coins className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={cn("font-medium text-sm", paymentType === "paid" ? "text-white" : "text-white/80")}>
                付费
              </h3>
              <p className="text-[11px] text-white/50 mt-0.5">所有人需付费{contentLabel}</p>
            </div>
            {paymentType === "paid" && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        )}

        {/* 圈内免费，圈外付费（全平台可见时才显示） */}
        {visibility === 'platform_wide' && (
          <button
            onClick={() => onPaymentTypeChange('member_free')}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
              paymentType === "member_free" 
                ? "border-primary bg-primary/10" 
                : "border-white/10 bg-white/5"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              paymentType === "member_free" ? "bg-info text-white" : "bg-white/10 text-white/60"
            )}>
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={cn("font-medium text-sm", paymentType === "member_free" ? "text-white" : "text-white/80")}>
                圈内免费
              </h3>
              <p className="text-[11px] text-white/50 mt-0.5">圈子成员免费，非成员付费</p>
            </div>
            {paymentType === "member_free" && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        )}

        {/* 价格设置 */}
        {(paymentType === 'paid' || paymentType === 'member_free') && (
          <div className="mt-3 p-4 bg-white/5 rounded-xl">
            <label className="text-sm font-medium text-white mb-2 block">
              {paymentType === 'member_free' ? '非圈子成员价格' : '价格'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gold text-lg font-bold">¥</span>
              <input
                type="number"
                value={price || ''}
                onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-lg font-bold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            {priceError && <p className="text-xs text-primary mt-2">{priceError}</p>}
            <p className="text-[10px] text-white/40 mt-2">
              {contentType === 'course' ? '建议定价：9.9-999元' : '建议定价：0.1-99元'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// 完整的可见范围设置组合组件
export function VisibilitySettings({
  circleId,
  visibility,
  paymentType,
  price,
  onCircleChange,
  onVisibilityChange,
  onPaymentTypeChange,
  onPriceChange,
  errors = {},
  showCircleSelector = true,
  contentType = 'article'
}: VisibilitySettingsProps) {
  return (
    <div className="space-y-4">
      {showCircleSelector && (
        <CircleSelector
          circleId={circleId}
          onCircleChange={onCircleChange}
          error={errors.circleId}
        />
      )}

      {circleId && (
        <div className="bg-foreground rounded-2xl p-4 space-y-4">
          <VisibilitySelector
            visibility={visibility}
            onVisibilityChange={onVisibilityChange}
          />

          <PaymentSettings
            visibility={visibility}
            paymentType={paymentType}
            price={price}
            onPaymentTypeChange={onPaymentTypeChange}
            onPriceChange={onPriceChange}
            priceError={errors.price}
            contentType={contentType}
          />
        </div>
      )}
    </div>
  )
}

// 内容权限标签组件 - 用于列表展示
export function ContentVisibilityBadge({
  visibility,
  paymentType,
  price,
  circleName,
  size = 'sm'
}: {
  visibility: Visibility
  paymentType: PaymentType
  price?: number
  circleName?: string
  size?: 'sm' | 'md'
}) {
  const baseClasses = size === 'sm' 
    ? "text-[10px] px-1.5 py-0.5 rounded" 
    : "text-xs px-2 py-1 rounded-lg"

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* 付费/免费标签 */}
      {paymentType === 'free' ? (
        <span className={cn(baseClasses, "bg-green-500/20 text-green-400")}>免费</span>
      ) : paymentType === 'paid' ? (
        <span className={cn(baseClasses, "bg-gold/20 text-gold")}>
          ¥{price}
        </span>
      ) : (
        <span className={cn(baseClasses, "bg-info/20 text-info")}>
          圈内免费
        </span>
      )}
      
      {/* 仅圈内可见标签 */}
      {visibility === 'circle_only' && (
        <span className={cn(baseClasses, "bg-white/10 text-white/60 flex items-center gap-0.5")}>
          <Lock className="w-3 h-3" />
          圈内
        </span>
      )}
      
      {/* 圈子名称 */}
      {circleName && (
        <span className={cn(baseClasses, "bg-white/10 text-white/50 truncate max-w-[80px]")}>
          {circleName}
        </span>
      )}
    </div>
  )
}

// 付费墙/权限墙组件
export function ContentPaywall({
  isOpen,
  onClose,
  title,
  authorName,
  authorAvatar,
  circleId,
  circleName,
  visibility,
  paymentType,
  price,
  onPay,
  contentType = 'article'
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  authorName: string
  authorAvatar: string
  circleId: string
  circleName: string
  visibility: Visibility
  paymentType: PaymentType
  price: number
  onPay: () => void
  contentType?: 'article' | 'course' | 'post' | 'live'
}) {
  if (!isOpen) return null

  const contentLabel = {
    article: '阅读',
    course: '学习',
    post: '查看',
    live: '观看'
  }[contentType]

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-gray-900 to-black rounded-3xl overflow-hidden border border-white/10">
        {/* 头部 */}
        <div className="relative h-40 bg-gradient-to-br from-primary/30 to-gold/20 flex items-center justify-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-16 h-16 rounded-full border border-white/30" />
            <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full border border-white/20" />
          </div>
          <div className="text-center relative z-10">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-3">
              {visibility === 'circle_only' ? (
                <Lock className="w-10 h-10 text-white" />
              ) : (
                <Coins className="w-10 h-10 text-gold" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white">
              {visibility === 'circle_only' ? '仅圈子成员可' + contentLabel : '付费' + contentLabel}
            </h3>
          </div>
        </div>
        
        {/* 内容 */}
        <div className="p-5">
          <div className="text-center mb-5">
            <h4 className="text-lg font-medium text-white mb-1 line-clamp-2">{title}</h4>
            <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
              <img src={authorAvatar} alt="" className="w-5 h-5 rounded-full" />
              <span>{authorName}</span>
            </div>
          </div>
          
          {/* 圈子信息 */}
          <a 
            href={`/circles/${circleId}`}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4 border border-white/10"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-gold/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{circleName}</p>
              <p className="text-white/50 text-xs">
                {visibility === 'circle_only' ? '加入圈子即可免费' + contentLabel : '圈子成员免费' + contentLabel}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </a>
          
          {/* 操作按钮 */}
          <div className="space-y-3">
            {visibility === 'circle_only' ? (
              <a 
                href={`/circles/${circleId}`}
                className="block w-full py-3.5 text-center rounded-full bg-gradient-to-r from-primary to-primary text-white font-semibold shadow-lg shadow-primary/25"
              >
                加入圈子{contentLabel}
              </a>
            ) : (
              <>
                <button 
                  onClick={onPay}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-gold to-secondary text-foreground font-semibold shadow-lg"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Coins className="w-5 h-5" />
                    ¥{price} 付费{contentLabel}
                  </span>
                </button>
                <a 
                  href={`/circles/${circleId}`}
                  className="block w-full py-3.5 text-center rounded-full bg-white/10 text-white font-medium border border-white/20"
                >
                  加入圈子免费看
                </a>
              </>
            )}
            <button 
              onClick={onClose}
              className="w-full py-3 text-white/60 text-sm"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
