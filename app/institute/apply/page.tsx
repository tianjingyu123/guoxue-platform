"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Upload,
  Camera,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Phone,
  Mail,
  Award,
  BookOpen,
  Video,
  RefreshCw,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { 
  submitInstructorApplication,
  getMyApplication,
  getApplicationStatusLabel,
  getApplicationStatusColor,
} from "@/lib/api/institute"
import type { InstructorApplication, ApplicationStatus } from "@/lib/types/institute"

// 骨架屏组件
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 专长领域选项
const specialtyOptions = [
  '八字命理', '紫微斗数', '六爻占卜', '奇门遁甲',
  '风水堪舆', '面相手相', '姓名学', '周易研究',
  '道家文化', '佛学禅修', '中医养生', '茶道文化'
]

// 进度状态图标
const statusIcons: Record<ApplicationStatus, React.ReactNode> = {
  draft: <FileText className="w-6 h-6" />,
  submitted: <Clock className="w-6 h-6" />,
  reviewing: <RefreshCw className="w-6 h-6" />,
  approved: <CheckCircle className="w-6 h-6" />,
  rejected: <XCircle className="w-6 h-6" />,
}

export default function InstructorApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingApplication, setExistingApplication] = useState<InstructorApplication | null>(null)
  
  // 表单数据
  const [formData, setFormData] = useState<InstructorApplication>({
    realName: '',
    phone: '',
    email: '',
    specialties: [],
    experience: '',
    introduction: '',
    certificates: [],
    trialVideoUrl: '',
  })
  
  // 表单错误
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 加载已有申请
  useEffect(() => {
    loadApplication()
  }, [])
  
  async function loadApplication() {
    try {
      setLoading(true)
      const res = await getMyApplication()
      if (res.code === 200 && res.data) {
        setExistingApplication(res.data)
      }
    } finally {
      setLoading(false)
    }
  }
  
  // 表单校验
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}
    
    if (!formData.realName.trim()) {
      newErrors.realName = '请输入真实姓名'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = '请输入手机号码'
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '手机号码格式不正确'
    }
    if (formData.specialties.length === 0) {
      newErrors.specialties = '请至少选择一个擅长领域'
    }
    if (!formData.experience.trim()) {
      newErrors.experience = '请填写从业/学习经历'
    }
    if (!formData.introduction.trim()) {
      newErrors.introduction = '请填写个人简介'
    } else if (formData.introduction.length < 50) {
      newErrors.introduction = '个人简介至少50字'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // 切换专长
  function toggleSpecialty(specialty: string) {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
    if (errors.specialties) {
      setErrors(prev => ({ ...prev, specialties: '' }))
    }
  }
  
  // 模拟上传证书
  function handleUploadCertificate() {
    // 模拟上传
    const fakeUrl = `/placeholder.svg?height=200&width=300&text=证书${(formData.certificates?.length || 0) + 1}`
    setFormData(prev => ({
      ...prev,
      certificates: [...(prev.certificates || []), fakeUrl]
    }))
  }
  
  // 删除证书
  function removeCertificate(index: number) {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates?.filter((_, i) => i !== index) || []
    }))
  }
  
  // 提交申请
  async function handleSubmit() {
    if (!validateForm()) return
    
    try {
      setSubmitting(true)
      const res = await submitInstructorApplication(formData)
      if (res.code === 200) {
        // 重新加载申请状态
        await loadApplication()
      }
    } finally {
      setSubmitting(false)
    }
  }
  
  // 渲染申请进度
  function renderApplicationStatus() {
    if (!existingApplication) return null
    
    const status = existingApplication.status || 'submitted'
    const statusColor = getApplicationStatusColor(status)
    
    return (
      <div className="min-h-screen bg-background">
        {/* 头部 */}
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">申请状态</h1>
          </div>
        </header>
        
        <div className="p-4">
          {/* 状态卡片 */}
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <div className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
              statusColor
            )}>
              {statusIcons[status]}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {getApplicationStatusLabel(status)}
            </h2>
            {status === 'submitted' && (
              <p className="text-muted-foreground text-sm">
                您的申请已提交，预计3-5个工作日内完成审核
              </p>
            )}
            {status === 'reviewing' && (
              <p className="text-muted-foreground text-sm">
                审核人员正在审核您的资料，请耐心等待
              </p>
            )}
            {status === 'approved' && (
              <div>
                <p className="text-green-600 text-sm mb-4">
                  恭喜您通过审核，已成为研究院讲师！
                </p>
                <Button 
                  onClick={() => router.push('/institute')}
                  className="bg-primary text-primary-foreground"
                >
                  进入讲师中心
                </Button>
              </div>
            )}
            {status === 'rejected' && (
              <div>
                <p className="text-red-600 text-sm mb-2">
                  很抱歉，您的申请未通过审核
                </p>
                {existingApplication.rejectReason && (
                  <p className="text-muted-foreground text-sm mb-4">
                    原因：{existingApplication.rejectReason}
                  </p>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setExistingApplication(null)}
                >
                  重新申请
                </Button>
              </div>
            )}
          </div>
          
          {/* 申请信息 */}
          <div className="mt-6 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">申请信息</h3>
            </div>
            <div className="divide-y divide-border">
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">姓名</span>
                <span>{existingApplication.realName}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">手机</span>
                <span>{existingApplication.phone}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-muted-foreground block mb-2">擅长领域</span>
                <div className="flex flex-wrap gap-2">
                  {existingApplication.specialties.map(s => (
                    <span key={s} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              {existingApplication.submittedAt && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">提交时间</span>
                  <span>{existingApplication.submittedAt}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 刷新按钮 */}
          {(status === 'submitted' || status === 'reviewing') && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={loadApplication}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新状态
            </Button>
          )}
        </div>
      </div>
    )
  }
  
  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }
  
  // 已有申请
  if (existingApplication) {
    return renderApplicationStatus()
  }
  
  // 申请表单
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">申请成为讲师</h1>
        </div>
      </header>
      
      <div className="p-4 space-y-6">
        {/* 提示 */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex gap-3">
            <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">成为研究院讲师</p>
              <p className="text-xs text-muted-foreground mt-1">
                加入研究院讲师团队，分享您的学识，传承国学文化
              </p>
            </div>
          </div>
        </div>
        
        {/* 基本信息 */}
        <section>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            基本信息
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                真实姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="请输入真实姓名"
                value={formData.realName}
                onChange={e => {
                  setFormData(prev => ({ ...prev, realName: e.target.value }))
                  if (errors.realName) setErrors(prev => ({ ...prev, realName: '' }))
                }}
                className={errors.realName ? 'border-red-500' : ''}
              />
              {errors.realName && (
                <p className="text-red-500 text-xs mt-1">{errors.realName}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                手机号码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="请输入手机号码"
                  value={formData.phone}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, phone: e.target.value }))
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }))
                  }}
                  className={cn("pl-10", errors.phone ? 'border-red-500' : '')}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                邮箱（选填）
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="请输入邮箱"
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* 专业信息 */}
        <section>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            专业信息
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                擅长领域 <span className="text-red-500">*</span>（可多选）
              </label>
              <div className="flex flex-wrap gap-2">
                {specialtyOptions.map(specialty => (
                  <button
                    key={specialty}
                    type="button"
                    onClick={() => toggleSpecialty(specialty)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      formData.specialties.includes(specialty)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    )}
                  >
                    {specialty}
                  </button>
                ))}
              </div>
              {errors.specialties && (
                <p className="text-red-500 text-xs mt-1">{errors.specialties}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                从业/学习经历 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="请描述您的从业或学习经历，如师承、研究年限等"
                value={formData.experience}
                onChange={e => {
                  setFormData(prev => ({ ...prev, experience: e.target.value }))
                  if (errors.experience) setErrors(prev => ({ ...prev, experience: '' }))
                }}
                rows={4}
                className={errors.experience ? 'border-red-500' : ''}
              />
              {errors.experience && (
                <p className="text-red-500 text-xs mt-1">{errors.experience}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                个人简介 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="请详细介绍您自己，包括专业背景、教学理念等（至少50字）"
                value={formData.introduction}
                onChange={e => {
                  setFormData(prev => ({ ...prev, introduction: e.target.value }))
                  if (errors.introduction) setErrors(prev => ({ ...prev, introduction: '' }))
                }}
                rows={5}
                className={errors.introduction ? 'border-red-500' : ''}
              />
              <div className="flex justify-between mt-1">
                {errors.introduction ? (
                  <p className="text-red-500 text-xs">{errors.introduction}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">
                  {formData.introduction.length}/50
                </span>
              </div>
            </div>
          </div>
        </section>
        
        {/* 资质证明 */}
        <section>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            资质证明（选填）
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            上传相关资质证书、学历证明等，提高审核通过率
          </p>
          <div className="grid grid-cols-3 gap-3">
            {formData.certificates?.map((cert, index) => (
              <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
                <img src={cert} alt={`证书${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeCertificate(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {(formData.certificates?.length || 0) < 6 && (
              <button
                type="button"
                onClick={handleUploadCertificate}
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">拍照上传</span>
              </button>
            )}
          </div>
        </section>
        
        {/* 试讲视频 */}
        <section>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            试讲视频（选填）
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            提供一段3-5分钟的试讲视频链接，展示您的授课风格
          </p>
          <Input
            placeholder="请输入视频链接（如B站、抖音等）"
            value={formData.trialVideoUrl || ''}
            onChange={e => setFormData(prev => ({ ...prev, trialVideoUrl: e.target.value }))}
          />
        </section>
      </div>
      
      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 safe-area-inset-bottom">
        <Button
          className="w-full bg-primary text-primary-foreground py-3 h-auto text-base"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '提交中...' : '提交申请'}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          提交即表示您同意《讲师入驻协议》
        </p>
      </div>
    </div>
  )
}
