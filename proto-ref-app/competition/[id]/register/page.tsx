"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trophy, Users, Calendar, CheckCircle, AlertCircle, Upload, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// 赛事信息摘要
const competitionInfo = {
  id: "1",
  title: "2024热卜杯·八字命理大赛",
  startTime: "2024-04-01",
  endTime: "2024-04-30",
  registrationDeadline: "2024-03-25",
  registrationFee: 0,
  participants: 1286,
  maxParticipants: 2000,
  organizer: "热卜平台",
  requiresUpload: false, // 是否需要上传作品
  groups: [ // 参赛组别
    { id: "beginner", name: "新手组", desc: "学习命理1年以内" },
    { id: "intermediate", name: "进阶组", desc: "学习命理1-3年" },
    { id: "advanced", name: "高手组", desc: "学习命理3年以上" },
  ],
}

export default function CompetitionRegisterPage() {
  const params = useParams()
  const router = useRouter()
  const [step, setStep] = useState(1) // 1:填写信息 2:确认支付 3:报名成功
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 表单状态
  const [formData, setFormData] = useState({
    realName: "",
    phone: "",
    group: "",
    experience: "",
    agreeRules: false,
  })

  // 报名成功数据
  const [registrationResult, setRegistrationResult] = useState<{
    participantNo: string
    registrationTime: string
  } | null>(null)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.realName || !formData.phone || !formData.group || !formData.agreeRules) {
      return
    }
    
    setIsSubmitting(true)
    
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setRegistrationResult({
      participantNo: `BZ2024${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      registrationTime: new Date().toLocaleString('zh-CN'),
    })
    
    setStep(3)
    setIsSubmitting(false)
  }

  // 步骤1：填写信息
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 h-11">
            <button onClick={() => router.back()} className="flex items-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-medium">比赛报名</h1>
            <div className="w-5" />
          </div>
        </header>

        {/* 赛事信息摘要 */}
        <Card className="mx-4 mt-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-sm">{competitionInfo.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {competitionInfo.organizer} · {competitionInfo.participants}人已报名
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {competitionInfo.startTime}
            </span>
            <span>报名截止: {competitionInfo.registrationDeadline}</span>
          </div>
        </Card>

        {/* 报名表单 */}
        <div className="px-4 mt-4 space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-4">参赛信息</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="realName" className="text-sm">
                  真实姓名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="realName"
                  placeholder="请输入真实姓名"
                  value={formData.realName}
                  onChange={(e) => handleInputChange("realName", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-sm">
                  手机号码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="请输入手机号码"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-4">选择组别 <span className="text-destructive">*</span></h3>
            
            <RadioGroup
              value={formData.group}
              onValueChange={(value) => handleInputChange("group", value)}
              className="space-y-3"
            >
              {competitionInfo.groups.map(group => (
                <div key={group.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={group.id} id={group.id} />
                  <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{group.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{group.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-4">学习经历</h3>
            <Input
              placeholder="简述您的命理学习经历（选填）"
              value={formData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
            />
          </Card>

          {/* 作品上传（如需要） */}
          {competitionInfo.requiresUpload && (
            <Card className="p-4">
              <h3 className="font-medium mb-4">作品上传 <span className="text-destructive">*</span></h3>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">点击或拖拽上传作品</p>
                <p className="text-xs text-muted-foreground mt-1">支持 PDF、Word、图片格式</p>
              </div>
            </Card>
          )}

          {/* 同意规则 */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="agreeRules"
              checked={formData.agreeRules}
              onCheckedChange={(checked) => handleInputChange("agreeRules", checked as boolean)}
            />
            <Label htmlFor="agreeRules" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              我已阅读并同意
              <Link href={`/competition/${params.id}`} className="text-primary">《比赛规则》</Link>
              ，承诺遵守比赛纪律
            </Label>
          </div>
        </div>

        {/* 底部提交按钮 */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">报名费</p>
              <p className="text-lg font-bold text-primary">
                {competitionInfo.registrationFee === 0 ? "免费" : `¥${competitionInfo.registrationFee}`}
              </p>
            </div>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!formData.realName || !formData.phone || !formData.group || !formData.agreeRules || isSubmitting}
            >
              {isSubmitting ? "提交中..." : "确认报名"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤3：报名成功
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-xl font-bold mb-2">报名成功</h1>
        <p className="text-muted-foreground mb-6">您已成功报名参赛</p>
        
        <Card className="p-4 text-left mb-6 w-full max-w-sm">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">参赛编号</span>
              <span className="font-mono font-bold text-primary">{registrationResult?.participantNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">报名时间</span>
              <span>{registrationResult?.registrationTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">参赛组别</span>
              <span>{competitionInfo.groups.find(g => g.id === formData.group)?.name}</span>
            </div>
          </div>
        </Card>
        
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl mb-6 text-left w-full max-w-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">温馨提示</p>
              <p>初赛将于 {competitionInfo.startTime} 开始，届时请准时参加线上答题。</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Link href={`/competition/${params.id}`}>
            <Button className="w-full">查看赛事详情</Button>
          </Link>
          <Link href="/competition">
            <Button variant="outline" className="w-full">返回赛事中心</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
