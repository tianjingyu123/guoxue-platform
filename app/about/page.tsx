'use client'

import Link from 'next/link'
import { ArrowLeft, Building2, Users, BookOpen, Award, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-lg text-foreground">关于我们</h1>
        </div>
      </header>

      {/* 内容 */}
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 to-gold/10 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-12 h-12">
              <circle cx="12" cy="12" r="11" fill="white" />
              <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#C41E3A" />
              <circle cx="12" cy="6.5" r="2" fill="white" />
              <circle cx="12" cy="17.5" r="2" fill="#C41E3A" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">热卜国学</h2>
          <p className="text-muted-foreground">传承智慧 · 启迪人生</p>
        </div>

        {/* 介绍 */}
        <div className="p-6">
          <p className="text-muted-foreground leading-relaxed mb-6">
            热卜国学是一个专注于中华传统文化传承与学习的综合性平台。我们汇聚了易经、风水、命理、中医养生等领域的专家学者，
            致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
          </p>

          {/* 数据展示 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">100+</p>
              <p className="text-xs text-muted-foreground mt-1">专家讲师</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-gold">500+</p>
              <p className="text-xs text-muted-foreground mt-1">精品课程</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-success">50万+</p>
              <p className="text-xs text-muted-foreground mt-1">学习用户</p>
            </Card>
          </div>

          {/* 特色 */}
          <h3 className="font-bold text-foreground mb-4">我们的特色</h3>
          <div className="space-y-3 mb-8">
            {[
              { icon: BookOpen, title: '专业内容', desc: '严选优质国学课程与古籍资源' },
              { icon: Users, title: '圈子交流', desc: '加入志同道合的学习社区' },
              { icon: Award, title: '名师指导', desc: '一对一咨询，答疑解惑' },
              { icon: Building2, title: '线下活动', desc: '定期举办国学文化体验活动' },
            ].map(item => (
              <Card key={item.title} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* 联系方式 */}
          <h3 className="font-bold text-foreground mb-4">联系我们</h3>
          <Card className="divide-y divide-border">
            <Link href="/feedback" className="p-4 flex items-center justify-between">
              <span className="text-foreground">意见反馈</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="p-4 flex items-center justify-between">
              <span className="text-foreground">客服邮箱</span>
              <span className="text-muted-foreground">support@rebu.com</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-foreground">官方微信</span>
              <span className="text-muted-foreground">rebu_guoxue</span>
            </div>
          </Card>

          {/* 版本信息 */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>版本 1.0.0</p>
            <p className="mt-1">Copyright © 2024 热卜国学</p>
          </div>
        </div>
      </main>
    </div>
  )
}
