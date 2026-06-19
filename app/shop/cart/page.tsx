"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Minus, Plus, ShoppingBag, CheckCircle2, Circle, AlertCircle, X } from "lucide-react"
import { shopApi, type CartItem } from "@/lib/api"

// Mock 数据
const mockCartData = {
  items: [
    {
      id: "1",
      productId: "p1",
      productName: "《易经》精装典藏版",
      productCover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=200&fit=crop",
      skuId: "s1",
      skuName: "精装版",
      price: 128,
      originalPrice: 168,
      quantity: 1,
      stock: 99,
      selected: true,
      isValid: true,
    },
    {
      id: "2",
      productId: "p2",
      productName: "紫檀木八卦罗盘",
      productCover: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200&h=200&fit=crop",
      skuId: "s2",
      skuName: "标准款",
      price: 388,
      originalPrice: 488,
      quantity: 2,
      stock: 50,
      selected: true,
      isValid: true,
    },
    {
      id: "3",
      productId: "p3",
      productName: "国学启蒙套装礼盒",
      productCover: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop",
      skuId: "s3",
      skuName: "完整版",
      price: 268,
      originalPrice: 358,
      quantity: 1,
      stock: 30,
      selected: false,
      isValid: true,
    },
    {
      id: "4",
      productId: "p4",
      productName: "【已下架】古籍善本·四库全书",
      productCover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
      skuId: "s4",
      skuName: "精装版",
      price: 1280,
      originalPrice: 1680,
      quantity: 1,
      stock: 0,
      selected: false,
      isValid: false,
      invalidReason: "商品已下架",
    },
  ],
  totalCount: 5,
  totalAmount: 1172,
}

