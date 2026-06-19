"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, GraduationCap, CheckCircle, AlertCircle,
  Crown, Users, Calendar, Shield, Video, MapPin, Mic,
  FileText, CreditCard, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ============================================
// 加入门槛
// ============================================
const requirements = [
  { id: "circle_owner", icon: Crown, label: "必须是圈主", desc: "拥有自己的圈子", met: true },
  { id: "members", icon: Users, label: "圈成员≥100人", desc: "圈子有一定规模", met: true },
  { id: "days", icon: Calendar, label: "圈子运营≥90天", desc: "持续运营能力", met: true },
  { id: "verified", icon: Shield, label: "完成实名认证", desc: "身份认证", met: true },
]

// ============================================
// 任务要求
// ============================================
const taskRequirements = [
  { icon: Video, label: "每月至少2场线上直播", period: "月度任务" },
  { icon: MapPin, label: "每季度至少1次线下小范围交流分享", period: "季度任务" },
  { icon: Mic, label: "每年至少1次大范围交流分享", period: "年度任务" },
]

// ============================================
// 用户的圈子信息 (Mock)
// ============================================
const userCircles = [
  { id: "1", name: "八字命理研习社", members: 1280, days: 365, cover: "/placeholder.svg" },
  { id: "2", name: "紫微斗数学习班", members: 560, days: 120, cover: "/placeholder.svg" },
]

