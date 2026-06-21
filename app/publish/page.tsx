"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { 
  Image as ImageIcon, 
  Video, 
  X, 
  Plus, 
  ChevronRight, 
  Clock, 
  Users, 
  BookOpen, 
  ShoppingBag, 
  Compass, 
  Bot, 
  Bold, 
  Italic, 
  List, 
  Link2, 
  AlignLeft,
  Calendar,
  Globe,
  Settings2,
  Sparkles,
  Loader2,
  RefreshCw,
  Feather,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type ContentType = "post" | "article" | "video" | "poem"

interface UploadedMedia {
  id: string
  type: "image" | "video"
  url: string
  name: string
}

const contentTypes = [
  { id: "post" as ContentType,    label: "帖子", icon: ImageIcon, desc: "图文动态，快速分享" },
  { id: "article" as ContentType, label: "文章", icon: BookOpen,  desc: "深度长文，知识沉淀" },
  { id: "video" as ContentType,   label: "短视频", icon: Video,   desc: "视频内容，生动展示" },
  { id: "poem" as ContentType,    label: "诗词", icon: Feather,   desc: "原创诗词，AI辅助" },
]

const recommendCardTypes = [
  { id: "circle", label: "圈子", icon: Users, color: "bg-blue-500/10 text-blue-500" },
  { id: "course", label: "课程", icon: BookOpen, color: "bg-green-500/10 text-green-500" },
  { id: "product", label: "商品", icon: ShoppingBag, color: "bg-orange-500/10 text-orange-500" },
  { id: "paipan", label: "排盘", icon: Compass, color: "bg-primary/10 text-primary" },
  { id: "agent", label: "智能体", icon: Bot, color: "bg-purple-500/10 text-purple-500" },
]

const myCircles = [
  { id: 1, name: "八字命理研习社", avatar: "", members: 1280 },
  { id: 2, name: "紫微斗数交流群", avatar: "", members: 856 },
  { id: 3, name: "风水堪舆学院", avatar: "", members: 2100 },
]

