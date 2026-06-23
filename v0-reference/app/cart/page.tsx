"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingCart, ChevronRight, Check } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 模拟购物车数据
const cartGroups = [
  {
    id: 1,
    sellerName: "易道书院",
    sellerAvatar: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&q=80",
    sellerType: "circle",
    freeShippingThreshold: 199, // 满199包邮
    items: [
      {
        id: 1,
        name: "《渊海子平》精装典藏版",
        spec: "精装版 / 全三册",
        price: 168,
        originalPrice: 298,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80",
        type: "product"
      },
      {
        id: 2,
        name: "八字命理入门到精通",
        spec: "视频课程 / 共36节",
        price: 299,
        originalPrice: 599,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80",
        type: "course"
      }
    ]
  },
  {
    id: 2,
    sellerName: "玄学文创旗舰店",
    sellerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    sellerType: "store",
    freeShippingThreshold: 99, // 满99包邮
    items: [
      {
        id: 3,
        name: "天然黑曜石貔貅手链",
        spec: "14mm / 男款",
        price: 128,
        originalPrice: 199,
        quantity: 2,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&q=80",
        type: "product"
      }
    ]
  }
]

// 失效商品
const invalidItems = [
  {
    id: 101,
    name: "限量版紫水晶摆件",
    spec: "已下架",
    price: 388,
    image: "https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=200&q=80",
    reason: "商品已下架"
  }
]

