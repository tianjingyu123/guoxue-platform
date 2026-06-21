"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Award, Check, Crown, Gift, Shield, TrendingUp, 
  Users, Wallet, ChevronRight, Star, Sparkles, Clock, Zap, BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// 权益列表
const benefits = [
  { icon: Award, title: "专属分站入口", desc: "分站名称显示在首页，提升标识性", highlight: true },
  { icon: TrendingUp, title: "分享赚佣金", desc: "分享商品/课程/会员等，购买成功获得佣金", highlight: true },
  { icon: Wallet, title: "自购也省钱", desc: "自己购买平台内容同样获得返佣", highlight: true },
  { icon: Gift, title: "赠送视频课程", desc: "国学视频课程免费学习", highlight: false },
  { icon: BookOpen, title: "赠送精装书籍", desc: "精装国学书籍一套", highlight: false },
  { icon: Star, title: "专属海报", desc: "生成推广海报和二维码", highlight: false },
]

// 收益案例
const earningCases = [
  { name: "易***师", avatar: "", days: 180, earnings: 12680, users: 256 },
  { name: "国***阁", avatar: "", days: 90, earnings: 5680, users: 128 },
  { name: "命***堂", avatar: "", days: 365, earnings: 28900, users: 512 },
]

// 常见问题
const faqs = [
  { q: "站长权益有效期多久？", a: "站长权益有效期为1年，到期后可续费继续享有权益。" },
  { q: "分佣比例是多少？", a: "入圈费用分佣比例为10%-30%，具体根据圈子类型和平台政策而定。" },
  { q: "可以升级为运营商吗？", a: "可以，补差价即可升级为运营商，享受更多权益和名额。" },
  { q: "通过运营商链接购买有区别吗？", a: "价格相同，区别是您将归属该运营商团队，享受团队支持。" },
]

export default function JoinStationPage() {
  const [inviteCode, setInviteCode] = useState("")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [agreed, setAgreed] = useState(false)

  const price = 999
  const originalPrice = 1299

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">成为分站站长</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-success via-success to-success text-white px-4 py-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Award className="w-10 h-10 text-white" />
          </div>
          <Badge className="bg-white/20 text-white border-0 mb-3">
            <Zap className="w-3 h-3 mr-1" />
            限时优惠
          </Badge>
          <h2 className="text-2xl font-bold mb-2">成为热卜分站站长</h2>
          <p className="text-white/80 text-sm mb-4">建立专属入口，享受平台分佣收益</p>
          
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold">¥{price}</span>
            <span className="text-lg text-white/60 line-through">¥{originalPrice}</span>
            <span className="text-sm text-white/80">/年</span>
          </div>
        </div>
      </div>

      {/* 权益列表 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold" />
            站长专属权益
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((item, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-3 rounded-xl",
                item.highlight ? "bg-success/5 border border-success/20" : "bg-secondary/30"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  item.highlight ? "bg-success/10" : "bg-muted"
                )}>
                  <item.icon className={cn("w-5 h-5", item.highlight ? "text-success" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.highlight && (
                      <Badge className="bg-success/10 text-success text-[10px] px-1.5 py-0">核心</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 分佣说明 */}
      <div className="px-4 mt-4">
        <Card className="p-4 bg-gradient-to-r from-success/5 to-gold/5 border-success/20">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            分佣收益说明
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
              <span className="text-muted-foreground">入圈费用分佣</span>
              <span className="font-bold text-success">10%-30%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
              <span className="text-muted-foreground">用户永久归属</span>
              <span className="font-bold text-success">终身绑定</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
              <span className="text-muted-foreground">结算周期</span>
              <span className="font-bold text-foreground">每月15日</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            * 用户通过您的分站链接注册后永久归属您，其入圈消费您都将获得分佣
          </p>
        </Card>
      </div>

      {/* 收益案例 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            站长收益案例
          </h3>
          <div className="space-y-3">
            {earningCases.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">入驻{item.days}天 · {item.users}位用户</p>
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

      {/* 邀请码 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">运营商邀请码（选填）</h3>
          <Input 
            placeholder="如有运营商邀请码请填写"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="bg-secondary/30"
          />
          <p className="text-[10px] text-muted-foreground mt-2">
            填写邀请码可加入运营商团队，享受团队支持和培训
          </p>
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
              agreed ? "bg-success border-success" : "border-muted-foreground"
            )}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className="text-xs text-muted-foreground">
            我已阅读并同意
            <Link href="/agreement/station" className="text-success">《分站服务协议》</Link>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">¥{price}</span>
              <span className="text-sm text-muted-foreground line-through">¥{originalPrice}</span>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              有效期1年
            </p>
          </div>
          <Button 
            className="flex-1 h-12 bg-success hover:bg-success/90 text-white font-medium"
            disabled={!agreed}
          >
            立即开通
          </Button>
        </div>
      </div>
    </div>
  )
}
