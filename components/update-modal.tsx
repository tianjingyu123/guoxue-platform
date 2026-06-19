"use client"

import { useState } from "react"
import { Sparkles, Wrench, Bug, Rocket, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UpdateItem {
  type: "new" | "optimize" | "fix"
  content: string
}

interface UpdateModalProps {
  isOpen: boolean
  onClose?: () => void
  version: string
  updateItems: UpdateItem[]
  isForced?: boolean
  onUpdate: () => void
}

export function UpdateModal({
  isOpen,
  onClose,
  version,
  updateItems,
  isForced = false,
  onUpdate,
}: UpdateModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  if (!isOpen) return null

  const handleUpdate = () => {
    setIsUpdating(true)
    onUpdate()
  }

  const getIcon = (type: UpdateItem["type"]) => {
    switch (type) {
      case "new":
        return <Sparkles className="w-4 h-4 text-accent" />
      case "optimize":
        return <Wrench className="w-4 h-4 text-blue-500" />
      case "fix":
        return <Bug className="w-4 h-4 text-green-500" />
    }
  }

  const getLabel = (type: UpdateItem["type"]) => {
    switch (type) {
      case "new":
        return "新增"
      case "optimize":
        return "优化"
      case "fix":
        return "修复"
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        {/* 顶部装饰区 */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent pt-8 pb-12 px-6 text-center">
          {/* 关闭按钮（非强制更新时显示） */}
          {!isForced && onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
          
          {/* Logo/图标 */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          
          {/* 标题 */}
          <h2 className="text-xl font-bold text-white">发现新版本</h2>
          <p className="text-white/80 text-sm mt-1">{version}</p>
        </div>

        {/* 更新内容区 */}
        <div className="px-6 -mt-6">
          <div className="bg-background rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-medium text-foreground mb-3">更新内容</h3>
            <div className="space-y-2.5">
              {updateItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded mr-1.5",
                      item.type === "new" && "bg-accent/10 text-accent",
                      item.type === "optimize" && "bg-blue-500/10 text-blue-500",
                      item.type === "fix" && "bg-green-500/10 text-green-500"
                    )}>
                      {getLabel(item.type)}
                    </span>
                    <span className="text-sm text-muted-foreground">{item.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 按钮区 */}
        <div className={cn(
          "p-6 pt-4",
          isForced ? "flex justify-center" : "flex gap-3"
        )}>
          {!isForced && onClose && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              稍后再说
            </Button>
          )}
          <Button
            className={cn(
              "bg-primary hover:bg-primary/90",
              isForced ? "w-full" : "flex-1"
            )}
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                更新中...
              </div>
            ) : (
              "立即更新"
            )}
          </Button>
        </div>

        {/* 强制更新提示 */}
        {isForced && (
          <p className="text-center text-xs text-muted-foreground pb-4 -mt-2">
            此版本包含重要更新，需立即更新后使用
          </p>
        )}
      </div>
    </div>
  )
}

// 演示页面组件
export function UpdateModalDemo() {
  const [showNormal, setShowNormal] = useState(false)
  const [showForced, setShowForced] = useState(false)

  const updateItems: UpdateItem[] = [
    { type: "new", content: "圈子付费问答功能" },
    { type: "new", content: "AI古籍智慧阅读" },
    { type: "optimize", content: "首页加载速度提升50%" },
    { type: "optimize", content: "视频播放流畅度优化" },
    { type: "fix", content: "部分机型排盘结果展示问题" },
  ]

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-bold text-foreground">版本更新弹窗演示</h1>
      
      <div className="flex gap-3">
        <Button onClick={() => setShowNormal(true)}>
          非强制更新
        </Button>
        <Button variant="destructive" onClick={() => setShowForced(true)}>
          强制更新
        </Button>
      </div>

      <UpdateModal
        isOpen={showNormal}
        onClose={() => setShowNormal(false)}
        version="V2.1.0"
        updateItems={updateItems}
        isForced={false}
        onUpdate={() => {
          setTimeout(() => setShowNormal(false), 2000)
        }}
      />

      <UpdateModal
        isOpen={showForced}
        version="V3.0.0"
        updateItems={[
          { type: "new", content: "全新架构重构" },
          { type: "new", content: "安全性重大升级" },
          { type: "fix", content: "修复关键安全漏洞" },
        ]}
        isForced={true}
        onUpdate={() => {
          setTimeout(() => setShowForced(false), 2000)
        }}
      />
    </div>
  )
}
