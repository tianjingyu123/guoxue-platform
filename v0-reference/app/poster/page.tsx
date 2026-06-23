"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Download, Share2, Check, QrCode, Sparkles, BookOpen, Users, Gift, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

// 海报模板配置
const posterTemplates = [
  { id: "classic", name: "国风经典", bg: "from-primary/20 via-accent/10 to-background", accent: "primary" },
  { id: "modern", name: "简约现代", bg: "from-slate-900 via-slate-800 to-slate-900", accent: "white" },
  { id: "ink", name: "水墨丹青", bg: "from-stone-100 via-stone-50 to-stone-100", accent: "stone" },
  { id: "gold", name: "金色华章", bg: "from-amber-900/80 via-amber-800/60 to-amber-900/80", accent: "amber" },
]

// 场景类型配置
const sceneConfigs = {
  invite: {
    title: "邀请好友",
    subtitle: "与好友一起探索国学智慧",
    icon: Gift,
    reward: "邀请1位好友，双方各得7天会员",
  },
  course: {
    title: "八字命理入门精讲",
    subtitle: "周易大师倾情授课",
    icon: BookOpen,
    reward: "好友购买后你可获得10%返佣",
  },
  circle: {
    title: "八字命理研习社",
    subtitle: "1,280位圈友共同学习",
    icon: Users,
    reward: "邀请入圈可获得5%分成",
  },
  paipan: {
    title: "我的八字排盘结果",
    subtitle: "AI智能命理分析",
    icon: Sparkles,
    reward: "分享后好友可免费体验",
  },
}

