"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Share2, QrCode, Check, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 模拟分站数据
const stationData = {
  id: "station-demo",
  name: "青云国学小站",
  logo: "",
  themeColor: "#8B5CF6",
  masterName: "青云道长",
  masterAvatar: "/images/avatars/master-1.jpg",
  masterIntro: "从事国学研究20余年，专注八字命理与风水堪舆",
  memberCount: 3680,
  contentCount: 156,
  qrCode: "", // 分站专属二维码
}

// 海报模板配置
const posterTemplates = [
  {
    id: "classic",
    name: "经典",
    bgColor: "bg-gradient-to-b from-foreground to-foreground",
    textColor: "text-white",
    accentColor: "text-amber-400",
  },
  {
    id: "elegant",
    name: "素雅",
    bgColor: "bg-gradient-to-b from-background to-[#e8e4d9]",
    textColor: "text-foreground",
    accentColor: "text-gold",
  },
  {
    id: "modern",
    name: "现代",
    bgColor: "bg-gradient-to-br from-operator to-operator",
    textColor: "text-white",
    accentColor: "text-yellow-300",
  },
  {
    id: "nature",
    name: "自然",
    bgColor: "bg-gradient-to-b from-info to-success",
    textColor: "text-white",
    accentColor: "text-lime-300",
  },
]

export default function SubstationPosterPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(posterTemplates[0])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const station = stationData
  
  // 保存海报
  const handleSave = async () => {
    setIsSaving(true)
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 h-11 flex items-center justify-between px-4 bg-background border-b border-border">
          <Link href="/station/materials" className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium">分享海报</span>
          <div className="w-6" />
        </header>
        
        {/* 海报预览 */}
        <div className="p-4">
          <div 
            ref={posterRef}
            className={cn(
              "relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl",
              selectedTemplate.bgColor
            )}
          >
            {/* 装饰图案 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            {/* 内容区域 */}
            <div className="relative h-full flex flex-col p-6">
              {/* 顶部 Logo */}
              <div className="flex items-center gap-2 mb-8">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: station.themeColor }}
                >
                  <span className="text-white text-sm font-bold">
                    {station.name.charAt(0)}
                  </span>
                </div>
                <span className={cn("text-sm font-medium", selectedTemplate.textColor)}>
                  热卜国学
                </span>
              </div>
              
              {/* 主内容 */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* 站长头像 */}
                <div 
                  className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden mb-4"
                  style={{ backgroundColor: station.themeColor }}
                >
                  {station.masterAvatar ? (
                    <img src={station.masterAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {station.masterName.charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* 分站名称 */}
                <h1 className={cn("text-2xl font-bold mb-2", selectedTemplate.textColor)}>
                  {station.name}
                </h1>
                <p className={cn("text-sm opacity-80 mb-6", selectedTemplate.textColor)}>
                  {station.masterName} · 诚邀您加入
                </p>
                
                {/* 数据展示 */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="text-center">
                    <p className={cn("text-2xl font-bold", selectedTemplate.accentColor)}>
                      {station.memberCount}
                    </p>
                    <p className={cn("text-xs opacity-70", selectedTemplate.textColor)}>成员</p>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center">
                    <p className={cn("text-2xl font-bold", selectedTemplate.accentColor)}>
                      {station.contentCount}
                    </p>
                    <p className={cn("text-xs opacity-70", selectedTemplate.textColor)}>精选</p>
                  </div>
                </div>
                
                {/* 站长简介 */}
                <p className={cn("text-sm opacity-70 max-w-[200px]", selectedTemplate.textColor)}>
                  {station.masterIntro}
                </p>
              </div>
              
              {/* 底部二维码 */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-white rounded-xl p-2 mb-3">
                  {station.qrCode ? (
                    <img src={station.qrCode} alt="" className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary rounded-lg">
                      <QrCode className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className={cn("text-xs opacity-70", selectedTemplate.textColor)}>
                  扫码加入{station.name}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 模板选择 */}
        <div className="px-4 mb-4">
          <p className="text-sm font-medium mb-3">选择风格</p>
          <div className="flex gap-3">
            {posterTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  "flex-1 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all",
                  selectedTemplate.id === template.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-transparent"
                )}
              >
                <div className={cn("w-full h-full", template.bgColor)}>
                  <div className="h-full flex flex-col items-center justify-center p-2">
                    <div className="w-6 h-6 rounded-full bg-white/30 mb-1" />
                    <div className="w-8 h-1 rounded bg-white/50 mb-0.5" />
                    <div className="w-6 h-0.5 rounded bg-white/30" />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            {posterTemplates.map((template) => (
              <span 
                key={template.id}
                className={cn(
                  "flex-1 text-center text-xs",
                  selectedTemplate.id === template.id ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {template.name}
              </span>
            ))}
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="px-4 pb-8">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  已保存
                </>
              ) : isSaving ? (
                <>
                  <Download className="w-4 h-4 mr-2 animate-bounce" />
                  保存中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  保存图片
                </>
              )}
            </Button>
            <Button 
              className="flex-1"
              style={{ backgroundColor: station.themeColor }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享海报
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            分享海报邀请好友，好友通过您的专属链接加入平台后将永久归属您的分站
          </p>
        </div>
      </div>
    </div>
  )
}
