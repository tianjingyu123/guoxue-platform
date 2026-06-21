"use client"

import { useState } from "react"
import { tools } from "@/lib/tools-data"
import { getToolIcon } from "./icons/tool-icons"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ToolsGridProps {
  defaultShowCount?: number
}

export function ToolsGrid({ defaultShowCount = 32 }: ToolsGridProps) {
  const [expanded, setExpanded] = useState(false)
  const displayTools = expanded ? tools : tools.slice(0, defaultShowCount)
  const hasMore = tools.length > defaultShowCount

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-x-2 gap-y-5">
        {displayTools.map((tool) => (
          <a
            key={tool.id}
            href={tool.href}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="relative">
              <div className="w-[62px] h-[62px] sm:w-[66px] sm:h-[66px] rounded-full flex items-center justify-center bg-card border-2 border-indigo/30 shadow-sm transition-all duration-200 group-hover:border-indigo/60 group-hover:shadow-md group-active:scale-95">
                <div className="w-8 h-8 sm:w-9 sm:h-9 text-indigo transition-colors group-hover:text-indigo/80">
                  {getToolIcon(tool.iconId)}
                </div>
              </div>
              {tool.badge && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className="text-[13px] font-medium text-foreground/80 group-hover:text-indigo transition-colors text-center leading-tight">
              {tool.name}
            </span>
          </a>
        ))}
      </div>
      
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-muted-foreground hover:text-indigo transition-colors"
        >
          {expanded ? (
            <>
              <span>收起</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>展开更多</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
