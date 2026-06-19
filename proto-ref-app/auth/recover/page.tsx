'use client'

import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MessageCircle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function AuthRecoverPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/login" className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-lg text-foreground">找回密码</h1>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">选择找回方式</h2>
          <p className="text-sm text-muted-foreground">请选择您注册时使用的验证方式</p>
        </div>

        <div className="space-y-3">
          <Card className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
            <Link href="/auth/recover/phone" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">手机号找回</p>
                <p className="text-sm text-muted-foreground">通过手机验证码重置密码</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </Card>

          <Card className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
            <Link href="/auth/recover/email" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-info" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">邮箱找回</p>
                <p className="text-sm text-muted-foreground">通过邮箱验证重置密码</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </Card>

          <Card className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
            <Link href="/feedback" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">联系客服</p>
                <p className="text-sm text-muted-foreground">人工协助找回账号</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </Card>
        </div>

        {/* 提示 */}
        <div className="mt-8 p-4 bg-secondary/50 rounded-xl">
          <p className="text-sm text-muted-foreground leading-relaxed">
            温馨提示：如果您绑定了多种验证方式，推荐使用手机号找回，速度更快更安全。
          </p>
        </div>
      </main>
    </div>
  )
}
