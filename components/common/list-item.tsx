"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// 统一列表项组件 - 提供一致的列表项交互体验
// ============================================

interface ListItemProps {
  /** 左侧图标 */
  icon?: React.ReactNode
  /** 左侧头像URL */
  avatar?: string
  /** 主标题 */
  title: string
  /** 副标题/描述 */
  subtitle?: string
  /** 右侧内容 */
  rightContent?: React.ReactNode
  /** 右侧文字 */
  rightText?: string
  /** 右侧文字颜色 */
  rightTextColor?: "default" | "muted" | "primary" | "success" | "warning" | "danger"
  /** 是否显示箭头 */
  showArrow?: boolean
  /** 是否显示下边框 */
  showBorder?: boolean
  /** 点击链接 */
  href?: string
  /** 点击事件 */
  onClick?: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 徽章内容 */
  badge?: string | number
  /** 徽章类型 */
  badgeType?: "default" | "primary" | "success" | "warning" | "danger" | "new"
  /** 自定义类名 */
  className?: string
  /** 尺寸 */
  size?: "sm" | "md" | "lg"
}

const rightTextColorMap = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
}

const badgeTypeMap = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  new: "bg-institute text-white",
}

const sizeMap = {
  sm: { padding: "py-2.5 px-4", icon: "w-8 h-8", avatar: "w-8 h-8", title: "text-sm", subtitle: "text-xs" },
  md: { padding: "py-3.5 px-4", icon: "w-10 h-10", avatar: "w-10 h-10", title: "text-base", subtitle: "text-sm" },
  lg: { padding: "py-4 px-4", icon: "w-12 h-12", avatar: "w-12 h-12", title: "text-lg", subtitle: "text-sm" },
}

export function ListItem({
  icon,
  avatar,
  title,
  subtitle,
  rightContent,
  rightText,
  rightTextColor = "muted",
  showArrow = true,
  showBorder = true,
  href,
  onClick,
  disabled = false,
  badge,
  badgeType = "default",
  className,
  size = "md",
}: ListItemProps) {
  const sizes = sizeMap[size]
  
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 bg-card transition-colors",
        sizes.padding,
        showBorder && "border-b border-border",
        !disabled && (href || onClick) && "active:bg-secondary/50 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {/* 左侧图标/头像 */}
      {(icon || avatar) && (
        <div className="flex-shrink-0">
          {avatar ? (
            <img alt="图片" 
              src={avatar} 
              alt={title}
              className={cn("rounded-full object-cover", sizes.avatar)}
            />
          ) : (
            <div className={cn(
              "rounded-xl bg-secondary/50 flex items-center justify-center",
              sizes.icon
            )}>
              {icon}
            </div>
          )}
        </div>
      )}
      
      {/* 中间内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-foreground truncate", sizes.title)}>
            {title}
          </span>
          {badge !== undefined && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              badgeTypeMap[badgeType]
            )}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className={cn("text-muted-foreground truncate mt-0.5", sizes.subtitle)}>
            {subtitle}
          </p>
        )}
      </div>
      
      {/* 右侧内容 */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {rightContent}
        {rightText && (
          <span className={cn("text-sm", rightTextColorMap[rightTextColor])}>
            {rightText}
          </span>
        )}
        {showArrow && (
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        )}
      </div>
    </div>
  )
  
  if (href && !disabled) {
    return <Link href={href}>{content}</Link>
  }
  
  return content
}

// ============================================
// 列表项变体 - 开关型
// ============================================

interface ListItemSwitchProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  showBorder?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ListItemSwitch({
  icon,
  title,
  subtitle,
  checked,
  onCheckedChange,
  disabled = false,
  showBorder = true,
  className,
  size = "md",
}: ListItemSwitchProps) {
  const sizes = sizeMap[size]
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card",
        sizes.padding,
        showBorder && "border-b border-border",
        className
      )}
    >
      {icon && (
        <div className={cn(
          "flex-shrink-0 rounded-xl bg-secondary/50 flex items-center justify-center",
          sizes.icon
        )}>
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium text-foreground", sizes.title)}>
          {title}
        </span>
        {subtitle && (
          <p className={cn("text-muted-foreground mt-0.5", sizes.subtitle)}>
            {subtitle}
          </p>
        )}
      </div>
      
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  )
}

// ============================================
// 列表项变体 - 选择型
// ============================================

interface ListItemSelectProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  value?: string
  placeholder?: string
  onClick: () => void
  showBorder?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ListItemSelect({
  icon,
  title,
  subtitle,
  value,
  placeholder = "请选择",
  onClick,
  showBorder = true,
  className,
  size = "md",
}: ListItemSelectProps) {
  const sizes = sizeMap[size]
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card active:bg-secondary/50 cursor-pointer",
        sizes.padding,
        showBorder && "border-b border-border",
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className={cn(
          "flex-shrink-0 rounded-xl bg-secondary/50 flex items-center justify-center",
          sizes.icon
        )}>
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium text-foreground", sizes.title)}>
          {title}
        </span>
        {subtitle && (
          <p className={cn("text-muted-foreground mt-0.5", sizes.subtitle)}>
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm",
          value ? "text-foreground" : "text-muted-foreground"
        )}>
          {value || placeholder}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      </div>
    </div>
  )
}

// ============================================
// 列表分组标题
// ============================================

interface ListGroupTitleProps {
  title: string
  rightText?: string
  rightAction?: () => void
  className?: string
}

export function ListGroupTitle({
  title,
  rightText,
  rightAction,
  className,
}: ListGroupTitleProps) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2 bg-secondary/30",
      className
    )}>
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      {rightText && (
        <button
          onClick={rightAction}
          className="text-xs text-primary"
        >
          {rightText}
        </button>
      )}
    </div>
  )
}

// ============================================
// 列表容器
// ============================================

interface ListContainerProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function ListContainer({
  children,
  title,
  className,
}: ListContainerProps) {
  return (
    <div className={cn("bg-card rounded-xl overflow-hidden", className)}>
      {title && (
        <div className="px-4 py-2.5 border-b border-border">
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}
