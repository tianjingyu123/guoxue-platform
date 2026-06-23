"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Camera, CheckCircle2, Clock, XCircle, Shield, Lock, Upload, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

// 认证状态类型
type VerificationStatus = "none" | "pending" | "approved" | "rejected"

export default function VerificationPage() {
  // 模拟认证状态，实际应从API获取
  const [status, setStatus] = useState<VerificationStatus>("none")
  const [realName, setRealName] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 模拟审核信息
  const verificationInfo = {
    pending: {
      submitTime: "2024-01-15 14:30",
      expectedTime: "1-3个工作日"
    },
    approved: {
      verifyTime: "2024-01-16 10:00",
      realName: "张**"
    },
    rejected: {
      reason: "身份证照片模糊，请重新上传清晰照片",
      rejectTime: "2024-01-16 09:00"
    }
  }

  const handleImageUpload = (type: "front" | "back") => {
    // 模拟上传
    if (type === "front") {
      setFrontImage("/placeholder-id-front.jpg")
    } else {
      setBackImage("/placeholder-id-back.jpg")
    }
  }

  const handleSubmit = () => {
    if (!realName || !idNumber || !frontImage || !backImage) return
    
    setIsSubmitting(true)
    // 模拟提交
    setTimeout(() => {
      setIsSubmitting(false)
      setStatus("pending")
    }, 1500)
  }

  const canSubmit = realName.length >= 2 && idNumber.length === 18 && frontImage && backImage

  // 已认证状态
  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-12 px-4">
  <BackButton fallbackPath="/settings" />
  <h1 className="font-semibold text-base">实名认证</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="pt-16 pb-8 px-4">
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">已完成实名认证</h2>
            <p className="text-sm text-muted-foreground mb-6">你已通过平台实名认证</p>
            
            <Card className="w-full p-4 bg-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">认证姓名</span>
                  <span className="text-sm text-foreground">{verificationInfo.approved.realName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">认证时间</span>
                  <span className="text-sm text-foreground">{verificationInfo.approved.verifyTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">认证状态</span>
                  <Badge className="bg-green-500/10 text-green-500 border-0">已认证</Badge>
                </div>
              </div>
            </Card>

            <div className="mt-8 p-4 rounded-xl bg-secondary/50 w-full">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-foreground font-medium">信息安全保障</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    你的实名信息已加密存储，仅用于身份验证，不会泄露给第三方。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 审核中状态
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-12 px-4">
  <BackButton fallbackPath="/settings" />
  <h1 className="font-semibold text-base">实名认证</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="pt-16 pb-8 px-4">
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">审核中</h2>
            <p className="text-sm text-muted-foreground mb-6">你的实名认证申请正在审核中</p>
            
            <Card className="w-full p-4 bg-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">提交时间</span>
                  <span className="text-sm text-foreground">{verificationInfo.pending.submitTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">预计审核</span>
                  <span className="text-sm text-foreground">{verificationInfo.pending.expectedTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">当前状态</span>
                  <Badge className="bg-amber-500/10 text-amber-500 border-0">审核中</Badge>
                </div>
              </div>
            </Card>

            <div className="mt-8 p-4 rounded-xl bg-secondary/50 w-full">
              <p className="text-sm text-muted-foreground text-center">
                审核结果将通过消息通知你，请耐心等待
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 认证失败状态
  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-12 px-4">
  <BackButton fallbackPath="/settings" />
  <h1 className="font-semibold text-base">实名认证</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="pt-16 pb-8 px-4">
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">认证失败</h2>
            <p className="text-sm text-muted-foreground mb-6">很抱歉，你的实名认证未通过</p>
            
            <Card className="w-full p-4 bg-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">审核时间</span>
                  <span className="text-sm text-foreground">{verificationInfo.rejected.rejectTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">当前状态</span>
                  <Badge className="bg-red-500/10 text-red-500 border-0">未通过</Badge>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">失败原因：</p>
                <p className="text-sm text-red-500 mt-1">{verificationInfo.rejected.reason}</p>
              </div>
            </Card>

            <button 
              onClick={() => setStatus("none")}
              className="mt-8 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              重新认证
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 未认证状态 - 填写表单
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <BackButton fallbackPath="/settings" />
          <h1 className="font-semibold text-base">实名认证</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="pt-16 px-4">
        {/* 认证须知 */}
        <Card className="p-4 bg-amber-500/5 border-amber-500/20 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium mb-2">认证须知</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                根据相关法律法规及平台规则，部分功能（成为圈主、站长提现等）需实名认证后才可使用。
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <p className="text-xs text-accent">
                  你的个人信息仅用于身份验证，我们将严格加密保护
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 信息填写区 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-medium text-foreground">基本信息</h3>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">真实姓名</label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="请输入身份证上的姓名"
              className="w-full h-12 px-4 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">身份证号</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/[^0-9Xx]/g, "").slice(0, 18))}
              placeholder="请输入18位身份证号码"
              className="w-full h-12 px-4 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {idNumber && idNumber.length !== 18 && (
              <p className="text-xs text-red-500 mt-1">请输入正确的18位身份证号</p>
            )}
          </div>
        </div>

        {/* 证件照片上传区 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-medium text-foreground">证件照片</h3>
          <p className="text-xs text-muted-foreground">请确保证件照片清晰、完整，四角齐全</p>

          <div className="grid grid-cols-2 gap-4">
            {/* 人像面 */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 text-center">身份证人像面</p>
              {frontImage ? (
                <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-secondary">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">已上传</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFrontImage(null)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleImageUpload("front")}
                  className="w-full aspect-[3/2] rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">点击上传</span>
                </button>
              )}
            </div>

            {/* 国徽面 */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 text-center">身份证国徽面</p>
              {backImage ? (
                <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-secondary">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">已上传</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setBackImage(null)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleImageUpload("back")}
                  className="w-full aspect-[3/2] rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">点击上传</span>
                </button>
              )}
            </div>
          </div>

          {/* 拍摄提示 */}
          <Card className="p-3 bg-secondary/50">
            <div className="flex items-start gap-2">
              <Upload className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>拍摄提示：</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>请确保证件边框完整，字迹清晰可辨</li>
                  <li>避免反光、遮挡或模糊</li>
                  <li>支持JPG、PNG格式，单张不超过5MB</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* 隐私声明 */}
        <div className="text-xs text-muted-foreground text-center mb-4">
          提交即表示你同意
          <Link href="/privacy" className="text-primary mx-1">《隐私政策》</Link>
          和
          <Link href="/terms" className="text-primary mx-1">《用户协议》</Link>
        </div>
      </main>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "w-full py-3.5 rounded-xl font-medium transition-all",
            canSubmit && !isSubmitting
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              提交中...
            </span>
          ) : (
            "提交审核"
          )}
        </button>
      </div>
    </div>
  )
}
