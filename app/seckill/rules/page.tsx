'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'

const rules = [
  { icon: '🎯', title: '参与资格', content: '所有注册用户均可参与秒杀活动。每个账号每次活动限购1件。不同的秒杀商品单独计算购买资格。' },
  { icon: '⏱️', title: '活动时间', content: '秒杀活动在指定时间段内进行，通常为每天10:00、14:00、20:00三个时段各1小时。具体时间以活动页面公示为准。' },
  { icon: '💳', title: '支付规则', content: '抢购成功后需在15分钟内完成支付，超时订单自动取消，商品重新投入秒杀池。支持微信支付、支付宝、余额等支付方式。' },
  { icon: '🚫', title: '禁止行为', content: '禁止使用脚本、外挂等技术手段抢购；禁止恶意下单不付款；禁止通过异常途径获取优惠。一经发现，取消参与资格并封禁账号。' },
  { icon: '↩️', title: '退款政策', content: '虚拟类商品（课程、VIP会员）付款成功后原则上不支持退款。如遇商品描述与实际严重不符，可在24小时内申请客服处理。' },
  { icon: '📦', title: '实物商品', content: '实物类秒杀商品将在3-5个工作日内发货，支持7天无理由退换货（限商品未拆封使用状态）。' },
]

const faqs = [
  { q: '秒杀价格是否包含运费？', a: '秒杀价格为商品本身价格，不包含运费。运费在支付页面单独显示。' },
  { q: '手慢没抢到可以等下次吗？', a: '秒杀商品库存有限，未抢到可关注该商品，下次活动时会收到推送通知。' },
  { q: '已购买的秒杀课程如何观看？', a: '购买成功后可在「我的课程」中找到对应课程，立即开始学习。' },
]

export default function SeckillRulesPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />秒杀活动规则
        </h1>
      </header>

      <div className="px-4 py-6 pb-20">
        {/* Hero */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <span className="font-bold text-base">限时秒杀</span>
          </div>
          <p className="text-sm opacity-90">全场低至1折，每天三场，错过等一年！参与前请仔细阅读以下规则。</p>
        </div>

        {/* Rules */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">活动规则</h2>
          </div>
          <div className="space-y-3">
            {rules.map(r => (
              <div key={r.title} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                <span className="text-2xl flex-shrink-0">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">常见问题</h2>
          </div>
          <div className="space-y-3">
            {faqs.map(f => (
              <div key={f.q} className="p-3 bg-card border border-border rounded-xl">
                <p className="text-sm font-medium text-foreground mb-1.5">Q：{f.q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">A：{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-1.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">平台保留活动最终解释权。如有疑问请联系客服。</p>
        </div>
      </div>
    </div>
  )
}
