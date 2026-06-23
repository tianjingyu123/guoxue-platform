"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  ArrowRight,
  Store, 
  TrendingUp, 
  Users, 
  Shield, 
  Headphones,
  Gift,
  CheckCircle2,
  ChevronRight,
  Star,
  Zap,
  BarChart3,
  Truck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 入驻优势
const advantages = [
  {
    icon: Users,
    title: "海量用户",
    desc: "千万级国学爱好者用户群体",
    highlight: "1000万+",
  },
  {
    icon: TrendingUp,
    title: "流量扶持",
    desc: "新店流量扶持，快速起步",
    highlight: "30天",
  },
  {
    icon: Shield,
    title: "平台保障",
    desc: "交易担保，资金安全",
    highlight: "100%",
  },
  {
    icon: Headphones,
    title: "专属客服",
    desc: "一对一运营指导服务",
    highlight: "7x24h",
  },
]

// 入驻流程
const steps = [
  { step: 1, title: "提交申请", desc: "填写店铺信息和资质" },
  { step: 2, title: "资质审核", desc: "1-3个工作日完成审核" },
  { step: 3, title: "签订协议", desc: "在线签署入驻协议" },
  { step: 4, title: "开店成功", desc: "发布商品开始经营" },
]

// 商家类型
const merchantTypes = [
  {
    id: "individual",
    title: "个人店铺",
    desc: "适合个人卖家、手艺人",
    features: ["无需营业执照", "快速入驻", "佣金8%"],
    badge: "推荐",
    badgeColor: "bg-primary text-primary-foreground",
  },
  {
    id: "enterprise",
    title: "企业店铺",
    desc: "适合公司、品牌商家",
    features: ["需营业执照", "品牌认证", "佣金5%"],
    badge: "专业",
    badgeColor: "bg-blue-500 text-white",
  },
  {
    id: "flagship",
    title: "旗舰店铺",
    desc: "适合知名品牌、连锁机构",
    features: ["品牌授权", "专属扶持", "佣金3%"],
    badge: "尊享",
    badgeColor: "bg-amber-500 text-white",
  },
]

// 成功案例
const successCases = [
  {
    id: "1",
    name: "古韵斋",
    avatar: "古",
    category: "文房用品",
    monthSales: "12.8万",
    rating: 4.9,
    desc: "入驻3个月，月销突破10万",
  },
  {
    id: "2",
    name: "国学书苑",
    avatar: "国",
    category: "国学书籍",
    monthSales: "8.5万",
    rating: 4.8,
    desc: "专注古籍善本，复购率超60%",
  },
  {
    id: "3",
    name: "易道坊",
    avatar: "易",
    category: "命理工具",
    monthSales: "6.2万",
    rating: 4.9,
    desc: "罗盘销量全网TOP3",
  },
]

// 常见问题
const faqs = [
  {
    q: "入驻需要什么条件？",
    a: "个人店铺需年满18周岁，企业店铺需提供营业执照。所有商家需保证商品质量和售后服务。",
  },
  {
    q: "入驻收费吗？",
    a: "入驻免费，平台按成交订单收取佣金。个人店铺8%，企业店铺5%，旗舰店3%。",
  },
  {
    q: "审核需要多久？",
    a: "一般1-3个工作日完成审核，资料齐全可当日通过。",
  },
  {
    q: "可以卖什么商品？",
    a: "国学相关的书籍、文创、法器、服饰、课程等均可销售，需符合平台规范。",
  },
]

