"use client"

import { useState, useCallback, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface CourseCoverProps {
  images: string[]
  title: string
}

export function CourseCover({ images, title }: CourseCoverProps) {
  const router = useRouter()
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="relative">
      {/* 返回按钮 */}
      <button 
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      {/* 轮播图 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((image, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0">
              <div className="aspect-video bg-secondary relative">
                <img
                  src={image}
                  alt={`${title} - 图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 轮播指示器 */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === selectedIndex 
                  ? "w-4 bg-primary" 
                  : "w-1.5 bg-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
