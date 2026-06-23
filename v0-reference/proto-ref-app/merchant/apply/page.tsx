"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, Camera, Check, Plus, Phone, FileText, Shield, AlertCircle, Store, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const categories = [
  { id: "guoxue", name: "国学课程" },
  { id: "guji", name: "古籍图书" },
  { id: "wenchuang", name: "文创用品" },
  { id: "wenfang", name: "文房四宝" },
  { id: "chadao", name: "茶道用品" },
  { id: "mingli", name: "命理咨询" },
  { id: "fengshui", name: "风水服务" },
  { id: "shufa", name: "书法字画" },
  { id: "other", name: "其他" },
]

const steps = [
  { id: 1, name: "填写信息" },
  { id: 2, name: "提交审核" },
  { id: 3, name: "开通店铺" },
]

// 表单校验规则
const validators = {
  shopName: (value: string) => {
    if (!value.trim()) return "请输入店铺名称"
    if (value.length < 2) return "店铺名称至少2个字符"
    if (value.length > 20) return "店铺名称不能超过20个字符"
    return null
  },
  contactName: (value: string) => {
    if (!value.trim()) return "请输入联系人姓名"
    if (value.length < 2) return "姓名至少2个字符"
    return null
  },
  contactPhone: (value: string) => {
    if (!value.trim()) return "请输入手机号码"
    if (!/^1[3-9]\d{9}$/.test(value)) return "请输入正确的手机号码"
    return null
  },
  verifyCode: (value: string) => {
    if (!value.trim()) return "请输入验证码"
    if (!/^\d{6}$/.test(value)) return "验证码为6位数字"
    return null
  },
  idNumber: (value: string) => {
    if (!value.trim()) return "请输入身份证号码"
    if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(value)) {
      return "请输入正确的身份证号码"
    }
    return null
  },
  categories: (value: string[]) => {
    if (value.length === 0) return "请至少选择一个经营类目"
    return null
  }
}

// 表单字段输入组件
interface FormFieldProps {
  label: string
  required?: boolean
  error?: string | null
  children: React.ReactNode
}

function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// 提交进度弹窗
interface SubmitProgressProps {
  isOpen: boolean
  step: number
  error?: string | null
}

