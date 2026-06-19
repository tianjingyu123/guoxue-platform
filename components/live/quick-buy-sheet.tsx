"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { X, Minus, Plus, Check, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QuickBuyProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  stock?: number
  sold?: number
  /** 可选规格，如 ["小号", "中号", "大号"]；不传则无规格选择 */
  skus?: string[]
}

type PayMethod = "wechat" | "alipay" | "unionpay" | "huifu"

const PAY_METHODS: { id: PayMethod; name: string; badge: string; badgeColor: string }[] = [
  { id: "wechat", name: "微信支付", badge: "微", badgeColor: "bg-[#07C160]" },
  { id: "alipay", name: "支付宝", badge: "支", badgeColor: "bg-[#1677FF]" },
  { id: "unionpay", name: "云闪付", badge: "云", badgeColor: "bg-danger" },
  { id: "huifu", name: "汇付天下", badge: "汇", badgeColor: "bg-warning" },
]

interface QuickBuySheetProps {
  open: boolean
  product: QuickBuyProduct | null
  onClose: () => void
  /** 支付成功回调，用于返回直播间继续观看 */
  onPaid?: (product: QuickBuyProduct, sku: string | null, quantity: number) => void
}

/**
 * 直播间「立即购买」半屏确认订单页。
 * 极短链路：选规格 → 选数量 → 选支付方式 → 确认支付 → 返回直播间。
 * 不跳转商品详情页、不进购物车。
 */
export function QuickBuySheet({ open, product, onClose, onPaid }: QuickBuySheetProps) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [payMethod, setPayMethod] = useState<PayMethod>("wechat")
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)

  const hasSku = !!product?.skus && product.skus.length > 0
  const total = useMemo(() => (product ? product.price * quantity : 0), [product, quantity])

  if (!open || !product) return null

  const reset = () => {
    setSelectedSku(null)
    setQuantity(1)
    setPayMethod("wechat")
    setPaying(false)
    setPaid(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handlePay = () => {
    if (hasSku && !selectedSku) return
    setPaying(true)
    // 模拟支付，成功后返回直播间
    setTimeout(() => {
      setPaying(false)
      setPaid(true)
      setTimeout(() => {
        onPaid?.(product, selectedSku, quantity)
        handleClose()
      }, 900)
    }, 1200)
  }

  const maxStock = product.stock ?? 99

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative bg-background rounded-t-3xl max-h-[82vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 支付成功态 */}
        {paid ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-success-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">支付成功</p>
            <p className="text-sm text-muted-foreground mt-1">正在返回直播间继续观看…</p>
          </div>
        ) : (
          <>
            {/* 头部：商品信息 */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                  <Image src={product.cover || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug pr-6">{product.name}</h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-danger text-xl font-bold">¥{product.price}</span>
                    <span className="text-muted-foreground text-xs line-through">¥{product.originalPrice}</span>
                  </div>
                  {product.stock !== undefined && (
                    <p className="text-[11px] text-muted-foreground mt-1">库存 {product.stock} 件</p>
                  )}
                </div>
                <button onClick={handleClose} className="absolute top-4 right-4 p-1" aria-label="关闭">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* 规格选择 */}
              {hasSku && (
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-medium text-foreground mb-2.5">选择规格</p>
                  <div className="flex flex-wrap gap-2">
                    {product.skus!.map((sku) => (
                      <button
                        key={sku}
                        onClick={() => setSelectedSku(sku)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm border transition-colors",
                          selectedSku === sku
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border text-foreground hover:border-primary/40"
                        )}
                      >
                        {sku}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 数量选择 */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">购买数量</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-40"
                    aria-label="减少"
                  >
                    <Minus className="w-4 h-4 text-foreground" />
                  </button>
                  <span className="text-base font-semibold text-foreground w-6 text-center tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                    disabled={quantity >= maxStock}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-40"
                    aria-label="增加"
                  >
                    <Plus className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>

              {/* 支付方式 */}
              <div className="p-4">
                <p className="text-sm font-medium text-foreground mb-2.5">支付方式</p>
                <div className="space-y-2">
                  {PAY_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                        payMethod === m.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn("w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold", m.badgeColor)}>
                          {m.badge}
                        </span>
                        <span className="text-sm text-foreground">{m.name}</span>
                      </div>
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          payMethod === m.id ? "border-primary bg-primary" : "border-muted-foreground"
                        )}
                      >
                        {payMethod === m.id && <Check className="w-3 h-3 text-primary-foreground" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部：合计 + 确认支付 */}
            <div className="p-4 border-t border-border safe-area-pb">
              <div className="flex items-center gap-2 mb-3 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>正品保障 · 支付后自动返回直播间</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <span className="text-xs text-muted-foreground">合计</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-danger text-sm font-bold">¥</span>
                    <span className="text-danger text-2xl font-bold tabular-nums">{total}</span>
                  </div>
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying || (hasSku && !selectedSku)}
                  className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-full font-semibold text-base disabled:opacity-50 transition-opacity"
                >
                  {paying ? "支付中…" : hasSku && !selectedSku ? "请选择规格" : "确认支付"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
