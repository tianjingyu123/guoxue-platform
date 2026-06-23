"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Bold, Italic, Image, Quote, Hash, Sparkles, 
  Wand2, Tag, ImagePlus, Send, Save, ChevronDown, X, Check,
  Loader2, RefreshCw
} from "lucide-react"
import { contentApi, aiApi, uploadApi, topicApi } from "@/lib/api"

// Mock数据
const mockCircles = [
  { id: "1", name: "八字研习社", cover: "/placeholder.svg" },
  { id: "2", name: "紫微斗数交流", cover: "/placeholder.svg" },
  { id: "3", name: "风水堪舆", cover: "/placeholder.svg" },
]

const mockTopics = [
  { id: "1", name: "八字命理" },
  { id: "2", name: "紫微斗数" },
  { id: "3", name: "风水布局" },
  { id: "4", name: "每日打卡" },
  { id: "5", name: "学习心得" },
]

// 加载状态
function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#C41E3A]" />
    </div>
  )
}

// 编辑器内容组件
function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")
  const defaultCircleId = searchParams.get("circleId")
  
  const [type, setType] = useState<"post" | "article">("post")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [cover, setCover] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [selectedCircle, setSelectedCircle] = useState<string | null>(defaultCircleId)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  
  const [circles, setCircles] = useState(mockCircles)
  const [topics] = useState(mockTopics)
  
  const [showCircleSelect, setShowCircleSelect] = useState(false)
  const [showTopicSelect, setShowTopicSelect] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState<"polish" | "title" | "tags" | "cover" | null>(null)
  
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [coverPrompt, setCoverPrompt] = useState("")
  
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载草稿或编辑内容
  useEffect(() => {
    if (editId) {
      // 加载编辑内容
    }
    contentApi.getMyCircles().then(setCircles).catch(() => setCircles(mockCircles))
  }, [editId])

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [content])

  // 插入格式
  const insertFormat = (format: "bold" | "italic" | "quote") => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    
    let newText = ""
    switch (format) {
      case "bold":
        newText = `**${selected || "粗体文字"}**`
        break
      case "italic":
        newText = `*${selected || "斜体文字"}*`
        break
      case "quote":
        newText = `\n> ${selected || "引用文字"}\n`
        break
    }
    
    setContent(content.substring(0, start) + newText + content.substring(end))
  }

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    try {
      const result = await uploadApi.images(Array.from(files))
      setImages([...images, ...result.urls])
    } catch {
      // Mock上传
      const mockUrls = Array.from(files).map((_, i) => `/placeholder.svg?${Date.now()}-${i}`)
      setImages([...images, ...mockUrls])
    }
  }

  // AI润色
  const handleAIPolish = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    try {
      const result = await aiApi.polish(content)
      setAiResult(result)
    } catch {
      setAiResult({
        polished: content + "\n\n（AI润色后的内容会更加流畅、专业）",
        changes: ["优化了段落结构", "增强了表达的专业性", "修正了语法问题"]
      })
    }
    setAiLoading(false)
  }

  // AI标题优化
  const handleAITitle = async () => {
    setAiLoading(true)
    try {
      const result = await aiApi.optimizeTitle(title, content)
      setAiResult(result)
    } catch {
      setAiResult({
        suggestions: [
          "深入解析八字命理的核心奥秘",
          "八字命理入门：从基础到实践",
          "探索八字命理的智慧之道"
        ]
      })
    }
    setAiLoading(false)
  }

  // AI标签推荐
  const handleAITags = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    try {
      const result = await aiApi.suggestTags(content)
      setAiResult(result)
    } catch {
      setAiResult({
        tags: ["八字命理", "国学智慧", "传统文化", "命理学习", "易学入门"]
      })
    }
    setAiLoading(false)
  }

  // AI生成封面
  const handleAICover = async () => {
    if (!coverPrompt.trim()) return
    setAiLoading(true)
    try {
      const result = await aiApi.generateCover(coverPrompt)
      setAiResult(result)
    } catch {
      setAiResult({
        imageUrl: "/placeholder.svg?cover"
      })
    }
    setAiLoading(false)
  }

  // 保存草稿
  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await contentApi.saveDraft({
        type,
        title,
        content,
        cover,
        images,
        circleId: selectedCircle || undefined,
        tags: selectedTags,
        topics: selectedTopics,
      })
    } catch {
      // 静默失败
    }
    setSaving(false)
  }

  // 发布
  const handlePublish = async () => {
    if (!content.trim()) return
    setPublishing(true)
    try {
      const result = await contentApi.create({
        type,
        title,
        content,
        cover,
        images,
        circleId: selectedCircle || undefined,
        tags: selectedTags,
        topics: selectedTopics,
      })
      if (result.success) {
        router.back()
      }
    } catch {
      // 静默失败，提示用户
    }
    setPublishing(false)
  }

  const selectedCircleData = circles.find(c => c.id === selectedCircle)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              草稿
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !content.trim()}
              className="flex items-center gap-1 px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布
            </button>
          </div>
        </div>
      </div>

      {/* 类型选择 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-4">
          {(["post", "article"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                type === t
                  ? "text-[#C41E3A] border-[#C41E3A]"
                  : "text-muted-foreground border-transparent"
              }`}
            >
              {t === "post" ? "发帖" : "写文章"}
            </button>
          ))}
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 px-4 py-4">
        {/* 标题 */}
        {type === "article" && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入标题"
            className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground mb-4"
          />
        )}

        {/* 内容 */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === "post" ? "分享你的想法..." : "开始写作..."}
          className="w-full min-h-[200px] bg-transparent border-none outline-none resize-none text-base leading-relaxed placeholder:text-muted-foreground"
        />

        {/* 已上传图片 */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 封面预览 */}
        {cover && type === "article" && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">封面图</p>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
              <img src={cover} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setCover("")}
                className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 选择圈子 */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={() => setShowCircleSelect(true)}
          className="flex items-center gap-2 text-sm"
        >
          {selectedCircleData ? (
            <>
              <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden">
                <img src={selectedCircleData.cover} alt="" className="w-full h-full object-cover" />
              </div>
              <span>{selectedCircleData.name}</span>
            </>
          ) : (
            <>
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">选择圈子（可选）</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* 选择话题 */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={() => setShowTopicSelect(true)}
          className="flex items-center gap-2 text-sm w-full"
        >
          <Tag className="w-4 h-4 text-muted-foreground" />
          {selectedTopics.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedTopics.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-xs rounded-full">
                  #{topics.find(topic => topic.id === t)?.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">添加话题标签</span>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* 工具栏 */}
      <div className="sticky bottom-0 bg-background border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 格式工具 */}
          <div className="flex items-center gap-4">
            <button onClick={() => insertFormat("bold")} className="p-1">
              <Bold className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={() => insertFormat("italic")} className="p-1">
              <Italic className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={() => insertFormat("quote")} className="p-1">
              <Quote className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1">
              <Image className="w-5 h-5 text-muted-foreground" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* AI工具 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAIPanel("polish"); handleAIPolish() }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 rounded-full"
            >
              <Sparkles className="w-3 h-3" />
              润色
            </button>
            {type === "article" && (
              <>
                <button
                  onClick={() => { setShowAIPanel("title"); handleAITitle() }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 rounded-full"
                >
                  <Wand2 className="w-3 h-3" />
                  标题
                </button>
                <button
                  onClick={() => { setShowAIPanel("cover"); setCoverPrompt(""); setAiResult(null) }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 rounded-full"
                >
                  <ImagePlus className="w-3 h-3" />
                  封面
                </button>
              </>
            )}
            <button
              onClick={() => { setShowAIPanel("tags"); handleAITags() }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-600 rounded-full"
            >
              <Tag className="w-3 h-3" />
              标签
            </button>
          </div>
        </div>
      </div>

      {/* 圈子选择弹窗 */}
      {showCircleSelect && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCircleSelect(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[60vh] overflow-auto safe-area-inset-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-center">选择圈子</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => { setSelectedCircle(null); setShowCircleSelect(false) }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                  !selectedCircle ? "bg-[#C41E3A]/10" : "bg-secondary"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Hash className="w-5 h-5 text-muted-foreground" />
                </div>
                <span>不选择圈子</span>
                {!selectedCircle && <Check className="w-5 h-5 text-[#C41E3A] ml-auto" />}
              </button>
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  onClick={() => { setSelectedCircle(circle.id); setShowCircleSelect(false) }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                    selectedCircle === circle.id ? "bg-[#C41E3A]/10" : "bg-secondary"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src={circle.cover} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span>{circle.name}</span>
                  {selectedCircle === circle.id && <Check className="w-5 h-5 text-[#C41E3A] ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 话题选择弹窗 */}
      {showTopicSelect && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowTopicSelect(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[60vh] overflow-auto safe-area-inset-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">已选 {selectedTopics.length}/3</span>
              <h3 className="font-semibold">选择话题</h3>
              <button onClick={() => setShowTopicSelect(false)} className="text-[#C41E3A] text-sm">
                完成
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic.id)
                  return (
                    <button
                      key={topic.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTopics(selectedTopics.filter(t => t !== topic.id))
                        } else if (selectedTopics.length < 3) {
                          setSelectedTopics([...selectedTopics, topic.id])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        isSelected
                          ? "bg-[#C41E3A] text-white"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      #{topic.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI面板 */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAIPanel(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] overflow-auto safe-area-inset-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background px-4 py-3 border-b border-border flex items-center justify-between">
              <button onClick={() => setShowAIPanel(null)}>
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                {showAIPanel === "polish" && "AI润色"}
                {showAIPanel === "title" && "标题优化"}
                {showAIPanel === "tags" && "标签推荐"}
                {showAIPanel === "cover" && "生成封面"}
              </h3>
              <div className="w-5" />
            </div>

            <div className="p-4">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                  <p className="text-sm text-muted-foreground">AI正在思考中...</p>
                </div>
              ) : (
                <>
                  {/* 润色结果 */}
                  {showAIPanel === "polish" && aiResult && (
                    <div className="space-y-4">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-sm whitespace-pre-wrap">{aiResult.polished}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">优化说明：</p>
                        {aiResult.changes?.map((change: string, i: number) => (
                          <p key={i} className="text-xs text-purple-600">• {change}</p>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setContent(aiResult.polished); setShowAIPanel(null) }}
                          className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-sm"
                        >
                          应用润色
                        </button>
                        <button
                          onClick={handleAIPolish}
                          className="px-4 py-2 border border-border rounded-xl text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 标题建议 */}
                  {showAIPanel === "title" && aiResult && (
                    <div className="space-y-2">
                      {aiResult.suggestions?.map((suggestion: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => { setTitle(suggestion); setShowAIPanel(null) }}
                          className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-left text-sm hover:bg-blue-100"
                        >
                          {suggestion}
                        </button>
                      ))}
                      <button
                        onClick={handleAITitle}
                        className="w-full py-2 border border-border rounded-xl text-sm flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        换一批
                      </button>
                    </div>
                  )}

                  {/* 标签推荐 */}
                  {showAIPanel === "tags" && aiResult && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {aiResult.tags?.map((tag: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (!selectedTags.includes(tag)) {
                                setSelectedTags([...selectedTags, tag])
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm ${
                              selectedTags.includes(tag)
                                ? "bg-orange-500 text-white"
                                : "bg-orange-50 dark:bg-orange-900/20 text-orange-600"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAIPanel(null)}
                          className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm"
                        >
                          完成选择
                        </button>
                        <button
                          onClick={handleAITags}
                          className="px-4 py-2 border border-border rounded-xl text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 封面生成 */}
                  {showAIPanel === "cover" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">描述你想要的封面</label>
                        <textarea
                          value={coverPrompt}
                          onChange={(e) => setCoverPrompt(e.target.value)}
                          placeholder="例如：古典中国风，山水画背景，配八卦图案..."
                          className="w-full h-24 p-3 bg-secondary rounded-xl text-sm resize-none"
                        />
                      </div>
                      {aiResult?.imageUrl && (
                        <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
                          <img src={aiResult.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        {aiResult?.imageUrl ? (
                          <>
                            <button
                              onClick={() => { setCover(aiResult.imageUrl); setShowAIPanel(null) }}
                              className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm"
                            >
                              使用此封面
                            </button>
                            <button
                              onClick={handleAICover}
                              className="px-4 py-2 border border-border rounded-xl text-sm"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleAICover}
                            disabled={!coverPrompt.trim()}
                            className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm disabled:opacity-50"
                          >
                            生成封面
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 导出页面
export default function EditorPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EditorContent />
    </Suspense>
  )
}
