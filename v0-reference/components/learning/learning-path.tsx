"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  CheckCircle2, Circle, Lock, ChevronRight, Trophy, Star, 
  Sparkles, Target, BookOpen, Award, Zap, Crown
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PathNode {
  id: string
  title: string
  description: string
  status: "completed" | "current" | "locked"
  type: "course" | "milestone" | "exam" | "certificate"
  href?: string
  reward?: {
    type: "badge" | "points" | "certificate"
    value: string | number
  }
}

interface LearningPathProps {
  title: string
  description: string
  progress: number
  nodes: PathNode[]
  className?: string
}

// 学习路径可视化组件
export function LearningPath({ title, description, progress, nodes, className }: LearningPathProps) {
  const completedCount = nodes.filter(n => n.status === "completed").length
  const currentNode = nodes.find(n => n.status === "current")

  const getNodeIcon = (node: PathNode) => {
    const iconClass = "w-5 h-5"
    
    if (node.status === "locked") {
      return <Lock className={cn(iconClass, "text-muted-foreground/50")} />
    }
    
    switch (node.type) {
      case "milestone":
        return <Trophy className={cn(iconClass, node.status === "completed" ? "text-amber-500" : "text-amber-500/70")} />
      case "exam":
        return <Target className={cn(iconClass, node.status === "completed" ? "text-blue-500" : "text-blue-500/70")} />
      case "certificate":
        return <Award className={cn(iconClass, node.status === "completed" ? "text-purple-500" : "text-purple-500/70")} />
      default:
        return node.status === "completed" 
          ? <CheckCircle2 className={cn(iconClass, "text-green-500")} />
          : <BookOpen className={cn(iconClass, "text-primary")} />
    }
  }

  return (
    <Card className={cn("p-4 overflow-hidden", className)}>
      {/* 标题区域 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {completedCount}/{nodes.length} 完成
        </Badge>
      </div>

      {/* 总进度条 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">学习进度</span>
          <span className="text-primary font-medium">{progress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-all duration-500 relative"
            style={{ width: `${progress}%` }}
          >
            {/* 进度条闪光效果 */}
            <span className="absolute inset-0 overflow-hidden">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </span>
          </div>
        </div>
      </div>

      {/* 路径节点 */}
      <div className="relative">
        {/* 连接线 */}
        <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-green-500 via-primary to-muted" />
        
        <div className="space-y-3">
          {nodes.map((node, index) => (
            <div 
              key={node.id}
              className={cn(
                "relative flex items-start gap-3 p-3 rounded-lg transition-all",
                node.status === "current" && "bg-primary/5 border border-primary/20",
                node.status === "completed" && "opacity-80",
                node.status === "locked" && "opacity-50"
              )}
            >
              {/* 节点图标 */}
              <div className={cn(
                "relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                node.status === "completed" && "bg-green-500/10",
                node.status === "current" && "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background",
                node.status === "locked" && "bg-muted"
              )}>
                {getNodeIcon(node)}
              </div>

              {/* 节点内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    node.status === "locked" ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {node.title}
                  </span>
                  {node.status === "current" && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-1.5">
                      进行中
                    </Badge>
                  )}
                  {node.type === "milestone" && node.status === "completed" && (
                    <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-0 px-1.5">
                      里程碑
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {node.description}
                </p>
                
                {/* 奖励提示 */}
                {node.reward && node.status !== "completed" && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-600">
                    <Zap className="w-3 h-3" />
                    <span>完成可获得: {node.reward.value}</span>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              {node.href && node.status !== "locked" && (
                <Link 
                  href={node.href}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 当前任务提示 */}
      {currentNode && (
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">当前目标</p>
              <p className="text-sm font-medium text-foreground">{currentNode.title}</p>
            </div>
            {currentNode.href && (
              <Link 
                href={currentNode.href}
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                继续学习
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// 预设学习路径数据
export const presetPaths = {
  bazi: {
    title: "八字命理学习路径",
    description: "从入门到精通的系统学习计划",
    progress: 35,
    nodes: [
      { id: "1", title: "八字入门基础", description: "了解八字的基本概念", status: "completed" as const, type: "course" as const, href: "/learn/1" },
      { id: "2", title: "天干地支详解", description: "掌握十天干十二地支", status: "completed" as const, type: "course" as const, href: "/learn/2" },
      { id: "3", title: "基础测验", description: "检验基础知识掌握", status: "completed" as const, type: "exam" as const, reward: { type: "badge" as const, value: "入门学者徽章" } },
      { id: "4", title: "五行生克关系", description: "理解五行相生相克", status: "current" as const, type: "course" as const, href: "/learn/3" },
      { id: "5", title: "十神基础", description: "学习十神的定义和作用", status: "locked" as const, type: "course" as const, href: "/learn/4" },
      { id: "6", title: "初级里程碑", description: "完成初级阶段学习", status: "locked" as const, type: "milestone" as const, reward: { type: "points" as const, value: "200积分" } },
      { id: "7", title: "格局判断", description: "学习八字格局分析", status: "locked" as const, type: "course" as const },
      { id: "8", title: "实战案例分析", description: "真实命盘解读练习", status: "locked" as const, type: "course" as const },
      { id: "9", title: "结业证书", description: "获得八字命理结业证书", status: "locked" as const, type: "certificate" as const, reward: { type: "certificate" as const, value: "八字命理师证书" } },
    ]
  },
  ziwei: {
    title: "紫微斗数学习路径",
    description: "紫微斗数完整学习体系",
    progress: 0,
    nodes: [
      { id: "1", title: "紫微斗数概述", description: "了解紫微斗数的起源", status: "current" as const, type: "course" as const, href: "/learn/10" },
      { id: "2", title: "命盘排法", description: "学习如何排紫微命盘", status: "locked" as const, type: "course" as const },
      { id: "3", title: "十四主星", description: "掌握十四颗主星特性", status: "locked" as const, type: "course" as const },
    ]
  }
}
