"use client"

import { useRouter } from "next/navigation"
import { Coins, Wallet } from "lucide-react"

interface InsufficientBalanceDialogProps {
  open: boolean
  onClose: () => void
  // 本次需要支付的国学币数量
  required: number
  // 当前余额
  balance: number
}

// 可用场景（打赏/付费问答/连麦/悬赏）国学币余额不足时的引导充值弹窗
export function InsufficientBalanceDialog({
  open,
  onClose,
  required,
  balance,
}: InsufficientBalanceDialogProps) {
  const router = useRouter()
  if (!open) return null

  const shortfall = Math.max(required - balance, 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-4">
            <Coins className="w-7 h-7 text-accent" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">国学币余额不足</h3>
          <p className="text-sm text-muted-foreground mb-5">
            本次需支付 <span className="font-semibold text-foreground">{required}</span> 国学币，
            当前余额 <span className="font-semibold text-foreground">{balance}</span> 国学币
          </p>

          <div className="w-full bg-secondary/50 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">还需充值</span>
              <span className="text-xl font-bold text-primary">{shortfall} 国学币</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/wallet/recharge")}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            去充值
          </button>
          <button
            onClick={onClose}
            className="w-full h-11 mt-2 text-sm text-muted-foreground"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  )
}
