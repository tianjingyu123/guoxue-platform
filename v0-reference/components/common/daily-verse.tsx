"use client"

/**
 * 今日小语母版（峰值时刻 2.1）
 *
 * 每日首次打开首页时，顶部淡入展示一句古诗词名句 + 当日节气，
 * 数秒后自动收起，不打断用户。克制的文化仪式感。
 */

import { useEffect, useState } from "react"
import { getTodayVerse } from "@/lib/data/daily-verse"

interface DailyVerseProps {
  /** 展示时长（毫秒），默认 4 秒 */
  duration?: number
  /** 当日是否已展示过（由调用方控制每日一次） */
  storageKey?: string
}

export function DailyVerse({ duration = 4000, storageKey = "daily-verse-shown" }: DailyVerseProps) {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden")
  const [verse] = useState(() => getTodayVerse())

  useEffect(() => {
    // 每日仅展示一次
    const today = new Date().toDateString()
    if (typeof window !== "undefined") {
      if (localStorage.getItem(storageKey) === today) return
      localStorage.setItem(storageKey, today)
    }
    const t1 = setTimeout(() => setPhase("in"), 200)
    const t2 = setTimeout(() => setPhase("out"), duration)
    const t3 = setTimeout(() => setPhase("hidden"), duration + 700)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [duration, storageKey])

  if (phase === "hidden") return null

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center px-4 pt-20 transition-all duration-700 ${
        phase === "in" ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-md rounded-2xl border border-border bg-card/95 px-5 py-4 text-center shadow-lg backdrop-blur">
        {verse.solarTerm && (
          <p className="mb-1.5 text-[12px] font-medium" style={{ color: "#c41e3a" }}>
            {verse.solarTerm}
          </p>
        )}
        <p className="font-serif text-[17px] leading-relaxed text-foreground text-balance">
          {verse.text}
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{verse.source}</p>
      </div>
    </div>
  )
}
