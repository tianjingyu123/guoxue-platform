"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, PauseCircle, Ban, CreditCard, FileText, Store, RefreshCw, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ApplicationStatus = "PENDING_REVIEW" | "REVIEW_FAILED" | "DEPOSIT_PENDING" | "AGREEMENT_PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED"

const statusConfig = {
  PENDING_REVIEW: { icon: Clock, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/30", title: "申请已提交，正在审核中", desc: "预计1-3个工作日完成审核" },
  REVIEW_FAILED: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/5", title: "审核未通过", desc: "请根据驳回原因修改后重新提交" },
  DEPOSIT_PENDING: { icon: AlertCircle, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/30", title: "审核已通过，请缴纳保证金", desc: "缴纳保证金后即可签署协议" },
  AGREEMENT_PENDING: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/30", title: "保证金已到账，请签署协议", desc: "签署入驻协议后即可开通店铺" },
  ACTIVE: { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950/30", title: "恭喜！店铺已成功开通", desc: "您可以开始上架商品了" },
  SUSPENDED: { icon: PauseCircle, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/30", title: "店铺已暂停经营", desc: "请查看暂停原因并进行申诉" },
  CLOSED: { icon: Ban, color: "text-muted-foreground", bgColor: "bg-muted", title: "店铺已关闭", desc: "如需继续经营，请重新申请入驻" },
}

const progressSteps = [{ id: "submit", name: "已提交" }, { id: "review", name: "审核中" }, { id: "deposit", name: "待缴费" }, { id: "agreement", name: "待签署" }, { id: "active", name: "已开通" }]

export default function ApplicationStatusPage() {
  const router = useRouter()
  const [status, setStatus] = useState<ApplicationStatus>("PENDING_REVIEW")
  const [isLoading, setIsLoading] = useState(false)
  
  const applicationData = { shopName: "古韵轩书店", rejectReason: "营业执照图片不清晰，请重新上传", depositAmount: 2000, suspendReason: "存在违规商品", openDate: "2024-01-18" }
  const config = statusConfig[status]
  const StatusIcon = config.icon
  
  const getProgressIndex = () => {
    switch(status) {
      case "PENDING_REVIEW": return 1; case "REVIEW_FAILED": return 1; case "DEPOSIT_PENDING": return 2
      case "AGREEMENT_PENDING": return 3; case "ACTIVE": return 4; default: return 0
    }
  }
  
  const handleRefresh = async () => { setIsLoading(true); await new Promise(resolve => setTimeout(resolve, 1000)); setIsLoading(false) }
  
  const demoStatuses: ApplicationStatus[] = ["PENDING_REVIEW", "REVIEW_FAILED", "DEPOSIT_PENDING", "AGREEMENT_PENDING", "ACTIVE", "SUSPENDED", "CLOSED"]
  const [demoIndex, setDemoIndex] = useState(0)
  const handleDemoSwitch = () => { const nextIndex = (demoIndex + 1) % demoStatuses.length; setDemoIndex(nextIndex); setStatus(demoStatuses[nextIndex]) }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center"><Link href="/" className="mr-3"><ArrowLeft className="w-5 h-5" /></Link><h1 className="text-lg font-semibold">入驻申请状态</h1></div>
          <button onClick={handleRefresh} className={cn("p-2", isLoading && "animate-spin")}><RefreshCw className="w-5 h-5 text-muted-foreground" /></button>
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        <Card className={cn("p-6", config.bgColor)}>
          <div className="flex flex-col items-center text-center">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", config.bgColor)}><StatusIcon className={cn("w-10 h-10", config.color)} /></div>
            <h2 className="text-xl font-bold mb-2">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.desc}</p>
            <div className="mt-4 px-4 py-2 bg-background rounded-lg"><span className="text-sm text-muted-foreground">店铺名称：</span><span className="font-medium">{applicationData.shopName}</span></div>
          </div>
        </Card>
        
        {!["SUSPENDED", "CLOSED"].includes(status) && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">申请进度</h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
              <div className="absolute top-4 left-0 h-0.5 bg-primary transition-all" style={{ width: `${(getProgressIndex() / (progressSteps.length - 1)) * 100}%` }} />
              {progressSteps.map((step, index) => {
                const isCompleted = index <= getProgressIndex()
                const isCurrent = index === getProgressIndex()
                return (
                  <div key={step.id} className="flex flex-col items-center relative z-10">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium", isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {isCompleted && index < getProgressIndex() ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className={cn("text-xs mt-2", isCurrent ? "text-primary font-medium" : "text-muted-foreground")}>{step.name}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
        
        {status === "REVIEW_FAILED" && <Card className="p-4 bg-destructive/5"><h3 className="font-medium text-destructive mb-2">驳回原因</h3><p className="text-sm text-muted-foreground">{applicationData.rejectReason}</p></Card>}
        {status === "DEPOSIT_PENDING" && <Card className="p-4"><h3 className="font-medium mb-3">保证金信息</h3><div className="flex items-baseline gap-1 mb-2"><span className="text-3xl font-bold text-primary">¥{applicationData.depositAmount}</span><span className="text-sm text-muted-foreground">.00</span></div><p className="text-sm text-muted-foreground">保证金将在您退出经营时全额退还</p></Card>}
        {status === "SUSPENDED" && <Card className="p-4 bg-orange-50 dark:bg-orange-950/30"><h3 className="font-medium text-orange-600 mb-2">暂停原因</h3><p className="text-sm text-muted-foreground">{applicationData.suspendReason}</p></Card>}
        {status === "ACTIVE" && <Card className="p-4"><div className="flex items-center justify-between"><span className="text-muted-foreground">开店日期</span><span className="font-medium">{applicationData.openDate}</span></div></Card>}
        
        <div className="space-y-3 pt-2">
          {status === "PENDING_REVIEW" && <Button variant="outline" className="w-full" onClick={() => router.push("/merchant/edit-application")}>修改申请</Button>}
          {status === "REVIEW_FAILED" && <Button className="w-full" onClick={() => router.push("/merchant/edit-application")}>修改申请</Button>}
          {status === "DEPOSIT_PENDING" && <Button className="w-full" onClick={() => router.push("/merchant/pay-deposit")}><CreditCard className="w-4 h-4 mr-2" />立即缴纳保证金</Button>}
          {status === "AGREEMENT_PENDING" && <Button className="w-full" onClick={() => router.push("/merchant/sign-agreement")}><FileText className="w-4 h-4 mr-2" />查看协议并签署</Button>}
          {status === "ACTIVE" && <Button className="w-full" onClick={() => router.push("/merchant/dashboard")}><Store className="w-4 h-4 mr-2" />进入商家后台</Button>}
          {status === "SUSPENDED" && <><Button className="w-full" variant="outline">我要申诉</Button><Button className="w-full" variant="ghost"><Headphones className="w-4 h-4 mr-2" />联系客服</Button></>}
          {status === "CLOSED" && <Button className="w-full" onClick={() => router.push("/merchant/apply")}>重新申请入驻</Button>}
        </div>
        
        <div className="pt-4 border-t border-dashed border-border">
          <p className="text-xs text-muted-foreground text-center mb-2">演示模式</p>
          <Button variant="outline" size="sm" className="w-full" onClick={handleDemoSwitch}>切换状态（{status}）</Button>
        </div>
      </div>
    </div>
  )
}