function SubmitProgress({ isOpen, step, error }: SubmitProgressProps) {
  if (!isOpen) return null
  
  const progressSteps = [
    { id: 1, name: "校验信息" },
    { id: 2, name: "上传资料" },
    { id: 3, name: "提交申请" },
  ]
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        {error ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-semibold mb-2">提交失败</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" className="w-full">重新提交</Button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-center mb-6">正在提交申请</h3>
            <div className="space-y-4">
              {progressSteps.map((s, index) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    step > s.id ? "bg-green-500 text-white" :
                    step === s.id ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {step > s.id ? <Check className="w-4 h-4" /> : 
                     step === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : s.id}
                  </div>
                  <span className={cn(
                    "text-sm",
                    step >= s.id ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {s.name}
                  </span>
                  {step > s.id && (
                    <span className="text-xs text-green-600 ml-auto">完成</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-6">请勿关闭页面，正在处理中...</p>
          </>
        )}
      </Card>
    </div>
  )
}

export default function MerchantApplyPage() {
  const router = useRouter()
  const [currentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    shopName: "", 
    shopLogo: "", 
    shopDesc: "", 
    contactName: "", 
    contactPhone: "", 
    verifyCode: "",
    idNumber: "", 
    idFrontImage: "", 
    idBackImage: "", 
    businessLicense: "", 
    brandAuth: "", 
    categories: [] as string[],
  })
  const [countdown, setCountdown] = useState(0)
  
  // 获取字段错误
  const getFieldError = useCallback((field: keyof typeof validators) => {
    if (!touched[field]) return null
    const validator = validators[field]
    if (!validator) return null
    return validator(formData[field] as never)
  }, [formData, touched])
  
  // 标记字段已触碰
  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }
  
  // 表单完整性检查
  const getFormCompleteness = () => {
    const required = ['shopName', 'contactName', 'contactPhone', 'verifyCode', 'idNumber']
    const filled = required.filter(field => {
      const value = formData[field as keyof typeof formData]
      return typeof value === 'string' && value.trim() !== ''
    })
    return {
      filled: filled.length,
      total: required.length,
      percentage: Math.round((filled.length / required.length) * 100)
    }
  }
  
  const formCompleteness = getFormCompleteness()
  
  const handleSendCode = () => {
    if (countdown > 0) return
    const phoneError = validators.contactPhone(formData.contactPhone)
    if (phoneError) {
      markTouched('contactPhone')
      return
    }
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown(prev => { 
        if (prev <= 1) { 
          clearInterval(timer)
          return 0 
        } 
        return prev - 1 
      })
    }, 1000)
  }
  
  const toggleCategory = (id: string) => {
    setFormData(prev => {
      const cats = prev.categories.includes(id) 
        ? prev.categories.filter(c => c !== id) 
        : prev.categories.length < 5 
          ? [...prev.categories, id] 
          : prev.categories
      return { ...prev, categories: cats }
    })
    markTouched('categories')
  }
  
  const validateForm = () => {
    // 标记所有字段为已触碰
    const fields = ['shopName', 'contactName', 'contactPhone', 'verifyCode', 'idNumber', 'categories']
    fields.forEach(f => markTouched(f))
    
    // 检查必填项
    for (const field of fields) {
      const validator = validators[field as keyof typeof validators]
      if (validator) {
        const error = validator(formData[field as keyof typeof formData] as never)
        if (error) return false
      }
    }
    return true
  }
  
  const handleSubmit = async () => {
    if (!agreedToTerms) { 
      return
    }
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    // 模拟多步骤提交
    setSubmitStep(1)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSubmitStep(2)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setSubmitStep(3)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    router.push("/merchant/application-status")
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/join" className="mr-3"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-semibold">商家入驻申请</h1>
        </div>
      </header>
      
      {/* 进度条 */}
      <div className="px-4 py-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium", currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className={cn("text-xs mt-1", currentStep >= step.id ? "text-primary font-medium" : "text-muted-foreground")}>{step.name}</span>
              </div>
              {index < steps.length - 1 && <div className={cn("w-12 sm:w-20 h-0.5 mx-2", currentStep > step.id ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>
        
        {/* 完成度提示 */}
        <div className="mt-4 p-3 bg-background rounded-lg border border-border/60">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">表单完成度</span>
            <span className="font-medium">{formCompleteness.percentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${formCompleteness.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            已填写 {formCompleteness.filled}/{formCompleteness.total} 项必填信息
          </p>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* 店铺信息 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">店铺信息</h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-xl bg-muted flex flex-col items-center justify-center border-2 border-dashed border-border">
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">上传Logo</span>
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">建议尺寸 200x200px</p>
            </div>
          </div>
          
          <FormField 
            label="店铺名称" 
            required 
            error={getFieldError('shopName')}
          >
            <Input 
              placeholder="请输入店铺名称（2-20字符）" 
              value={formData.shopName} 
              onChange={e => setFormData(prev => ({ ...prev, shopName: e.target.value }))} 
              onBlur={() => markTouched('shopName')}
              maxLength={20}
              className={cn(getFieldError('shopName') && "border-destructive focus-visible:ring-destructive")}
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">{formData.shopName.length}/20</span>
            </div>
          </FormField>
          
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium">店铺简介</label>
            <Textarea 
              placeholder="介绍您的店铺特色" 
              value={formData.shopDesc} 
              onChange={e => setFormData(prev => ({ ...prev, shopDesc: e.target.value }))} 
              maxLength={200} 
              rows={3} 
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">{formData.shopDesc.length}/200</span>
            </div>
          </div>
        </Card>
        
        {/* 联系人信息 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">联系人信息</h2>
          </div>
          <div className="space-y-4">
            <FormField 
              label="联系人姓名" 
              required 
              error={getFieldError('contactName')}
            >
              <Input 
                placeholder="请输入真实姓名" 
                value={formData.contactName} 
                onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                onBlur={() => markTouched('contactName')}
                className={cn(getFieldError('contactName') && "border-destructive focus-visible:ring-destructive")}
              />
            </FormField>
            
            <FormField 
              label="手机号码" 
              required 
              error={getFieldError('contactPhone')}
            >
              <div className="flex gap-2">
                <Input 
                  placeholder="请输入手机号" 
                  value={formData.contactPhone} 
                  onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  onBlur={() => markTouched('contactPhone')}
                  className={cn("flex-1", getFieldError('contactPhone') && "border-destructive focus-visible:ring-destructive")}
                />
                <Button 
                  variant="outline" 
                  onClick={handleSendCode} 
                  disabled={countdown > 0} 
                  className="w-28 shrink-0"
                >
                  {countdown > 0 ? `${countdown}s` : "获取验证码"}
                </Button>
              </div>
            </FormField>
            
            <FormField 
              label="验证码" 
              required 
              error={getFieldError('verifyCode')}
            >
              <Input 
                placeholder="请输入6位验证码" 
                value={formData.verifyCode} 
                onChange={e => setFormData(prev => ({ ...prev, verifyCode: e.target.value }))}
                onBlur={() => markTouched('verifyCode')}
                maxLength={6}
                className={cn(getFieldError('verifyCode') && "border-destructive focus-visible:ring-destructive")}
              />
            </FormField>
            
            <FormField 
              label="身份证号" 
              required 
              error={getFieldError('idNumber')}
            >
              <Input 
                placeholder="请输入身份证号码" 
                value={formData.idNumber} 
                onChange={e => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                onBlur={() => markTouched('idNumber')}
                maxLength={18}
                className={cn(getFieldError('idNumber') && "border-destructive focus-visible:ring-destructive")}
              />
            </FormField>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">身份证照片 <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[3/2] rounded-lg bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">人像面</span>
                </div>
                <div className="aspect-[3/2] rounded-lg bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">国徽面</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* 资质材料 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">资质材料</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">营业执照 <span className="text-destructive">*</span></label>
              <div className="aspect-[4/3] rounded-lg bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">点击上传营业执照</span>
                <span className="text-xs text-muted-foreground mt-1">支持 jpg、png 格式，小于 5MB</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* 经营类目 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">经营类目</h2>
            </div>
            <span className="text-xs text-muted-foreground">已选 {formData.categories.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const isSelected = formData.categories.includes(cat.id)
              return (
                <button 
                  key={cat.id} 
                  onClick={() => toggleCategory(cat.id)} 
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {cat.name}
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </div>
          {getFieldError('categories') && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {getFieldError('categories')}
            </p>
          )}
          {formData.categories.length >= 5 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              最多选择5个经营类目
            </p>
          )}
        </Card>
        
        {/* 协议同意 */}
        <div className="flex items-start gap-2 px-1">
          <button 
            onClick={() => setAgreedToTerms(!agreedToTerms)} 
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
              agreedToTerms ? "bg-primary border-primary" : "border-muted-foreground"
            )}
          >
            {agreedToTerms && <Check className="w-3 h-3 text-primary-foreground" />}
          </button>
          <p className="text-sm text-muted-foreground">
            我已阅读并同意
            <Link href="/terms/merchant" className="text-primary mx-1">《商家入驻协议》</Link>
            和
            <Link href="/terms/service" className="text-primary mx-1">《平台服务条款》</Link>
          </p>
        </div>
      </div>
      
      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/merchant/join">返回</Link>
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !agreedToTerms} 
            className="flex-[2] h-12 text-base font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                提交申请
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* 提交进度弹窗 */}
      <SubmitProgress 
        isOpen={isSubmitting} 
        step={submitStep}
        error={submitError}
      />
    </div>
  )
}
