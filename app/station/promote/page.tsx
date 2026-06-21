"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check, QrCode, Share2, Link2, Clock, Sparkles, ChevronRight, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// 分站信息
const stationInfo = {
  id: "qingyun",
  name: "青云国学小站",
  themeColor: "#8B5CF6",
  promoteUrl: "https://recob.app/s/qingyun",
}

// 可临时推荐的内容
const recommendableContent = [
  { id: "c1", type: "课程", title: "八字命理入门到精通", price: 299, commission: 60 },
  { id: "c2", type: "课程", title: "紫微斗数实战班", price: 599, commission: 120 },
  { id: "c3", type: "商品", title: "开光紫水晶手串", price: 188, commission: 28 },
  { id: "c4", type: "圈子", title: "玄学研习社·年度会员", price: 365, commission: 73 },
]

export default function PromoteCenterPage() {
  const [activeTab, setActiveTab] = useState("permanent")
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState<typeof recommendableContent[0] | null>(null)
  const [tempLinkGenerated, setTempLinkGenerated] = useState(false)

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const tempLink = selectedContent
    ? `${stationInfo.promoteUrl}/t/${selectedContent.id}?ref=qingyun&exp=24h`
    : ""

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-10">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/station/manage" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">推广中心</h1>
          <Link href="/station/materials" className="p-2 -mr-2">
            <ImageIcon className="w-5 h-5 text-gray-700" />
          </Link>
        </div>
      </header>

      {/* 推广模式切换 */}
      <div className="px-4 py-3 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-gray-100/80">
            <TabsTrigger value="permanent" className="text-sm">永久推广</TabsTrigger>
            <TabsTrigger value="temporary" className="text-sm">临时推荐</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 永久推广 */}
      {activeTab === "permanent" && (
        <div className="px-4 py-4 space-y-4">
          {/* 说明卡 */}
          <Card className="p-4 bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 border-[#8B5CF6]/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/15 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">专属推广链接</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  用户通过此链接注册后将<span className="text-[#8B5CF6] font-medium">永久锁定</span>在您的分站名下，后续所有消费您都将获得推广佣金。
                </p>
              </div>
            </div>
          </Card>

          {/* 推广链接 */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">推广链接</p>
            <div className="flex gap-2">
              <Input value={stationInfo.promoteUrl} readOnly className="bg-white text-sm" />
              <Button
                onClick={() => handleCopy(stationInfo.promoteUrl, "link")}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] shrink-0"
              >
                {copied === "link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* 二维码 */}
          <Card className="p-5 flex flex-col items-center">
            <div className="w-44 h-44 bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-center">
              <div className="w-full h-full bg-secondary rounded-lg flex items-center justify-center">
                <QrCode className="w-20 h-20 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">扫码进入「{stationInfo.name}」</p>
            <div className="flex gap-3 mt-4 w-full">
              <Button variant="outline" className="flex-1" onClick={() => handleCopy(stationInfo.promoteUrl, "qr")}>
                {copied === "qr" ? "已复制链接" : "复制链接"}
              </Button>
              <Link href="/station/poster" className="flex-1">
                <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED]">
                  <Share2 className="w-4 h-4 mr-2" />
                  生成海报
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* 临时推荐 */}
      {activeTab === "temporary" && (
        <div className="px-4 py-4 space-y-4">
          {/* 说明卡 */}
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/40 border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">临时推荐链接</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  分享指定内容，用户点击后<span className="text-amber-600 font-medium">24小时内</span>购买，佣金归您。不影响用户已有的永久锁定关系。
                </p>
              </div>
            </div>
          </Card>

          {/* 选择推荐内容 */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">选择推荐内容</p>
            <div className="space-y-2">
              {recommendableContent.map(content => (
                <button
                  key={content.id}
                  onClick={() => { setSelectedContent(content); setTempLinkGenerated(false) }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left bg-white",
                    selectedContent?.id === content.id ? "border-amber-400" : "border-transparent"
                  )}
                >
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">{content.type}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{content.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      售价 ¥{content.price} · 佣金 <span className="text-amber-600">¥{content.commission}</span>
                    </p>
                  </div>
                  {selectedContent?.id === content.id && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 生成临时链接 */}
          {selectedContent && (
            !tempLinkGenerated ? (
              <Button
                onClick={() => setTempLinkGenerated(true)}
                className="w-full bg-amber-500 hover:bg-amber-600 h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                生成临时推荐链接
              </Button>
            ) : (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <Clock className="w-3.5 h-3.5" />
                  有效期 24 小时，过期自动失效
                </div>
                <div className="flex gap-2">
                  <Input value={tempLink} readOnly className="bg-gray-50 text-xs" />
                  <Button
                    onClick={() => handleCopy(tempLink, "temp")}
                    className="bg-amber-500 hover:bg-amber-600 shrink-0"
                  >
                    {copied === "temp" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  )
}
