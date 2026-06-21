"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EmptyState } from "@/components/common/empty-state"
import { 
  SealFeedback, 
  TaijiLoading, 
  BrushLoading, 
  GuoxueToast,
  CeremonyConfirm 
} from "@/components/feedback/guoxue-feedback"
import { TaijiLoader, PageLoader, InlineLoader, OverlayLoader } from "@/components/ui/taiji-loader"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// 空状态类型列表
const emptyStateTypes = [
  "course", "myCourse", "circle", "myCircle", "circlePost",
  "favorite", "bookmark", "message", "notification", "comment",
  "search", "order", "cart", "product", "article",
  "live", "video", "note", "question", "answer",
  "activity", "ebook", "institute", "history", "following", "follower",
  "networkError", "noPermission"
] as const

export default function GuoxueDesignDemoPage() {
  const [activeEmptyState, setActiveEmptyState] = useState<typeof emptyStateTypes[number]>("course")
  const [showSealSuccess, setShowSealSuccess] = useState(false)
  const [showSealError, setShowSealError] = useState(false)
  const [showSealWarning, setShowSealWarning] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("success")
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmType, setConfirmType] = useState<"join" | "complete" | "unlock" | "default">("join")

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/help" className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold">国学风格设计演示</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* 空状态演示 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <h2 className="font-medium">空状态组件</h2>
            <p className="text-xs text-muted-foreground">展示国学韵味的空状态文案和视觉</p>
          </div>
          
          {/* 类型选择 */}
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {emptyStateTypes.map((type) => (
                <Button
                  key={type}
                  variant={activeEmptyState === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEmptyState(type)}
                  className="text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          
          {/* 空状态展示 */}
          <div className="bg-background">
            <EmptyState type={activeEmptyState} />
          </div>
        </Card>

        {/* 反馈组件演示 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <h2 className="font-medium">状态反馈组件</h2>
            <p className="text-xs text-muted-foreground">印章风格的成功/错误/警告反馈</p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* 印章反馈 */}
            <div>
              <p className="text-sm font-medium mb-2">印章反馈</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowSealSuccess(true)} className="bg-success hover:bg-success/90">
                  成功印章
                </Button>
                <Button onClick={() => setShowSealError(true)} variant="destructive">
                  错误印章
                </Button>
                <Button onClick={() => setShowSealWarning(true)} className="bg-warning hover:bg-warning/90 text-white">
                  警告印章
                </Button>
              </div>
            </div>

            {/* Toast反馈 */}
            <div>
              <p className="text-sm font-medium mb-2">Toast反馈</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setToastType("success"); setShowToast(true) }}
                >
                  成功Toast
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setToastType("error"); setShowToast(true) }}
                >
                  错误Toast
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setToastType("warning"); setShowToast(true) }}
                >
                  警告Toast
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setToastType("info"); setShowToast(true) }}
                >
                  信息Toast
                </Button>
              </div>
            </div>

            {/* 仪式感确认 */}
            <div>
              <p className="text-sm font-medium mb-2">仪式感确认弹窗</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setConfirmType("join"); setShowConfirm(true) }}
                >
                  加入确认
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setConfirmType("complete"); setShowConfirm(true) }}
                >
                  完成确认
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setConfirmType("unlock"); setShowConfirm(true) }}
                >
                  解锁确认
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 加载动画演示 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <h2 className="font-medium">加载动画</h2>
            <p className="text-xs text-muted-foreground">太极旋转和多种加载形态</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* 太极Loader组件 */}
            <div>
              <p className="text-sm font-medium mb-4">太极加载器（新）</p>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col items-center gap-2">
                  <TaijiLoader size="sm" showText={false} />
                  <span className="text-xs text-muted-foreground">小</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TaijiLoader size="md" showText={false} />
                  <span className="text-xs text-muted-foreground">中</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TaijiLoader size="lg" showText={false} />
                  <span className="text-xs text-muted-foreground">大</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TaijiLoader size="xl" showText={false} />
                  <span className="text-xs text-muted-foreground">特大</span>
                </div>
              </div>
            </div>
            
            {/* 内联加载 */}
            <div>
              <p className="text-sm font-medium mb-2">内联加载</p>
              <InlineLoader />
            </div>
            
            {/* 原有加载动画 */}
            <div>
              <p className="text-sm font-medium mb-4">特色加载动画</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center gap-2">
                  <TaijiLoading message="太极加载中..." size="lg" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <BrushLoading message="毛笔加载中..." />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 文案库展示 */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <h2 className="font-medium">国学文案库</h2>
            <p className="text-xs text-muted-foreground">引经据典的文案体系</p>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">成功反馈</p>
              <p className="text-sm font-serif">善哉善哉 · 已妥善收藏 · 呈文已递</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">错误反馈</p>
              <p className="text-sm font-serif">事与愿违 · 山高路远，通讯受阻</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">加载提示</p>
              <p className="text-sm font-serif">稍候片刻 · 正在整理卷宗 · 画卷徐徐展开</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">成就文案</p>
              <p className="text-sm font-serif">初入山门 · 开卷有益 · 志同道合 · 持之以恒</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 印章反馈弹窗 */}
      <SealFeedback 
        type="success" 
        message="操作成功" 
        visible={showSealSuccess} 
        onClose={() => setShowSealSuccess(false)} 
      />
      <SealFeedback 
        type="error" 
        message="操作失败" 
        visible={showSealError} 
        onClose={() => setShowSealError(false)} 
      />
      <SealFeedback 
        type="warning" 
        message="请三思而行" 
        visible={showSealWarning} 
        onClose={() => setShowSealWarning(false)} 
      />

      {/* Toast */}
      <GuoxueToast 
        type={toastType} 
        message={
          toastType === "success" ? "善哉，操作成功" :
          toastType === "error" ? "事与愿违，请重试" :
          toastType === "warning" ? "请三思而行" : "知悉"
        }
        visible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      {/* 仪式感确认 */}
      <CeremonyConfirm
        visible={showConfirm}
        type={confirmType}
        title={
          confirmType === "join" ? "确认加入圈子？" :
          confirmType === "complete" ? "确认完成学习？" : "确认解锁内容？"
        }
        description={
          confirmType === "join" ? "加入后可参与圈内讨论和学习" :
          confirmType === "complete" ? "完成后将获得结业证书" : "解锁后可查看完整内容"
        }
        confirmText={confirmType === "join" ? "拜入" : "确定"}
        onConfirm={() => setShowConfirm(false)}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
