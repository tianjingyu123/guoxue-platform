"use client"

/**
 * 注册成功 · 欢迎仪式（峰值时刻 1.1）
 *
 * 宣纸色背景 + 中心热卜 LOGO + 渐入「欢迎来到国学世界」+ Slogan，
 * 底部「开始探索」按钮，3 秒自动进入下一步（兴趣选择/首页），可主动点击加速。
 */

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api"
import Image from "next/image"
import { BRAND } from "@/lib/brand"
import { ArrowRight } from "lucide-react"

export default function WelcomePage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)
  const [showTitle, setShowTitle] = useState(false)
  const [showSlogan, setShowSlogan] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [hasInterests, setHasInterests] = useState<boolean | null>(null)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const profile = await authApi.getProfile()
        setUserName(profile?.nickname || profile?.username || "")
        setHasInterests(Boolean(profile?.interests && profile.interests.length > 0))
      } catch {
        setHasInterests(false)
      }
    }
    checkUserProfile()
  }, [])

  const handleNavigate = useCallback(() => {
    if (hasInterests === null) return
    router.replace(hasInterests ? "/" : "/interests-guide")
  }, [router, hasInterests])

  // 渐入动画序列
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setShowTitle(true), 1000))
    timers.push(setTimeout(() => setShowSlogan(true), 1500))
    timers.push(setTimeout(() => setShowButton(true), 2000))
    return () => timers.forEach(clearTimeout)
  }, [])

  // 倒计时自动进入
  useEffect(() => {
    if (countdown <= 0) {
      handleNavigate()
      return
    }
    const timer = setTimeout(() => setCountdown((p) => p - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, handleNavigate])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "linear-gradient(180deg,#f7f0e3 0%,#efe4cf 100%)" }}>
      {/* 柔和光晕 */}
      <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full blur-[100px]" style={{ background: "rgba(201,169,110,0.18)" }} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8">
        {/* 热卜 LOGO */}
        <div className="mb-10 animate-in fade-in zoom-in-90 duration-1000">
          <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-[#c9a96e]/30">
            <Image
              src="/brand/rebu-logo.jpg"
              alt="热卜国学"
              width={104}
              height={104}
              priority
              className="h-[104px] w-[104px] object-cover"
            />
          </div>
        </div>

        {/* 欢迎标题 */}
        <div className={`text-center transition-all duration-1000 ease-out ${showTitle ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
          <h1 className="font-serif text-[26px] font-bold" style={{ color: "#3a3226" }}>
            {userName ? `${userName}，` : ""}欢迎来到国学世界
          </h1>
        </div>

        {/* Slogan */}
        <p className={`mt-4 font-serif text-[16px] transition-all duration-1000 ease-out ${showSlogan ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`} style={{ color: "#7a6f60" }}>
          {BRAND.slogan}
        </p>

        {/* 开始探索按钮 */}
        <button
          onClick={handleNavigate}
          disabled={hasInterests === null}
          className={`mt-14 flex items-center gap-2 rounded-3xl px-10 py-3.5 text-[15px] font-medium text-white shadow-lg transition-all duration-700 active:scale-95 disabled:opacity-50 ${showButton ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
          style={{ background: "#c41e3a" }}
        >
          {hasInterests === null ? "加载中…" : (
            <>
              开始探索
              <ArrowRight className="h-4 w-4" />
              <span className="text-white/70">({countdown}s)</span>
            </>
          )}
        </button>

        {/* 装饰分隔线 */}
        <div className={`mt-16 flex items-center gap-4 transition-opacity duration-700 ${showButton ? "opacity-100" : "opacity-0"}`}>
          <div className="h-px w-12" style={{ background: "linear-gradient(to right,transparent,rgba(201,169,110,0.6))" }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(201,169,110,0.6)" }} />
          <div className="h-px w-12" style={{ background: "linear-gradient(to left,transparent,rgba(201,169,110,0.6))" }} />
        </div>
      </div>

      {/* 底部品牌落款 */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[11px]" style={{ color: "rgba(122,111,96,0.6)" }}>
          {BRAND.name} · {BRAND.tagline}
        </p>
      </div>
    </div>
  )
}
