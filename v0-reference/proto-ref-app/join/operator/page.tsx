"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Building2, Check, Crown, Gift, Shield, TrendingUp, 
  Users, ChevronRight, Star, Sparkles, Clock, Zap, Award, Layers, Wallet, BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 权益对比
const planComparison = [
  { feature: "专属分站入口", station: true, operator: true },
  { feature: "入圈费用分佣", station: "10%-30%", operator: "15%-35%" },
  { feature: "分站名额", station: "1个（自用）", operator: "6个（自用1+售卖5）" },
  { feature: "团队管理", station: false, operator: true },
  { feature: "下级站长分佣", station: false, operator: "5%" },
  { feature: "专属培训", station: false, operator: true },
  { feature: "优先客服", station: false, operator: true },
  { feature: "线下活动", station: false, operator: true },
]

// 运营商权益
const operatorBenefits = [
  { icon: Award, title: "开通专属分站", desc: "分站名称显示在首页，提升标识性", highlight: true },
  { icon: TrendingUp, title: "分享赚佣金", desc: "分享商品/课程/会员等，购买成功获得佣金", highlight: true },
  { icon: Wallet, title: "自购也省钱", desc: "自己购买平台内容同样获得返佣", highlight: true },
  { icon: Layers, title: "5个销售名额", desc: "赠送5个销售金额全返的分站推荐名额", highlight: true },
  { icon: Users, title: "管理奖励", desc: "管理分站得相应比例的管理奖", highlight: true },
  { icon: Gift, title: "赠送视频课程", desc: "国学视频课程免费学习", highlight: false },
  { icon: BookOpen, title: "赠送精装书籍", desc: "精装国学书籍一套", highlight: false },
]

// 收益案例
const earningCases = [
  { name: "张***运营", days: 365, earnings: 86800, teamSize: 12, soldQuota: 8 },
  { name: "李***商", days: 180, earnings: 32500, teamSize: 6, soldQuota: 4 },
  { name: "王***营", days: 90, earnings: 18600, teamSize: 3, soldQuota: 2 },
]

// 常见问题
const faqs = [
  { q: "运营商和站长有什么区别？", a: "运营商是更高级别的合作伙伴，拥有6个分站名额，可以发展和管理站长团队，享受团队分佣收益。" },
  { q: "6个分站名额如何使用？", a: "1个自用建立分站，剩余5个可以999元/个的价格售卖给他人，售卖收入100%归您。" },
  { q: "下级站长的分佣怎么算？", a: "您招募的站长产生的入圈分佣，您额外获得5%的团队奖励。" },
  { q: "已经是站长可以升级吗？", a: "可以，补差价4000元即可升级为运营商，原站长权益继续有效。" },
]

export default function JoinOperatorPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [agreed, setAgreed] = useState(false)

  const price = 4999
  const originalPrice = 5999
  const quotaValue = 999 * 6 // 名额价值

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">成为运营商</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-operator via-operator to-operator text-white px-4 py-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <Badge className="bg-white/20 text-white border-0 mb-3">
            <Zap className="w-3 h-3 mr-1" />
            限时特惠
          </Badge>
          <h2 className="text-2xl font-bold mb-2">成为热卜运营商</h2>
          <p className="text-white/80 text-sm mb-4">获得6个分站名额，建立您的推广团队</p>
          
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold">¥{price}</span>
            <span className="text-lg text-white/60 line-through">¥{originalPrice}</span>
          </div>
          
          <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
            <Gift className="w-4 h-4" />
            赠送6个分站名额（价值¥{quotaValue}）
          </div>
        </div>
      </div>

      {/* 名额说明 */}
      <div className="px-4 mt-4">
        <Card className="p-4 bg-gradient-to-r from-operator/5 to-gold/5 border-operator/20">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-operator" />
            6个分站名额使用说明
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-xl text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-operator/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-operator" />
              </div>
              <p className="text-lg font-bold text-operator">1个</p>
              <p className="text-xs text-muted-foreground">自用建站</p>
            </div>
            <div className="p-3 bg-white rounded-xl text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gold/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-gold" />
              </div>
              <p className="text-lg font-bold text-gold">5个</p>
              <p className="text-xs text-muted-foreground">可售卖 ¥999/个</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            售卖5个名额即可回本 ¥4,995，后续收益都是纯利润
          </p>
        </Card>
      </div>

      {/* 权益列表 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold" />
            运营商专属权益
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {operatorBenefits.map((item, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-3 rounded-xl",
                item.highlight ? "bg-operator/5 border border-operator/20" : "bg-secondary/30"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  item.highlight ? "bg-operator/10" : "bg-muted"
                )}>
                  <item.icon className={cn("w-5 h-5", item.highlight ? "text-operator" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.highlight && (
                      <Badge className="bg-operator/10 text-operator text-[10px] px-1.5 py-0">核心</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 权益对比表 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-4">站长 vs 运营商</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-secondary/50 text-xs font-medium">
              <div className="p-2 border-r border-border">权益</div>
              <div className="p-2 border-r border-border text-center text-success">站长</div>
              <div className="p-2 text-center text-operator">运营商</div>
            </div>
            {planComparison.map((item, i) => (
              <div key={i} className="grid grid-cols-3 text-xs border-t border-border">
                <div className="p-2 border-r border-border">{item.feature}</div>
                <div className="p-2 border-r border-border text-center">
                  {typeof item.station === "boolean" ? (
                    item.station ? <Check className="w-4 h-4 text-success mx-auto" /> : <span className="text-muted-foreground">-</span>
                  ) : (
                    <span className="text-success">{item.station}</span>
                  )}
                </div>
                <div className="p-2 text-center">
                  {typeof item.operator === "boolean" ? (
                    item.operator ? <Check className="w-4 h-4 text-operator mx-auto" /> : <span className="text-muted-foreground">-</span>
                  ) : (
                    <span className="text-operator font-medium">{item.operator}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 收益案例 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            运营商收益案例
          </h3>
          <div className="space-y-3">
            {earningCases.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-operator/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-operator" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    入驻{item.days}天 · 团队{item.teamSize}人 · 已售{item.soldQuota}个名额
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">¥{item.earnings.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">累计收益</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 常见问题 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">常见问题</h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expandedFaq === i && "rotate-90"
                  )} />
                </button>
                {expandedFaq === i && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 底部购买栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 safe-area-bottom">
        <div className="flex items-center gap-2 mb-3">
          <button 
            onClick={() => setAgreed(!agreed)}
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center",
              agreed ? "bg-operator border-operator" : "border-muted-foreground"
            )}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className="text-xs text-muted-foreground">
            我已阅读并同意
            <Link href="/agreement/operator" className="text-operator">《运营商服务协议》</Link>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">¥{price}</span>
              <span className="text-sm text-muted-foreground line-through">¥{originalPrice}</span>
            </div>
            <p className="text-[10px] text-operator font-medium flex items-center gap-1">
              <Gift className="w-3 h-3" />
              含6个分站名额
            </p>
          </div>
          <Button 
            className="flex-1 h-12 bg-operator hover:bg-operator/90 text-white font-medium"
            disabled={!agreed}
          >
            立即开通
          </Button>
        </div>
      </div>
    </div>
  )
}