const recommendProducts = [
  { id: 1, name: "紫微斗数全书", price: 88, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80" },
  { id: 2, name: "开光铜钱挂件", price: 68, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&q=80" },
  { id: 3, name: "风水罗盘专业版", price: 268, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" },
  { id: 4, name: "命理学基础课", price: 199, image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80" },
]

// 骨架屏组件
function CartSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2].map((group) => (
        <Card key={group} className="p-4 bg-card animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-secondary" />
            <div className="h-4 w-24 bg-secondary rounded" />
          </div>
          {[1, 2].map((item) => (
            <div key={item} className="flex gap-3 py-3 border-t border-border/50">
              <div className="w-5 h-5 rounded bg-secondary" />
              <div className="w-20 h-20 rounded-lg bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-secondary rounded" />
                <div className="h-3 w-1/2 bg-secondary rounded" />
                <div className="h-4 w-16 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  )
}

// 空状态组件
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
        <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">购物车是空的</h3>
      <p className="text-sm text-muted-foreground mb-6">快去挑选心仪的商品吧</p>
      <Link
        href="/discover"
        className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
      >
        去逛逛
      </Link>
      
      {/* 热门推荐 */}
      <div className="w-full mt-10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">热门推荐</h4>
          <Link href="/mall" className="text-xs text-primary">更多</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {recommendProducts.slice(0, 4).map((product) => (
            <Link key={product.id} href={`/mall/product/${product.id}`}>
              <Card className="p-3 bg-card hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="aspect-square rounded-lg bg-secondary mb-2 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h5 className="text-sm text-foreground line-clamp-1">{product.name}</h5>
                <p className="text-sm text-primary font-medium mt-1">¥{product.price}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [groups, setGroups] = useState(cartGroups)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [isEmpty, setIsEmpty] = useState(false)
  
  useEffect(() => {
    // 模拟加载
    const timer = setTimeout(() => {
      setIsLoading(false)
      // 初始全选
      const allIds = new Set<number>()
      groups.forEach(g => g.items.forEach(item => allIds.add(item.id)))
      setSelectedItems(allIds)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])
  
  // 计算总价
  const calculateTotal = () => {
    let total = 0
    let originalTotal = 0
    let count = 0
    groups.forEach(group => {
      group.items.forEach(item => {
        if (selectedItems.has(item.id)) {
          total += item.price * item.quantity
          originalTotal += item.originalPrice * item.quantity
          count += item.quantity
        }
      })
    })
    return { total, originalTotal, count, saved: originalTotal - total }
  }
  
  const { total, originalTotal, count, saved } = calculateTotal()
  
  // 全选/取消全选
  const handleSelectAll = () => {
    if (isAllSelected()) {
      setSelectedItems(new Set())
    } else {
      const allIds = new Set<number>()
      groups.forEach(g => g.items.forEach(item => allIds.add(item.id)))
      setSelectedItems(allIds)
    }
  }
  
  const isAllSelected = () => {
    let totalItems = 0
    groups.forEach(g => totalItems += g.items.length)
    return selectedItems.size === totalItems && totalItems > 0
  }
  
  // 切换选中状态
  const toggleItem = (id: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }
  
  // 修改数量
  const updateQuantity = (groupId: number, itemId: number, delta: number) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(item => {
            if (item.id === itemId) {
              const newQty = Math.max(1, item.quantity + delta)
              return { ...item, quantity: newQty }
            }
            return item
          })
        }
      }
      return group
    }))
  }
  
  // 删除商品
  const removeItem = (groupId: number, itemId: number) => {
    setGroups(prev => {
      const newGroups = prev.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            items: group.items.filter(item => item.id !== itemId)
          }
        }
        return group
      }).filter(group => group.items.length > 0)
      
      if (newGroups.length === 0) {
        setIsEmpty(true)
      }
      return newGroups
    })
    
    // 从选中列表移除
    const newSelected = new Set(selectedItems)
    newSelected.delete(itemId)
    setSelectedItems(newSelected)
  }
  
  // 批量删除
  const removeSelected = () => {
    setGroups(prev => {
      const newGroups = prev.map(group => ({
        ...group,
        items: group.items.filter(item => !selectedItems.has(item.id))
      })).filter(group => group.items.length > 0)
      
      if (newGroups.length === 0) {
        setIsEmpty(true)
      }
      return newGroups
    })
    setSelectedItems(new Set())
    setIsEditing(false)
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-12 px-4">
            <BackButton />
            <h1 className="font-semibold text-base text-foreground">购物车</h1>
            <div className="w-9" />
          </div>
        </header>
        <CartSkeleton />
      </div>
    )
  }
  
  if (isEmpty || groups.length === 0) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-12 px-4">
            <BackButton />
            <h1 className="font-semibold text-base text-foreground">购物车</h1>
            <div className="w-9" />
          </div>
        </header>
        <EmptyCart />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">购物车({count})</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-primary font-medium"
          >
            {isEditing ? "完成" : "编辑"}
          </button>
        </div>
      </header>
      
      {/* 优惠提示 */}
      {saved > 0 && !isEditing && (
        <div className="mx-4 mt-3 px-3 py-2 bg-primary/10 rounded-lg flex items-center justify-between">
          <span className="text-xs text-primary">已为您节省 ¥{saved.toFixed(2)}</span>
          <Link href="/shop/coupons" className="text-xs text-primary flex items-center">
            领更多优惠券 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
      
      {/* 商品列表 */}
      <div className="p-4 space-y-4">
        {groups.map((group) => (
          <Card key={group.id} className="p-4 bg-card">
            {/* 店铺信息 */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
              <Avatar className="w-6 h-6">
                <AvatarImage src={group.sellerAvatar} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {group.sellerName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{group.sellerName}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                {group.sellerType === "circle" ? "圈子" : "驿站"}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>
            
            {/* 商品列表 */}
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  {/* 选择框/删除按钮 */}
                  {isEditing ? (
                    <button
                      onClick={() => removeItem(group.id, item.id)}
                      className="flex-shrink-0 w-5 h-5 mt-7 text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "flex-shrink-0 w-5 h-5 mt-7 rounded-full border-2 flex items-center justify-center transition-colors",
                        selectedItems.has(item.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedItems.has(item.id) && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </button>
                  )}
                  
                  {/* 商品图片 */}
                  <div className="w-20 h-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* 商品信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.spec}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-semibold text-primary">¥{item.price}</span>
                        {item.originalPrice > item.price && (
                          <span className="text-xs text-muted-foreground line-through">¥{item.originalPrice}</span>
                        )}
                      </div>
                      
                      {/* 数量控制 */}
                      {item.type === "product" && (
                        <div className="flex items-center gap-2 bg-secondary rounded-full">
                          <button
                            onClick={() => updateQuantity(group.id, item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-medium text-foreground w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(group.id, item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
        {/* 失效商品 */}
        {invalidItems.length > 0 && (
          <Card className="p-4 bg-card/60 border-dashed">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">失效商品({invalidItems.length})</span>
              <button className="text-xs text-destructive">清空</button>
            </div>
            <div className="space-y-3 opacity-60">
              {invalidItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">失效</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-muted-foreground line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-destructive mt-0.5">{item.reason}</p>
                    <p className="text-xs text-muted-foreground line-through mt-1">¥{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 凑单提示 */}
            {(() => {
              const groupTotal = group.items.reduce((sum, item) => 
                selectedItems.has(item.id) ? sum + item.price * item.quantity : sum, 0
              )
              const threshold = group.freeShippingThreshold || 0
              const diff = threshold - groupTotal
              if (diff > 0 && groupTotal > 0) {
                return (
                  <div className="mt-3 px-3 py-2 bg-accent/10 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-accent">
                      再买 <span className="font-medium">¥{diff.toFixed(0)}</span> 即可享受包邮
                    </span>
                    <Link href="/mall" className="text-xs text-accent font-medium flex items-center">
                      去凑单 <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )
              }
              return null
            })()}
            
            {/* 店铺小计 */}
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
              <span className="text-xs text-muted-foreground">
                小计：
                <span className="text-sm font-semibold text-foreground ml-1">
                  ¥{group.items.reduce((sum, item) => 
                    selectedItems.has(item.id) ? sum + item.price * item.quantity : sum, 0
                  ).toFixed(2)}
                </span>
              </span>
            </div>
          </Card>
        ))}
      </div>
      
      {/* 猜你喜欢 */}
      <div className="px-4 mt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">为你推荐</h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {recommendProducts.map((product) => (
            <Card key={product.id} className="flex-shrink-0 w-28 p-2 bg-card hover:bg-secondary/50 transition-colors cursor-pointer">
              <div className="aspect-square rounded-lg bg-secondary mb-2 overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <h5 className="text-xs text-foreground line-clamp-1">{product.name}</h5>
              <p className="text-xs text-primary font-medium mt-0.5">¥{product.price}</p>
            </Card>
          ))}
        </div>
      </div>
      
      {/* 底部结算栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            {/* 全选 */}
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                isAllSelected()
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              )}>
                {isAllSelected() && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="text-sm text-foreground">全选</span>
            </button>
          </div>
          
          {isEditing ? (
            <button
              onClick={removeSelected}
              disabled={selectedItems.size === 0}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                selectedItems.size > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              删除({selectedItems.size})
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {/* 价格 */}
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-muted-foreground">合计:</span>
                  <span className="text-lg font-bold text-primary">¥{total.toFixed(2)}</span>
                </div>
                {saved > 0 && (
                  <span className="text-[10px] text-muted-foreground line-through">¥{originalTotal.toFixed(2)}</span>
                )}
              </div>
              
              {/* 结算按钮 */}
              <button
                disabled={selectedItems.size === 0}
                onClick={() => router.push("/checkout")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  selectedItems.size > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground"
                )}
              >
                结算({count})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
