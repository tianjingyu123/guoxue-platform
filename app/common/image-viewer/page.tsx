"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { X, Download, Share2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function ImageViewerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // 从URL参数获取图片列表和初始索引
  const imagesParam = searchParams.get("images") || ""
  const initialIndex = Number(searchParams.get("index") || 0)
  
  const images = imagesParam ? imagesParam.split(",").map(decodeURIComponent) : [
    "/placeholder.svg?height=800&width=600&text=示例图片1",
    "/placeholder.svg?height=600&width=800&text=示例图片2",
    "/placeholder.svg?height=800&width=800&text=示例图片3",
  ]
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showControls, setShowControls] = useState(true)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const lastTapRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number; distance?: number }>({ x: 0, y: 0 })
  
  // 重置变换
  const resetTransform = useCallback(() => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [])
  
  // 切换图片时重置
  useEffect(() => {
    resetTransform()
  }, [currentIndex, resetTransform])
  
  // 隐藏控制栏定时器
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showControls])
  
  // 切换到上一张
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [currentIndex])
  
  // 切换到下一张
  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentIndex, images.length])
  
  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPrev()
          break
        case "ArrowRight":
          goToNext()
          break
        case "Escape":
          router.back()
          break
        case "+":
        case "=":
          setScale(s => Math.min(s + 0.5, 5))
          break
        case "-":
          setScale(s => Math.max(s - 0.5, 0.5))
          break
        case "0":
          resetTransform()
          break
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToPrev, goToNext, router, resetTransform])
  
  // 双击放大/还原
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // 双击
      if (scale === 1) {
        setScale(2)
        // 以点击位置为中心放大
        if ("touches" in e) {
          const touch = e.touches[0]
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect) {
            const x = touch.clientX - rect.left - rect.width / 2
            const y = touch.clientY - rect.top - rect.height / 2
            setPosition({ x: -x, y: -y })
          }
        }
      } else {
        resetTransform()
      }
    }
    lastTapRef.current = now
  }
  
  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    setShowControls(true)
    
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      }
      if (scale > 1) {
        setIsDragging(true)
      }
    } else if (e.touches.length === 2) {
      // 双指缩放
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchStartRef.current = { x: 0, y: 0, distance }
    }
  }
  
  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      // 单指拖动（放大时）
      const x = e.touches[0].clientX - touchStartRef.current.x
      const y = e.touches[0].clientY - touchStartRef.current.y
      setPosition({ x, y })
    } else if (e.touches.length === 2 && touchStartRef.current.distance) {
      // 双指缩放
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = distance / touchStartRef.current.distance
      setScale(s => Math.min(Math.max(s * delta, 0.5), 5))
      touchStartRef.current.distance = distance
    }
  }
  
  // 触摸结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false)
    
    // 检测左右滑动切换图片（仅在未缩放时）
    if (scale === 1 && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
      if (Math.abs(deltaX) > 80) {
        if (deltaX > 0) {
          goToPrev()
        } else {
          goToNext()
        }
      }
    }
  }
  
  // 鼠标拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    setShowControls(true)
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  // 保存图片
  const handleSave = async () => {
    const currentImage = images[currentIndex]
    try {
      const response = await fetch(currentImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `image-${currentIndex + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("图片已保存")
    } catch {
      toast.error("保存失败，请重试")
    }
  }
  
  // 分享图片
  const handleShare = async () => {
    const currentImage = images[currentIndex]
    if (navigator.share) {
      try {
        await navigator.share({
          title: "分享图片",
          url: currentImage,
        })
      } catch {
        // 用户取消分享
      }
    } else {
      // 复制链接
      await navigator.clipboard.writeText(currentImage)
      toast.success("图片链接已复制")
    }
  }
  
  // 放大
  const handleZoomIn = () => {
    setScale(s => Math.min(s + 0.5, 5))
  }
  
  // 缩小
  const handleZoomOut = () => {
    setScale(s => Math.max(s - 0.5, 0.5))
  }
  
  // 旋转
  const handleRotate = () => {
    setRotation(r => (r + 90) % 360)
  }
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 select-none"
      onClick={() => setShowControls(!showControls)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 顶部栏 */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        
        <div className="w-10" />
      </div>
      
      {/* 图片区域 */}
      <div 
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`图片 ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? "grab" : "default",
          }}
          draggable={false}
        />
      </div>
      
      {/* 左右切换按钮 */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev() }}
            disabled={currentIndex === 0}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white transition-all duration-300",
              currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/50",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); goToNext() }}
            disabled={currentIndex === images.length - 1}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white transition-all duration-300",
              currentIndex === images.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/50",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      
      {/* 底部指示器和操作栏 */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* 圆点指示器 */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex 
                    ? "bg-white w-4" 
                    : "bg-white/50 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-6 pb-8 pt-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30">
              <ZoomOut className="w-5 h-5" />
            </div>
            <span className="text-xs">缩小</span>
          </button>
          
          <button
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30">
              <ZoomIn className="w-5 h-5" />
            </div>
            <span className="text-xs">放大</span>
          </button>
          
          <button
            onClick={handleRotate}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30">
              <RotateCw className="w-5 h-5" />
            </div>
            <span className="text-xs">旋转</span>
          </button>
          
          <button
            onClick={handleSave}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs">保存</span>
          </button>
          
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs">分享</span>
          </button>
        </div>
      </div>
      
      {/* 缩放比例提示 */}
      {scale !== 1 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            {Math.round(scale * 100)}%
          </div>
        </div>
      )}
    </div>
  )
}

export default function ImageViewerPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <ImageViewerContent />
    </Suspense>
  )
}
