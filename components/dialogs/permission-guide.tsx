"use client"

import { useState } from "react"
import { 
  Camera, 
  Mic, 
  Image, 
  MapPin, 
  Bell, 
  Phone,
  Bluetooth,
  Wifi,
  X,
  Settings,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 权限类型
export type PermissionType = 
  | 'camera' 
  | 'microphone' 
  | 'photo' 
  | 'location' 
  | 'notification' 
  | 'contacts'
  | 'bluetooth'
  | 'wifi'

// 权限状态
export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'restricted'

// 权限配置
export interface PermissionConfig {
  type: PermissionType
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  reasons: string[]
  required: boolean
}

// 权限配置列表
const PERMISSION_CONFIGS: Record<PermissionType, Omit<PermissionConfig, 'type' | 'required'>> = {
  camera: {
    title: '相机权限',
    description: '用于拍摄照片、视频和扫描二维码',
    icon: <Camera className="w-12 h-12 text-white" />,
    iconBg: 'bg-blue-500',
    reasons: [
      '拍摄头像和照片',
      '扫描二维码签到、加好友',
      '直播时开启摄像头',
      '拍摄视频上传',
    ],
  },
  microphone: {
    title: '麦克风权限',
    description: '用于语音消息和直播互动',
    icon: <Mic className="w-12 h-12 text-white" />,
    iconBg: 'bg-red-500',
    reasons: [
      '发送语音消息',
      '直播时开启麦克风',
      '语音通话功能',
      '语音搜索功能',
    ],
  },
  photo: {
    title: '相册权限',
    description: '用于选择和保存图片',
    icon: <Image className="w-12 h-12 text-white" />,
    iconBg: 'bg-green-500',
    reasons: [
      '选择相册图片上传',
      '保存图片到相册',
      '分享海报保存',
      '课程资料下载保存',
    ],
  },
  location: {
    title: '位置权限',
    description: '用于签到和推荐附近内容',
    icon: <MapPin className="w-12 h-12 text-white" />,
    iconBg: 'bg-orange-500',
    reasons: [
      '线下课程签到定位',
      '推荐附近的线下活动',
      '导航到上课地点',
      '发布动态时添加位置',
    ],
  },
  notification: {
    title: '通知权限',
    description: '用于接收消息和提醒',
    icon: <Bell className="w-12 h-12 text-white" />,
    iconBg: 'bg-purple-500',
    reasons: [
      '接收新消息通知',
      '直播开播提醒',
      '课程更新提醒',
      '每日运势推送',
    ],
  },
  contacts: {
    title: '通讯录权限',
    description: '用于邀请好友',
    icon: <Phone className="w-12 h-12 text-white" />,
    iconBg: 'bg-cyan-500',
    reasons: [
      '邀请通讯录好友',
      '发现已注册的好友',
    ],
  },
  bluetooth: {
    title: '蓝牙权限',
    description: '用于连接周边设备',
    icon: <Bluetooth className="w-12 h-12 text-white" />,
    iconBg: 'bg-indigo-500',
    reasons: [
      '连接蓝牙耳机',
      '线下签到设备连接',
    ],
  },
  wifi: {
    title: '网络权限',
    description: '用于网络连接和下载',
    icon: <Wifi className="w-12 h-12 text-white" />,
    iconBg: 'bg-teal-500',
    reasons: [
      '在线播放课程视频',
      '下载课程资料',
      '同步学习进度',
    ],
  },
}

interface PermissionGuideProps {
  /** 权限类型 */
  type: PermissionType
  /** 是否必须（必须时不显示跳过按钮） */
  required?: boolean
  /** 是否显示 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 去设置回调 */
  onGoSettings: () => void
  /** 跳过回调 */
  onSkip?: () => void
  /** 自定义原因列表 */
  customReasons?: string[]
}

export function PermissionGuide({
  type,
  required = false,
  open,
  onClose,
  onGoSettings,
  onSkip,
  customReasons,
}: PermissionGuideProps) {
  const config = PERMISSION_CONFIGS[type]
  const reasons = customReasons || config.reasons

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* 顶部关闭按钮 */}
      {!required && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* 图标 */}
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-8",
          config.iconBg
        )}>
          {config.icon}
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {config.title}
        </h1>

        {/* 描述 */}
        <p className="text-muted-foreground text-center mb-8">
          {config.description}
        </p>

        {/* 原因列表 */}
        <div className="w-full max-w-sm bg-secondary/50 rounded-2xl p-4 mb-8">
          <p className="text-sm font-medium text-foreground mb-3">
            我们需要此权限来：
          </p>
          <ul className="space-y-2">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-sm text-muted-foreground">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 隐私说明 */}
        <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
          我们重视您的隐私，您的数据将被安全保护，不会用于其他目的
        </p>
      </div>

      {/* 底部按钮 */}
      <div className="px-6 pb-8 safe-area-inset-bottom space-y-3">
        <Button
          onClick={onGoSettings}
          className="w-full h-12 text-base"
        >
          <Settings className="w-5 h-5 mr-2" />
          去设置
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>

        {!required && (
          <Button
            variant="ghost"
            onClick={onSkip || onClose}
            className="w-full h-10 text-muted-foreground"
          >
            暂不开启
          </Button>
        )}
      </div>
    </div>
  )
}