export default function MerchantJoinPage() {
  const [selectedType, setSelectedType] = useState("individual")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">商家入驻</h1>
          <Link href="/merchant/apply" className="text-sm text-primary font-medium">
            立即入驻
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground px-4 py-8 overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <Badge className="bg-white/20 text-white border-0 mb-3">
            <Zap className="w-3 h-3 mr-1" />
            限时福利
          </Badge>
          <h2 className="text-2xl font-bold mb-2">入驻热卜平台</h2>
          <p className="text-white/80 text-sm mb-4">
            千万国学爱好者等你来，开启你的国学生意
          </p>
          <div className="flex gap-3">
            <Link href="/merchant/apply">
              <Button className="bg-white text-primary hover:bg-white/90">
                立即入驻
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              咨询客服
            </Button>
          </div>
        </div>
      </section>

      {/* 入驻优势 */}
      <section className="px-4 py-6">
        <h3 className="font-bold text-lg mb-4">为什么选择我们</h3>
        <div className="grid grid-cols-2 gap-3">
          {advantages.map((item, i) => (
            <Card key={i} className="p-4 border-border/60">
              <item.icon className="w-8 h-8 text-primary mb-2" />
              <p className="text-xl font-bold text-primary">{item.highlight}</p>
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 入驻流程 */}
      <section className="px-4 py-6 bg-secondary/30">
        <h3 className="font-bold text-lg mb-4">入驻流程</h3>
        <div className="flex items-center justify-between">
          {steps.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                {item.step}
              </div>
              <p className="text-xs font-medium">{item.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
              {i < steps.length - 1 && (
                <ChevronRight className="absolute w-4 h-4 text-muted-foreground" style={{ marginLeft: '100%', marginTop: '-2rem' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 商家类型 */}
      <section className="px-4 py-6">
        <h3 className="font-bold text-lg mb-4">选择店铺类型</h3>
        <div className="space-y-3">
          {merchantTypes.map((type) => (
            <Card 
              key={type.id}
              className={cn(
                "p-4 cursor-pointer transition-all border-2",
                selectedType === type.id 
                  ? "border-primary bg-primary/5" 
                  : "border-transparent hover:border-border"
              )}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{type.title}</h4>
                    <Badge className={cn("text-[10px]", type.badgeColor)}>
                      {type.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{type.desc}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  selectedType === type.id 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground/30"
                )}>
                  {selectedType === type.id && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {type.features.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-secondary rounded">
                    {f}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 成功案例 */}
      <section className="px-4 py-6 bg-secondary/30">
        <h3 className="font-bold text-lg mb-4">成功商家案例</h3>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {successCases.map((item) => (
            <Card key={item.id} className="flex-shrink-0 w-56 p-4 border-border/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {item.avatar}
                </div>
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">月销售额</p>
                  <p className="font-bold text-primary">{item.monthSales}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{item.rating}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 平台数据 */}
      <section className="px-4 py-6">
        <h3 className="font-bold text-lg mb-4">平台实力</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-4 bg-secondary/50 rounded-xl">
            <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold">1000万+</p>
            <p className="text-xs text-muted-foreground">注册用户</p>
          </div>
          <div className="text-center p-4 bg-secondary/50 rounded-xl">
            <Store className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold">5000+</p>
            <p className="text-xs text-muted-foreground">入驻商家</p>
          </div>
          <div className="text-center p-4 bg-secondary/50 rounded-xl">
            <Truck className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold">100万+</p>
            <p className="text-xs text-muted-foreground">月订单量</p>
          </div>
        </div>
      </section>

      {/* 常见问题 */}
      <section className="px-4 py-6 bg-secondary/30">
        <h3 className="font-bold text-lg mb-4">常见问题</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <Card 
              key={i} 
              className="border-border/60 overflow-hidden"
            >
              <button
                className="w-full p-4 text-left flex items-center justify-between"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  expandedFaq === i && "rotate-90"
                )} />
              </button>
              {expandedFaq === i && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* 底部CTA */}
      <section className="px-4 py-8">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 text-center">
          <Gift className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2">新商家专属福利</h3>
          <p className="text-sm text-muted-foreground mb-4">
            现在入驻享30天流量扶持+首月佣金减半
          </p>
          <Link href="/merchant/apply">
            <Button className="w-full" size="lg">
              立即入驻，领取福利
            </Button>
          </Link>
        </Card>
      </section>

      {/* 底部占位 */}
      <div className="h-20" />

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 p-4 safe-area-bottom">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            <Headphones className="w-4 h-4 mr-2" />
            咨询客服
          </Button>
          <Link href="/merchant/apply" className="flex-1">
            <Button className="w-full">
              立即入驻
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
