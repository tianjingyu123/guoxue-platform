"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Upload, Camera, Video, Monitor, Smartphone, 
  Sparkles, Image as ImageIcon, Palette, Users, Mic, MicOff,
  ShoppingBag, Plus, Search, X, ChevronDown, ChevronUp,
  Clock, Calendar, BookOpen, Radio, Settings, Eye, EyeOff,
  Play, Trash2, GripVertical, Zap, Crown, Ban, MessageSquare,
  Wand2, Film, Layers, UserPlus, MoreHorizontal, Check
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"

// 圈子列表
const circleList = [
  { id: 1, name: "易学研习社", avatar: "", members: 2860 },
  { id: 2, name: "紫微斗数交流群", avatar: "", members: 1580 },
  { id: 3, name: "风水布局研究会", avatar: "", members: 960 },
]

// 滤镜预设
const filterPresets = [
  { id: 1, name: "原图", preview: "", value: "none" },
  { id: 2, name: "国风", preview: "", value: "guofeng" },
  { id: 3, name: "宣纸", preview: "", value: "xuanzhi" },
  { id: 4, name: "水墨", preview: "", value: "shuimo" },
  { id: 5, name: "日系", preview: "", value: "rixi" },
  { id: 6, name: "复古", preview: "", value: "fugu" },
]

// 虚拟背景
const virtualBackgrounds = [
  { id: 1, name: "书房", preview: "", type: "image" },
  { id: 2, name: "山水", preview: "", type: "image" },
  { id: 3, name: "茶室", preview: "", type: "image" },
  { id: 4, name: "竹林", preview: "", type: "video" },
  { id: 5, name: "自定义", preview: "", type: "custom" },
]

// 直播间主题皮肤
const themeSkins = [
  { id: 1, name: "默认", preview: "", color: "from-gray-500 to-gray-600" },
  { id: 2, name: "国风红", preview: "", color: "from-red-500 to-rose-600" },
  { id: 3, name: "墨韵", preview: "", color: "from-gray-800 to-gray-900" },
  { id: 4, name: "青花", preview: "", color: "from-blue-500 to-indigo-600" },
  { id: 5, name: "金玉", preview: "", color: "from-amber-500 to-yellow-500" },
]

// 商品列表
const productList = [
  { id: 1, name: "渊海子平精装版", price: 98, image: "", stock: 156 },
  { id: 2, name: "专业罗盘（铜制）", price: 398, image: "", stock: 28 },
  { id: 3, name: "五帝钱开光套装", price: 88, image: "", stock: 89 },
  { id: 4, name: "八字精批课程", price: 199, image: "", stock: 999 },
]

// 可添加的主播/副播
const availableHosts = [
  { id: 1, name: "紫微大师", avatar: "", role: "讲师", isOnline: true },
  { id: 2, name: "易道先生", avatar: "", role: "圈主", isOnline: true },
  { id: 3, name: "风水学徒", avatar: "", role: "助教", isOnline: false },
]