// ========== 权限请求弹窗组件 ==========

interface PermissionRequestDialogProps {
  /** 权限类型 */
  type: PermissionType
  /** 是否显示 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 允许回调 */
  onAllow: () => void
  /** 拒绝回调 */
  onDeny: () => void
}

export function PermissionRequestDialog({
  type,
  open,
  onClose,
  onAllow,
  onDeny,
}: PermissionRequestDialogProps) {
  const config = PERMISSION_CONFIGS[type]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl w-[85%] max-w-sm overflow-hidden">
        {/* 头部 */}
        <div className="p-6 text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            config.iconBg
          )}>
            {config.icon}
          </div>
          <h2 className="text-lg font-semibold mb-2">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        {/* 原因简述 */}
        <div className="px-6 pb-4">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              {config.reasons.slice(0, 2).join('、')}等功能需要此权限
            </p>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex border-t border-border">
          <button
            onClick={onDeny}
            className="flex-1 py-3.5 text-center text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            拒绝
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={onAllow}
            className="flex-1 py-3.5 text-center text-primary font-medium hover:bg-secondary/50 transition-colors"
          >
            允许
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== 多权限引导组件 ==========

interface MultiPermissionGuideProps {
  /** 需要的权限列表 */
  permissions: { type: PermissionType; required: boolean }[]
  /** 是否显示 */
  open: boolean
  /** 完成回调（返回授权结果） */
  onComplete: (results: Record<PermissionType, PermissionStatus>) => void
  /** 跳过回调 */
  onSkip?: () => void
}

export function MultiPermissionGuide({
  permissions,
  open,
  onComplete,
  onSkip,
}: MultiPermissionGuideProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<Record<PermissionType, PermissionStatus>>({} as Record<PermissionType, PermissionStatus>)

  if (!open || permissions.length === 0) return null

  const currentPermission = permissions[currentIndex]
  const isLast = currentIndex === permissions.length - 1
  const config = PERMISSION_CONFIGS[currentPermission.type]

  const handleGrant = () => {
    const newResults = { ...results, [currentPermission.type]: 'granted' as PermissionStatus }
    setResults(newResults)
    
    if (isLast) {
      onComplete(newResults)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleDeny = () => {
    const newResults = { ...results, [currentPermission.type]: 'denied' as PermissionStatus }
    setResults(newResults)
    
    if (isLast) {
      onComplete(newResults)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleSkipAll = () => {
    const skipResults = permissions.reduce((acc, p) => {
      acc[p.type] = results[p.type] || 'denied'
      return acc
    }, {} as Record<PermissionType, PermissionStatus>)
    onSkip?.()
    onComplete(skipResults)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* 进度指示器 */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {permissions.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= currentIndex ? "bg-primary" : "bg-secondary"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {currentIndex + 1} / {permissions.length}
        </p>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-8",
          config.iconBg
        )}>
          {config.icon}
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {config.title}
        </h1>

        <p className="text-muted-foreground text-center mb-8">
          {config.description}
        </p>

        <div className="w-full max-w-sm bg-secondary/50 rounded-2xl p-4">
          <ul className="space-y-2">
            {config.reasons.slice(0, 3).map((reason, index) => (
              <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="px-6 pb-8 safe-area-inset-bottom space-y-3">
        <Button onClick={handleGrant} className="w-full h-12 text-base">
          允许
        </Button>

        {!currentPermission.required && (
          <Button
            variant="outline"
            onClick={handleDeny}
            className="w-full h-10"
          >
            {isLast ? '完成设置' : '跳过此项'}
          </Button>
        )}

        {!permissions.every(p => p.required) && (
          <button
            onClick={handleSkipAll}
            className="w-full text-center text-sm text-muted-foreground py-2"
          >
            全部跳过
          </button>
        )}
      </div>
    </div>
  )
}

// 导出权限配置获取函数
export function getPermissionConfig(type: PermissionType): PermissionConfig & { type: PermissionType } {
  return {
    type,
    ...PERMISSION_CONFIGS[type],
    required: false,
  }
}

// 导出所有权限类型
export const ALL_PERMISSION_TYPES: PermissionType[] = [
  'camera',
  'microphone', 
  'photo',
  'location',
  'notification',
  'contacts',
  'bluetooth',
  'wifi',
]
