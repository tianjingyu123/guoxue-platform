"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Phone, MessageCircle, ShieldCheck, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { CaptchaModal, useCaptcha } from "@/components/captcha-modal"

export default function CaptchaDemoPage() {
  const [showDirectModal, setShowDirectModal] = useState(false)
  const [directResult, setDirectResult] = useState<string | null>(null)
  
  // 使用 Hook 方式
  const { verify, CaptchaComponent } = useCaptcha()
  const [hookResult, setHookResult] = useState<string | null>(null)
  
  // 模拟发送验证码场景
  const [phone, setPhone] = useState("138****8888")
  const [countdown, setCountdown] = useState(0)
  const [smsSent, setSmsSent] = useState(false)

  const handleSendSms = () => {
    verify(() => {
      // 验证成功后发送短信
      setSmsSent(true)
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton />
          <h1 className="font-semibold text-base text-foreground">安全验证演示</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 说明卡片 */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">滑块拼图验证</h2>
              <p className="text-sm text-muted-foreground mt-1">
                用于防止机器人恶意刷接口。用户需要拖动滑块将拼图块拼合到正确位置，验证通过后自动触发后续操作。
              </p>
            </div>
          </div>
        </Card>

        {/* 场景1：直接调用 */}
        <div>
          <h3 className="font-medium text-sm text-foreground mb-3">场景1：直接使用组件</h3>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              直接导入 CaptchaModal 组件，通过 isOpen 控制显示
            </p>
            <button
              onClick={() => setShowDirectModal(true)}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              打开验证弹窗
            </button>
            {directResult && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                {directResult}
              </div>
            )}
          </Card>
        </div>

        {/* 场景2：使用 Hook */}
        <div>
          <h3 className="font-medium text-sm text-foreground mb-3">场景2：使用 useCaptcha Hook</h3>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              使用 useCaptcha() Hook，调用 verify(callback) 方法触发验证
            </p>
            <button
              onClick={() => {
                verify(() => {
                  setHookResult("验证成功！时间：" + new Date().toLocaleTimeString())
                })
              }}
              className="w-full py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
            >
              触发验证 (Hook 方式)
            </button>
            {hookResult && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                {hookResult}
              </div>
            )}
          </Card>
        </div>

        {/* 场景3：发送短信验证码 */}
        <div>
          <h3 className="font-medium text-sm text-foreground mb-3">场景3：发送短信验证码</h3>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Phone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-foreground">{phone}</p>
                <p className="text-xs text-muted-foreground">当前绑定手机号</p>
              </div>
            </div>
            
            <button
              onClick={handleSendSms}
              disabled={countdown > 0}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `${countdown}秒后可重新发送` : "获取验证码"}
            </button>
            
            {smsSent && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <MessageCircle className="w-4 h-4" />
                验证码已发送至 {phone}
              </div>
            )}
          </Card>
        </div>

        {/* 技术说明 */}
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">技术说明</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• 拼图位置随机生成，每次刷新都会变化</p>
            <p>• 允许误差范围 ±5px，保证用户体验</p>
            <p>• 验证失败后自动重置滑块位置</p>
            <p>• 验证成功后触发回调函数</p>
            <p>• 可接入腾讯云验证码服务替换本地验证逻辑</p>
          </div>
        </Card>
      </div>

      {/* 直接调用的弹窗 */}
      <CaptchaModal
        isOpen={showDirectModal}
        onClose={() => setShowDirectModal(false)}
        onSuccess={() => {
          setShowDirectModal(false)
          setDirectResult("验证成功！时间：" + new Date().toLocaleTimeString())
        }}
      />

      {/* Hook 方式的弹窗 */}
      <CaptchaComponent />
    </div>
  )
}
