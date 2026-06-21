"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, Download, Share2, ZoomIn, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageViewerProps {
  images: Array<{
    url: string
    thumbnail?: string
    alt?: string
  }>
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export function ImageViewer({ images, initialIndex = 0, isOpen, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [lastTap, setLastTap] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentImage = images[currentIndex]
  const isMultiple = images.length > 1

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setShowControls(true)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen, initialIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && isMultiple) goToPrev()
      if (e.key === "ArrowRight" && isMultiple) goToNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isMultiple, currentIndex])

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [currentIndex, images.length])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [currentIndex])

  const handleDoubleTap = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now()
    if (now - lastTap < 300) {
      handleDoubleTap()
    } else {
      // Single tap - toggle controls
      if (scale === 1) {
        setShowControls(!showControls)
      }
    }
    setLastTap(now)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      setIsDragging(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isDragging) return
    
    const deltaX = e.touches[0].clientX - touchStart.x
    const deltaY = e.touches[0].clientY - touchStart.y

    if (scale > 1) {
      // Pan when zoomed
      setPosition({
        x: position.x + deltaX * 0.5,
        y: position.y + deltaY * 0.5
      })
    }
    
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x

    // Swipe to navigate (only when not zoomed)
    if (scale === 1 && Math.abs(deltaX) > 50 && isMultiple) {
      if (deltaX > 0) goToPrev()
      else goToNext()
    }

    setTouchStart(null)
    setIsDragging(false)
  }

  const handleSave = async () => {
    // Simulate save to album
    setShowMenu(false)
    alert("图片已保存到相册")
  }

  const handleShare = () => {
    setShowMenu(false)
    if (navigator.share) {
      navigator.share({
        title: currentImage.alt || "分享图片",
        url: currentImage.url
      })
    } else {
      alert("分享链接已复制")
    }
  }

  const handleViewOriginal = () => {
    setIsLoadingOriginal(true)
    // Simulate loading original
    setTimeout(() => setIsLoadingOriginal(false), 1500)
  }

  const handleLongPress = () => {
    setShowMenu(true)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black"
      ref={containerRef}
    >
      {/* Close button */}
      <button 
        onClick={onClose}
        className={cn(
          "absolute top-4 right-4 z-50 p-2 rounded-full bg-black/30 backdrop-blur-sm transition-opacity duration-200 safe-area-pt",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation arrows (desktop) */}
      {isMultiple && (
        <>
          <button 
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/30 backdrop-blur-sm transition-all duration-200 hidden md:flex",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none",
              currentIndex === 0 && "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button 
            onClick={goToNext}
            disabled={currentIndex === images.length - 1}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/30 backdrop-blur-sm transition-all duration-200 hidden md:flex",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none",
              currentIndex === images.length - 1 && "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Image container */}
      <div 
        className="w-full h-full flex items-center justify-center"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
      >
        <div 
          className="relative transition-transform duration-200 ease-out"
          style={{ 
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          }}
        >
          {/* Image placeholder */}
          <div className="w-screen h-screen flex items-center justify-center p-4">
            <div className="max-w-full max-h-full bg-secondary/20 rounded-lg flex items-center justify-center aspect-square md:aspect-video">
              {isLoadingOriginal ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white/60 text-sm">加载原图中...</span>
                </div>
              ) : (
                <div className="text-white/40 text-center p-8">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-lg bg-white/10 flex items-center justify-center">
                    <ZoomIn className="w-10 h-10" />
                  </div>
                  <p className="text-sm">{currentImage.alt || "图片预览"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page indicator */}
      {isMultiple && (
        <div className={cn(
          "absolute bottom-24 left-0 right-0 flex justify-center items-center gap-2 transition-opacity duration-200",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          {images.length <= 9 ? (
            // Dots for fewer images
            images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setScale(1)
                  setPosition({ x: 0, y: 0 })
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex ? "bg-white w-4" : "bg-white/40"
                )}
              />
            ))
          ) : (
            // Text for many images
            <span className="text-white text-sm bg-black/30 px-3 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
      )}

      {/* Bottom toolbar */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-8 px-4 transition-opacity duration-200 safe-area-pb",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-center gap-8 max-w-sm mx-auto">
          <button 
            onClick={handleSave}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs">保存</span>
          </button>
          
          <button 
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs">分享</span>
          </button>
          
          {currentImage.thumbnail && (
            <button 
              onClick={handleViewOriginal}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <ZoomIn className="w-5 h-5" />
              </div>
              <span className="text-xs">原图</span>
            </button>
          )}
          
          <button 
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-xs">更多</span>
          </button>
        </div>
      </div>

      {/* Long press / More menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-[110] flex items-end justify-center"
          onClick={() => setShowMenu(false)}
        >
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <p className="text-sm text-muted-foreground text-center">图片操作</p>
            </div>
            
            <div className="divide-y divide-border">
              <button 
                onClick={handleSave}
                className="w-full py-4 text-center text-foreground hover:bg-secondary transition-colors"
              >
                保存到相册
              </button>
              <button 
                onClick={handleShare}
                className="w-full py-4 text-center text-foreground hover:bg-secondary transition-colors"
              >
                分享图片
              </button>
              {currentImage.thumbnail && (
                <button 
                  onClick={handleViewOriginal}
                  className="w-full py-4 text-center text-foreground hover:bg-secondary transition-colors"
                >
                  查看原图
                </button>
              )}
              <button 
                onClick={() => setShowMenu(false)}
                className="w-full py-4 text-center text-muted-foreground hover:bg-secondary transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for easy usage
export function useImageViewer() {
  const [state, setState] = useState<{
    isOpen: boolean
    images: Array<{ url: string; thumbnail?: string; alt?: string }>
    initialIndex: number
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0
  })

  const open = useCallback((
    images: Array<{ url: string; thumbnail?: string; alt?: string }>,
    initialIndex = 0
  ) => {
    setState({ isOpen: true, images, initialIndex })
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    ...state,
    open,
    close,
    ImageViewerComponent: () => (
      <ImageViewer
        images={state.images}
        initialIndex={state.initialIndex}
        isOpen={state.isOpen}
        onClose={close}
      />
    )
  }
}
