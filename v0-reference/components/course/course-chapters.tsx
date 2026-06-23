"use client"

import { useState } from "react"
import { Play, Lock, ChevronDown, ChevronUp, Clock } from "lucide-react"

interface Chapter {
  id: string
  title: string
  duration: string
  isFree: boolean
  isCompleted?: boolean
}

interface Section {
  id: string
  title: string
  chapters: Chapter[]
}

interface CourseChaptersProps {
  sections: Section[]
  isPurchased?: boolean
  onPlayChapter?: (chapterId: string) => void
}

export function CourseChapters({ 
  sections, 
  isPurchased = false,
  onPlayChapter 
}: CourseChaptersProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.length > 0 ? [sections[0].id] : []
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const totalChapters = sections.reduce((acc, s) => acc + s.chapters.length, 0)
  const totalDuration = sections.reduce((acc, section) => {
    return acc + section.chapters.reduce((chapterAcc, chapter) => {
      const minutes = parseInt(chapter.duration.replace("分钟", ""))
      return chapterAcc + (isNaN(minutes) ? 0 : minutes)
    }, 0)
  }, 0)

  return (
    <div className="p-4 bg-card border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">课程目录</h3>
        <span className="text-sm text-muted-foreground">
          共{totalChapters}课时 · 约{totalDuration}分钟
        </span>
      </div>
      
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg overflow-hidden border border-border">
            {/* 章节标题 */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <span className="font-medium text-foreground text-sm">
                {section.title}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {section.chapters.length}课时
                </span>
                {expandedSections.includes(section.id) ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {/* 章节内容 */}
            {expandedSections.includes(section.id) && (
              <div className="divide-y divide-border">
                {section.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      if (isPurchased || chapter.isFree) {
                        onPlayChapter?.(chapter.id)
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* 播放/锁定图标 */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isPurchased || chapter.isFree 
                          ? "bg-primary/10 text-primary" 
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {isPurchased || chapter.isFree ? (
                          <Play className="w-4 h-4 ml-0.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${
                            chapter.isCompleted 
                              ? "text-muted-foreground" 
                              : "text-foreground"
                          }`}>
                            {chapter.title}
                          </span>
                          {chapter.isFree && !isPurchased && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-accent/20 text-accent">
                              试看
                            </span>
                          )}
                          {chapter.isCompleted && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary">
                              已学
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{chapter.duration}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
