"use client"

import { useEffect, useRef, useState } from "react"
import { Wifi, WifiOff, Loader2, PhoneOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReconnectingOverlayProps {
  /** 是否处于断连状态 */
  open: boolean
  /** 重连成功回调 */
  onReconnected: () => void
  /** 挂断/结束通话回调 */
  onEndCall: () => void
  /** 强调色，默认主色 */
  accentColor?: string
  /** 每次自动重试的秒数 */
  retryInterval?: number
  /** 最大自动重试次数，超过后提示手动操作 */
  maxAutoRetries?: number
}

/**
 * 通话网络断连重连浮层。
 * - 监听真实 online/offline 事件，断网即显示
 * - 自动重试倒计时 + 手动「立即重连」
 * - 多次失败后提示结束通话
 * - 重连期间父组件应暂停计时与计费
 */
export function ReconnectingOverlay({
  open,
  onReconnected,
  onEndCall,
  accentColor = "var(--primary)",
  retryInterval = 5,
  maxAutoRetries = 3,
}: ReconnectingOverlayProps) {
  const [countdown, setCountdown] = useState(retryInterval)
  const [attempt, setAttempt] = useState(1)
  const [retrying, setRetrying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 进入断连态时重置
  useEffect(() => {
    if (open) {
      setCountdown(retryInterval)
      setAttempt(1)
      setRetrying(false)
    }
  }, [open, retryInterval])

  // 网络恢复即视为重连成功
  useEffect(() => {
    if (!open) return
    const handleOnline = () => doReconnect()
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 自动重试倒计时
  useEffect(() => {
    if (!open || retrying || attempt > maxAutoRetries) return
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          doReconnect()
          return retryInterval
        }
        return c - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retrying, attempt, maxAutoRetries, retryInterval])

  const doReconnect = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setRetrying(true)
    // 模拟握手过程；若网络已恢复则成功，否则进入下一次尝试
    setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setRetrying(false)
        onReconnected()
      } else {
        setRetrying(false)
        setAttempt((a) => a + 1)
        setCountdown(retryInterval)
      }
    }, 1500)
  }

  if (!open) return null

  const exhausted = attempt > maxAutoRetries

  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm px-8 text-center">
      <div className="relative mb-6">
        <span
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {retrying ? (
            <Loader2 className="w-9 h-9 text-white animate-spin" />
          ) : (
            <WifiOff className="w-9 h-9 text-white/80" />
          )}
        </span>
        {!retrying && (
          <span className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
        )}
      </div>

      <h3 className="text-white text-lg font-semibold mb-1.5">
        {retrying ? "正在重新连接…" : exhausted ? "网络连接已断开" : "网络不稳定，连接中断"}
      </h3>
      <p className="text-white/60 text-sm leading-relaxed mb-1">
        {retrying
          ? "请保持网络畅通"
          : exhausted
            ? "多次重连未成功，请检查网络后重试，通话计费已暂停"
            : `将在 ${countdown} 秒后自动重连（第 ${attempt}/${maxAutoRetries} 次），计费已暂停`}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-7">
        <button
          onClick={doReconnect}
          disabled={retrying}
          className="w-full h-12 rounded-full text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
          style={{ background: accentColor }}
        >
          <Wifi className="w-5 h-5" />
          {retrying ? "连接中…" : "立即重连"}
        </button>
        <button
          onClick={onEndCall}
          className={cn(
            "w-full h-12 rounded-full font-medium flex items-center justify-center gap-2",
            "bg-white/10 text-white active:scale-[0.98] transition-transform",
          )}
        >
          <PhoneOff className="w-5 h-5" />
          结束通话
        </button>
      </div>
    </div>
  )
}
