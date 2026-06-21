"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Upload, Plus, X, Calendar, Clock, Share2, Link2, Image as ImageIcon, ShoppingBag, GraduationCap, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 模拟商品数据
const productList = [
  { id: 1, name: "渊海子平全译本", price: 68, image: "/placeholder.svg" },
  { id: 2, name: "紫微斗数精装版", price: 128, image: "/placeholder.svg" },
  { id: 3, name: "开运转运手链", price: 299, image: "/placeholder.svg" },
  { id: 4, name: "檀香香炉套装", price: 168, image: "/placeholder.svg" },
  { id: 5, name: "风水罗盘专业版", price: 458, image: "/placeholder.svg" },
]

export default function CreateLivePage() {
  const [liveType, setLiveType] = useState<"knowledge" | "ecommerce">("knowledge")
  const [title, setTitle] = useState("")
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)

  const toggleProduct = (id: number) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleCreate = () => {
    // 创建直播逻辑
    alert("直播创建成功!")
  }

  const handleSaveDraft = () => {
    // 保存草稿逻辑
    alert("已保存为草稿")
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/manage/live" />
            <h1 className="font-semibold text-lg text-foreground">创建直播</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* 直播类型选择 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">直播类型</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLiveType("knowledge")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                liveType === "knowledge"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  liveType === "knowledge" ? "bg-primary" : "bg-secondary"
                )}>
                  <GraduationCap className={cn(
                    "w-5 h-5",
                    liveType === "knowledge" ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "font-medium text-sm",
                    liveType === "knowledge" ? "text-primary" : "text-foreground"
                  )}>知识授课</p>
                  <p className="text-xs text-muted-foreground">横屏OBS直播</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLiveType("ecommerce")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                liveType === "ecommerce"
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  liveType === "ecommerce" ? "bg-accent" : "bg-secondary"
                )}>
                  <ShoppingBag className={cn(
                    "w-5 h-5",
                    liveType === "ecommerce" ? "text-accent-foreground" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "font-medium text-sm",
                    liveType === "ecommerce" ? "text-accent" : "text-foreground"
                  )}>电商带货</p>
                  <p className="text-xs text-muted-foreground">竖屏手机直播</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 基本信息 */}
        <Card className="p-4 mb-4">
          <h3 className="font-medium text-sm text-foreground mb-4">基本信息</h3>

          {/* 直播标题 */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">直播标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入直播标题，吸引更多观众"
              className="w-full px-4 py-3 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/50</p>
          </div>

          {/* 封面图 */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">封面图</label>
            <div className="flex gap-3">
              <button className="w-28 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">上传封面</span>
              </button>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">建议尺寸: 16:9</p>
                <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG 格式</p>
              </div>
            </div>
          </div>

          {/* 开播时间 */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">计划开播时间</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 商品设置（电商带货可见） */}
        {liveType === "ecommerce" && (
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm text-foreground">关联商品</h3>
              <button
                onClick={() => setShowProductPicker(true)}
                className="flex items-center gap-1 text-sm text-primary"
              >
                <Plus className="w-4 h-4" />
                添加商品
              </button>
            </div>

            {selectedProducts.length > 0 ? (
              <div className="space-y-2">
                {selectedProducts.map(id => {
                  const product = productList.find(p => p.id === id)
                  if (!product) return null
                  return (
                    <div key={id} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">{product.name}</p>
                        <p className="text-xs text-primary">¥{product.price}</p>
                      </div>
                      <button
                        onClick={() => toggleProduct(id)}
                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">还未添加商品</p>
                <p className="text-xs text-muted-foreground">点击上方按钮从商品库中选择</p>
              </div>
            )}
          </Card>
        )}

        {/* 分享设置 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-4">直播间分享</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowShareOptions(true)}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">生成海报</p>
                <p className="text-xs text-muted-foreground">预告海报分享</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">复制链接</p>
                <p className="text-xs text-muted-foreground">分享直播间</p>
              </div>
            </button>
          </div>
        </Card>
      </main>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            onClick={handleSaveDraft}
            className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
          >
            保存为草稿
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            创建直播
          </button>
        </div>
      </div>

      {/* 商品选择弹窗 */}
      {showProductPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowProductPicker(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">选择商品</h3>
              <button
                onClick={() => setShowProductPicker(false)}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {productList.map(product => (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-secondary rounded-lg transition-colors"
                >
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-foreground">{product.name}</p>
                    <p className="text-sm text-primary">¥{product.price}</p>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedProducts.includes(product.id)
                      ? "border-primary bg-primary"
                      : "border-border"
                  )}>
                    {selectedProducts.includes(product.id) && (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowProductPicker(false)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                确定 ({selectedProducts.length})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
