"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { 
  ArrowLeft, Play, Pause, Scissors, Sparkles, Music, Image as ImageIcon,
  X, Check, ChevronRight, MapPin, Users, ShoppingBag, Eye, Lock,
  Plus, Volume2, VolumeX
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"

// 滤镜列表
const filters = [
  { id: "none", name: "原片", preview: "" },
  { id: "guofeng", name: "国风", preview: "" },
  { id: "xuanzhi", name: "宣纸", preview: "" },
  { id: "shuimo", name: "水墨", preview: "" },
  { id: "huaijiu", name: "怀旧", preview: "" },
  { id: "qingxin", name: "清新", preview: "" },
  { id: "nuanyang", name: "暖阳", preview: "" },
]

// 音乐列表
const musicList = [
  { id: "none", name: "无背景音乐", artist: "", duration: "" },
  { id: 1, name: "古风悠扬", artist: "平台精选", duration: "03:25" },
  { id: 2, name: "山水意境", artist: "平台精选", duration: "02:48" },
  { id: 3, name: "禅意空灵", artist: "平台精选", duration: "04:12" },
  { id: 4, name: "国韵悠长", artist: "热门推荐", duration: "03:05" },
  { id: 5, name: "书香墨韵", artist: "热门推荐", duration: "02:56" },
]

// 话题标签
const hotTopics = ["八字命理", "风水布局", "紫微斗数", "每日运势", "国学智慧", "传统文化"]

