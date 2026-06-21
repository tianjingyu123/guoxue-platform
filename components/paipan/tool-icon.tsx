"use client"

import { getToolIcon } from "./icons/tool-icons"
import { cn } from "@/lib/utils"

interface ToolIconProps {
  iconId: string
  size?: number
  className?: string
}

export function ToolIcon({ iconId, size = 44, className }: ToolIconProps) {
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center",
        "bg-primary/5 border-2 border-primary/20",
        "transition-all duration-200",
        "hover:border-primary/40 hover:bg-primary/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      <div 
        className="text-primary flex items-center justify-center"
        style={{ width: size * 0.55, height: size * 0.55 }}
      >
        {getToolIcon(iconId)}
      </div>
    </div>
  )
}
