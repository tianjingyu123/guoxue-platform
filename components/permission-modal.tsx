"use client"

import { useState } from "react"
import { Camera, Mic, Image, MapPin, Bell, X, Settings, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PermissionType = "camera" | "microphone" | "photos" | "location" | "notification"

interface PermissionModalProps {
  type: PermissionType
  isOpen: boolean
  onClose: () => void
  onAllow: () => void
  onDeny: () => void
  isDenied?: boolean // 是否之前已被拒绝
}

const permissionConfig = {
  camera: {
    icon: Camera,
    title: "开启相机权限",
    description: "用于拍摄短视频和课程封面，分享你的国学见解。",
    useCases: ["拍摄短视频", "实名认证拍照", "直播开播"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  microphone: {
    icon: Mic,
    title: "开启麦克风权限",
    description: "用于连麦咨询和直播互动，与老师面对面交流。",
    useCases: ["语音连麦咨询", "直播语音互动", "录制语音消息"],
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  photos: {
    icon: Image,
    title: "开启相册权限",
    description: "用于上传证件照片完成实名认证，保障交易安全。",
    useCases: ["上传头像", "发布图片内容", "实名认证上传"],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  location: {
    icon: MapPin,
    title: "开启位置权限",
    description: "用于发现附近的驿站和同城圈友，获取本地化服务。",
    useCases: ["发现附近驿站", "同城内容推荐", "线下活动导航"],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  notification: {
    icon: Bell,
    title: "开启通知权限",
    description: "用于接收课程提醒、互动消息和重要公告，不错过精彩内容。",
    useCases: ["课程开播提醒", "消息即时通知", "活动优惠推送"],
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
}

export function PermissionModal({
  type,
  isOpen,
  onClose,
  onAllow,
  onDeny,
  isDenied = false,
}: PermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  if (!isOpen) return null
  
  const config = permissionConfig[type]
  const Icon = config.icon
  
  const handleAllow = async () => {
    setIsLoading(true)
    // 模拟请求权限
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsLoading(false)
    onAllow()
  }
  
  const handleGoSettings = () => {
    // 跳转系统设置
    alert("将跳转到系统设置页面")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div 
        className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* 关闭按钮 */}
        {!isDenied && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        
        {/* 内容区 */}
        <div className="p-6 pt-8">
          {/* 图标 */}
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5",
            config.bgColor
          )}>
            <Icon className={cn("w-10 h-10", config.color)} />
          </div>
          
          {/* 标题 */}
          <h2 className="text-xl font-bold text-center text-foreground mb-2">
            {isDenied ? "权限已被禁用" : config.title}
          </h2>
          
          {/* 描述 */}
          <p className="text-sm text-muted-foreground text-center mb-5">
            {isDenied 
              ? `你之前拒绝了${config.title.replace("开启", "")}，请前往系统设置手动开启。`
              : config.description
            }
          </p>
          
          {/* 用途说明 */}
          {!isDenied && (
            <Card className="p-4 mb-5 bg-secondary/30 border-0">
              <p className="text-xs text-muted-foreground mb-2">此权限将用于：</p>
              <div className="flex flex-wrap gap-2">
                {config.useCases.map((useCase, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-background rounded text-xs text-foreground"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </Card>
          )}
          
          {/* 隐私保护声明 */}
          <div className="flex items-center gap-2 justify-center mb-6">
            <Shield className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">
              你的隐私受严格保护，未经授权不会调用权限
            </p>
          </div>
          
          {/* 按钮区 */}
          <div className="space-y-3">
            {isDenied ? (
              <>
                <button
                  onClick={handleGoSettings}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  前往系统设置
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  暂时不用
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAllow}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "请求中..." : "去开启"}
                </button>
                <button
                  onClick={onDeny}
                  className="w-full py-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  暂不开启
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* 安全区域占位 */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  )
}

// 权限引导全屏页面组件
export function PermissionGuidePage({
  type,
  onAllow,
  onSkip,
}: {
  type: PermissionType
  onAllow: () => void
  onSkip: () => void
}) {
  const config = permissionConfig[type]
  const Icon = config.icon
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 跳过按钮 */}
      <div className="flex justify-end p-4 safe-area-pt">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          跳过
        </button>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* 大图标 */}
        <div className={cn(
          "w-28 h-28 rounded-full flex items-center justify-center mb-8",
          config.bgColor
        )}>
          <Icon className={cn("w-14 h-14", config.color)} />
        </div>
        
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-3">
          {config.title}
        </h1>
        
        {/* 描述 */}
        <p className="text-base text-muted-foreground text-center mb-8 max-w-xs">
          {config.description}
        </p>
        
        {/* 功能列表 */}
        <div className="w-full max-w-xs space-y-3 mb-12">
          {config.useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl"
            >
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bgColor)}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
              <span className="text-sm text-foreground">{useCase}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 底部按钮 */}
      <div className="p-6 safe-area-pb">
        <div className="flex items-center gap-2 justify-center mb-4">
          <Shield className="w-4 h-4 text-accent" />
          <p className="text-xs text-muted-foreground">
            隐私严格保护，未授权不会调用
          </p>
        </div>
        <button
          onClick={onAllow}
          className="w-full py-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          允许访问
        </button>
      </div>
    </div>
  )
}
