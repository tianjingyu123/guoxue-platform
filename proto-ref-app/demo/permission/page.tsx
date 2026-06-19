"use client"

import { useState } from "react"
import { PermissionModal, PermissionGuidePage } from "@/components/permission-modal"
import { BackButton } from "@/components/common/back-button"
import { Camera, Mic, Image, MapPin, Bell } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"

type PermissionType = "camera" | "microphone" | "photos" | "location" | "notification"

export default function PermissionDemoPage() {
  const [activeModal, setActiveModal] = useState<PermissionType | null>(null)
  const [isDenied, setIsDenied] = useState(false)
  const [showFullPage, setShowFullPage] = useState(false)
  const [fullPageType, setFullPageType] = useState<PermissionType>("camera")
  
  const permissions = [
    { type: "camera" as const, icon: Camera, label: "相机权限", color: "text-blue-500" },
    { type: "microphone" as const, icon: Mic, label: "麦克风权限", color: "text-green-500" },
    { type: "photos" as const, icon: Image, label: "相册权限", color: "text-purple-500" },
    { type: "location" as const, icon: MapPin, label: "位置权限", color: "text-orange-500" },
    { type: "notification" as const, icon: Bell, label: "通知权限", color: "text-red-500" },
  ]
  
  if (showFullPage) {
    return (
      <PermissionGuidePage
        type={fullPageType}
        onAllow={() => {
          alert("权限已开启")
          setShowFullPage(false)
        }}
        onSkip={() => setShowFullPage(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">权限申请演示</h1>
          <div className="w-9" />
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          点击下方按钮查看不同权限类型的引导弹窗效果
        </p>
        
        {/* 半屏弹窗演示 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-3">半屏弹窗模式</h3>
          <div className="grid grid-cols-2 gap-3">
            {permissions.map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                onClick={() => {
                  setIsDenied(false)
                  setActiveModal(type)
                }}
                className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
              >
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </Card>
        
        {/* 已拒绝状态演示 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-3">已拒绝状态</h3>
          <button
            onClick={() => {
              setIsDenied(true)
              setActiveModal("camera")
            }}
            className="w-full flex items-center gap-2 p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors"
          >
            <Camera className="w-5 h-5 text-red-500" />
            <span className="text-sm text-foreground">相机权限（已拒绝）</span>
          </button>
        </Card>
        
        {/* 全屏引导页演示 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-3">全屏引导页模式</h3>
          <div className="grid grid-cols-2 gap-3">
            {permissions.slice(0, 2).map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                onClick={() => {
                  setFullPageType(type)
                  setShowFullPage(true)
                }}
                className="flex items-center gap-2 p-3 bg-accent/10 rounded-xl hover:bg-accent/20 transition-colors"
              >
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
      
      {/* 权限弹窗 */}
      {activeModal && (
        <PermissionModal
          type={activeModal}
          isOpen={true}
          isDenied={isDenied}
          onClose={() => setActiveModal(null)}
          onAllow={() => {
            alert("权限已开启")
            setActiveModal(null)
          }}
          onDeny={() => {
            alert("已暂时跳过，部分功能将受限")
            setActiveModal(null)
          }}
        />
      )}
    </div>
  )
}
