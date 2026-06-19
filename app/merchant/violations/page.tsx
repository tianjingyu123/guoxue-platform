"use client"

import Link from "next/link"
import { ArrowLeft, AlertTriangle, FileWarning, ShieldAlert, ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const violationStats = {
  total: 3,
  pending: 1,
  score: 12,
  maxScore: 48,
}

const violations = [
  {
    id: "1",
    type: "product",
    title: "商品信息违规",
    description: "商品标题包含夸大宣传用语",
    productTitle: "最强命理秘籍",
    penalty: "商品下架，扣2分",
    score: 2,
    status: "pending",
    createdAt: "2024-01-15 10:00",
    deadline: "2024-01-18 10:00",
  },
  {
    id: "2",
    type: "service",
    title: "服务态度违规",
    description: "与买家沟通时使用不文明用语",
    orderNo: "202401100001",
    penalty: "警告，扣5分",
    score: 5,
    status: "processed",
    createdAt: "2024-01-10 15:00",
    processedAt: "2024-01-11 09:00",
  },
  {
    id: "3",
    type: "delay",
    title: "延迟发货",
    description: "超过承诺时间48小时未发货",
    orderNo: "202401050001",
    penalty: "扣5分，赔付买家5元",
    score: 5,
    status: "processed",
    createdAt: "2024-01-05 00:00",
    processedAt: "2024-01-05 12:00",
  },
]

const typeConfig = {
  product: { icon: FileWarning, color: "text-orange-600 bg-orange-50" },
  service: { icon: ShieldAlert, color: "text-red-600 bg-red-50" },
  delay: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
}

const statusConfig = {
  pending: { label: "待处理", color: "bg-red-100 text-red-700" },
  appealing: { label: "申诉中", color: "bg-blue-100 text-blue-700" },
  processed: { label: "已处理", color: "bg-gray-100 text-gray-700" },
}

export default function ViolationsPage() {
  const scorePercent = (violationStats.score / violationStats.maxScore) * 100

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/dashboard" className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">违规管理</h1>
        </div>
      </header>
      
      {/* 违规概览 */}
      <div className="p-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">店铺扣分</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold text-foreground">{violationStats.score}</span>
                <span className="text-sm text-muted-foreground">/ {violationStats.maxScore}分</span>
              </div>
            </div>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              scorePercent > 50 ? "bg-red-100" : scorePercent > 25 ? "bg-amber-100" : "bg-green-100"
            )}>
              <span className={cn(
                "text-lg font-bold",
                scorePercent > 50 ? "text-red-600" : scorePercent > 25 ? "text-amber-600" : "text-green-600"
              )}>
                {scorePercent > 50 ? "警告" : scorePercent > 25 ? "注意" : "良好"}
              </span>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                scorePercent > 50 ? "bg-red-500" : scorePercent > 25 ? "bg-amber-500" : "bg-green-500"
              )}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">违规次数</span>
              <span className="font-medium">{violationStats.total}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">待处理</span>
              <span className="font-medium text-red-600">{violationStats.pending}</span>
            </div>
          </div>
        </Card>
        
        {/* 扣分说明 */}
        <Card className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p>扣分满48分将被暂停营业资格，每季度初清零一次。</p>
              <p className="mt-1">如有异议可在收到通知后3天内提交申诉。</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* 违规记录 */}
      <div className="px-4">
        <h2 className="font-medium mb-3">违规记录</h2>
        
        <div className="space-y-3">
          {violations.map(violation => {
            const config = typeConfig[violation.type as keyof typeof typeConfig]
            const status = statusConfig[violation.status as keyof typeof statusConfig]
            const Icon = config.icon
            
            return (
              <Card key={violation.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", config.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">{violation.title}</h3>
                      <Badge className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{violation.description}</p>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      {violation.productTitle && <p>商品: {violation.productTitle}</p>}
                      {violation.orderNo && <p>订单: {violation.orderNo}</p>}
                    </div>
                    
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs">
                      <span className="text-red-600">处罚: {violation.penalty}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">{violation.createdAt}</span>
                      {violation.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">申诉</Button>
                          <Button size="sm">去处理</Button>
                        </div>
                      )}
                      {violation.status === "processed" && (
                        <span className="text-xs text-muted-foreground">
                          处理时间: {violation.processedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
        
        {violations.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-muted-foreground">暂无违规记录，继续保持！</p>
          </div>
        )}
      </div>
    </div>
  )
}
