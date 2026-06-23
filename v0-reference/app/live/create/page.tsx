"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Camera, Calendar, ChevronRight, X, Check, Info, Smartphone, Monitor, Settings } from "lucide-react"
import { liveApi, type CreateLiveRoomData, type LiveCategory } from "@/lib/api"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Mock分类
const mockCategories: LiveCategory[] = [
  { id: "1", name: "易经国学" },
  { id: "2", name: "风水堪舆" },
  { id: "3", name: "命理八字" },
  { id: "4", name: "紫微斗数" },
  { id: "5", name: "面相手相" },
  { id: "6", name: "六爻占卜" },
  { id: "7", name: "奇门遁甲" },
  { id: "8", name: "其他" },
]

function CreateLivePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<LiveCategory[]>(mockCategories)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [liveMode, setLiveMode] = useState<"vertical" | "horizontal">("vertical")

  const [form, setForm] = useState<CreateLiveRoomData>({
    title: "",
    cover: "",
    startTime: "",
    type: "knowledge",
    categoryId: "",
    description: "",
    tags: [],
    isPublic: true,
  })

  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    if (editId) {
      // 编辑模式：加载现有数据
      setForm({
        title: "周易六十四卦精讲直播",
        cover: "/placeholder.svg",
        startTime: "2024-12-20T20:00",
        type: "knowledge",
        categoryId: "1",
        description: "深入讲解周易六十四卦的卦象、爻辞和应用方法",
        tags: ["周易", "六十四卦", "国学"],
        isPublic: true,
      })
    }
  }, [editId])

  const selectedCategory = categories.find(c => c.id === form.categoryId)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!form.title.trim()) newErrors.title = "请输入直播标题"
    else if (form.title.length > 30) newErrors.title = "标题不能超过30个字"
    if (!form.cover) newErrors.cover = "请上传封面图"
    if (!form.startTime) newErrors.startTime = "请选择开播时间"
    if (!form.categoryId) newErrors.categoryId = "请选择直播分类"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !validateForm()) return

    setLoading(true)
    try {
      if (editId) {
        await liveApi.updateRoom(editId, form)
      } else {
        await liveApi.createRoom(form)
      }
      router.back()
    } catch {
      // Mock success
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleCoverUpload = () => {
    // Mock上传
    setForm(prev => ({ ...prev, cover: "/placeholder.svg" }))
    setErrors(prev => ({ ...prev, cover: "" }))
  }

  const addTag = () => {
    if (tagInput.trim() && (form.tags?.length || 0) < 5) {
      setForm(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }))
      setTagInput("")
    }
  }

  const removeTag = (index: number) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index),
    }))
  }

  // 生成日期时间选项
  const generateDateOptions = () => {
    const options: { date: string; display: string }[] = []
    const now = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
      options.push({
        date: dateStr,
        display: i === 0 ? '今天' : i === 1 ? '明天' : `${date.getMonth() + 1}月${date.getDate()}日 ${weekDay}`,
      })
    }
    return options
  }

  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const timeOptions = Array.from({ length: 24 }, (_, h) =>
    [`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`]
  ).flat()

  const confirmDateTime = () => {
    if (selectedDate && selectedTime) {
      setForm(prev => ({ ...prev, startTime: `${selectedDate}T${selectedTime}` }))
      setShowDatePicker(false)
      setErrors(prev => ({ ...prev, startTime: "" }))
    }
  }

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return ""
    const date = new Date(dateTime)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="text-lg font-semibold text-[#2C2C2C]">
          {editId ? "编辑直播" : "创建直播"}
        </h1>
        <button
          onClick={() => handleSubmit(true)}
          className="text-sm text-[#666666]"
        >
          存草稿
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 直播模式选择 - 新增 */}
        <div className="bg-white rounded-2xl p-4">
          <label className="text-sm font-medium text-[#2C2C2C] mb-3 block">
            直播模式 <span className="text-[#C41E3A]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLiveMode("vertical")}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                liveMode === "vertical" 
                  ? "border-[#C41E3A] bg-red-50" 
                  : "border-[#E8E3DB] bg-[#FAF8F5] hover:border-[#C41E3A]/50"
              )}
            >
              <div className="absolute top-2 right-2 bg-[#C41E3A] text-white text-[10px] px-1.5 py-0.5 rounded">
                推荐
              </div>
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                liveMode === "vertical" ? "bg-[#C41E3A] text-white" : "bg-[#E8E3DB] text-[#666]"
              )}>
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className={cn("font-medium text-sm", liveMode === "vertical" ? "text-[#C41E3A]" : "text-[#2C2C2C]")}>
                手机竖屏
              </h3>
              <p className="text-[10px] text-[#999] mt-1">适合带货、聊天互动</p>
            </button>
            
            <button
              onClick={() => setLiveMode("horizontal")}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                liveMode === "horizontal" 
                  ? "border-[#C41E3A] bg-red-50" 
                  : "border-[#E8E3DB] bg-[#FAF8F5] hover:border-[#C41E3A]/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                liveMode === "horizontal" ? "bg-[#C41E3A] text-white" : "bg-[#E8E3DB] text-[#666]"
              )}>
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className={cn("font-medium text-sm", liveMode === "horizontal" ? "text-[#C41E3A]" : "text-[#2C2C2C]")}>
                OBS横屏
              </h3>
              <p className="text-[10px] text-[#999] mt-1">适合课程、课件讲解</p>
            </button>
          </div>
          
          {/* OBS提示 */}
          {liveMode === "horizontal" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <Settings className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-800 font-medium">OBS推流设置</p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    横屏直播需要使用OBS等推流软件，开播后将显示推流地址。
                  </p>
                  <Link href="/live/obs-guide" className="text-[10px] text-amber-800 underline mt-1 inline-block">
                    查看OBS配置教程
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 封面上传 */}
        <div className="bg-white rounded-2xl p-4">
          <label className="text-sm font-medium text-[#2C2C2C] mb-3 block">
            直播封面 <span className="text-[#C41E3A]">*</span>
          </label>
          <div
            onClick={handleCoverUpload}
            className={`relative aspect-video rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-colors ${
              errors.cover ? "border-[#C41E3A] bg-red-50" : "border-[#E8E3DB] bg-[#FAF8F5] hover:border-[#C41E3A]"
            }`}
          >
            {form.cover ? (
              <>
                <Image src={form.cover} alt="封面" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Camera className="w-10 h-10 text-[#999999]" />
                <span className="text-sm text-[#999999]">点击上传封面</span>
                <span className="text-xs text-[#999999]">建议尺寸 16:9，支持 JPG/PNG</span>
              </div>
            )}
          </div>
          {errors.cover && <p className="text-xs text-[#C41E3A] mt-2">{errors.cover}</p>}
        </div>

        {/* 基本信息 */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          {/* 标题 */}
          <div>
            <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">
              直播标题 <span className="text-[#C41E3A]">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => {
                setForm(prev => ({ ...prev, title: e.target.value }))
                if (e.target.value.trim()) setErrors(prev => ({ ...prev, title: "" }))
              }}
              placeholder="请输入直播标题，最多30字"
              maxLength={30}
              className={`w-full px-4 py-3 rounded-xl border bg-[#FAF8F5] text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 ${
                errors.title ? "border-[#C41E3A] focus:ring-[#C41E3A]/20" : "border-[#E8E3DB] focus:ring-[#C41E3A]/20 focus:border-[#C41E3A]"
              }`}
            />
            <div className="flex justify-between mt-1">
              {errors.title ? (
                <p className="text-xs text-[#C41E3A]">{errors.title}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-[#999999]">{form.title.length}/30</span>
            </div>
          </div>

          {/* 开播时间 */}
          <div>
            <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">
              开播时间 <span className="text-[#C41E3A]">*</span>
            </label>
            <button
              onClick={() => setShowDatePicker(true)}
              className={`w-full px-4 py-3 rounded-xl border bg-[#FAF8F5] flex items-center justify-between ${
                errors.startTime ? "border-[#C41E3A]" : "border-[#E8E3DB]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#999999]" />
                <span className={form.startTime ? "text-[#2C2C2C]" : "text-[#999999]"}>
                  {form.startTime ? formatDateTime(form.startTime) : "请选择开播时间"}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>
            {errors.startTime && <p className="text-xs text-[#C41E3A] mt-1">{errors.startTime}</p>}
          </div>

          {/* 直播类型 */}
          <div>
            <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">直播类型</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "knowledge", label: "知识授课", desc: "适合课程讲解" },
                { value: "ecommerce", label: "电商带货", desc: "适合商品销售" },
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setForm(prev => ({ ...prev, type: item.value as CreateLiveRoomData['type'] }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.type === item.value
                      ? "border-[#C41E3A] bg-red-50"
                      : "border-[#E8E3DB] bg-[#FAF8F5]"
                  }`}
                >
                  <span className={`text-sm font-medium ${form.type === item.value ? "text-[#C41E3A]" : "text-[#2C2C2C]"}`}>
                    {item.label}
                  </span>
                  <p className="text-xs text-[#999999] mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 分类 */}
          <div>
            <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">
              直播分类 <span className="text-[#C41E3A]">*</span>
            </label>
            <button
              onClick={() => setShowCategoryPicker(true)}
              className={`w-full px-4 py-3 rounded-xl border bg-[#FAF8F5] flex items-center justify-between ${
                errors.categoryId ? "border-[#C41E3A]" : "border-[#E8E3DB]"
              }`}
            >
              <span className={selectedCategory ? "text-[#2C2C2C]" : "text-[#999999]"}>
                {selectedCategory?.name || "请选择分类"}
              </span>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>
            {errors.categoryId && <p className="text-xs text-[#C41E3A] mt-1">{errors.categoryId}</p>}
          </div>
        </div>

        {/* 更多设置 */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          {/* 描述 */}
          <div>
            <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">直播简介</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="介绍一下本场直播的内容..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E3DB] bg-[#FAF8F5] text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20 focus:border-[#C41E3A] resize-none"
            />
            <div className="text-right">
              <span className="text-xs text-[#999999]">{form.description?.length || 0}/200</span>
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="text-sm font-medium text-[#2C2C2C] mb-2 block">
              直播标签 <span className="text-xs text-[#999999] font-normal">（最多5个）</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-[#C41E3A] rounded-full text-sm"
                >
                  {tag}
                  <button onClick={() => removeTag(index)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            {(form.tags?.length || 0) < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="输入标签后回车添加"
                  maxLength={10}
                  className="flex-1 px-4 py-2 rounded-xl border border-[#E8E3DB] bg-[#FAF8F5] text-sm text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20 focus:border-[#C41E3A]"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-[#C41E3A] text-white rounded-xl text-sm"
                >
                  添加
                </button>
              </div>
            )}
          </div>

          {/* 公开设置 */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-[#2C2C2C]">公开直播</span>
              <p className="text-xs text-[#999999] mt-0.5">关闭后仅粉丝可见</p>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
              className={`w-12 h-7 rounded-full transition-colors ${
                form.isPublic ? "bg-[#C41E3A]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 提示 */}
        <div className="flex items-start gap-2 px-2">
          <Info className="w-4 h-4 text-[#C9A96E] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#999999]">
            直播开始前15分钟将推送通知给已预约的用户，请确保按时开播
          </p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4">
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E85D75] text-white rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "提交中..." : editId ? "保存修改" : "��建直播"}
        </button>
      </div>

      {/* 分类选择器 */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCategoryPicker(false)}
          />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[60vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
              <button
                onClick={() => setShowCategoryPicker(false)}
                className="text-[#666666]"
              >
                取消
              </button>
              <span className="font-medium text-[#2C2C2C]">选择分类</span>
              <span className="w-8" />
            </div>
            <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto max-h-[50vh]">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setForm(prev => ({ ...prev, categoryId: cat.id }))
                    setShowCategoryPicker(false)
                    setErrors(prev => ({ ...prev, categoryId: "" }))
                  }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    form.categoryId === cat.id
                      ? "border-[#C41E3A] bg-red-50 text-[#C41E3A]"
                      : "border-[#E8E3DB] bg-[#FAF8F5] text-[#2C2C2C]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 日期时间选择器 */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDatePicker(false)}
          />
          <div className="relative w-full bg-white rounded-t-3xl">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-[#666666]"
              >
                取消
              </button>
              <span className="font-medium text-[#2C2C2C]">选择时间</span>
              <button
                onClick={confirmDateTime}
                className="text-[#C41E3A] font-medium"
              >
                确定
              </button>
            </div>
            <div className="flex h-64">
              {/* 日期列 */}
              <div className="flex-1 overflow-y-auto border-r border-[#E8E3DB]">
                {generateDateOptions().map(opt => (
                  <button
                    key={opt.date}
                    onClick={() => setSelectedDate(opt.date)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                      selectedDate === opt.date ? "bg-red-50 text-[#C41E3A]" : "text-[#2C2C2C]"
                    }`}
                  >
                    <span>{opt.display}</span>
                    {selectedDate === opt.date && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
              {/* 时间列 */}
              <div className="flex-1 overflow-y-auto">
                {timeOptions.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                      selectedTime === time ? "bg-red-50 text-[#C41E3A]" : "text-[#2C2C2C]"
                    }`}
                  >
                    <span>{time}</span>
                    {selectedTime === time && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function CreateLivePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateLivePageContent />
    </Suspense>
  )
}
