"use client"

import { useState, useEffect, useCallback } from "react"
import { getWalletInfo } from "@/lib/api/wallet"

// 国学币余额 hook：用于可用场景（打赏/付费问答/连麦/悬赏）的余额校验与引导充值
export function useCoinBalance() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getWalletInfo()
      if (res.code === 200 && res.data) {
        setBalance(res.data.balance)
      }
    } catch (error) {
      console.error("加载国学币余额失败:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // 余额是否充足；余额尚未加载完成时按充足处理，避免误拦截
  const isEnough = useCallback(
    (amount: number) => balance === null || balance >= amount,
    [balance],
  )

  return { balance, loading, isEnough, refresh }
}
