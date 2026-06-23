"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ImageViewer, useImageViewer } from "@/components/image-viewer"

// Demo images
const demoImages = [
  { url: "/demo/image1.jpg", thumbnail: "/demo/image1_thumb.jpg", alt: "八卦图示例" },
  { url: "/demo/image2.jpg", thumbnail: "/demo/image2_thumb.jpg", alt: "古籍页面" },
  { url: "/demo/image3.jpg", thumbnail: "/demo/image3_thumb.jpg", alt: "风水罗盘" },
  { url: "/demo/image4.jpg", alt: "紫微斗数盘" },
  { url: "/demo/image5.jpg", alt: "命理书籍" },
  { url: "/demo/image6.jpg", alt: "国学课堂" },
  { url: "/demo/image7.jpg", alt: "线下活动" },
  { url: "/demo/image8.jpg", alt: "学员合影" },
  { url: "/demo/image9.jpg", alt: "证书展示" },
]

export default function ImageViewerDemoPage() {
  const { open, close, isOpen, images, initialIndex, ImageViewerComponent } = useImageViewer()
  
  // Alternative: direct state control
  const [directViewer, setDirectViewer] = useState({
    isOpen: false,
    index: 0
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center h-14 px-4">
  <BackButton />
  <h1 className="ml-2 font-semibold">图片浏览器演示</h1>
        </div>
      </header>

      <main className="p-4 space-y-6 pb-20">
        {/* Usage with Hook */}
        <Card className="p-4">
          <h2 className="font-semibold text-base mb-3">使用 useImageViewer Hook</h2>
          <p className="text-sm text-muted-foreground mb-4">
            推荐方式，自动管理状态
          </p>
          <div className="grid grid-cols-3 gap-2">
            {demoImages.slice(0, 6).map((img, index) => (
              <div
                key={index}
                onClick={() => open(demoImages.slice(0, 6), index)}
                className="aspect-square bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-xs text-muted-foreground">{index + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Single image */}
        <Card className="p-4">
          <h2 className="font-semibold text-base mb-3">单张图片查看</h2>
          <p className="text-sm text-muted-foreground mb-4">
            不显示页码指示器，无左右滑动
          </p>
          <div
            onClick={() => open([demoImages[0]], 0)}
            className="aspect-video bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-sm text-muted-foreground">点击查看单张图片</span>
          </div>
        </Card>

        {/* Many images */}
        <Card className="p-4">
          <h2 className="font-semibold text-base mb-3">多张图片（数字指示）</h2>
          <p className="text-sm text-muted-foreground mb-4">
            超过9张时显示数字页码
          </p>
          <div className="grid grid-cols-3 gap-2">
            {demoImages.map((img, index) => (
              <div
                key={index}
                onClick={() => open(demoImages, index)}
                className="aspect-square bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-xs text-muted-foreground">{index + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Direct control */}
        <Card className="p-4">
          <h2 className="font-semibold text-base mb-3">直接控制组件</h2>
          <p className="text-sm text-muted-foreground mb-4">
            不使用 Hook，直接传入 props
          </p>
          <div className="grid grid-cols-3 gap-2">
            {demoImages.slice(0, 3).map((img, index) => (
              <div
                key={index}
                onClick={() => setDirectViewer({ isOpen: true, index })}
                className="aspect-square bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-xs text-muted-foreground">{index + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-secondary/30">
          <h2 className="font-semibold text-base mb-3">交互说明</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 单击图片：显示/隐藏操作栏</li>
            <li>• 双击图片：放大/还原</li>
            <li>• 左右滑动：切换上一张/下一张</li>
            <li>• 长按图片：弹出操作菜单</li>
            <li>• 双指捏合：缩放图片</li>
            <li>• 键盘左右键：切换图片</li>
            <li>• ESC键：关闭浏览器</li>
          </ul>
        </Card>
      </main>

      {/* Image Viewer from Hook */}
      <ImageViewerComponent />

      {/* Direct controlled Image Viewer */}
      <ImageViewer
        images={demoImages.slice(0, 3)}
        initialIndex={directViewer.index}
        isOpen={directViewer.isOpen}
        onClose={() => setDirectViewer({ ...directViewer, isOpen: false })}
      />
    </div>
  )
}
