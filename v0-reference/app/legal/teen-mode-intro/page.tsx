"use client"

import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Shield, 
  Clock, 
  Filter, 
  Moon, 
  Lock,
  Eye,
  Bell,
  Sparkles,
  ChevronRight,
  CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 功能特性
const features = [
  {
    icon: Clock,
    title: '时长管理',
    description: '每日使用时长限制，帮助青少年合理规划学习和娱乐时间。',
    details: ['每日使用时长上限设置', '休息提醒功能', '使用时段限制'],
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Filter,
    title: '内容过滤',
    description: '智能过滤不适合青少年的内容，营造健康的学习环境。',
    details: ['自动屏蔽敏感内容', '仅展示适龄内容', '严格内容审核'],
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: Moon,
    title: '夜间模式',
    description: '设置夜间禁用时段，保障青少年充足睡眠。',
    details: ['自定义禁用时段', '默认22:00-6:00禁用', '护眼模式自动开启'],
    color: 'text-purple-600 bg-purple-50',
  },
  {
    icon: Lock,
    title: '密码保护',
    description: '独立密码保护，防止青少年自行关闭保护模式。',
    details: ['独立4位数字密码', '密码修改需验证', '忘记密码可通过监护人找回'],
    color: 'text-orange-600 bg-orange-50',
  },
]

// 额外保护措施
const protections = [
  { icon: Eye, text: '浏览记录可供家长查看' },
  { icon: Bell, text: '异常行为通知监护人' },
  { icon: Shield, text: '禁止充值和打赏功能' },
  { icon: Sparkles, text: '推荐优质国学学习内容' },
]

export default function TeenModeIntroPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">青少年模式</h1>
          </div>
        </div>
      </header>

      <div className="pb-32">
        {/* 头部Banner */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-4 py-8 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">守护青少年健康成长</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            青少年模式为未成年用户提供全方位的使用保护，帮助建立健康的数字使用习惯
          </p>
        </div>

        {/* 功能特性 */}
        <div className="p-4 space-y-4">
          <h3 className="text-base font-semibold text-foreground">核心功能</h3>
          
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  feature.color
                )}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                  <div className="space-y-1.5">
                    {feature.details.map((detail, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-foreground/80">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 额外保护措施 */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-foreground mb-3">额外保护措施</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {protections.map((item, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 使用须知 */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-foreground mb-3">使用须知</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm text-amber-800">
              <span className="font-medium">1. </span>
              青少年模式开启后，部分功能将受到限制，如直播打赏、充值消费等。
            </p>
            <p className="text-sm text-amber-800">
              <span className="font-medium">2. </span>
              建议由家长或监护人设置密码，并妥善保管。
            </p>
            <p className="text-sm text-amber-800">
              <span className="font-medium">3. </span>
              如需关闭青少年模式，需输入设置时的密码。
            </p>
            <p className="text-sm text-amber-800">
              <span className="font-medium">4. </span>
              忘记密码可通过"设置 - 青少年模式 - 忘记密码"找回。
            </p>
          </div>
        </div>

        {/* 常见问题 */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-foreground mb-3">常见问题</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <button 
              onClick={() => router.push('/help/faq?topic=teen-mode')}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">如何设置青少年模式密码？</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button 
              onClick={() => router.push('/help/faq?topic=teen-mode')}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">忘记密码怎么办？</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button 
              onClick={() => router.push('/help/faq?topic=teen-mode')}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">青少年模式会限制哪些功能？</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button 
              onClick={() => router.push('/help/faq?topic=teen-mode')}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">如何查看孩子的使用记录？</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* 联系我们 */}
        <div className="p-4">
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              如有任何问题，欢迎联系我们
            </p>
            <p className="text-sm text-foreground">
              客服邮箱：<a href="mailto:support@rebu.com" className="text-primary">support@rebu.com</a>
            </p>
          </div>
        </div>
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
        <Button 
          onClick={() => router.push('/mine/teen-mode')}
          className="w-full h-12 text-base font-medium"
        >
          <Shield className="w-5 h-5 mr-2" />
          立即开启青少年模式
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          开启后可随时在"设置"中进行调整
        </p>
      </div>
    </div>
  )
}
