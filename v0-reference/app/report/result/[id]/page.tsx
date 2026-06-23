"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Check, Info, AlertTriangle, FileText, User, ChevronRight, Home, HelpCircle, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 模拟举报处理结果数据
const reportResults: Record<string, {
  id: string
  targetType: "post" | "user" | "comment"
  target: {
    title?: string
    content?: string
    nickname: string
    avatar?: string
  }
  reportType: string
  reportTime: string
  result: "processed" | "rejected"
  resultTitle: string
  resultDescription: string
  processTime: string
  punishment?: string
}> = {
  "1": {
    id: "R202401150001",
    targetType: "post",
    target: {
      title: "这个八字太神奇了，大家来看看",
      content: "昨天遇到一个案例，真的是让我大开眼界...",
      nickname: "算命先生",
      avatar: ""
    },
    reportType: "虚假宣传/欺诈",
    reportTime: "2024-01-15 10:30",
    result: "processed",
    resultTitle: "举报成立，已处理",
    resultDescription: "经核实，该内容存在虚假宣传行为，已对相关内容进行下架处理，并对发布者进行警告处分。感谢你的举报，你的反馈有助于维护平台健康环境。",
    processTime: "2024-01-16 14:22",
    punishment: "内容下架 + 账号警告"
  },
  "2": {
    id: "R202401160002",
    targetType: "user",
    target: {
      nickname: "神棍大师",
      avatar: ""
    },
    reportType: "人身攻击/骚扰",
    reportTime: "2024-01-16 15:45",
    result: "rejected",
    resultTitle: "举报不成立",
    resultDescription: "经平台审核，被举报用户的行为未违反平台社区规范。如有其他问题，建议你直接使用拉黑功能屏蔽该用户。如有异议，可联系客服进一步反馈。",
    processTime: "2024-01-17 09:15"
  },
  "3": {
    id: "R202401170003",
    targetType: "comment",
    target: {
      content: "你这个分析完全是胡说八道，一点都不专业...",
      nickname: "路人甲",
      avatar: ""
    },
    reportType: "人身攻击/骚扰",
    reportTime: "2024-01-17 08:20",
    result: "processed",
    resultTitle: "举报成立，已处理",
    resultDescription: "经核实，该评论内容含有攻击性言论，已删除相关评论并对发布者进行禁言3天处理。感谢你对社区环境的维护。",
    processTime: "2024-01-17 16:40",
    punishment: "评论删除 + 禁言3天"
  }
}

export default function ReportResultPage() {
  const params = useParams()
  const reportId = params.id as string
  const report = reportResults[reportId] || reportResults["1"]
  
  const isProcessed = report.result === "processed"
  
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/im/conversations" />
          <h1 className="font-semibold text-base text-foreground">举报处理结果</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* 处理结果状态卡片 */}
        <Card className={cn(
          "p-6 text-center",
          isProcessed 
            ? "bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20"
            : "bg-gradient-to-br from-muted/50 via-muted/30 to-transparent border-border"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3",
            isProcessed ? "bg-green-500/20" : "bg-muted"
          )}>
            {isProcessed ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : (
              <Info className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h2 className={cn(
            "text-lg font-bold",
            isProcessed ? "text-green-600" : "text-muted-foreground"
          )}>
            {report.resultTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            处理时间：{report.processTime}
          </p>
        </Card>

        {/* 被举报对象摘要 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            被举报对象
          </h3>
          
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            {report.targetType === "user" ? (
              <>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={report.target.avatar} alt={report.target.nickname} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {report.target.nickname[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1 border-blue-500/30 text-blue-500">
                    用户
                  </Badge>
                  <p className="font-medium text-sm text-foreground">{report.target.nickname}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  {report.targetType === "post" ? (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1 border-primary/30 text-primary">
                    {report.targetType === "post" ? "帖子" : "评论"}
                  </Badge>
                  {report.target.title && (
                    <p className="font-medium text-sm text-foreground line-clamp-1">{report.target.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{report.target.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">发布者：{report.target.nickname}</p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* 举报信息 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">举报信息</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">举报编号</span>
              <span className="text-sm text-foreground font-mono">{report.id}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">举报类型</span>
              <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-0">
                {report.reportType}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">举报时间</span>
              <span className="text-sm text-foreground">{report.reportTime}</span>
            </div>
          </div>
        </Card>

        {/* 处理结果详情 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            处理说明
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {report.resultDescription}
          </p>
          
          {report.punishment && (
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">处罚措施</p>
              <p className="text-sm text-green-600 font-medium">{report.punishment}</p>
            </div>
          )}
        </Card>

        {/* 常见问题入口 */}
        <Card className="p-4">
          <Link href="/content/community-rules" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">查看平台内容规范</p>
                <p className="text-xs text-muted-foreground">了解什么是违规内容</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </Card>

        {/* 反馈提示 */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            如对处理结果有异议，可
            <Link href="/help" className="text-primary">联系客服</Link>
            进一步反馈
          </p>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
