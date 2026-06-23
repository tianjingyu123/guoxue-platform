"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function SignAgreementPage() {
  const router = useRouter()
  const [hasScrolled, setHasScrolled] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  
  const agreementInfo = { version: "v2024.01", signedAt: "2024-01-17 16:45:30", signedIP: "192.168.1.100" }
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight - 50) setHasScrolled(true)
  }
  
  const handleSign = async () => {
    if (!agreed) return
    setIsSigning(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSigning(false)
    setIsSigned(true)
    setTimeout(() => router.push("/merchant/application-status"), 2000)
  }
  
  if (isSigned) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b border-border"><div className="flex items-center h-14 px-4"><Link href="/merchant/application-status" className="mr-3"><ArrowLeft className="w-5 h-5" /></Link><h1 className="text-lg font-semibold">签署入驻协议</h1></div></header>
        <div className="p-4">
          <Card className="p-8 bg-green-50 dark:bg-green-950/30">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
              <h2 className="text-xl font-bold text-green-600 mb-2">协议签署成功</h2>
              <p className="text-sm text-muted-foreground mb-4">店铺即将开通...</p>
              <div className="w-full space-y-2 text-sm bg-background rounded-lg p-4">
                <div className="flex justify-between"><span className="text-muted-foreground">协议版本</span><span className="font-medium">{agreementInfo.version}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">签署时间</span><span className="font-medium">{agreementInfo.signedAt}</span></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center"><Link href="/merchant/application-status" className="mr-3"><ArrowLeft className="w-5 h-5" /></Link><h1 className="text-lg font-semibold">签署入驻协议</h1></div>
          <span className="text-xs text-muted-foreground">{agreementInfo.version}</span>
        </div>
      </header>
      
      <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        <Card className="p-4">
          <h2 className="text-lg font-bold text-center mb-4">热卜平台商家入驻协议</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
            <p className="text-muted-foreground">欢迎您入驻热卜平台。在您完成入驻流程前，请仔细阅读本协议的全部内容。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第一条 定义</h3>
            <p>1.1 商家是指在平台上开设店铺、销售商品或提供服务的企业或个人。</p>
            <p>1.2 平台是指热卜运营的电子商务平台，包括但不限于网站、移动应用程序等。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第二条 入驻条件</h3>
            <p>2.1 商家应具有合法的经营资质，包括但不限于营业执照、相关行业许可证等。</p>
            <p>2.2 商家应保证所提供的信息真实、准确、完整，如有变更应及时更新。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第三条 商家权利与义务</h3>
            <p>3.1 商家有权使用平台提供的各项服务，包括但不限于商品上架、订单管理、数据统计等。</p>
            <p>3.2 商家应遵守国家法律法规和平台规则，不得从事违法违规经营活动。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第四条 费用与结算</h3>
            <p>4.1 商家应按照平台规定的比例支付技术服务费。</p>
            <p>4.2 平台将在每笔订单完成后扣除相应佣金，剩余金额进入商家可提现账户。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第五条 保证金</h3>
            <p>5.1 保证金用于保障消费者权益和平台交易安全。</p>
            <p>5.2 商家退出经营且无违规记录的情况下，保证金将在30个工作日内全额退还。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第六条 违约责任</h3>
            <p>6.1 任何一方违反本协议约定，应承担相应的违约责任。</p>
            <h3 className="text-base font-semibold mt-4 mb-2">第七条 争议解决</h3>
            <p>7.1 本协议的签订、履行、解释及争议解决均适用中华人民共和国法律。</p>
            <p className="mt-6 text-center text-muted-foreground">— 协议内容结束 —</p>
          </div>
        </Card>
        {!hasScrolled && <p className="text-xs text-center text-muted-foreground mt-4 animate-pulse">请滚动阅读完整协议内容</p>}
      </div>
      
      <div className="sticky bottom-0 p-4 bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setAgreed(!agreed)} disabled={!hasScrolled} className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors", agreed ? "bg-primary border-primary" : "border-muted-foreground", !hasScrolled && "opacity-50 cursor-not-allowed")}>{agreed && <Check className="w-3 h-3 text-primary-foreground" />}</button>
          <p className="text-sm text-muted-foreground">我已阅读并同意《商家入驻协议》</p>
        </div>
        <Button onClick={handleSign} disabled={!agreed || isSigning} className="w-full h-12 text-base font-medium">{isSigning ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />签署中...</> : "确认签署协议"}</Button>
      </div>
    </div>
  )
}
