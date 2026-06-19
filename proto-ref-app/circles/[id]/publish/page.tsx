"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ChevronLeft, FileText, Video, BookOpen, Radio, Plus, 
  Camera, X, Check, Lock, Globe, Users, Coins, ChevronRight, AudioLines
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  VisibilitySelector, 
  PaymentSettings,
  type Visibility,
  type PaymentType,
  mockManagedCircles
} from "@/components/content/visibility-settings"
import { FeatureApplyModal, StatusBadge } from "@/components/feature/feature-gate"
import { mockCircleFeatures } from "@/lib/feature-permissions"

// 内容类型
const contentTypes = [
  { id: "article", name: "文章", icon: FileText, description: "发布图文内容", href: "article" },
  { id: "course", name: "课程", icon: BookOpen, description: "上传视频课程", href: "course" },
  { id: "live", name: "直播", icon: Radio, description: "发起在线直播", href: "/live/create" },
]

export default function CirclePublishPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  
  // 获取圈子信息
  const circle = mockManagedCircles.find(c => c.id === circleId) || {
    id: circleId,
    name: "未知圈子",
    avatar: "",
    members: 0,
    role: "member"
  }

  const [selectedType, setSelectedType] = useState<string | null>(null)

  const handleTypeSelect = (type: typeof contentTypes[0]) => {
    if (type.id === 'live') {
      router.push(`${type.href}?circleId=${circleId}`)
    } else {
      setSelectedType(type.id)
    }
  }

  return (
    <div className="min-h-screen bg-foreground">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-foreground/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-white">发布内容</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 圈子信息 */}
        <div className="bg-foreground rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <img alt="图片" 
              src={circle.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${circleId}`} 
              alt={circle.name}
              className="w-12 h-12 rounded-xl"
            />
            <div className="flex-1">
              <h2 className="font-medium text-white">{circle.name}</h2>
              <p className="text-xs text-white/50">{circle.members.toLocaleString()} 成员</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              circle.role === 'owner' ? 'bg-gold/20 text-gold' : 'bg-info/20 text-info'
            }`}>
              {circle.role === 'owner' ? '圈主' : '管理员'}
            </span>
          </div>
        </div>

        {/* 选择内容类型 */}
        {!selectedType ? (
          <div className="bg-foreground rounded-2xl p-4">
            <h3 className="text-sm font-medium text-white mb-4">选择内容类型</h3>
            <div className="space-y-3">
              {contentTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type)}
                  className="w-full p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <type.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-white">{type.name}</h4>
                    <p className="text-xs text-white/50 mt-0.5">{type.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 根据选择的类型显示对应表单
          selectedType === 'article' ? (
            <ArticleForm circleId={circleId} circleName={circle.name} onBack={() => setSelectedType(null)} />
          ) : selectedType === 'course' ? (
            <CourseForm circleId={circleId} circleName={circle.name} onBack={() => setSelectedType(null)} />
          ) : null
        )}
      </div>
    </div>
  )
}