export default function PublishPage() {
  const [contentType, setContentType] = useState<ContentType>("post")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [selectedCircle, setSelectedCircle] = useState(myCircles[0])
  const [showCircleSelect, setShowCircleSelect] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showRecommendPanel, setShowRecommendPanel] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [pushToHome, setPushToHome] = useState(false)
  const [scheduleTime, setScheduleTime] = useState("")
  const [videoCover, setVideoCover] = useState("")
  const [linkedProducts, setLinkedProducts] = useState<number[]>([])
  // 诗词发布额外状态
  const [showAiPoemPanel, setShowAiPoemPanel] = useState(false)
  const [aiPoemTopic, setAiPoemTopic] = useState("")
  const [aiPoemStatus, setAiPoemStatus] = useState<"idle" | "loading" | "done">("idle")
  const [aiPoemDraft, setAiPoemDraft] = useState("")
  const [useAiLabel, setUseAiLabel] = useState(false)

  const aiPoems: Record<string, string> = {
    春天: "春风送暖入屠苏，\n桃李无言自成蹊。\n枝头鸟语催人醉，\n一片芳心向日归。",
    离别: "执手相看泪眼湿，\n千言万语难为情。\n此去山河路漫漫，\n归来犹见月当庭。",
    山水: "青山隐隐水迢迢，\n云卷云舒任逍遥。\n且将闲愁付流水，\n人间处处是仙桥。",
  }

  const handleGenerateAiPoem = () => {
    setAiPoemStatus("loading")
    setTimeout(() => {
      const key = Object.keys(aiPoems).find(k => aiPoemTopic.includes(k)) ?? "春天"
      setAiPoemDraft(aiPoems[key])
      setAiPoemStatus("done")
    }, 1800)
  }

  const handleUseAiDraft = () => {
    setContent(aiPoemDraft)
    setUseAiLabel(true)
    setShowAiPoemPanel(false)
  }

  const handleAddMedia = () => {
    const newMedia: UploadedMedia = {
      id: Date.now().toString(),
      type: contentType === "video" ? "video" : "image",
      url: "",
      name: contentType === "video" ? "video_001.mp4" : `image_${uploadedMedia.length + 1}.jpg`
    }
    if (contentType === "video") {
      setUploadedMedia([newMedia])
    } else {
      if (uploadedMedia.length < 9) {
        setUploadedMedia([...uploadedMedia, newMedia])
      }
    }
  }

  const handleRemoveMedia = (id: string) => {
    setUploadedMedia(uploadedMedia.filter(m => m.id !== id))
  }

  const handleInsertCard = (type: string) => {
    const cardPlaceholder = `\n[${type.toUpperCase()}_CARD]\n`
    setContent(content + cardPlaceholder)
    setShowRecommendPanel(false)
  }

  const canPublish = title.trim() || content.trim() || uploadedMedia.length > 0

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-14 px-4">
  <BackButton />
  <h1 className="font-semibold text-foreground">发布内容</h1>
          <button
            disabled={!canPublish}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              canPublish
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            发布
          </button>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 内容类型选择 */}
        <div className="flex gap-2">
          {contentTypes.map((type) => {
            const Icon = type.icon
            const isActive = contentType === type.id
            return (
              <button
                key={type.id}
                onClick={() => {
                  setContentType(type.id)
                  setUploadedMedia([])
                }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-foreground")}>
                  {type.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{type.desc}</span>
              </button>
            )
          })}
        </div>

        {/* 标题输入 */}
        {(contentType === "post" || contentType === "article") && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入标题（选填）"
            className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        )}

        {/* 短视频标题 */}
        {contentType === "video" && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="添加视频标题，获得更多曝光"
            className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        )}

        {/* 正文编辑区 */}
        {(contentType === "post" || contentType === "article") && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* 文章工具栏 */}
            {contentType === "article" && (
              <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-secondary/30">
                <button className="p-2 rounded hover:bg-secondary transition-colors">
                  <Bold className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded hover:bg-secondary transition-colors">
                  <Italic className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded hover:bg-secondary transition-colors">
                  <List className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded hover:bg-secondary transition-colors">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded hover:bg-secondary transition-colors">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1" />
                <button 
                  onClick={() => setShowRecommendPanel(!showRecommendPanel)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  推荐卡片
                </button>
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={contentType === "article" ? "开始撰写你的文章..." : "分享你的想法..."}
              className="w-full min-h-[200px] px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
            />
          </div>
        )}

        {/* 推荐卡片选择面板 */}
        {showRecommendPanel && contentType === "article" && (
          <Card className="p-4 bg-card border-primary/30">
            <h4 className="text-sm font-medium text-foreground mb-3">插入推荐卡片</h4>
            <div className="grid grid-cols-5 gap-2">
              {recommendCardTypes.map((card) => {
                const Icon = card.icon
                return (
                  <button
                    key={card.id}
                    onClick={() => handleInsertCard(card.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", card.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-foreground">{card.label}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        {/* 诗词创作区 */}
        {contentType === "poem" && (
          <div className="space-y-3">
            {/* 标题 */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="诗词标题（选填）"
              className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-serif"
            />
            {/* 正文编辑区 */}
            <div className="rounded-xl border border-border overflow-hidden"
              style={{ background: "var(--poem-surface, #2e1f10)" }}>
              <div className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: "1px solid var(--poem-border, rgba(255,210,140,0.12))" }}>
                <span className="text-xs" style={{ color: "var(--poem-text-muted, rgba(245,234,216,0.30))" }}>
                  {useAiLabel && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] mr-2"
                      style={{ background: "var(--poem-ai-soft)", color: "var(--poem-ai)" }}>
                      AI 辅助创作
                    </span>
                  )}
                  建议每句换行
                </span>
                <button
                  onClick={() => setShowAiPoemPanel(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
                  style={{ background: "var(--poem-ai-soft, rgba(155,126,200,0.18))", color: "var(--poem-ai, #9b7ec8)" }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 诗词辅助
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"请输入诗词原文…\n\n例：\n春风送暖入屠苏，\n桃李无言自成蹊。"}
                className="w-full min-h-[180px] px-4 py-3 bg-transparent placeholder:text-muted-foreground focus:outline-none resize-none font-serif text-base leading-[2]"
                style={{ color: "var(--poem-text, #f5ead8)" }}
              />
            </div>
          </div>
        )}

        {/* AI 诗词创作辅助面板 */}
        {showAiPoemPanel && contentType === "poem" && (
          <div className="fixed inset-0 z-50 flex flex-col">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiPoemPanel(false)} />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up overflow-hidden"
              style={{ background: "var(--poem-surface, #2e1f10)", borderTop: "1px solid var(--poem-border)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--poem-border)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--poem-ai)" }} />
                  <span className="font-medium" style={{ color: "var(--poem-text)" }}>AI 诗词创作辅助</span>
                </div>
                <button onClick={() => setShowAiPoemPanel(false)} className="p-1.5 rounded-full hover:bg-white/10">
                  <X className="w-4 h-4" style={{ color: "var(--poem-text-soft)" }} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <p className="text-sm mb-2" style={{ color: "var(--poem-text-soft)" }}>
                    输入主题或关键词，AI 生成诗词草稿，你来润色修改
                  </p>
                  <input
                    type="text"
                    value={aiPoemTopic}
                    onChange={(e) => setAiPoemTopic(e.target.value)}
                    placeholder="例：春天、离别、山水、思念…"
                    className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--poem-border)",
                      color: "var(--poem-text)",
                    }}
                  />
                </div>
                {aiPoemStatus === "idle" && (
                  <button
                    onClick={handleGenerateAiPoem}
                    disabled={!aiPoemTopic.trim()}
                    className="w-full h-11 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{ background: "var(--poem-ai)", color: "#fff" }}
                  >
                    生成草稿
                  </button>
                )}
                {aiPoemStatus === "loading" && (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--poem-ai)" }} />
                    <span className="text-sm" style={{ color: "var(--poem-text-soft)" }}>AI 正在感受主题意境…</span>
                  </div>
                )}
                {aiPoemStatus === "done" && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--poem-border)" }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: "var(--poem-ai-soft)", color: "var(--poem-ai)" }}>AI 生成</span>
                        <span className="text-xs" style={{ color: "var(--poem-text-muted)" }}>可修改润色后使用</span>
                      </div>
                      <p className="font-serif text-base whitespace-pre-line leading-[2.2]"
                        style={{ color: "var(--poem-text)" }}>{aiPoemDraft}</p>
                    </div>
                    <p className="text-xs text-center" style={{ color: "var(--poem-text-muted)" }}>
                      AI 只提供草稿，最终作品的主导权在你
                    </p>
                    <div className="flex gap-3 pb-2">
                      <button onClick={() => { setAiPoemStatus("idle"); setAiPoemDraft("") }}
                        className="flex-1 h-11 rounded-xl border text-sm"
                        style={{ borderColor: "var(--poem-border)", color: "var(--poem-text-soft)" }}>
                        <RefreshCw className="w-4 h-4 inline mr-1.5" />重新生成
                      </button>
                      <button onClick={handleUseAiDraft}
                        className="flex-1 h-11 rounded-xl text-sm font-medium"
                        style={{ background: "var(--poem-ai)", color: "#fff" }}>
                        使用草稿（我来润色）
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 媒体上传区 - 帖子模式 */}
        {contentType === "post" && (          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">添加图片/视频</span>
              <span className="text-xs text-muted-foreground">{uploadedMedia.length}/9</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {uploadedMedia.map((media) => (
                <div key={media.id} className="aspect-square relative bg-secondary rounded-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    {media.type === "video" ? (
                      <Video className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMedia(media.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {uploadedMedia.length < 9 && (
                <button
                  onClick={handleAddMedia}
                  className="aspect-square bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">添加</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 短视频上传区 */}
        {contentType === "video" && (
          <div className="space-y-4">
            {/* 视频上传 */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">上传视频</span>
              {uploadedMedia.length === 0 ? (
                <button
                  onClick={handleAddMedia}
                  className="w-full aspect-video bg-secondary rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">点击上传视频</span>
                  <span className="text-xs text-muted-foreground">支持 MP4、MOV 格式，最大 500MB</span>
                </button>
              ) : (
                <div className="relative aspect-video bg-secondary rounded-xl overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                    {uploadedMedia[0].name}
                  </Badge>
                  <button
                    onClick={() => setUploadedMedia([])}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* 封面选择 */}
            {uploadedMedia.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">选择封面</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <button
                      key={i}
                      onClick={() => setVideoCover(String(i))}
                      className={cn(
                        "flex-1 aspect-video bg-secondary rounded-lg border-2 flex items-center justify-center transition-all",
                        videoCover === String(i) ? "border-primary" : "border-transparent"
                      )}
                    >
                      <span className="text-xs text-muted-foreground">第{i}帧</span>
                    </button>
                  ))}
                  <button className="flex-1 aspect-video bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:border-primary/50 transition-colors">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">自定义</span>
                  </button>
                </div>
              </div>
            )}

            {/* 关联商品 */}
            {uploadedMedia.length > 0 && (
              <Card 
                className="p-4 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => setLinkedProducts([1])}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">关联商品</span>
                      <p className="text-xs text-muted-foreground">
                        {linkedProducts.length > 0 ? `已关联 ${linkedProducts.length} 件商品` : "从商城选择商品进行带货"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 关联圈子 */}
        <Card 
          className="p-4 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setShowCircleSelect(!showCircleSelect)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedCircle.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {selectedCircle.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-medium text-foreground">{selectedCircle.name}</span>
                <p className="text-xs text-muted-foreground">{selectedCircle.members} 成员</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                发布到此圈子
              </Badge>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        {/* 圈子选择面板 */}
        {showCircleSelect && (
          <Card className="p-2 bg-card border-primary/30">
            {myCircles.map((circle) => (
              <button
                key={circle.id}
                onClick={() => {
                  setSelectedCircle(circle)
                  setShowCircleSelect(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                  selectedCircle.id === circle.id ? "bg-primary/10" : "hover:bg-secondary"
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {circle.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <span className="text-sm text-foreground">{circle.name}</span>
                  <p className="text-xs text-muted-foreground">{circle.members} 成员</p>
                </div>
                {selectedCircle.id === circle.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </Card>
        )}

        {/* 发布设置 */}
        <Card className="bg-card overflow-hidden">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">发布设置</span>
            </div>
            <ChevronRight className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              showSettings && "rotate-90"
            )} />
          </button>
          
          {showSettings && (
            <div className="border-t border-border">
              {/* 定时发布 */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-foreground">定时发布</span>
                    {scheduleEnabled && scheduleTime && (
                      <p className="text-xs text-primary">{scheduleTime}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative",
                    scheduleEnabled ? "bg-primary" : "bg-secondary"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                    scheduleEnabled ? "left-5" : "left-0.5"
                  )} />
                </button>
              </div>
              
              {scheduleEnabled && (
                <div className="p-4 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 推送到首页 - 仅文章可见 */}
              {contentType === "article" && (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-foreground">推送到首页</span>
                      <p className="text-xs text-muted-foreground">需经平台审核</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPushToHome(!pushToHome)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      pushToHome ? "bg-primary" : "bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                      pushToHome ? "left-5" : "left-0.5"
                    )} />
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center justify-between p-4">
          <button className="px-6 py-2.5 rounded-full border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors">
            存为草稿
          </button>
          <button
            disabled={!canPublish}
            className={cn(
              "px-8 py-2.5 rounded-full text-sm font-medium transition-all",
              canPublish
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {scheduleEnabled ? "定时发布" : "立即发布"}
          </button>
        </div>
      </div>
    </div>
  )
}
