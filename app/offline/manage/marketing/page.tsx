"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { QrCode, ImageIcon, MessageSquareText, Ticket, Copy, Download, Plus, Share2, X } from "lucide-react"

const promoTexts = [
  "【限时报名】热卜国学北京朝阳驿站「八字命理入门实战班」开课啦！资深命理师亲授，零基础也能学会排盘分析。名额有限，扫码即刻预约 👇",
  "周末来驿站坐坐～本期公益课「风水堪舆入门」免费开放，茶香相伴，与同好一起品读传统文化。点击链接报名占座。",
  "想系统学习传统国学？我们的线下小班课，名师面对面、案例实操、学完即用。现在报名享早鸟价，详情见课程页。",
]

const coupons = [
  { id: 1, name: "新学员立减50", type: "满减", value: "满299减50", total: 200, used: 86, status: "active" },
  { id: 2, name: "公益课预约券", type: "免费", value: "免费名额", total: 50, used: 50, status: "ended" },
]

export default function MarketingPage() {
  const [showQr, setShowQr] = useState(false)
  const [showPoster, setShowPoster] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("文案已复制，可粘贴到朋友圈")
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/manage" />
          <h1 className="text-lg font-semibold">营销工具</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 推广入口 */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowQr(true)}>
            <Card className="p-4 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">专属推广码</span>
              <span className="text-xs text-muted-foreground">引流到驿站主页</span>
            </Card>
          </button>
          <button onClick={() => setShowPoster(true)}>
            <Card className="p-4 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium">课程海报</span>
              <span className="text-xs text-muted-foreground">一键生成分享图</span>
            </Card>
          </button>
        </div>

        {/* 朋友圈文案 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquareText className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">朋友圈文案模板</h2>
          </div>
          <div className="space-y-3">
            {promoTexts.map((text, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-foreground leading-relaxed">{text}</p>
                <button
                  onClick={() => handleCopy(text)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary"
                >
                  <Copy className="w-3.5 h-3.5" /> 复制文案
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* 优惠券 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">专属优惠券</h2>
            </div>
            <button
              onClick={() => toast.success("打开创建优惠券")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> 新建
            </button>
          </div>
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border">
                <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-dashed border-border pr-3">
                  <span className="text-xs text-muted-foreground">{c.type}</span>
                  <span className="text-sm font-bold text-primary text-center leading-tight mt-0.5">{c.value}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.status === "active" ? (
                      <Badge className="bg-green-500 text-white text-[10px]">进行中</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">已结束</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    已领取 {c.used}/{c.total} 张
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">优惠券仅限本驿站课程 / 商品使用。</p>
        </Card>

        {/* 学员触达 */}
        <Link href="/offline/manage/students">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">向学员推送消息</p>
              <p className="text-xs text-muted-foreground">向曾报名的学员定向推送开课提醒</p>
            </div>
          </Card>
        </Link>
      </main>

      {/* 推广码弹窗 */}
      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
          <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">驿站推广码</h3>
              <button onClick={() => setShowQr(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="w-32 h-32" />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-3">扫码进入驿站主页报名课程</p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => toast.success("已保存到相册")}>
                <Download className="w-4 h-4 mr-1" /> 保存
              </Button>
              <Button className="flex-1" onClick={() => toast.success("已复制推广链接")}>
                <Copy className="w-4 h-4 mr-1" /> 复制链接
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 海报弹窗 */}
      {showPoster && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPoster(false)}>
          <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">生成课程海报</h3>
              <button onClick={() => setShowPoster(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-[3/4] bg-gradient-to-b from-primary/10 to-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="w-12 h-12" />
              <span className="text-xs">海报预览</span>
            </div>
            <Button className="w-full mt-4" onClick={() => toast.success("海报已保存到相册")}>
              <Download className="w-4 h-4 mr-1" /> 保存海报
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
