'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'

interface OptimizedImageProps extends Omit<ImageProps, 'alt'> {
  alt: string
  fallback?: string
  showFallbackIcon?: boolean
  aspectRatio?: 'square' | 'video' | '4/3' | '3/4' | '16/9'
  objectFit?: 'cover' | 'contain' | 'fill'
}

/**
 * 优化图片组件
 * 
 * 基于 Next/Image，添加以下功能：
 * - 自动懒加载（非首屏图片）
 * - 错误处理和占位图
 * - 统一的宽高比
 * - 加载状态骨架屏
 * 
 * @example
 * // 基础用法
 * <OptimizedImage src="/image.jpg" alt="描述" width={200} height={150} />
 * 
 * // 带宽高比
 * <OptimizedImage src="/image.jpg" alt="描述" aspectRatio="video" fill />
 * 
 * // 首屏图片（禁用懒加载）
 * <OptimizedImage src="/hero.jpg" alt="主图" priority />
 */
export function OptimizedImage({
  src,
  alt,
  className,
  fallback = '/images/placeholder.png',
  showFallbackIcon = true,
  aspectRatio,
  objectFit = 'cover',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/4': 'aspect-[3/4]',
    '16/9': 'aspect-[16/9]',
  }

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
  }

  if (error) {
    return (
      <div 
        className={cn(
          'bg-muted flex items-center justify-center',
          aspectRatio && aspectRatioClasses[aspectRatio],
          className
        )}
      >
        {showFallbackIcon ? (
          <ImageOff className="w-8 h-8 text-muted-foreground/50" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fallback} alt={alt} className="w-full h-full object-cover" />
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        aspectRatio && aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {/* 加载骨架屏 */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <Image
        src={src}
        alt={alt}
        className={cn(
          objectFitClasses[objectFit],
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setError(true)
        }}
        {...props}
      />
    </div>
  )
}

/**
 * 头像图片组件
 */
interface AvatarImageProps {
  src?: string | null
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallbackText?: string
}

export function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
  fallbackText,
}: AvatarImageProps) {
  const [error, setError] = useState(false)

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  }

  const sizePx = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }

  if (!src || error) {
    return (
      <div 
        className={cn(
          'rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary',
          sizeClasses[size],
          className
        )}
      >
        {fallbackText || alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={sizePx[size]}
      height={sizePx[size]}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      onError={() => setError(true)}
    />
  )
}

/**
 * 产品/课程封面图片
 */
interface CoverImageProps {
  src?: string | null
  alt: string
  aspectRatio?: 'square' | 'video' | '4/3' | '3/4'
  className?: string
  priority?: boolean
}

export function CoverImage({
  src,
  alt,
  aspectRatio = '4/3',
  className,
  priority = false,
}: CoverImageProps) {
  const [error, setError] = useState(false)

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/4': 'aspect-[3/4]',
  }

  if (!src || error) {
    return (
      <div 
        className={cn(
          'bg-secondary flex items-center justify-center',
          aspectRatioClasses[aspectRatio],
          className
        )}
      >
        <ImageOff className="w-8 h-8 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', aspectRatioClasses[aspectRatio], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority={priority}
        onError={() => setError(true)}
      />
    </div>
  )
}
