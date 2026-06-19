"use client"

import { useState, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Bold, Italic, Image, Quote, List, ListOrdered, 
  Link2, Heading1, Heading2, Eye, Save, Send, ChevronDown, X, 
  Plus, ShoppingBag, BookOpen, MapPin, Crown, Check,
  Users, Lock, Globe, Coins, Sparkles, ImagePlus, Trash2, Star
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock数据 - 用户有发布权限的圈子
const mockManagedCircles = [
  { id: "1", name: "八字命理研习社", cover: "https://api.dicebear.com/7.x/shapes/svg?seed=circle1", role: "owner", members: 12580 },
  { id: "2", name: "风水堪舆交流群", cover: "https://api.dicebear.com/7.x/shapes/svg?seed=circle2", role: "owner", members: 8920 },
  { id: "3", name: "紫微斗数学习班", cover: "https://api.dicebear.com/7.x/shapes/svg?seed=circle3", role: "guest", members: 5600 },
]

// Mock数据 - 可挂载的商品
const mockProducts = [
  { id: "p1", name: "《渊海子平》精装典藏版", cover: "/images/products/book-1.jpg", price: 68, stock: 120 },
  { id: "p2", name: "专业堪舆罗盘套装", cover: "/images/products/product-1.jpg", price: 298, stock: 50 },
  { id: "p3", name: "开运水晶手链", cover: "/images/products/product-2.jpg", price: 158, stock: 200 },
]

// Mock数据 - 可挂载的课程
const mockCourses = [
  { id: "c1", title: "八字入门实战课", cover: "/images/courses/course-1.jpg", price: 199, lessons: 32, students: 2860 },
  { id: "c2", title: "紫微斗数命盘解读", cover: "/images/courses/course-2.jpg", price: 299, lessons: 48, students: 1560 },
  { id: "c3", title: "风水堪舆入门精讲", cover: "/images/courses/course-3.jpg", price: 168, lessons: 24, students: 980 },
]

// Mock数据 - 可挂载的活动
const mockActivities = [
  { id: "a1", title: "2024八字命理线下研讨会·北京站", date: "2024-04-20", location: "北京·朝阳区", price: 299, quota: 60, enrolled: 45 },
  { id: "a2", title: "风水实地考察·苏州园林行", date: "2024-05-15", location: "苏州·拙政园", price: 599, quota: 30, enrolled: 18 },
]

// Mock数据 - 可挂载的智能体
  const mockAgents = [
  { id: "ag1", name: "八字命理分析师", description: "专业八字命理分析，解读命盘格局", conversations: 12680, rating: 4.9, isOfficial: true },
  { id: "ag2", name: "风水布局顾问", description: "家居风水、办公风水专业指导", conversations: 8560, rating: 4.8, isOfficial: true },
  { id: "ag3", name: "择日择吉助手", description: "婚嫁、开业、搬家吉日选择", conversations: 5680, rating: 4.7, isOfficial: false },
  ]

  type EmbeddedItem = {
  type: "product" | "course" | "activity" | "agent"
  id: string
  data: any
}

function ArticleEditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCircleId = searchParams.get('circleId')
  
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [cover, setCover] = useState<string | null>(null)
  const [selectedCircle, setSelectedCircle] = useState<string | null>(defaultCircleId)
  const [visibility, setVisibility] = useState<"circle_only" | "platform_wide">("platform_wide")
  const [paymentType, setPaymentType] = useState<"free" | "paid" | "member_free">("free")
  const [price, setPrice] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [embeddedItems, setEmbeddedItems] = useState<EmbeddedItem[]>([])
  
  const [showCirclePicker, setShowCirclePicker] = useState(false)
  const [showEmbedPicker, setShowEmbedPicker] = useState(false)
  const [embedPickerType, setEmbedPickerType] = useState<"product" | "course" | "activity" | "agent" | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const hasPublishPermission = mockManagedCircles.length > 0
  const selectedCircleData = mockManagedCircles.find(c => c.id === selectedCircle)

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // 添加挂载内容
  const handleAddEmbed = (type: "product" | "course" | "activity" | "agent", item: any) => {
    // 检查是否已存在
    if (embeddedItems.some(e => e.type === type && e.id === item.id)) return
    
    setEmbeddedItems([...embeddedItems, { type, id: item.id, data: item }])
    setShowEmbedPicker(false)
    setEmbedPickerType(null)
  }

  // 移除挂载内容
  const handleRemoveEmbed = (type: string, id: string) => {
    setEmbeddedItems(embeddedItems.filter(e => !(e.type === type && e.id === id)))
  }

  // 保存草稿
  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  // 发布
  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !selectedCircle) {
      alert("请填写标题、正文，并选择发布圈子")
      return
    }
    setPublishing(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setPublishing(false)
    router.push(`/circles/${selectedCircle}`)
  }

  // 无权限提示
  if (!hasPublishPermission) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-white border-b border-muted">
          <div className="flex items-center justify-between px-4 h-12">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="font-medium text-foreground">写文章</span>
            <div className="w-9" />
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Crown className="w-16 h-16 text-gold mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">暂无发布权限</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            根据平台规则，只有圈主和嘉宾才能发布文章。<br />
            您可以创建自己的圈子成为圈主。
          </p>
          <Link 
            href="/circles/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium"
          >
            <Plus className="w-5 h-5" />
            创建圈子
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-muted">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-medium text-foreground">写文章</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={cn("p-2", showPreview ? "text-primary" : "text-muted-foreground")}
            >
              <Eye className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="p-2 text-muted-foreground"
            >
              <Save className={cn("w-5 h-5", saving && "animate-pulse")} />
            </button>
          </div>
        </div>
      </header>

      {/* 预览模式：渲染发布后的文章效果 */}
      {showPreview && (
        <div className="fixed inset-0 top-12 z-40 bg-background overflow-y-auto pb-20">
          <article className="max-w-2xl mx-auto">
            {cover && (
              <div className="relative aspect-video bg-secondary">
                <img src={cover || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <h1 className="text-2xl font-bold text-foreground leading-snug mb-3 font-serif">
                {title || "未命名文章"}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-muted">
                <span>预览模式</span>
                {selectedCircleData && <span>· 发布到 {selectedCircleData.name}</span>}
              </div>
              {content ? (
                <div className="space-y-4">
                  {content.split("\n").filter(Boolean).map((para, i) => (
                    <p key={i} className="text-[16px] text-foreground/90 leading-[1.9]">{para}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">正文为空，返回继续编辑…</p>
              )}
            </div>
          </article>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* 选择圈子 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2">
            发布到 <span className="text-primary">*</span>
          </label>
          <button
            onClick={() => setShowCirclePicker(true)}
            className={cn(
              "w-full p-3 rounded-xl border flex items-center justify-between",
              selectedCircleData ? "bg-primary/5 border-primary/30" : "bg-background border-transparent"
            )}
          >
            {selectedCircleData ? (
              <div className="flex items-center gap-3">
                <img src={selectedCircleData.cover} alt="" className="w-10 h-10 rounded-xl" />
                <div className="text-left">
                  <span className="font-medium text-foreground">{selectedCircleData.name}</span>
                  <p className="text-xs text-muted-foreground">{selectedCircleData.role === 'owner' ? '圈主' : '嘉宾'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-5 h-5" />
                <span>选择发布的圈子</span>
              </div>
            )}
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 封面图 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2">封面图</label>
          {cover ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
              <img src={cover} alt="" className="w-full h-full object-cover" />
              <button 
                onClick={() => setCover(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setCover("/images/courses/course-1.jpg")}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-gold transition-colors"
            >
              <ImagePlus className="w-8 h-8" />
              <span className="text-sm">添加封面图（建议16:9）</span>
            </button>
          )}
        </div>

        {/* 标题 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入文章标题"
            className="w-full text-lg font-medium text-foreground placeholder:text-muted outline-none"
            maxLength={50}
          />
          <div className="text-right text-xs text-muted-foreground mt-1">{title.length}/50</div>
        </div>

        {/* 正文编辑 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 工具栏 */}
          <div className="flex items-center gap-1 p-2 border-b border-muted overflow-x-auto">
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Bold className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Italic className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-muted" />
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Heading1 className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Heading2 className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-muted" />
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <List className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <ListOrdered className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Quote className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-muted" />
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Image className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-background rounded">
              <Link2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* 正文输入 */}
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="开始写作，分享你的知识与见解..."
            className="w-full min-h-[300px] p-4 text-[15px] text-foreground leading-relaxed placeholder:text-muted outline-none resize-none"
          />
        </div>

        {/* 挂载内容 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-foreground">挂载推荐内容</label>
            <span className="text-xs text-muted-foreground">已添加 {embeddedItems.length}/5</span>
          </div>
          
          {/* 已添加的挂载内容 */}
          {embeddedItems.length > 0 && (
            <div className="space-y-2 mb-3">
              {embeddedItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                    item.type === "product" ? "bg-primary" :
                    item.type === "course" ? "bg-info" :
                    item.type === "activity" ? "bg-warning" : "bg-operator"
                  )}>
                    {item.type === "product" && <ShoppingBag className="w-4 h-4" />}
                    {item.type === "course" && <BookOpen className="w-4 h-4" />}
                    {item.type === "activity" && <MapPin className="w-4 h-4" />}
                    {item.type === "agent" && <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.data.name || item.data.title}
                    </p>
  <p className="text-xs text-muted-foreground">
  {item.type === "product" ? "商品" :
  item.type === "course" ? "课程" :
  item.type === "activity" ? "活动" : "智能体"}
  </p>
                  </div>
                  <button 
                    onClick={() => handleRemoveEmbed(item.type, item.id)}
                    className="p-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* 添加按钮 */}
          {embeddedItems.length < 5 && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => { setEmbedPickerType("product"); setShowEmbedPicker(true) }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">商品</span>
              </button>
              <button
                onClick={() => { setEmbedPickerType("course"); setShowEmbedPicker(true) }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-muted hover:border-info hover:bg-info/5 transition-colors"
              >
                <BookOpen className="w-5 h-5 text-info" />
                <span className="text-xs text-muted-foreground">课程</span>
              </button>
              <button
                onClick={() => { setEmbedPickerType("activity"); setShowEmbedPicker(true) }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-muted hover:border-warning hover:bg-warning/5 transition-colors"
              >
                <MapPin className="w-5 h-5 text-warning" />
                <span className="text-xs text-muted-foreground">活动</span>
              </button>
  <button
  onClick={() => { setEmbedPickerType("agent"); setShowEmbedPicker(true) }}
  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-muted hover:border-operator hover:bg-operator/5 transition-colors"
  >
  <Sparkles className="w-5 h-5 text-operator" />
  <span className="text-xs text-muted-foreground">智能体</span>
  </button>
            </div>
          )}
        </div>

        {/* 可见范围和付费设置 */}
        {selectedCircle && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">可见范围</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVisibility("platform_wide")}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                    visibility === "platform_wide" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted"
                  )}
                >
                  <Globe className={cn("w-5 h-5", visibility === "platform_wide" ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-left">
                    <div className={cn("text-sm font-medium", visibility === "platform_wide" ? "text-primary" : "text-muted-foreground")}>
                      全平台
                    </div>
                    <p className="text-[10px] text-muted-foreground">推送到首页需审核</p>
                  </div>
                </button>
                <button
                  onClick={() => setVisibility("circle_only")}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center gap-2 transition-all",
                    visibility === "circle_only" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted"
                  )}
                >
                  <Lock className={cn("w-5 h-5", visibility === "circle_only" ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-left">
                    <div className={cn("text-sm font-medium", visibility === "circle_only" ? "text-primary" : "text-muted-foreground")}>
                      仅圈内
                    </div>
                    <p className="text-[10px] text-muted-foreground">仅圈子成员可见</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">阅读权限</label>
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentType("free")}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all",
                    paymentType === "free" ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", paymentType === "free" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground")}>
                    <span className="text-sm font-bold">免</span>
                  </div>
                  <div className="text-left">
                    <div className={cn("text-sm font-medium", paymentType === "free" ? "text-foreground" : "text-muted-foreground")}>免费阅读</div>
                    <p className="text-[10px] text-muted-foreground">所有人可免费阅读全文</p>
                  </div>
                </button>
                
                {visibility === "platform_wide" && (
                  <button
                    onClick={() => setPaymentType("member_free")}
                    className={cn(
                      "w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all",
                      paymentType === "member_free" ? "border-primary bg-primary/5" : "border-muted"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", paymentType === "member_free" ? "bg-info text-white" : "bg-muted text-muted-foreground")}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className={cn("text-sm font-medium", paymentType === "member_free" ? "text-foreground" : "text-muted-foreground")}>圈内免费</div>
                      <p className="text-[10px] text-muted-foreground">圈子成员免费，圈外用户付费</p>
                    </div>
                  </button>
                )}
                
                <button
                  onClick={() => setPaymentType("paid")}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all",
                    paymentType === "paid" ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", paymentType === "paid" ? "bg-gold text-white" : "bg-muted text-muted-foreground")}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={cn("text-sm font-medium", paymentType === "paid" ? "text-foreground" : "text-muted-foreground")}>付费阅读</div>
                    <p className="text-[10px] text-muted-foreground">所有用户需付费解锁全文</p>
                  </div>
                </button>
              </div>
              
              {(paymentType === "paid" || paymentType === "member_free") && (
                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">
                    {paymentType === "member_free" ? "��外用户" : ""}定价（元）
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="请输入价格"
                    className="w-full px-4 py-3 bg-background rounded-xl text-sm outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 标签 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2">文章标签</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span 
                key={tag} 
                className="px-2.5 py-1 bg-secondary rounded-full text-sm text-gold flex items-center gap-1"
              >
                #{tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="输入标签，回车添加"
                className="flex-1 px-4 py-2 bg-background rounded-full text-sm outline-none"
                maxLength={10}
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary text-white text-sm rounded-full"
              >
                添加
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">最多添加5个标签，每个标签不超过10字</p>
        </div>
      </div>

      {/* 底部发布栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-muted px-4 pt-3 pb-safe-or-4">
        <button
          onClick={handlePublish}
          disabled={publishing || !title.trim() || !content.trim() || !selectedCircle}
          className="w-full py-3.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {publishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              发布中...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              发布文章
            </>
          )}
        </button>
      </div>

      {/* 圈子选择弹窗 */}
      {showCirclePicker && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCirclePicker(false)} />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[60vh] overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b border-muted">
              <button onClick={() => setShowCirclePicker(false)} className="text-muted-foreground">取消</button>
              <span className="font-medium text-foreground">选择圈子</span>
              <span className="w-8" />
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
              <p className="text-xs text-muted-foreground mb-2">仅显示您有发布权限的圈子</p>
              {mockManagedCircles.map(circle => (
                <button
                  key={circle.id}
                  onClick={() => { setSelectedCircle(circle.id); setShowCirclePicker(false) }}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all",
                    selectedCircle === circle.id ? "border-primary bg-primary/5" : "border-muted bg-background"
                  )}
                >
                  <img src={circle.cover} alt="" className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">{circle.name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        circle.role === 'owner' ? "bg-gold/10 text-gold" : "bg-info/10 text-info"
                      )}>
                        {circle.role === 'owner' ? '圈主' : '嘉宾'}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">{circle.members.toLocaleString()} 成员</p>
                  </div>
                  {selectedCircle === circle.id && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 挂载内容选择弹窗 */}
      {showEmbedPicker && embedPickerType && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowEmbedPicker(false); setEmbedPickerType(null) }} />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b border-muted">
              <button onClick={() => { setShowEmbedPicker(false); setEmbedPickerType(null) }} className="text-muted-foreground">取消</button>
  <span className="font-medium text-foreground">
  选择{embedPickerType === "product" ? "商品" : embedPickerType === "course" ? "课程" : embedPickerType === "activity" ? "活动" : "智能体"}
  </span>
              <span className="w-8" />
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
              {embedPickerType === "product" && mockProducts.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddEmbed("product", item)}
                  disabled={embeddedItems.some(e => e.type === "product" && e.id === item.id)}
                  className="w-full p-3 rounded-xl border border-muted flex items-center gap-3 hover:bg-background disabled:opacity-50"
                >
                  <img src={item.cover} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                    <p className="text-sm text-primary font-bold mt-1">¥{item.price}</p>
                  </div>
                </button>
              ))}
              {embedPickerType === "course" && mockCourses.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddEmbed("course", item)}
                  disabled={embeddedItems.some(e => e.type === "course" && e.id === item.id)}
                  className="w-full p-3 rounded-xl border border-muted flex items-center gap-3 hover:bg-background disabled:opacity-50"
                >
                  <img src={item.cover} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-primary font-bold">¥{item.price}</span>
                      <span className="text-xs text-muted-foreground">{item.lessons}课时</span>
                    </div>
                  </div>
                </button>
              ))}
              {embedPickerType === "activity" && mockActivities.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddEmbed("activity", item)}
                  disabled={embeddedItems.some(e => e.type === "activity" && e.id === item.id)}
                  className="w-full p-3 rounded-xl border border-muted flex items-center gap-3 hover:bg-background disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-lg bg-warning/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{item.date}</span>
                      <span>·</span>
                      <span>{item.location}</span>
                    </div>
                  </div>
                </button>
              ))}
              {embedPickerType === "agent" && mockAgents.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddEmbed("agent", item)}
                  disabled={embeddedItems.some(e => e.type === "agent" && e.id === item.id)}
                  className="w-full p-3 rounded-xl border border-muted flex items-center gap-3 hover:bg-background disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-operator to-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      {item.isOfficial && (
                        <span className="px-1.5 py-0.5 bg-gold/10 text-gold text-[9px] rounded">官方</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{item.conversations}次对话</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-gold text-gold" />{item.rating}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ArticleEditorPage() {
  return (
    <Suspense fallback={null}>
      <ArticleEditorContent />
    </Suspense>
  )
}