export default function VideoPublishPage() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<"trim" | "filter" | "music" | "cover" | null>(null)
  const [selectedFilter, setSelectedFilter] = useState("none")
  const [selectedMusic, setSelectedMusic] = useState("none")
  const [selectedCover, setSelectedCover] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)
  
  // 发布设置
  const [title, setTitle] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState("")
  const [location, setLocation] = useState("")
  const [selectedCircle, setSelectedCircle] = useState({ id: 1, name: "八字命理研习社" })
  const [linkedProducts, setLinkedProducts] = useState<any[]>([])
  const [visibility, setVisibility] = useState<"public" | "circle">("public")
  const [showCircleSelect, setShowCircleSelect] = useState(false)
  const [showProductSelect, setShowProductSelect] = useState(false)
  
  // 视频帧用于封面选择
  const coverFrames = [0, 1, 2, 3, 4, 5, 6, 7]
  
  const addTopic = (topic: string) => {
    if (topic && !topics.includes(topic) && topics.length < 5) {
      setTopics([...topics, topic])
      setTopicInput("")
    }
  }
  
  const removeTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic))
  }
  
  const handlePublish = () => {
    // 发布逻辑
    alert("发布成功！")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/publish" />
          <h1 className="font-semibold text-base text-foreground">编辑视频</h1>
          <button 
            onClick={handlePublish}
            disabled={!title.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发布
          </button>
        </div>
      </header>

      <div className="pb-20">
        {/* 视频预览区 */}
        <div className="relative aspect-[9/16] max-h-[50vh] bg-black mx-4 mt-4 rounded-xl overflow-hidden">
          {/* 视频占位 */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <Play className="w-8 h-8 text-white/60 ml-1" />
              </div>
              <p className="text-white/40 text-xs">视频预览区</p>
            </div>
          </div>
          
          {/* 播放/暂停控制 */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 flex items-center justify-center"
          >
            {!isPlaying && (
              <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            )}
          </button>
          
          {/* 静音控制 */}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
          
          {/* 滤镜效果叠加层 */}
          {selectedFilter !== "none" && (
            <div className={`absolute inset-0 pointer-events-none ${
              selectedFilter === "shuimo" ? "mix-blend-multiply bg-gradient-to-br from-transparent to-slate-300/30" :
              selectedFilter === "xuanzhi" ? "bg-amber-50/20" :
              selectedFilter === "guofeng" ? "bg-gradient-to-br from-red-900/10 to-amber-900/10" :
              selectedFilter === "huaijiu" ? "sepia-[0.3]" :
              ""
            }`} />
          )}
        </div>

        {/* 编辑工具条 */}
        <div className="flex items-center justify-around px-4 py-4 border-b border-border">
          <button 
            onClick={() => setActiveTab(activeTab === "trim" ? null : "trim")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "trim" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scissors className="w-5 h-5" />
            <span className="text-xs">裁剪</span>
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === "filter" ? null : "filter")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "filter" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs">滤镜</span>
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === "music" ? null : "music")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "music" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Music className="w-5 h-5" />
            <span className="text-xs">音乐</span>
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === "cover" ? null : "cover")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "cover" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-xs">封面</span>
          </button>
        </div>

        {/* 编辑面板 */}
        {activeTab === "trim" && (
          <div className="px-4 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground mb-3">拖动滑块选择视频片段</p>
            <div className="relative h-12 bg-secondary rounded-lg overflow-hidden">
              {/* 时间轴缩略图 */}
              <div className="absolute inset-0 flex">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex-1 border-r border-border/30 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/10" />
                ))}
              </div>
              {/* 选择区域 */}
              <div 
                className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
                style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }}
              />
              {/* 左侧拖块 */}
              <div 
                className="absolute top-0 bottom-0 w-4 bg-primary rounded-l cursor-ew-resize flex items-center justify-center"
                style={{ left: `${trimStart}%` }}
              >
                <div className="w-0.5 h-4 bg-white rounded" />
              </div>
              {/* 右侧拖块 */}
              <div 
                className="absolute top-0 bottom-0 w-4 bg-primary rounded-r cursor-ew-resize flex items-center justify-center"
                style={{ right: `${100 - trimEnd}%` }}
              >
                <div className="w-0.5 h-4 bg-white rounded" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>00:00</span>
              <span>已选 {Math.round((trimEnd - trimStart) / 100 * 15)}秒</span>
              <span>00:15</span>
            </div>
          </div>
        )}

        {activeTab === "filter" && (
          <div className="px-4 py-4 border-b border-border">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2"
                >
                  <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedFilter === filter.id ? "border-primary" : "border-transparent"
                  }`}>
                    <div className={`w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center ${
                      filter.id === "shuimo" ? "from-slate-200 to-slate-400" :
                      filter.id === "xuanzhi" ? "from-amber-100 to-amber-200" :
                      filter.id === "guofeng" ? "from-red-100 to-amber-100" :
                      filter.id === "huaijiu" ? "from-yellow-100 to-orange-100" :
                      filter.id === "qingxin" ? "from-green-100 to-cyan-100" :
                      filter.id === "nuanyang" ? "from-orange-100 to-yellow-100" :
                      ""
                    }`}>
                      <Sparkles className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  </div>
                  <span className={`text-xs ${selectedFilter === filter.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "music" && (
          <div className="px-4 py-4 border-b border-border max-h-48 overflow-y-auto">
            {musicList.map(music => (
              <button
                key={music.id}
                onClick={() => setSelectedMusic(String(music.id))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedMusic === String(music.id) ? "bg-primary/10" : "hover:bg-secondary"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedMusic === String(music.id) ? "bg-primary" : "bg-secondary"
                }`}>
                  <Music className={`w-5 h-5 ${selectedMusic === String(music.id) ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm ${selectedMusic === String(music.id) ? "text-primary font-medium" : "text-foreground"}`}>
                    {music.name}
                  </p>
                  {music.artist && (
                    <p className="text-xs text-muted-foreground">{music.artist} · {music.duration}</p>
                  )}
                </div>
                {selectedMusic === String(music.id) && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === "cover" && (
          <div className="px-4 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground mb-3">从视频中选择封面</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {coverFrames.map((frame, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCover(index)}
                  className={`flex-shrink-0 w-16 aspect-[9/16] rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedCover === index ? "border-primary" : "border-transparent"
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                  </div>
                </button>
              ))}
              {/* 自定义上传 */}
              <button className="flex-shrink-0 w-16 aspect-[9/16] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">上传</span>
              </button>
            </div>
          </div>
        )}

        {/* 发布设置区 */}
        <div className="px-4 py-4 space-y-4">
          {/* 标题 */}
          <div>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="添加视频标题和描述，让更多人发现你的作品..."
              className="w-full h-20 p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={200}
            />
            <p className="text-right text-xs text-muted-foreground mt-1">{title.length}/200</p>
          </div>

          {/* 话题标签 */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">话题标签</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {topics.map(topic => (
                <Badge key={topic} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1">
                  #{topic}
                  <button onClick={() => removeTopic(topic)} className="p-0.5 rounded hover:bg-background/50">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {topics.length < 5 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">#</span>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTopic(topicInput)}
                    placeholder="添加话题"
                    className="w-20 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {hotTopics.filter(t => !topics.includes(t)).slice(0, 4).map(topic => (
                <button
                  key={topic}
                  onClick={() => addTopic(topic)}
                  className="px-2 py-1 bg-secondary rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  #{topic}
                </button>
              ))}
            </div>
          </div>

          {/* 位置 */}
          <button className="w-full flex items-center justify-between p-3 bg-secondary rounded-xl">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{location || "添加位置"}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* 关联圈子 */}
          <button 
            onClick={() => setShowCircleSelect(true)}
            className="w-full flex items-center justify-between p-3 bg-secondary rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {selectedCircle ? selectedCircle.name : "选择发布圈子"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* 关联商品 */}
          <button 
            onClick={() => setShowProductSelect(true)}
            className="w-full flex items-center justify-between p-3 bg-secondary rounded-xl"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {linkedProducts.length > 0 ? `已选 ${linkedProducts.length} 件商品` : "关联商品（可选）"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* 可见范围 */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
            <div className="flex items-center gap-3">
              {visibility === "public" ? (
                <Eye className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">谁可以看</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVisibility("public")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  visibility === "public" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                }`}
              >
                公开
              </button>
              <button
                onClick={() => setVisibility("circle")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  visibility === "circle" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                }`}
              >
                仅圈内
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部发布按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <button
          onClick={handlePublish}
          disabled={!title.trim()}
          className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
        >
          发布视频
        </button>
      </div>
    </div>
  )
}
