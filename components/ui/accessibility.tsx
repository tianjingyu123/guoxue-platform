"use client"

import { cn } from "@/lib/utils"

/**
 * 屏幕阅读器专用文本
 * 视觉上隐藏，但屏幕阅读器可读取
 */
export function ScreenReaderOnly({ 
  children,
  as: Component = "span",
  className,
}: { 
  children: React.ReactNode
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  className?: string
}) {
  return (
    <Component className={cn("sr-only", className)}>
      {children}
    </Component>
  )
}

/**
 * 跳转链接 - 键盘导航用户可快速跳转到主内容
 */
export function SkipLink({ 
  href = "#main-content",
  children = "跳转到主要内容"
}: { 
  href?: string
  children?: React.ReactNode 
}) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-[9999]",
        "focus:px-4 focus:py-2 focus:rounded-lg",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      )}
    >
      {children}
    </a>
  )
}

/**
 * 实时区域 - 动态内容变化时通知屏幕阅读器
 */
export function LiveRegion({
  children,
  mode = "polite",
  atomic = true,
  className,
}: {
  children: React.ReactNode
  mode?: "polite" | "assertive" | "off"
  atomic?: boolean
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic={atomic}
      className={className}
    >
      {children}
    </div>
  )
}

/**
 * 加载状态通知 - 通知屏幕阅读器加载状态
 */
export function LoadingAnnouncer({ 
  isLoading,
  loadingText = "正在加载...",
  loadedText = "加载完成",
}: { 
  isLoading: boolean
  loadingText?: string
  loadedText?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sr-only"
    >
      {isLoading ? loadingText : loadedText}
    </div>
  )
}

/**
 * 焦点陷阱 - 将焦点限制在容器内（用于模态框等）
 */
export function FocusTrap({
  children,
  active = true,
  className,
}: {
  children: React.ReactNode
  active?: boolean
  className?: string
}) {
  if (!active) {
    return <>{children}</>
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={className}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const focusableElements = e.currentTarget.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          const firstElement = focusableElements[0] as HTMLElement
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }}
    >
      {children}
    </div>
  )
}

/**
 * 可访问性按钮 - 增强版按钮，包含完整的可访问性支持
 */
export function AccessibleButton({
  children,
  label,
  description,
  disabled = false,
  loading = false,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode
  label: string
  description?: string
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const describedById = description ? `${label}-description` : undefined

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-describedby={describedById}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        disabled={disabled || loading}
        onClick={onClick}
        className={className}
        {...props}
      >
        {children}
        {loading && <ScreenReaderOnly>正在处理中</ScreenReaderOnly>}
      </button>
      {description && (
        <ScreenReaderOnly id={describedById}>
          {description}
        </ScreenReaderOnly>
      )}
    </>
  )
}

/**
 * 图片优化包装器 - 确保图片有正确的alt和loading属性
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  ...props
}: {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  // 装饰性图片使用空alt
  const isDecorative = alt === ""
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      aria-hidden={isDecorative}
      className={className}
      {...props}
    />
  )
}

/**
 * 主要内容区域 - 用于跳转链接目标
 */
export function MainContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn("outline-none", className)}
    >
      {children}
    </main>
  )
}

/**
 * 导航区域
 */
export function NavigationRegion({
  children,
  label,
  className,
}: {
  children: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <nav
      aria-label={label}
      className={className}
    >
      {children}
    </nav>
  )
}

/**
 * 错误提示 - 表单验证错误等
 */
export function ErrorMessage({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn("text-sm text-danger", className)}
    >
      {children}
    </p>
  )
}

/**
 * 进度条 - 带可访问性支持
 */
export function AccessibleProgress({
  value,
  max = 100,
  label,
  showValue = true,
  className,
}: {
  value: number
  max?: number
  label: string
  showValue?: boolean
  className?: string
}) {
  const percentage = Math.round((value / max) * 100)
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {showValue && (
          <span className="text-sm font-medium">{percentage}%</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2 bg-secondary rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ScreenReaderOnly>
        {label}: {percentage}%
      </ScreenReaderOnly>
    </div>
  )
}
