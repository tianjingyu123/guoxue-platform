"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, CreditCard, Smartphone, Building2, Shield, Copy, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const paymentMethods = [
  { id: "wechat", name: "微信支付", icon: Smartphone, color: "text-green-500" },
  { id: "alipay", name: "支付宝", icon: Smartphone, color: "text-blue-500" },
  { id: "bank", name: "银行卡转账", icon: Building2, color: "text-orange-500" },
]

export default function PayDepositPage() {
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState("wechat")
  const [isPaying, setIsPaying] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const depositInfo = { baseDeposit: 1000, categoryDeposit: 1000, totalDeposit: 2000, paidAt: "2024-01-17 15:30:25", transactionId: "PAY202401171530250001" }
  const bankInfo = { bankName: "中国工商银行", accountName: "热卜（北京）科技有限公司", accountNo: "6222 0202 0001 1234 5678", remark: "商家入驻保证金" }
  
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  
  const handlePay = async () => {
    setIsPaying(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsPaying(false)
    setIsPaid(true)
    setTimeout(() => router.push("/merchant/application-status"), 3000)
  }

  if (isPaid) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b border-border"><div className="flex items-center h-14 px-4"><Link href="/merchant/application-status" className="mr-3"><ArrowLeft className="w-5 h-5" /></Link><h1 className="text-lg font-semibold">缴纳保证金</h1></div></header>
        <div className="p-4">
          <Card className="p-8 bg-green-50 dark:bg-green-950/30">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
              <h2 className="text-xl font-bold text-green-600 mb-2">支付成功</h2>
              <p className="text-sm text-muted-foreground mb-4">保证金已缴纳，即将跳转...</p>
              <div className="w-full space-y-2 text-sm bg-background rounded-lg p-4">
                <div className="flex justify-between"><span className="text-muted-foreground">缴纳金额</span><span className="font-medium text-primary">¥{depositInfo.totalDeposit}.00</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">缴纳时间</span><span className="font-medium">{depositInfo.paidAt}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">交易流水号</span><span className="font-mono text-xs">{depositInfo.transactionId}</span></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 bg-background border-b border-border"><div className="flex items-center h-14 px-4"><Link href="/merchant/application-status" className="mr-3"><ArrowLeft className="w-5 h-5" /></Link><h1 className="text-lg font-semibold">缴纳保证金</h1></div></header>
      
      <div className="p-4 space-y-4">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">应缴保证金</p>
            <div className="flex items-baseline justify-center gap-1"><span className="text-sm text-primary">¥</span><span className="text-4xl font-bold text-primary">{depositInfo.totalDeposit}</span><span className="text-sm text-primary">.00</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">基础保证金</span><span>¥{depositInfo.baseDeposit}.00</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">类目保证金</span><span>¥{depositInfo.categoryDeposit}.00</span></div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-start gap-3"><Shield className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /><div><h3 className="font-medium mb-1">保证金说明</h3><p className="text-sm text-muted-foreground">保证金用于保障消费者权益和平台交易安全。在您退出经营且无违规记录的情况下，保证金将全额退还。</p></div></div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-medium mb-4">选择支付方式</h3>
          <div className="space-y-3">
            {paymentMethods.map(method => {
              const Icon = method.icon
              const isSelected = selectedMethod === method.id
              return (
                <button key={method.id} onClick={() => setSelectedMethod(method.id)} className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", isSelected ? "border-primary bg-primary/5" : "border-border")}>
                  <div className="flex items-center gap-3"><Icon className={cn("w-6 h-6", method.color)} /><span className="font-medium">{method.name}</span></div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground")}>{isSelected && <Check className="w-3 h-3 text-primary-foreground" />}</div>
                </button>
              )
            })}
          </div>
        </Card>
        
        {selectedMethod === "bank" && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">收款账户信息</h3>
            <div className="space-y-4">
              <div><p className="text-xs text-muted-foreground mb-1">开户银行</p><p className="font-medium">{bankInfo.bankName}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">账户名称</p><p className="font-medium">{bankInfo.accountName}</p></div>
              <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground mb-1">银行账号</p><p className="font-mono font-medium">{bankInfo.accountNo}</p></div><Button variant="outline" size="sm" onClick={() => handleCopy(bankInfo.accountNo)}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button></div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg"><p className="text-sm text-amber-600">转账时请备注：{bankInfo.remark}</p></div>
            </div>
          </Card>
        )}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <Button onClick={handlePay} disabled={isPaying} className="w-full h-12 text-base font-medium">{isPaying ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />支付中...</> : <><CreditCard className="w-5 h-5 mr-2" />确认支付 ¥{depositInfo.totalDeposit}.00</>}</Button>
      </div>
    </div>
  )
}
