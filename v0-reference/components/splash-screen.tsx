"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface SplashScreenProps {
  onFinish?: () => void
  duration?: number
  showAd?: boolean
  adImage?: string
  adLink?: string
  adDuration?: number
}

export function SplashScreen({
  onFinish,
  duration = 2000,
  showAd = false,
  adImage,
  adLink,
  adDuration = 5,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "ad" | "done">("logo")
  const [countdown, setCountdown] = useState(adDuration)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Logo 阶段
    const logoTimer = setTimeout(() => {
      if (showAd && adImage) {
        setPhase("ad")
      } else {
        handleFinish()
      }
    }, duration)

    return () => clearTimeout(logoTimer)
  }, [duration, showAd, adImage])

  // 广告倒计时
  useEffect(() => {
    if (phase === "ad" && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            handleFinish()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [phase])

  const handleFinish = () => {
    setIsExiting(true)
    setTimeout(() => {
      setPhase("done")
      onFinish?.()
    }, 300)
  }

  const handleSkip = () => {
    handleFinish()
  }

  const handleAdClick = () => {
    if (adLink) {
      window.open(adLink, "_blank")
    }
  }

  if (phase === "done") return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] transition-opacity duration-300",
        isExiting ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Logo 阶段 */}
      {phase === "logo" && (
        <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
              <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 15 6 15 12C15 18 12 22 12 22" />
                <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" />
                <path d="M2 12H22" />
              </svg>
            </div>
            
            {/* 光晕效果 */}
            <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 blur-2xl opacity-50 -z-10" />
          </div>

          {/* 品牌名称 */}
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">热卜国学</h1>
          <p className="text-white/60 text-sm">传承智慧 · 启迪人生</p>

          {/* 加载动画 */}
          <div className="mt-12 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-white/60 rounded-full"
                style={{
                  animation: "bounce 1s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>

          {/* 版本号 */}
          <p className="absolute bottom-8 text-white/40 text-xs">v1.0.0</p>
        </div>
      )}

      {/* 开屏广告阶段 */}
      {phase === "ad" && (
        <div className="w-full h-full bg-black relative">
          {/* 广告图片 */}
          <div 
            className="w-full h-full bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: `url(${adImage})` }}
            onClick={handleAdClick}
          >
            {/* 占位示例 */}
            {!adImage && (
              <div className="w-full h-full bg-gradient-to-b from-primary/20 to-accent/20 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground mb-2">开屏广告位</p>
                  <p className="text-sm text-muted-foreground">点击了解更多</p>
                </div>
              </div>
            )}
          </div>

          {/* 跳过按钮 */}
          <button
            onClick={handleSkip}
            className="absolute top-12 right-4 px-4 py-1.5 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm"
          >
            跳过 {countdown}s
          </button>

          {/* 底部品牌标识 */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <span className="text-white text-sm font-medium">热卜国学</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// 使用示例组件
export function SplashScreenDemo() {
  const [showSplash, setShowSplash] = useState(true)
  const [showWithAd, setShowWithAd] = useState(false)

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        duration={2000}
        showAd={showWithAd}
        adDuration={5}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-foreground">启动页演示</h1>
      <p className="text-sm text-muted-foreground text-center">
        启动页已完成显示
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => {
            setShowWithAd(false)
            setShowSplash(true)
          }}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
        >
          重新播放（仅Logo）
        </button>
        <button
          onClick={() => {
            setShowWithAd(true)
            setShowSplash(true)
          }}
          className="w-full py-3 bg-secondary text-foreground rounded-xl font-medium"
        >
          重新播放（含开屏广告）
        </button>
      </div>
    </div>
  )
}