// 文章发布表单
function ArticleForm({ 
  circleId, 
  circleName, 
  onBack 
}: { 
  circleId: string
  circleName: string
  onBack: () => void 
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [cover, setCover] = useState("")
  const [visibility, setVisibility] = useState<Visibility>("platform_wide")
  const [paymentType, setPaymentType] = useState<PaymentType>("free")
  const [price, setPrice] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCoverUpload = () => {
    // 模拟上传
    setCover("https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=450&fit=crop")
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "请输入文章标题"
    if (!content.trim()) newErrors.content = "请输入文章内容"
    if ((paymentType === 'paid' || paymentType === 'member_free') && price <= 0) {
      newErrors.price = "请设置价格"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push(`/circles/${circleId}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>
        <h3 className="font-medium text-white">发布文章</h3>
        <div className="w-12" />
      </div>

      {/* 封面 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-3 block">文章封面</label>
        <div
          onClick={handleCoverUpload}
          className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-primary transition-colors"
        >
          {cover ? (
            <>
              <img src={cover} alt="封面" className="w-full h-full object-cover" />
              <button 
                onClick={e => { e.stopPropagation(); setCover(""); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Camera className="w-8 h-8 text-white/40" />
              <span className="text-sm text-white/60">点击上传封面</span>
            </div>
          )}
        </div>
      </div>

      {/* 标题 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-2 block">
          文章标题 <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: "" })); }}
          placeholder="请输入文章标题"
          className={cn(
            "w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/30",
            errors.title ? "border-primary" : "border-white/10"
          )}
        />
        {errors.title && <p className="text-xs text-primary mt-2">{errors.title}</p>}
      </div>

      {/* 内容 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-2 block">
          文章内容 <span className="text-primary">*</span>
        </label>
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); setErrors(prev => ({ ...prev, content: "" })); }}
          placeholder="请输入文章内容..."
          rows={8}
          className={cn(
            "w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/30 resize-none",
            errors.content ? "border-primary" : "border-white/10"
          )}
        />
        {errors.content && <p className="text-xs text-primary mt-2">{errors.content}</p>}
      </div>

      {/* 可见范围和付费设置 */}
      <div className="bg-foreground rounded-2xl p-4 space-y-4">
        <VisibilitySelector
          visibility={visibility}
          onVisibilityChange={setVisibility}
        />
        <PaymentSettings
          visibility={visibility}
          paymentType={paymentType}
          price={price}
          onPaymentTypeChange={setPaymentType}
          onPriceChange={setPrice}
          priceError={errors.price}
          contentType="article"
        />
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary text-white font-semibold shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {isSubmitting ? "发布中..." : "发布文章"}
      </button>
    </div>
  )
}

// 课程发布表单
function CourseForm({ 
  circleId, 
  circleName, 
  onBack 
}: { 
  circleId: string
  circleName: string
  onBack: () => void 
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cover, setCover] = useState("")
  const [courseFormat, setCourseFormat] = useState<"text" | "av">("text")
  const [showApply, setShowApply] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>("platform_wide")
  const [paymentType, setPaymentType] = useState<PaymentType>("paid")
  const [price, setPrice] = useState(99)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 音视频课程为高级功能，需申请开通
  const avStatus = mockCircleFeatures.av_course.status
  const avUnlocked = avStatus === "approved"

  const handleCoverUpload = () => {
    setCover("https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=450&fit=crop")
  }

  // 选择音视频课程：未开通则弹申请，不切换
  const handleSelectAV = () => {
    if (avUnlocked) {
      setCourseFormat("av")
    } else if (avStatus !== "reviewing") {
      setShowApply(true)
    }
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "请输入课程名称"
    if (!description.trim()) newErrors.description = "请输入课程简介"
    if ((paymentType === 'paid' || paymentType === 'member_free') && price <= 0) {
      newErrors.price = "请设置价格"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push(`/circles/${circleId}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>
        <h3 className="font-medium text-white">发布课程</h3>
        <div className="w-12" />
      </div>

      {/* 课程类型选择 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-3 block">课程类型</label>
        <div className="grid grid-cols-2 gap-3">
          {/* 图文课程 - 始终可用 */}
          <button
            onClick={() => setCourseFormat("text")}
            className={cn(
              "p-3 rounded-xl border-2 transition-all text-left",
              courseFormat === "text" ? "border-primary bg-primary/10" : "border-white/10 bg-white/5",
            )}
          >
            <FileText className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-medium text-white">图文课程</p>
            <p className="text-[10px] text-white/50 mt-0.5">图文 + 资料形式</p>
          </button>
          {/* 音视频课程 - 高级功能，需申请开通 */}
          <button
            onClick={handleSelectAV}
            disabled={avStatus === "reviewing"}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all text-left",
              courseFormat === "av" && avUnlocked
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-white/5",
              !avUnlocked && "opacity-80",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <AudioLines className={cn("w-5 h-5", avUnlocked ? "text-accent" : "text-white/40")} />
              {!avUnlocked && <Lock className="w-3.5 h-3.5 text-white/40" />}
            </div>
            <p className={cn("text-sm font-medium", avUnlocked ? "text-white" : "text-white/60")}>音视频课程</p>
            {avUnlocked ? (
              <p className="text-[10px] text-white/50 mt-0.5">音频 / 视频章节</p>
            ) : (
              <div className="mt-1">
                <StatusBadge status={avStatus} />
              </div>
            )}
          </button>
        </div>
        {!avUnlocked && (
          <p className="text-[11px] text-accent mt-2">音视频课程为高级功能，需申请开通后使用</p>
        )}
      </div>

      {/* 封面 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-3 block">
          课程封面 <span className="text-primary">*</span>
        </label>
        <div
          onClick={handleCoverUpload}
          className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-primary transition-colors"
        >
          {cover ? (
            <>
              <img src={cover} alt="封面" className="w-full h-full object-cover" />
              <button 
                onClick={e => { e.stopPropagation(); setCover(""); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Video className="w-8 h-8 text-white/40" />
              <span className="text-sm text-white/60">点击上传封面</span>
            </div>
          )}
        </div>
      </div>

      {/* 名称 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-2 block">
          课程名称 <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: "" })); }}
          placeholder="请输入课程名称"
          className={cn(
            "w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/30",
            errors.title ? "border-primary" : "border-white/10"
          )}
        />
        {errors.title && <p className="text-xs text-primary mt-2">{errors.title}</p>}
      </div>

      {/* 简介 */}
      <div className="bg-foreground rounded-2xl p-4">
        <label className="text-sm font-medium text-white mb-2 block">
          课程简介 <span className="text-primary">*</span>
        </label>
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: "" })); }}
          placeholder="请输入课程简介..."
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/30 resize-none",
            errors.description ? "border-primary" : "border-white/10"
          )}
        />
        {errors.description && <p className="text-xs text-primary mt-2">{errors.description}</p>}
      </div>

      {/* 可见范围和付费设置 */}
      <div className="bg-foreground rounded-2xl p-4 space-y-4">
        <VisibilitySelector
          visibility={visibility}
          onVisibilityChange={setVisibility}
        />
        <PaymentSettings
          visibility={visibility}
          paymentType={paymentType}
          price={price}
          onPaymentTypeChange={setPaymentType}
          onPriceChange={setPrice}
          priceError={errors.price}
          contentType="course"
        />
      </div>

      {/* 提示 */}
      <div className="bg-gold/10 rounded-xl p-3 border border-gold/20">
        <p className="text-xs text-gold">
          {courseFormat === "av"
            ? '课程创建后，可在"课程管理"中上传音视频章节、设置目录结构'
            : '课程创建后，可在"课程管理"中上传图文内容与学习资料'}
        </p>
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary text-white font-semibold shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {isSubmitting ? "创建中..." : "创建课程"}
      </button>

      {/* 音视频课程申请弹窗 */}
      {showApply && (
        <FeatureApplyModal
          feature="av_course"
          onClose={() => setShowApply(false)}
          onSubmit={() => setShowApply(false)}
        />
      )}
    </div>
  )
}
