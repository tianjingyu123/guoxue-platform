"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CourseDescriptionProps {
  content: string
  highlights?: string[]
}

export function CourseDescription({ content, highlights = [] }: CourseDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="p-4 bg-card border-b border-border">
      <h3 className="font-semibold text-foreground mb-3">课程介绍</h3>
      
      {/* 课程亮点 */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {highlights.map((highlight, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-sm text-foreground">{highlight}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* 详细介绍 */}
      <div 
        className={`text-sm text-muted-foreground leading-relaxed ${
          !isExpanded ? "line-clamp-3" : ""
        }`}
      >
        {content}
      </div>
      
      {/* 展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 mt-2 text-sm text-primary"
      >
        <span>{isExpanded ? "收起" : "展开全部"}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
