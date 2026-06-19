"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { systemApi } from "@/lib/api"

// 开屏广告类型
interface SplashAd {
  id: string
  image: string
  link: string
  duration: number // 广告展示秒数
}

// 开屏页 - 品牌曝光 + 开屏广告
export default function SplashPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<"brand" | "ad">("brand")
  const [countdown, setCountdown] = useState(3)
  const [logoAnimated, setLogoAnimated] = useState(false)
  const [sloganVisible, setSloganVisible] = useState(false)
  const [ad, setAd] = useState<SplashAd | null>(null)
  const [adCountdown, setAdCountdown] = useState(5)

  // 跳转首页
  const goHome = useCallback(() => {
    router.push("/")
  }, [router])

  // 点击广告
  const handleAdClick = useCallback(() => {
    if (ad?.link) {
      // 记录广告点击
      // analyticsApi.trackAdClick(ad.id)
      window.location.href = ad.link
    }
  }, [ad])

  // 获取开屏广告
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const banners = await systemApi.getBanners("splash")
        if (banners && banners.length > 0) {
          setAd({
            id: banners[0].id,
            image: banners[0].image,
            link: banners[0].link,
            duration: 5
          })
        }
      } catch (error) {
        // 无广告时继续品牌展示
        console.log("[v0] No splash ad available")
      }
    }
    fetchAd()
    
    // 后台预加载首页数据
    // recommendApi.personalized().catch(() => {})
  }, [])

  // 品牌Logo动画
  useEffect(() => {
    // 100ms后开始Logo动画
    const logoTimer = setTimeout(() => setLogoAnimated(true), 100)
    // 600ms后显示Slogan
    const sloganTimer = setTimeout(() => setSloganVisible(true), 600)
    
    return () => {
      clearTimeout(logoTimer)
      clearTimeout(sloganTimer)
    }
  }, [])

  // 品牌阶段倒计时
  useEffect(() => {
    if (phase !== "brand") return
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // 有广告则切换到广告阶段，否则跳转首页
          if (ad) {
            setPhase("ad")
            setAdCountdown(ad.duration)
          } else {
            goHome()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase, ad, goHome])

  // 广告阶段倒计时
  useEffect(() => {
    if (phase !== "ad") return
    
    const timer = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          goHome()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase, goHome])

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* 品牌展示阶段 */}
      {phase === "brand" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* 背景 - 深灰蓝色调渐变 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1F2E] via-[#252A38] to-[#1A1F2E]">
            {/* 山峦剪影层 */}
            <div className="absolute bottom-0 left-0 right-0 h-[40%]">
              <svg 
                className="absolute bottom-0 left-0 right-0 w-full h-full opacity-20"
                viewBox="0 0 1440 400"
                preserveAspectRatio="none"
              >
                <path
                  fill="#2A3040"
                  d="M0,400 L0,200 Q200,100 400,180 Q600,260 800,150 Q1000,40 1200,120 Q1400,200 1440,150 L1440,400 Z"
                />
              </svg>
              <svg 
                className="absolute bottom-0 left-0 right-0 w-full h-full opacity-30"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
              >
                <path
                  fill="#252A38"
                  d="M0,320 L0,160 Q180,80 360,140 Q540,200 720,100 Q900,0 1080,80 Q1260,160 1440,120 L1440,320 Z"
                />
              </svg>
            </div>
            
            {/* 天边曙光 */}
            <div className="absolute top-[20%] left-0 right-0 h-[30%] bg-gradient-to-b from-transparent via-[#C9A96E]/5 to-transparent" />
            
            {/* 微妙光晕 */}
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#C9A96E]/10 rounded-full blur-[100px]" />
          </div>

          {/* 右上角跳过按钮 */}
          <button
            onClick={goHome}
            className="absolute top-12 right-4 z-20 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium active:bg-white/20 transition-colors"
          >
            跳过 {countdown}s
          </button>

          {/* 主内容区 - Logo + 品牌名 + Slogan */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo - 缩放淡入动画 */}
            <div 
              className={`w-32 h-32 mb-6 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden transition-all duration-700 ease-out ${
                logoAnimated 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-75'
              }`}
            >
              <img 
                src="/images/logo.jpg" 
                alt="热卜" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* 品牌名 - 跟随Logo淡入 */}
            <h1 
              className={`font-serif text-3xl font-bold text-white tracking-widest mb-3 transition-all duration-500 delay-200 ${
                logoAnimated 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4'
              }`}
            >
              热卜国学
            </h1>
            
            {/* Slogan - 延迟淡入 */}
            <p 
              className={`text-base text-[#C9A96E] tracking-[0.3em] transition-all duration-500 ${
                sloganVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-2'
              }`}
            >
              探寻东方智慧
            </p>
          </div>

          {/* 底部版权 */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-[11px] text-white/30 tracking-wide">
              Copyright 2024 热卜国学 All Rights Reserved
            </p>
          </div>
        </div>
      )}

      {/* 广告展示阶段 */}
      {phase === "ad" && ad && (
        <div className="absolute inset-0 bg-black">
          {/* 右上角跳过按钮 */}
          <button
            onClick={goHome}
            className="absolute top-12 right-4 z-20 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/30 text-white text-sm font-medium active:bg-black/70 transition-colors"
          >
            跳过 {adCountdown}s
          </button>

          {/* 广告图片 - 全屏可点击 */}
          <button
            onClick={handleAdClick}
            className="w-full h-full"
          >
            <img 
              src={ad.image} 
              alt="广告" 
              className="w-full h-full object-cover"
            />
          </button>

          {/* 底部品牌标识 */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded overflow-hidden">
              <img src="/images/logo.jpg" alt="热卜" className="w-full h-full object-cover" />
            </div>
            <span className="text-white/60 text-xs">热卜国学</span>
          </div>
        </div>
      )}
    </div>
  )
}
