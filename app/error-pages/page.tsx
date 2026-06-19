"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { WifiOff, ServerCrash, FileQuestion, ShieldX, Clock, RefreshCw, Home, ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// 错误类型
type ErrorType = "network" | "server" | "notfound" | "forbidden" | "timeout"

const errorConfigs = {
  network: {
    icon: WifiOff,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    title: "网络连接异常",
    description: "请检查您的网络设置后重试",
    primaryAction: "重新加载",
    secondaryAction: "返回首页",
  },
  server: {
    icon: ServerCrash,
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    title: "服务器开小差了",
    description: "服务器暂时无法响应，请稍后再试",
    primaryAction: "重试",
    secondaryAction: "联系客服",
  },
  notfound: {
    icon: FileQuestion,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    title: "页面不存在",
    description: "您访问的页面已被移除或不存在",
    primaryAction: "返回首页",
    secondaryAction: "搜索内容",
  },
  forbidden: {
    icon: ShieldX,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
    title: "无访问权限",
    description: "您没有权限访问此内容，请先登录或升级会员",
    primaryAction: "去登录",
    secondaryAction: "开通会员",
  },
  timeout: {
    icon: Clock,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    title: "请求超时",
    description: "服务器响应时间过长，请检查网络后重试",
    primaryAction: "重试",
    secondaryAction: "返回上页",
  },
}

// 通用错误页面组件
export function ErrorPage({ 
  type = "server",
  onRetry,
  onSecondary,
}: { 
  type?: ErrorType
  onRetry?: () => void
  onSecondary?: () => void
}) {
  const config = errorConfigs[type]
  const Icon = config.icon

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* 错误图标 */}
      <div className={`w-24 h-24 rounded-full ${config.iconBg} flex items-center justify-center mb-6`}>
        <Icon className={`w-12 h-12 ${config.iconColor}`} />
      </div>

      {/* 错误信息 */}
      <h1 className="text-xl font-semibold text-foreground mb-2">{config.title}</h1>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">{config.description}</p>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button 
          onClick={onRetry}
          className="w-full"
        >
          {type === "network" || type === "timeout" || type === "server" ? (
            <RefreshCw className="w-4 h-4 mr-2" />
          ) : type === "notfound" ? (
            <Home className="w-4 h-4 mr-2" />
          ) : null}
          {config.primaryAction}
        </Button>
        <Button 
          variant="outline"
          onClick={onSecondary}
          className="w-full"
        >
          {config.secondaryAction}
        </Button>
      </div>
    </div>
  )
}

// 演示页面
export default function ErrorPagesDemo() {
  const [activeType, setActiveType] = useState<ErrorType>("network")

  const types: ErrorType[] = ["network", "server", "notfound", "forbidden", "timeout"]

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">错误页面演示</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 类型选择 */}
      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground mb-3">选择错误类型：</p>
        <div className="flex flex-wrap gap-2">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {errorConfigs[type].title}
            </button>
          ))}
        </div>
      </div>

      {/* 错误页面预览 */}
      <div className="border-t border-border">
        <ErrorPage 
          type={activeType}
          onRetry={() => alert("重试操作")}
          onSecondary={() => alert("次要操作")}
        />
      </div>
    </div>
  )
}