export default function CreateLivePage() {
  const router = useRouter()
  
  // 基础信息
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [liveType, setLiveType] = useState<"knowledge" | "commerce">("knowledge")
  const [startTime, setStartTime] = useState("")
  const [duration, setDuration] = useState("60")
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null)
  
  // 推流模式
  const [streamMode, setStreamMode] = useState<"mobile" | "obs">("mobile")
  
  // 视觉配置
  const [beautySettings, setBeautySettings] = useState({
    smooth: 50,
    thin: 30,
    whiten: 40,
  })
  const [selectedFilter, setSelectedFilter] = useState("none")
  const [selectedBackground, setSelectedBackground] = useState<number | null>(null)
  const [enableGreenScreen, setEnableGreenScreen] = useState(false)
  const [enablePIP, setEnablePIP] = useState(true)
  
  // 高级设置
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [enableConnect, setEnableConnect] = useState(true)
  const [connectSlots, setConnectSlots] = useState(4)
  const [isPaid, setIsPaid] = useState(false)
  const [price, setPrice] = useState("")
  const [enableReplay, setEnableReplay] = useState(true)
  const [selectedTheme, setSelectedTheme] = useState(1)
  const [enableFilter, setEnableFilter] = useState(true)
  const [enableMute, setEnableMute] = useState(false)
  
  // 商品管理
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [seckillProductId, setSeckillProductId] = useState<number | null>(null)
  
  // 主播管理
  const [hosts, setHosts] = useState<{ id: number; role: "main" | "sub" }[]>([])
  const [showHostPicker, setShowHostPicker] = useState(false)
  const [hostSearchQuery, setHostSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-lg font-semibold">创建直播</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Settings className="w-4 h-4 mr-1" />
            更多设置
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ===== 基础信息区 ===== */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            基础信息
          </h2>
          
          {/* 封面上传 */}
          <div className="flex gap-4 mb-4">
            <div className="relative">
              {coverImage ? (
                <div className="w-28 h-40 rounded-lg overflow-hidden relative group">
                  <img src={coverImage} alt="封面" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary" className="h-7 text-xs">更换</Button>
                  </div>
                </div>
              ) : (
                <button className="w-28 h-40 rounded-lg border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">上传封面</span>
                  <span className="text-[10px] text-muted-foreground">9:16比例</span>
                </button>
              )}
              <Badge className="absolute -top-2 -right-2 text-[10px] bg-primary border-0">必填</Badge>
            </div>
            
            <div className="flex-1 space-y-3">
              {/* 直播标题 */}
              <div>
                <Input
                  placeholder="输入直播标题（5-30字）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm"
                  maxLength={30}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{title.length}/30</p>
              </div>
              
              {/* 直播类型 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setLiveType("knowledge")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                    liveType === "knowledge" 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  知识授课
                </button>
                <button
                  onClick={() => setLiveType("commerce")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                    liveType === "commerce" 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  电商带货
                </button>
              </div>
            </div>
          </div>
          
          {/* 直播简介 */}
          <Textarea
            placeholder="输入直播简介，让观众了解本场直播内容..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-sm resize-none mb-4"
            rows={2}
          />
          
          {/* 时间设置 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">开播时间</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">预计时长</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm appearance-none cursor-pointer"
                >
                  <option value="30">30分钟</option>
                  <option value="60">1小时</option>
                  <option value="90">1.5小时</option>
                  <option value="120">2小时</option>
                  <option value="180">3小时</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* 所属圈子 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">所属圈子</label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {circleList.map(circle => (
                <button
                  key={circle.id}
                  onClick={() => setSelectedCircle(circle.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0 transition-colors",
                    selectedCircle === circle.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{circle.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{circle.name}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ===== 推流模式区 ===== */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            推流模式
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStreamMode("mobile")}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all",
                streamMode === "mobile" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  streamMode === "mobile" ? "bg-primary text-white" : "bg-secondary"
                )}>
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">手机/Web端</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">竖屏直播，适合展示人像</p>
                </div>
              </div>
              {streamMode === "mobile" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
            
            <button
              onClick={() => setStreamMode("obs")}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all",
                streamMode === "obs" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  streamMode === "obs" ? "bg-primary text-white" : "bg-secondary"
                )}>
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">OBS推流</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">横屏授课，适合展示课件</p>
                </div>
              </div>
              {streamMode === "obs" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <Badge className="absolute top-2 left-2 text-[9px] bg-violet-500 border-0">专业</Badge>
            </button>
          </div>
          
          {/* OBS��式下显示推流地址 */}
          {streamMode === "obs" && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">推流地址将在创建后生成，请使用OBS等推流软件进行直播。</p>
              <Button size="sm" variant="outline" className="text-xs h-7">
                查看OBS配置教程
              </Button>
            </div>
          )}
        </Card>

        {/* ===== 视觉与场景配置区 ===== */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            视觉与场景配置
          </h2>
          
          {/* 美颜设置 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium">美颜调节</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs text-primary">
                <Wand2 className="w-3 h-3 mr-1" />
                一键美颜
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { key: "smooth", label: "磨皮", value: beautySettings.smooth },
                { key: "thin", label: "瘦脸", value: beautySettings.thin },
                { key: "whiten", label: "美白", value: beautySettings.whiten },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8">{item.label}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={item.value}
                    onChange={(e) => setBeautySettings(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))}
                    className="flex-1 h-1 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* 滤镜选择 */}
          <div className="mb-4">
            <span className="text-xs font-medium mb-2 block">滤镜效果</span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {filterPresets.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.value)}
                  className={cn(
                    "flex-shrink-0 w-14 text-center",
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 mb-1 border-2 transition-colors",
                    selectedFilter === filter.value ? "border-primary" : "border-transparent"
                  )} />
                  <span className={cn(
                    "text-[10px]",
                    selectedFilter === filter.value ? "text-primary font-medium" : "text-muted-foreground"
                  )}>{filter.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* 虚拟背景 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">虚拟背景</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">绿幕抠图</span>
                <Switch checked={enableGreenScreen} onCheckedChange={setEnableGreenScreen} />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">上传</span>
              </button>
              {virtualBackgrounds.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBackground(bg.id)}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-2 transition-colors overflow-hidden",
                    selectedBackground === bg.id ? "border-primary" : "border-transparent"
                  )}
                >
                  {bg.type === "video" && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-2 h-2 text-white fill-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] py-0.5 text-center">{bg.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* OBS模式下的画中画设置 */}
          {streamMode === "obs" && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">人像画中画</p>
                  <p className="text-[10px] text-muted-foreground">将主播人像叠加在课件上</p>
                </div>
              </div>
              <Switch checked={enablePIP} onCheckedChange={setEnablePIP} />
            </div>
          )}
        </Card>

        {/* ===== 高级功能配置区（折叠） ===== */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4"
          >
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              高级功能配置
            </h2>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-4">
              {/* 连麦设置 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">开启连麦</span>
                </div>
                <div className="flex items-center gap-2">
                  {enableConnect && (
                    <select
                      value={connectSlots}
                      onChange={(e) => setConnectSlots(parseInt(e.target.value))}
                      className="h-7 px-2 rounded border border-input bg-background text-xs"
                    >
                      <option value={2}>2个麦位</option>
                      <option value={4}>4个麦位</option>
                      <option value={6}>6个麦位</option>
                    </select>
                  )}
                  <Switch checked={enableConnect} onCheckedChange={setEnableConnect} />
                </div>
              </div>
              
              {/* 付费设置 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">付费观看</span>
                </div>
                <div className="flex items-center gap-2">
                  {isPaid && (
                    <Input
                      type="number"
                      placeholder="价格"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-20 h-7 text-xs"
                    />
                  )}
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                </div>
              </div>
              
              {/* 回放设置 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">开启回放</span>
                </div>
                <Switch checked={enableReplay} onCheckedChange={setEnableReplay} />
              </div>
              
              {/* 直播间主题 */}
              <div>
                <span className="text-xs mb-2 block">直播间皮肤</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {themeSkins.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className="flex-shrink-0 text-center"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-lg bg-gradient-to-br mb-1 border-2 transition-colors",
                        theme.color,
                        selectedTheme === theme.id ? "border-primary" : "border-transparent"
                      )} />
                      <span className={cn(
                        "text-[10px]",
                        selectedTheme === theme.id ? "text-primary font-medium" : "text-muted-foreground"
                      )}>{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 敏感词过滤 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">敏感词过滤</span>
                </div>
                <Switch checked={enableFilter} onCheckedChange={setEnableFilter} />
              </div>
              
              {/* 观众禁言 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">全员禁言</span>
                </div>
                <Switch checked={enableMute} onCheckedChange={setEnableMute} />
              </div>
            </div>
          )}
        </Card>

        {/* ===== 商品管理区（电商带货可见） ===== */}
        {liveType === "commerce" && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                商品管理
              </h2>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowProductPicker(true)}>
                <Plus className="w-3 h-3 mr-1" />
                添加商品
              </Button>
            </div>
            
            {selectedProducts.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">暂未添加商品</p>
                <p className="text-xs text-muted-foreground mt-1">从商城选品添加到直播购物袋</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((productId, index) => {
                  const product = productList.find(p => p.id === productId)
                  if (!product) return null
                  return (
                    <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">{index + 1}</span>
                      <div className="w-12 h-12 rounded-lg bg-secondary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-primary">¥{product.price}</p>
                      </div>
                      {seckillProductId === product.id ? (
                        <Badge className="text-[10px] bg-red-500 border-0">秒杀</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-muted-foreground"
                          onClick={() => setSeckillProductId(product.id)}
                        >
                          <Zap className="w-3 h-3 mr-0.5" />
                          设为秒杀
                        </Button>
                      )}
                      <button onClick={() => setSelectedProducts(prev => prev.filter(id => id !== product.id))}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* ===== 直播团队管理区 ===== */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              直播团队管理
            </h2>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowHostPicker(true)}>
              <UserPlus className="w-3 h-3 mr-1" />
              添加成员
            </Button>
          </div>
          
          {/* 角色权限说明 */}
          <div className="mb-4 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
            <p className="font-medium text-foreground mb-2">角色权限说明：</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <p><Badge className="mr-1 text-[8px] bg-red-500 border-0">主播</Badge>最高权限，管理所有</p>
              <p><Badge className="mr-1 text-[8px] bg-orange-500 border-0">副播</Badge>推商品/券/抽奖/弹幕</p>
              <p><Badge className="mr-1 text-[8px] bg-blue-500 border-0">场控</Badge>后台配置/数据监控</p>
              <p><Badge className="mr-1 text-[8px] bg-green-500 border-0">嘉宾</Badge>仅参与连麦互动</p>
            </div>
          </div>
          
          {/* 当前用户（主播/Owner） */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
            <Avatar className="w-10 h-10 border-2 border-primary">
              <AvatarFallback className="bg-primary text-white">我</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">我</span>
                <Badge className="text-[10px] bg-red-500 border-0">主播 Owner</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">创建/编辑/删除直播，管理所有成员，获取推流码</p>
            </div>
          </div>
          
          {/* 已添加的团队成员 */}
          {hosts.length > 0 && (
            <div className="space-y-2">
              {hosts.map(host => {
                const hostInfo = availableHosts.find(h => h.id === host.id)
                if (!hostInfo) return null
                const roleColor = host.role === "cohost" ? "bg-orange-500" : host.role === "operator" ? "bg-blue-500" : "bg-green-500"
                const roleLabel = host.role === "cohost" ? "副播" : host.role === "operator" ? "场控" : "嘉宾"
                const roleDesc = host.role === "cohost" ? "推送商品/优惠券/抽奖/弹幕管理" : host.role === "operator" ? "后台配置/数据监控/复盘" : "连麦互动"
                return (
                  <div key={host.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{hostInfo.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{hostInfo.name}</span>
                        <Badge className={cn("text-[10px] border-0", roleColor)}>{roleLabel}</Badge>
                        {hostInfo.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{hostInfo.role} · {roleDesc}</p>
                    </div>
                    <button onClick={() => setHosts(prev => prev.filter(h => h.id !== host.id))}>
                      <X className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          
          {hosts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              添加团队成员来协助管理直播间。副播可推送商品/优惠券/抽奖，场控负责后台配置和数据监控。
            </p>
          )}
        </Card>
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 p-4">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            保存草稿
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90">
            <Radio className="w-4 h-4 mr-2" />
            创建直播
          </Button>
        </div>
      </div>

      {/* ===== 商品选择弹窗 ===== */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowProductPicker(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">选择商品</h3>
              <button onClick={() => setShowProductPicker(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索商品" className="pl-9" />
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {productList.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (selectedProducts.includes(product.id)) {
                        setSelectedProducts(prev => prev.filter(id => id !== product.id))
                      } else {
                        setSelectedProducts(prev => [...prev, product.id])
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      selectedProducts.includes(product.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="w-14 h-14 rounded-lg bg-secondary flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-primary">¥{product.price}</p>
                      <p className="text-[10px] text-muted-foreground">库存 {product.stock}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedProducts.includes(product.id) 
                        ? "border-primary bg-primary" 
                        : "border-border"
                    )}>
                      {selectedProducts.includes(product.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <Button className="w-full" onClick={() => setShowProductPicker(false)}>
                确定添加 ({selectedProducts.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 副播选择弹窗 ===== */}
      {showHostPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowHostPicker(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">添加团队成员</h3>
              <button onClick={() => setShowHostPicker(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索圈子成员或签约讲师" 
                  className="pl-9"
                  value={hostSearchQuery}
                  onChange={(e) => setHostSearchQuery(e.target.value)}
                />
              </div>
              
              {/* 角色选择说明 */}
              <div className="mb-4 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground mb-1">选择成员后请指定角色：</p>
                <p>· 副播：推送商品/优惠券/抽奖/弹幕管理</p>
                <p>· 场控：后台配置/数据监控/复盘</p>
                <p>· 嘉宾：仅参与连麦互动</p>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3">从圈子成员中选择</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {availableHosts.map(host => {
                  const addedHost = hosts.find(h => h.id === host.id)
                  const isAdded = !!addedHost
                  return (
                    <div
                      key={host.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        isAdded ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{host.name[0]}</AvatarFallback>
                        </Avatar>
                        {host.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{host.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{host.role}</Badge>
                          {host.isOnline && <span className="text-[10px] text-green-500">在线</span>}
                        </div>
                        {/* 角色选择 */}
                        {isAdded ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            {["cohost", "operator", "guest"].map(role => {
                              const roleInfo = {
                                cohost: { label: "副播", color: "bg-orange-500" },
                                operator: { label: "场控", color: "bg-blue-500" },
                                guest: { label: "嘉宾", color: "bg-green-500" },
                              }[role]!
                              return (
                                <button
                                  key={role}
                                  onClick={() => setHosts(prev => prev.map(h => h.id === host.id ? { ...h, role } : h))}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] transition-colors",
                                    addedHost?.role === role ? `${roleInfo.color} text-white` : "bg-secondary text-muted-foreground"
                                  )}
                                >
                                  {roleInfo.label}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground mt-0.5">点击添加到团队</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (isAdded) {
                            setHosts(prev => prev.filter(h => h.id !== host.id))
                          } else {
                            setHosts(prev => [...prev, { id: host.id, role: "cohost" }])
                          }
                        }}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          isAdded ? "border-primary bg-primary" : "border-border hover:border-primary/50"
                        )}
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <Button className="w-full" onClick={() => setShowHostPicker(false)}>
                完成添加 ({hosts.length}人)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