function PosterPageContent() {
  const searchParams = useSearchParams()
  const scene = (searchParams.get("scene") as keyof typeof sceneConfigs) || "invite"
  const sceneConfig = sceneConfigs[scene]
  
  const [selectedTemplate, setSelectedTemplate] = useState("classic")
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  
  const currentTemplate = posterTemplates.find(t => t.id === selectedTemplate) || posterTemplates[0]
  const SceneIcon = sceneConfig.icon

  const handleSave = async () => {
    setIsSaving(true)
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSaving(false)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleShare = () => {
    setShowShareMenu(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">生成海报</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="pb-40">
        {/* 海报预览区 */}
        <div className="p-6 flex justify-center">
          <div 
            className={cn(
              "w-72 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b",
              currentTemplate.bg
            )}
          >
            {/* 海报头部装饰 */}
            <div className="relative h-32 flex items-center justify-center">
              {/* 太极装饰 */}
              <div className="absolute inset-0 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className={cn(
                    selectedTemplate === "modern" ? "text-white" : "text-foreground"
                  )} />
                  <path d="M50 10 A40 40 0 0 1 50 90 A20 20 0 0 1 50 50 A20 20 0 0 0 50 10" fill="currentColor" className={cn(
                    selectedTemplate === "modern" ? "text-white" : "text-foreground"
                  )} />
                </svg>
              </div>
              
              {/* Logo */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center",
                  selectedTemplate === "modern" ? "bg-white/20" : "bg-primary/20"
                )}>
                  <SceneIcon className={cn(
                    "w-7 h-7",
                    selectedTemplate === "modern" ? "text-white" : "text-primary"
                  )} />
                </div>
                <span className={cn(
                  "text-lg font-bold mt-2",
                  selectedTemplate === "modern" ? "text-white" : 
                  selectedTemplate === "ink" ? "text-stone-800" : "text-foreground"
                )}>
                  热卜国学
                </span>
              </div>
            </div>

            {/* 海报内容 */}
            <div className={cn(
              "px-6 py-5",
              selectedTemplate === "modern" ? "text-white" : 
              selectedTemplate === "ink" ? "text-stone-800" : "text-foreground"
            )}>
              <h2 className="text-xl font-bold text-center">{sceneConfig.title}</h2>
              <p className={cn(
                "text-sm text-center mt-1",
                selectedTemplate === "modern" ? "text-white/70" : "text-muted-foreground"
              )}>
                {sceneConfig.subtitle}
              </p>

              {/* 用户信息 */}
              <div className={cn(
                "flex items-center gap-3 mt-5 p-3 rounded-xl",
                selectedTemplate === "modern" ? "bg-white/10" : "bg-secondary/50"
              )}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src="" alt="用户" />
                  <AvatarFallback className="bg-primary/20 text-primary">李</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">李易安</p>
                  <p className={cn(
                    "text-xs",
                    selectedTemplate === "modern" ? "text-white/60" : "text-muted-foreground"
                  )}>
                    邀请你一起探索国学
                  </p>
                </div>
              </div>

              {/* 二维码区域 */}
              <div className="mt-5 flex flex-col items-center">
                <div className={cn(
                  "w-28 h-28 rounded-xl flex items-center justify-center",
                  selectedTemplate === "modern" ? "bg-white" : "bg-white"
                )}>
                  <QrCode className="w-20 h-20 text-foreground" />
                </div>
                <p className={cn(
                  "text-xs mt-2",
                  selectedTemplate === "modern" ? "text-white/60" : "text-muted-foreground"
                )}>
                  长按或扫码识别
                </p>
              </div>

              {/* 奖励提示 */}
              <div className={cn(
                "mt-4 py-2 px-3 rounded-lg text-center text-xs",
                selectedTemplate === "modern" ? "bg-white/10 text-white/80" :
                selectedTemplate === "gold" ? "bg-amber-500/20 text-amber-200" :
                "bg-accent/10 text-accent"
              )}>
                {sceneConfig.reward}
              </div>
            </div>

            {/* 海报底部 - 带Logo */}
            <div className={cn(
              "px-6 py-3 flex items-center justify-center gap-2 border-t",
              selectedTemplate === "modern" ? "border-white/10 text-white/50" :
              selectedTemplate === "ink" ? "border-stone-200 text-stone-500" :
              "border-border text-muted-foreground"
            )}>
              <img src="/images/logo.jpg" alt="热卜" className="w-5 h-5 rounded object-cover" />
              <span className="text-xs">热卜国学 · 探索易学智慧</span>
            </div>
          </div>
        </div>

        {/* 模板选择 */}
        <div className="px-4">
          <h3 className="text-sm font-medium text-foreground mb-3">选择模板</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {posterTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "flex-shrink-0 w-20 rounded-xl overflow-hidden border-2 transition-all",
                  selectedTemplate === template.id 
                    ? "border-primary shadow-lg shadow-primary/20" 
                    : "border-transparent"
                )}
              >
                <div className={cn(
                  "h-28 bg-gradient-to-b flex items-center justify-center",
                  template.bg
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    template.id === "modern" ? "bg-white/20" : "bg-primary/20"
                  )}>
                    <Sparkles className={cn(
                      "w-4 h-4",
                      template.id === "modern" ? "text-white" : "text-primary"
                    )} />
                  </div>
                </div>
                <div className="py-2 text-center bg-card">
                  <span className={cn(
                    "text-xs",
                    selectedTemplate === template.id ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {template.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 提示文字 */}
        <div className="px-4 mt-6">
          <Card className="p-3 bg-accent/5 border-accent/20">
            <p className="text-xs text-center text-muted-foreground">
              分享后若有朋友通过你的海报进入平台，你将获得推广奖励
            </p>
          </Card>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
              isSaved 
                ? "bg-green-500 text-white" 
                : "bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isSaved ? (
              <>
                <Check className="w-5 h-5" />
                已保存到相册
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                保存图片
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            直接分享
          </button>
        </div>
      </div>

      {/* 分享菜单 */}
      {showShareMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowShareMenu(false)}>
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl safe-area-pb animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-center text-foreground">分享至</h3>
            </div>
            <div className="grid grid-cols-4 gap-4 p-6">
              {[
                { name: "微信好友", icon: "💬", color: "bg-green-500" },
                { name: "朋友圈", icon: "🌐", color: "bg-green-600" },
                { name: "QQ好友", icon: "🐧", color: "bg-blue-500" },
                { name: "微博", icon: "📢", color: "bg-red-500" },
              ].map(item => (
                <button key={item.name} className="flex flex-col items-center gap-2">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-xl", item.color)}>
                    {item.icon}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowShareMenu(false)}
              className="w-full py-4 text-center text-foreground font-medium border-t border-border"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PosterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PosterPageContent />
    </Suspense>
  )
}
