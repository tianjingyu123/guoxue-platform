"use client"

/**
 * 勋章解锁仪式浮层（峰值时刻 · 自带品牌露出与传播入口）
 *
 * 用于"达成那一刻"的庆祝：成就勋章解锁、连续签到里程碑等。
 * 国风视觉——鎏金光芒射线旋转 + 勋章圆盘放大入场 + 名称/描述 + 可选积分奖励。
 * 这是用户乐于截图分享的高光时刻，因此内建：
 *   1) 顶部品牌露出（热卜国学 + slogan，引用 BRAND 常量与海报/证书母版口径一致）
 *   2) 底部「进入平台入口」扫码引导卡片 + 「分享喜悦」按钮（原生分享/复制文案）
 */

import { useEffect, useState } from "react"
import {
  Trophy, Star, Flame, BookOpen, Award, Crown, Zap, Target,
  GraduationCap, Medal, Sparkles, Calendar, Gift, X, Share2,
} from "lucide-react"
import { BRAND } from "@/lib/brand"
import { PlatformEntry } from "@/components/common/platform-entry"

export const unlockIcons = {
  trophy: Trophy, star: Star, flame: Flame, book: BookOpen, award: Award,
  crown: Crown, zap: Zap, target: Target, graduation: GraduationCap,
  medal: Medal, sparkles: Sparkles, calendar: Calendar, gift: Gift,
}

export type UnlockIconName = keyof typeof unlockIcons
export type UnlockRarity = "common" | "rare" | "epic" | "legendary"

const RARITY_LABEL: Record<UnlockRarity, string> = {
  common: "普通", rare: "稀有", epic: "史诗", legendary: "传说",
}

export interface BadgeUnlockData {
  title?: string
  name: string
  description: string
  icon: UnlockIconName
  rarity?: UnlockRarity
  /** 可选积分奖励 */
  rewardPoints?: number
}

interface BadgeUnlockProps {
  open: boolean
  data: BadgeUnlockData
  onClose: () => void
  claimLabel?: string
  onClaim?: () => void
  /** 二维码图片地址（可选，缺省显示占位引导） */
  qrCodeUrl?: string
}

export function BadgeUnlock({ open, data, onClose, claimLabel = "收下", onClaim, qrCodeUrl }: BadgeUnlockProps) {
  const [show, setShow] = useState(false)
  const [toast, setToast] = useState("")

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShow(true), 50)
      return () => clearTimeout(t)
    }
    setShow(false)
  }, [open])

  if (!open) return null

  const Icon = unlockIcons[data.icon] || Award
  const rarity = data.rarity || "rare"

  const handleShare = async () => {
    const text = `我在${BRAND.name}解锁了「${data.name}」成就，${BRAND.slogan}`
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: data.name, text })
      } catch {
        /* 用户取消 */
      }
    } else {
      navigator.clipboard?.writeText(text)
      setToast("分享文案已复制")
      setTimeout(() => setToast(""), 1800)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-y-auto px-8 py-8 bg-black/75 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      {/* 顶部品牌露出 */}
      <div
        className={`mb-3 flex items-center gap-1.5 transition-all duration-700 ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      >
        <span className="font-serif text-[14px] font-bold" style={{ color: "#e8d5b5" }}>{BRAND.name}</span>
        <span className="text-white/40">·</span>
        <span className="text-[12px] text-white/55">{BRAND.slogan}</span>
      </div>

      {/* 仪式标题 */}
      <p
        className={`mb-7 font-serif text-[20px] font-bold text-white transition-all duration-700 ${show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        {data.title || "解锁新成就"}
      </p>

      {/* 勋章 + 光芒 */}
      <div className="relative mb-7 flex h-56 w-56 items-center justify-center">
        {/* 旋转光芒射线 */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 ${show ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(201,169,110,0.45) 20deg, transparent 40deg, rgba(201,169,110,0.45) 60deg, transparent 80deg, rgba(201,169,110,0.45) 100deg, transparent 120deg, rgba(201,169,110,0.45) 140deg, transparent 160deg, rgba(201,169,110,0.45) 180deg, transparent 200deg, rgba(201,169,110,0.45) 220deg, transparent 240deg, rgba(201,169,110,0.45) 260deg, transparent 280deg, rgba(201,169,110,0.45) 300deg, transparent 320deg, rgba(201,169,110,0.45) 340deg, transparent 360deg)",
            animation: show ? "spin 8s linear infinite" : "none",
            maskImage: "radial-gradient(circle, transparent 38%, black 42%, black 70%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 38%, black 42%, black 70%, transparent 72%)",
          }}
        />
        {/* 柔光晕 */}
        <div className="absolute h-40 w-40 rounded-full blur-2xl" style={{ background: "rgba(201,169,110,0.35)" }} />

        {/* 勋章圆盘 */}
        <div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full shadow-2xl transition-all duration-700 ${show ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-180 opacity-0"}`}
          style={{
            background: "radial-gradient(circle at 35% 30%, #f7f0e3 0%, #efe4cf 60%, #e8d5b5 100%)",
            border: "3px solid #c9a96e",
          }}
        >
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: "#c41e3a", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25)" }}
          >
            <Icon className="h-12 w-12 text-white" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* 勋章信息 */}
      <div
        className={`flex flex-col items-center text-center transition-all delay-300 duration-700 ${show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: "rgba(201,169,110,0.25)", color: "#e8d5b5" }}>
            {RARITY_LABEL[rarity]}
          </span>
        </div>
        <h2 className="font-serif text-[24px] font-bold text-white">{data.name}</h2>
        <p className="mt-2 max-w-[260px] text-pretty text-[14px] leading-relaxed text-white/70">
          {data.description}
        </p>
        {data.rewardPoints != null && (
          <div className="mt-3 flex items-center gap-1.5 rounded-full px-4 py-1.5" style={{ background: "rgba(196,30,58,0.2)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "#e8d5b5" }} />
            <span className="text-[14px] font-medium text-white">+{data.rewardPoints} 积分</span>
          </div>
        )}
      </div>

      {/* 进入平台入口（扫码引导）+ 分享 —— 分享传播时刻的品牌出口 */}
      <div
        className={`mt-8 flex w-full max-w-[320px] flex-col items-center gap-3.5 transition-all delay-500 duration-700 ${show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        <PlatformEntry qrCodeUrl={qrCodeUrl} variant="dark" />

        <div className="flex w-full gap-2.5">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-3xl bg-white/10 py-3.5 text-[15px] font-medium text-white active:bg-white/20"
          >
            <Share2 className="h-4 w-4" />
            分享喜悦
          </button>
          <button
            onClick={onClaim || onClose}
            className="flex-1 rounded-3xl py-3.5 text-[15px] font-medium text-white shadow-lg active:scale-95"
            style={{ background: "#c41e3a" }}
          >
            {claimLabel}
          </button>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
