"use client"

import { useState, useEffect, useRef } from "react"
import { X, Phone, PhoneOff, Mic, MicOff, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type MicState = "idle" | "requesting" | "connected" | "ended" | "timeout"

interface MicConnectSheetProps {
  open: boolean
  onClose: () => void
  hostName: string
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0")
  const s = (sec % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

export function MicConnectSheet({ open, onClose, hostName }: MicConnectSheetProps) {
  const [state, setState] = useState<MicState>("idle")
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waitRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 申请连麦：模拟主播在 3.5s 后同意；若长时间无响应则超时
  useEffect(() => {
    if (state === "requesting") {
      waitRef.current = setTimeout(() => setState("connected"), 3500)
      const timeout = setTimeout(() => {
        setState((s) => (s === "requesting" ? "timeout" : s))
      }, 15000)
      return () => {
        if (waitRef.current) clearTimeout(waitRef.current)
        clearTimeout(timeout)
      }
    }
  }, [state])

  // 通话计时
  useEffect(() => {
    if (state === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [state])

  if (!open) return null

  const reset = () => {
    setState("idle")
    setDuration(0)
    setMuted(false)
    onClose()
  }

  const hangUp = () => setState("ended")

  // 通话中：紧凑悬浮条，不遮挡直播画面，可边看边连麦
  if (state === "connected") {
    return (
      <div className="absolute left-3 right-3 bottom-20 z-[55] animate-in slide-in-from-bottom-2 fade-in duration-300">
        <div className="flex items-center gap-3 rounded-2xl bg-gray-900/85 backdrop-blur-md border border-white/10 px-3 py-2.5 shadow-2xl">
          <span className="relative flex-shrink-0">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/50 to-cyan-500/40 flex items-center justify-center text-base">🎙️</span>
            <span className="absolute inset-0 rounded-full border border-blue-400/60 animate-ping" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate">与「{hostName}」连麦中</p>
            <p className="text-blue-300 font-mono text-[12px] tabular-nums">{fmt(duration)}</p>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", muted ? "bg-amber-500/80" : "bg-white/10")}
            aria-label={muted ? "取消静音" : "静音"}
          >
            {muted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={hangUp}
            className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            aria-label="挂断"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[55]" onClick={reset}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-gray-900/95 to-black rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <span className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* 申请前 */}
        {state === "idle" && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/40 to-cyan-500/30 flex items-center justify-center mb-3">
              <Phone className="w-7 h-7 text-blue-300" />
            </div>
            <h3 className="text-white font-semibold text-lg">申请与主播连麦</h3>
            <p className="text-white/50 text-sm mt-1.5 leading-relaxed">
              向「{hostName}」发起连麦申请，主播同意后即可开始语音互动，连麦内容将对全场观众公开。
            </p>
            <button
              onClick={() => setState("requesting")}
              className="w-full h-12 mt-6 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />申请连麦
            </button>
            <button onClick={reset} className="w-full h-11 mt-2 text-sm text-white/50">取消</button>
          </div>
        )}

        {/* 等待主播同意 */}
        {state === "requesting" && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Loader2 className="w-7 h-7 text-blue-300 animate-spin" />
            </div>
            <h3 className="text-white font-semibold text-lg">等待主播同意…</h3>
            <p className="text-white/50 text-sm mt-1.5">已向「{hostName}」发送连麦申请</p>
            <button onClick={reset} className="w-full h-12 mt-6 rounded-2xl bg-white/10 text-white font-medium">取消申请</button>
          </div>
        )}

        {/* 超时未响应 */}
        {state === "timeout" && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-white font-semibold text-lg">主播暂未响应</h3>
            <p className="text-white/50 text-sm mt-1.5">主播正在忙碌，可稍后再试</p>
            <button onClick={() => setState("requesting")} className="w-full h-12 mt-6 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold">重新申请</button>
            <button onClick={reset} className="w-full h-11 mt-2 text-sm text-white/50">关闭</button>
          </div>
        )}

        {/* 挂断总结 */}
        {state === "ended" && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <Phone className="w-7 h-7 text-white/70" />
            </div>
            <h3 className="text-white font-semibold text-lg">连麦已结束</h3>
            <div className="w-full bg-white/5 rounded-2xl p-4 mt-4 flex items-center justify-between">
              <span className="text-white/50 text-sm">通话时长</span>
              <span className="text-white font-mono text-lg tabular-nums">{fmt(duration)}</span>
            </div>
            <button onClick={reset} className="w-full h-12 mt-5 rounded-2xl bg-white/10 text-white font-medium">完成</button>
          </div>
        )}
        <div className="pb-safe" />
      </div>
    </div>
  )
}