// 骨架屏
function CartSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center gap-3 border-b border-[#E8E3DB]">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="w-20 h-20 rounded-lg bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CartPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CartItem[]>([])
  const [editMode, setEditMode] = useState(false)
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    setLoading(true)
    try {
      const data = await shopApi.getCart()
      setItems(data.items)
    } catch {
      setItems(mockCartData.items)
    } finally {
      setLoading(false)
    }
  }

  // 计算选中数量和总价（只计算有效商品）
  const { selectedCount, totalAmount, validItems, invalidItems } = useMemo(() => {
    const valid = items.filter(i => i.isValid !== false)
    const invalid = items.filter(i => i.isValid === false)
    const selected = valid.filter((i) => i.selected)
    return {
      selectedCount: selected.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount: selected.reduce((sum, i) => sum + i.price * i.quantity, 0),
      validItems: valid,
      invalidItems: invalid,
    }
  }, [items])

  // 全选状态（只考虑有效商品）
  const allSelected = validItems.length > 0 && validItems.every((i) => i.selected)

  // 切换选中
  const toggleSelect = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)))
  }

  // 全选/取消全选（只操作有效商品）
  const toggleSelectAll = () => {
    const newSelected = !allSelected
    setItems((prev) => prev.map((i) => i.isValid !== false ? { ...i, selected: newSelected } : i))
  }

  // 清除失效商品
  const clearInvalidItems = async () => {
    const invalidIds = invalidItems.map(i => i.id)
    setItems(prev => prev.filter(i => i.isValid !== false))
    try {
      await shopApi.batchRemoveCartItems(invalidIds)
    } catch {}
  }

  // 左滑手势处理
  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent, itemId: string) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchStartX.current - touchCurrentX.current
    if (diff > 50) {
      setSwipedItemId(itemId)
    } else if (diff < -30) {
      setSwipedItemId(null)
    }
  }

  const handleTouchEnd = () => {
    // 保持当前状态
  }

  // 修改数量
  const updateQuantity = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    const newQty = Math.max(1, Math.min(item.stock, item.quantity + delta))
    if (newQty === item.quantity) return

    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)))

    try {
      await shopApi.updateCartItem(id, newQty)
    } catch {
      // 失败回滚
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: item.quantity } : i)))
    }
  }

  // 删除商品
  const removeItem = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    setItems((prev) => prev.filter((i) => i.id !== id))

    try {
      await shopApi.removeCartItem(id)
    } catch {
      setItems((prev) => [...prev, item])
    }
  }

  // 删除选中
  const removeSelected = async () => {
    const selectedIds = items.filter((i) => i.selected).map((i) => i.id)
    if (selectedIds.length === 0) return

    const backup = [...items]
    setItems((prev) => prev.filter((i) => !i.selected))

    try {
      await shopApi.batchRemoveCartItems(selectedIds)
    } catch {
      setItems(backup)
    }
  }

  // 结算
  const handleCheckout = () => {
    const selectedIds = items.filter((i) => i.selected).map((i) => i.id)
    if (selectedIds.length === 0) return
    router.push(`/shop/checkout?items=${selectedIds.join(",")}`)
  }

  if (loading) return <CartSkeleton />

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center justify-between border-b border-[#E8E3DB]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">购物车({items.length})</h1>
        </div>
        {items.length > 0 && (
          <button onClick={() => setEditMode(!editMode)} className="text-sm text-[#C41E3A]">
            {editMode ? "完成" : "编辑"}
          </button>
        )}
      </div>

      {/* 购物车列表 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-[#F5F0EB] flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-[#999999]" />
          </div>
          <p className="text-[#666666] mb-4">购物车空空如也</p>
          <button
            onClick={() => router.push("/shop")}
            className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
          >
            去逛逛
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* 有效商品列表 */}
          {validItems.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-2xl"
              onTouchStart={(e) => handleTouchStart(e, item.id)}
              onTouchMove={(e) => handleTouchMove(e, item.id)}
              onTouchEnd={handleTouchEnd}
            >
              {/* 左滑删除按钮 */}
              <div 
                className={`absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center transition-opacity ${
                  swipedItemId === item.id ? "opacity-100" : "opacity-0"
                }`}
              >
                <button 
                  onClick={() => removeItem(item.id)}
                  className="w-full h-full flex flex-col items-center justify-center text-white"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-xs mt-1">删除</span>
                </button>
              </div>
              
              {/* 商品卡片 */}
              <div 
                className={`bg-white p-4 flex gap-3 shadow-sm transition-transform ${
                  swipedItemId === item.id ? "-translate-x-20" : "translate-x-0"
                }`}
              >
                {/* 选择框 */}
                <button onClick={() => toggleSelect(item.id)} className="flex-shrink-0 mt-6">
                  {item.selected ? (
                    <CheckCircle2 className="w-5 h-5 text-[#C41E3A]" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#CCCCCC]" />
                  )}
                </button>

                {/* 商品图片 */}
                <div
                  onClick={() => router.push(`/shop/${item.productId}`)}
                  className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                >
                  <img
                    src={item.productCover}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 商品信息 */}
                <div className="flex-1 min-w-0">
                  <h3
                    onClick={() => router.push(`/shop/${item.productId}`)}
                    className="text-sm font-medium text-[#2C2C2C] line-clamp-2 cursor-pointer"
                  >
                    {item.productName}
                  </h3>
                  <p className="text-xs text-[#999999] mt-1">{item.skuName}</p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#C41E3A] font-semibold">¥{item.price}</span>
                      {item.originalPrice > item.price && (
                        <span className="text-xs text-[#999999] line-through">
                          ¥{item.originalPrice}
                        </span>
                      )}
                    </div>

                    {editMode ? (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-full bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#F5F0EB] rounded-full px-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3 text-[#666666]" />
                        </button>
                        <span className="w-6 text-center text-sm text-[#2C2C2C]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3 text-[#666666]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 失效商品区域 */}
          {invalidItems.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#999999]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">失效商品 ({invalidItems.length})</span>
                </div>
                <button 
                  onClick={clearInvalidItems}
                  className="text-xs text-[#C41E3A]"
                >
                  清除全部
                </button>
              </div>
              
              {invalidItems.map(item => (
                <div key={item.id} className="bg-white/60 rounded-2xl p-4 flex gap-3 mb-3 opacity-60">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img
                      src={item.productCover}
                      alt={item.productName}
                      className="w-full h-full object-cover grayscale"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs">已失效</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-[#999999] line-clamp-2">{item.productName}</h3>
                    <p className="text-xs text-[#CCCCCC] mt-1">{item.skuName}</p>
                    <p className="text-xs text-[#FF6B6B] mt-2">{item.invalidReason}</p>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-[#CCCCCC]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 底部结算栏 */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-2">
              {allSelected ? (
                <CheckCircle2 className="w-5 h-5 text-[#C41E3A]" />
              ) : (
                <Circle className="w-5 h-5 text-[#CCCCCC]" />
              )}
              <span className="text-sm text-[#666666]">全选</span>
            </button>
          </div>

          {editMode ? (
            <button
              onClick={removeSelected}
              disabled={selectedCount === 0}
              className="px-6 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
            >
              删除选中({selectedCount})
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-[#999999]">
                  已选 {selectedCount} 件
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-[#666666]">合计:</span>
                  <span className="text-xl font-bold text-[#C41E3A]">
                    ¥{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedCount === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-[#C41E3A] to-[#E85050] text-white rounded-full text-sm font-medium disabled:opacity-50"
              >
                结算({selectedCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