// ============================================
// 主组件
// ============================================
export default function InstituteMemberApplyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: 资格检查, 2: 填写资料, 3: 支付保证金, 4: 完成
  const [selectedCircle, setSelectedCircle] = useState<string>("")
  const [formData, setFormData] = useState({
    realName: "",
    expertise: "",
    introduction: "",
    reason: "",
  })
  const [agreements, setAgreements] = useState({
    tasks: false,
    refund: false,
    rules: false,
  })
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [paying, setPaying] = useState(false)

  // 检查资格
  const allRequirementsMet = requirements.every(r => r.met)
  const allAgreementsChecked = Object.values(agreements).every(v => v)

  // 提交申请
  const handleSubmit = () => {
    if (!selectedCircle || !formData.realName || !formData.expertise || !formData.introduction) {
      return
    }
    setStep(3)
  }

  // 支付保证金
  const handlePay = async () => {
    setPaying(true)
    // Mock 支付
    await new Promise(resolve => setTimeout(resolve, 2000))
    setPaying(false)
    setShowPayDialog(false)
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base">申请加入研究院</h1>
          <div className="w-6" />
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-between px-8 py-3">
          {["资格检查", "填写资料", "支付保证金", "申请完成"].map((label, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                step > i + 1 ? "bg-green-500 text-white" :
                step === i + 1 ? "bg-operator text-white" :
                "bg-muted text-muted-foreground"
              )}>
                {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-[10px] mt-1",
                step === i + 1 ? "text-operator font-medium" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Step 1: 资格检查 */}
        {step === 1 && (
          <>
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-operator" />
                加入门槛检查
              </h3>
              <div className="space-y-3">
                {requirements.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-operator/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-operator" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      {item.met ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-operator" />
                任务要求承诺
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                加入研究院后，需完成以下任务方可退还保证金：
              </p>
              <div className="space-y-2 mb-4">
                {taskRequirements.map((task, i) => {
                  const Icon = task.icon
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{task.label}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{task.period}</Badge>
                    </div>
                  )
                })}
              </div>

              {/* 协议确认 */}
              <div className="space-y-3 border-t border-border pt-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox 
                    checked={agreements.tasks}
                    onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, tasks: !!checked }))}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    我承诺按时完成研究院规定的任务要求，积极参与分享交流
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox 
                    checked={agreements.refund}
                    onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, refund: !!checked }))}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    我理解：完成任务可全额退还保证金；仅学习不分享则保证金不予退还
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox 
                    checked={agreements.rules}
                    onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, rules: !!checked }))}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    我已阅读并同意《研究院管理规则》和《保证金退还规则》
                  </span>
                </label>
              </div>
            </Card>

            <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                研究院鼓励成员相互交流分享，本身不收取费用。保证金是为了确保成员积极参与，
                完成任务要求后可全额退还。
              </p>
            </div>

            <Button 
              className="w-full bg-operator hover:bg-operator/90"
              disabled={!allRequirementsMet || !allAgreementsChecked}
              onClick={() => setStep(2)}
            >
              下一步：填写申请资料
            </Button>
          </>
        )}

        {/* Step 2: 填写资料 */}
        {step === 2 && (
          <>
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-operator" />
                选择关联圈子
              </h3>
              <div className="space-y-2">
                {userCircles.map((circle) => (
                  <button
                    key={circle.id}
                    onClick={() => setSelectedCircle(circle.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      selectedCircle === circle.id 
                        ? "border-operator bg-operator/5" 
                        : "border-border hover:border-operator/30"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden">
                      <img src={circle.cover} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{circle.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {circle.members}名成员 · 运营{circle.days}天
                      </p>
                    </div>
                    {selectedCircle === circle.id && (
                      <CheckCircle className="w-5 h-5 text-operator" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-operator" />
                个人信息
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">真实姓名 *</Label>
                  <Input 
                    placeholder="请输入真实姓名"
                    value={formData.realName}
                    onChange={(e) => setFormData(prev => ({ ...prev, realName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">专业领域 *</Label>
                  <Input 
                    placeholder="如：八字命理、紫微斗数、风水堪舆"
                    value={formData.expertise}
                    onChange={(e) => setFormData(prev => ({ ...prev, expertise: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">个人简介 *</Label>
                  <Textarea 
                    placeholder="请简要介绍您的从业经历和专业背景（100-500字）"
                    value={formData.introduction}
                    onChange={(e) => setFormData(prev => ({ ...prev, introduction: e.target.value }))}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                <div>
                  <Label className="text-xs">申请理由</Label>
                  <Textarea 
                    placeholder="您希望加入研究院的原因和期望（选填）"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                上一步
              </Button>
              <Button 
                className="flex-1 bg-operator hover:bg-operator/90"
                disabled={!selectedCircle || !formData.realName || !formData.expertise || !formData.introduction}
                onClick={handleSubmit}
              >
                下一步：支付保证金
              </Button>
            </div>
          </>
        )}

        {/* Step 3: 支付保证金 */}
        {step === 3 && (
          <>
            <Card className="p-4 bg-gradient-to-r from-operator/10 to-operator/5">
              <div className="text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-operator" />
                <h3 className="font-bold text-lg mb-1">研究院保证金</h3>
                <p className="text-3xl font-bold text-operator my-4">¥10,000</p>
                <p className="text-xs text-muted-foreground">
                  完成任务要求后可全额退还
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">保证金说明</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 保证金为您加入研究院的诚意金，用于确保成员积极参与交流分享。</p>
                <p>2. 成功完成全部任务要求后，保证金将在年度周期结束后全额退还。</p>
                <p>3. 如仅参与学习而不进行分享，保证金将不予退还。</p>
                <p>4. 保证金有效期为1年，到期后需续费或完成任务申请退还。</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">申请信息确认</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">申请人</span>
                  <span>{formData.realName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">专业领域</span>
                  <span>{formData.expertise}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联圈子</span>
                  <span>{userCircles.find(c => c.id === selectedCircle)?.name}</span>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => setStep(2)}
              >
                上一步
              </Button>
              <Button 
                className="flex-1 bg-operator hover:bg-operator/90"
                onClick={() => setShowPayDialog(true)}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                支付保证金
              </Button>
            </div>
          </>
        )}

        {/* Step 4: 完成 */}
        {step === 4 && (
          <div className="text-center py-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">申请提交成功</h2>
            <p className="text-muted-foreground mb-6">
              您的申请已提交，研究院管理层将在3个工作日内审核
            </p>
            
            <Card className="p-4 text-left mb-4">
              <h3 className="font-medium mb-2">接下来...</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 审核通过后，您将收到系统通知</p>
                <p>2. 正式成为研究院成员，可参与内部交流活动</p>
                <p>3. 请按时完成任务要求，以便退还保证金</p>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/institute")}
              >
                返回研究院
              </Button>
              <Button 
                className="flex-1 bg-operator hover:bg-operator/90"
                onClick={() => router.push("/mine/institute")}
              >
                查看我的申请
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 支付确认对话框 */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认支付</DialogTitle>
            <DialogDescription>
              您即将支付研究院保证金
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-operator">¥10,000</p>
            <p className="text-xs text-muted-foreground mt-1">
              完成任务可全额退还
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPayDialog(false)} className="flex-1">
              取消
            </Button>
            <Button 
              onClick={handlePay} 
              disabled={paying}
              className="flex-1 bg-operator hover:bg-operator/90"
            >
              {paying ? "支付中..." : "确认支付"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
