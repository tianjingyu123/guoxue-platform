"use client"

import { useState } from "react"
import { FeatureGuide, useFeatureGuide } from "@/components/feature-guide"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Compass, MessageCircle, BookOpen, ShoppingBag, Users, 
  Sparkles, Search, Bell, Settings, Home
} from "lucide-react"
import Link from "next/link"

// 自定义引导步骤示例
const customSteps = [
  {
    id: "home-ai",
    title: "首页AI入口",
    description: "点击这里开始智能对话，探索国学智慧",
    icon: <Sparkles className="w-8 h-8 text-accent" />,
    highlightPosition: { top: 120, left: 20, width: 80, height: 80, borderRadius: 16 },
    cardPosition: "bottom" as const
  },
  {
    id: "paipan-new",
    title: "排盘工具升级",
    description: "新增紫微斗数、奇门遁甲等更多排盘方式",
    icon: <Compass className="w-8 h-8 text-primary" />,
    highlightPosition: { top: 120, left: 110, width: 80, height: 80, borderRadius: 16 },
    cardPosition: "bottom" as const
  },
  {
    id: "qa-feature",
    title: "付费问答上线",
    description: "向圈主发起提问，获取专业解答",
    icon: <MessageCircle className="w-8 h-8 text-primary" />,
    highlightPosition: { top: 340, left: 20, width: 160, height: 56, borderRadius: 12 },
    cardPosition: "bottom" as const
  }
]

export default function FeatureGuideDemoPage() {
  const [showDefaultGuide, setShowDefaultGuide] = useState(false)
  const [showCustomGuide, setShowCustomGuide] = useState(false)
  const featureGuide = useFeatureGuide("demo-2.1.0")

  return (
    <div className="min-h-screen bg-background">
      {/* 引导浮层 */}
      <FeatureGuide 
        isOpen={showDefaultGuide} 
        onClose={() => setShowDefaultGuide(false)}
        version="2.1.0"
      />
      <FeatureGuide 
        isOpen={showCustomGuide} 
        onClose={() => setShowCustomGuide(false)}
        steps={customSteps}
        version="2.2.0"
      />

      {/* 模拟的应用界面 */}
      <div className="relative">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="font-bold text-lg text-foreground">热卜国学</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-secondary">
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-full hover:bg-secondary relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <div className="p-4 space-y-6">
          {/* 功能入口网格 */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Sparkles, label: "AI对话", color: "text-accent" },
              { icon: Compass, label: "排盘", color: "text-primary" },
              { icon: BookOpen, label: "古籍", color: "text-accent" },
              { icon: Users, label: "圈子", color: "text-primary" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          {/* 演示控制区 */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h2 className="font-semibold text-base text-foreground mb-3">新功能引导演示</h2>
            <p className="text-sm text-muted-foreground mb-4">
              点击下方按钮体验不同的引导浮层效果
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setShowDefaultGuide(true)}
                className="w-full"
              >
                展示默认引导（5步）
              </Button>
              <Button 
                onClick={() => setShowCustomGuide(true)}
                variant="outline"
                className="w-full"
              >
                展示自定义引导（3步）
              </Button>
              <Button 
                onClick={() => {
                  featureGuide.reset()
                  featureGuide.open()
                }}
                variant="secondary"
                className="w-full"
              >
                模拟首次访问自动弹出
              </Button>
            </div>
          </Card>

          {/* 模拟功能卡片 */}
          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">付费问答</h3>
                    <Badge className="bg-primary/10 text-primary text-[10px]">新功能</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">向专家发起提问</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">AI智能搜索</h3>
                    <Badge className="bg-accent/10 text-accent text-[10px]">新功能</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">用自然语言提问</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">连麦咨询</h3>
                    <Badge className="bg-primary/10 text-primary text-[10px]">新功能</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">与讲师实时交流</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 使用说明 */}
          <Card className="p-4">
            <h3 className="font-medium text-foreground mb-2">组件特性</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• 半透明蒙层 + SVG镂空高亮</li>
              <li>• 支持多步骤引导，左右滑动切换</li>
              <li>• 步骤指示器可点击跳转</li>
              <li>• 键盘方向键和ESC快捷操作</li>
              <li>• useFeatureGuide Hook 管理状态</li>
              <li>• localStorage 记录已展示版本</li>
            </ul>
          </Card>
        </div>

        {/* 底部导航 */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-pb">
          <div className="flex items-center justify-around h-14">
            {[
              { icon: Home, label: "首页" },
              { icon: Compass, label: "排盘" },
              { icon: Users, label: "圈子" },
              { icon: ShoppingBag, label: "商城" },
              { icon: Settings, label: "我的" },
            ].map((item, i) => (
              <button key={i} className="flex flex-col items-center gap-0.5 px-4 py-1">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hook自动弹出的引导 */}
      <FeatureGuide 
        isOpen={featureGuide.isOpen} 
        onClose={featureGuide.close}
        version="demo-2.1.0"
      />
    </div>
  )
}
