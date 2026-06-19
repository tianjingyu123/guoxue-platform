"use client"

import { useState, useEffect } from "react"
import { Heart, Share2, ShoppingCart, Zap, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface CourseBottomBarProps {
  price: number
  originalPrice?: number
  studentsCount?: number
  isPurchased?: boolean
  isFavorited?: boolean
  cartCount?: number
  isUrgent?: boolean // 限时优惠紧迫状态
  onFavorite?: () => void
  onShare?: () => void
  onAddToCart?: () => void
  onBuy?: () => void
  onStartLearning?: () => void
}

export function CourseBottomBar({
  price,
  originalPrice,
  studentsCount = 0,
  isPurchased = false,
  isFavorited = false,
  cartCount = 0,
  isUrgent = false,
  onFavorite,
  onShare,
  onAddToCart,
  onBuy,
  onStartLearning
}: CourseBottomBarProps) {
  const [localFavorited, setLocalFavorited] = useState(isFavorited)
  const [localCartCount, setLocalCartCount] = useState(cartCount)
  const [showAddedTip, setShowAddedTip] = useState(false)

  const hasDiscount = originalPrice && originalPrice > price
  const savedAmount = hasDiscount ? originalPrice - price : 0

  const handleFavorite = () => {
    setLocalFavorited(!localFavorited)
    onFavorite?.()
  }

  const handleAddToCart = () => {
    setLocalCartCount(prev => prev + 1)
    setShowAddedTip(true)
    setTimeout(() => setShowAddedTip(false), 2000)
    onAddToCart?.()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      {/* 社会证明提示条 */}
      {!isPurchased && studentsCount > 0 && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-secondary/50 text-xs border-b border-border">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">
            已有 <span className="text-foreground font-semibold">{studentsCount.toLocaleString()}</span> 人学习
          </span>
          {hasDiscount && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <span className="text-green-500 font-medium">省¥{savedAmount}</span>
            </>
          )}
        </div>
      )}
      
      {/* 加入购物车成功提示 */}
      {showAddedTip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500 text-white text-sm rounded-full shadow-lg animate-fade-in-up">
          已加入购物车
        </div>
      )}
      
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 左侧图标按钮 */}
        <div className="flex items-center gap-4">
          {/* 收藏 */}
          <button 
            onClick={handleFavorite}
            className="flex flex-col items-center gap-0.5"
          >
            <Heart 
              className={`w-5 h-5 transition-colors ${
                localFavorited 
                  ? "fill-primary text-primary" 
                  : "text-muted-foreground"
              }`} 
            />
            <span className="text-[10px] text-muted-foreground">收藏</span>
          </button>
          
          {/* 分享 */}
          <button 
            onClick={onShare}
            className="flex flex-col items-center gap-0.5"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">分享</span>
          </button>
          
          {/* 购物车 */}
          {!isPurchased && (
            <button 
              onClick={handleAddToCart}
              className="flex flex-col items-center gap-0.5 relative"
            >
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              {localCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {localCartCount > 99 ? "99+" : localCartCount}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">购物车</span>
            </button>
          )}
        </div>
        
        {/* 右侧按钮 */}
        <div className="flex-1 flex gap-2">
          {isPurchased ? (
            /* 已购买状态 */
            <button
              onClick={onStartLearning}
              className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              开始学习
            </button>
          ) : (
            /* 未购买状态 */
            <>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-full bg-accent/20 text-accent font-semibold text-sm hover:bg-accent/30 transition-colors active:scale-95"
              >
                加入购物车
              </button>
              <button
                onClick={onBuy}
                className={cn(
                  "relative flex-1 py-3 rounded-full font-semibold text-sm transition-all overflow-hidden active:scale-95",
                  isUrgent 
                    ? "bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse shadow-lg shadow-red-500/30" 
                    : "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                )}
              >
                {/* 闪光效果 */}
                <span className="absolute inset-0 overflow-hidden">
                  <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </span>
                <span className="relative flex items-center justify-center gap-1">
                  {isUrgent && <Zap className="w-4 h-4" />}
                  <span>¥{price}</span>
                  {hasDiscount && <span className="text-xs opacity-80 line-through">¥{originalPrice}</span>}
                  <span>立即抢购</span>
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
