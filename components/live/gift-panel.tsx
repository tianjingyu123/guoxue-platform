"use client"

import { useState } from "react"
import { X, Sparkles, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { InsufficientBalanceDialog } from "@/components/wallet/insufficient-balance-dialog"

export interface LiveGift {
  id: number
  name: string
  icon: string
  price: number
  /** 动效等级：1 普通 / 2 高级 / 3 顶级（飘屏） */
  level: 1 | 2 | 3
}

// 国学风格礼物（含动效等级）
export const LIVE_GIFTS: LiveGift[] = [
  { id: 1, name: "太极", icon: "☯️", price: 1, level: 1 },
  { id: 2, name: "梅花", icon: "🌸", price: 10, level: 1 },
  { id: 3, name: "竹简", icon: "📜", price: 52, level: 1 },
  { id: 4, name: "罗盘", icon: "🧭", price: 99, level: 2 },
  { id: 5, name: "如意", icon: "🪬", price: 199, level: 2 },
  { id: 6, name: "八卦阵", icon: "🔯", price: 366, level: 2 },
  { id: 7, name: "金龙献瑞", icon: "🐉", price: 520, level: 3 },
  { id: 8, name: "紫微星耀", icon: "🌟", price: 1888, level: 3 },
]

const LEVEL_LABEL: Record<number, string> = { 1: "普通", 2: "高级", 3: "全屏" }

interface GiftPanelProps {
  open: boolean
  onClose: () => void
  /** 当前国学币余额 */
  balance: number
  /** 发送成功回调，parent 负责扣费与飘屏 */
  onSend: (gift: LiveGift) => void
}

export function GiftPanel({ open, onClose, balance, onSend }: GiftPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showInsufficient, setShowInsufficient] = useState(false)
  const selected = LIVE_GIFTS.find((g) => g.id === selectedId) ?? null

  if (!open) return null

  const handleSend = () => {
    if (!selected) return
    if (selected.price > balance) {
      setShowInsufficient(true)
      return
    }
    onSend(selected)
  }

  return (
    <>
      <div className="absolute inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-gray-900/95 to-black rounded-t-3xl animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
          {/* 拖拽条 */}
          <div className="flex justify-center pt-2.5">
            <span className="w-9 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-4 pt-2 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">国学风礼物</span>
            </div>
            <button onClick={onClose} aria-label="关闭"><X className="w-5 h-5 text-white/60" /></button>
          </div>

          {/* 礼物网格 */}
          <div className="px-4 grid grid-cols-4 gap-2.5">
            {LIVE_GIFTS.map((gift) => {
              const isSel = gift.id === selectedId
              return (
                <button
                  key={gift.id}
                  onClick={() => setSelectedId(gift.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all",
                    isSel
                      ? "bg-amber-500/15 border-amber-400 scale-[1.03]"
                      : "bg-white/5 border-white/5 hover:bg-white/10",
                  )}
                >
                  {gift.level === 3 && (
                    <span className="absolute top-1 right-1 text-[8px] px-1 py-px rounded bg-amber-500/90 text-black font-bold">{LEVEL_LABEL[gift.level]}</span>
                  )}
                  <span className="text-3xl">{gift.icon}</span>
                  <span className="text-xs text-white">{gift.name}</span>
                  <div className="flex items-center gap-0.5">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-amber-400">{gift.price}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 底部：余额 + 发送 */}
          <div className="mt-3 p-4 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm text-white whitespace-nowrap">余额 {balance.toLocaleString()}</span>
              <button onClick={() => setShowInsufficient(true)} className="text-xs text-amber-400 ml-1">充值</button>
            </div>
            <button
              onClick={handleSend}
              disabled={!selected}
              className={cn(
                "px-7 h-10 rounded-full font-semibold text-white flex items-center gap-1.5 transition-all active:scale-95",
                selected ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-white/10 text-white/40",
              )}
            >
              <Sparkles className="w-4 h-4" />
              {selected ? `送出 ${selected.price}币` : "选择礼物"}
            </button>
          </div>
          <div className="pb-safe" />
        </div>
      </div>

      <InsufficientBalanceDialog
        open={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        required={selected?.price ?? 0}
        balance={balance}
      />
    </>
  )
}
