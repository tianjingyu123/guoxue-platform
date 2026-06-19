"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { 
  ChevronLeft, Check, Palette, Image, Sparkles, Gift, Heart, 
  Users, Upload, Plus, Eye, Lock, Crown, Trash2, Settings,
  Play, Pause, RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"

// 预设主题模版
const themeTemplates = [
  {
    id: "default",
    name: "默认主题",
    desc: "简洁大气，适合日常直播",
    primaryColor: "#8B5CF6",
    secondaryColor: "#A78BFA",
    bgGradient: "from-gray-900 to-gray-800",
    preview: "🎯",
    isFree: true,
    isUsing: true,
  },
  {
    id: "chinese",
    name: "新中式",
    desc: "古典韵味，国学文化氛围",
    primaryColor: "#DC2626",
    secondaryColor: "#F59E0B",
    bgGradient: "from-red-950 to-amber-950",
    preview: "🏮",
    isFree: true,
    isUsing: false,
  },
  {
    id: "spring",
    name: "春节喜庆",
    desc: "红红火火，节日氛围拉满",
    primaryColor: "#EF4444",
    secondaryColor: "#FCD34D",
    bgGradient: "from-red-600 to-red-900",
    preview: "🧧",
    isFree: false,
    isUsing: false,
  },
  {
    id: "mid-autumn",
    name: "中秋团圆",
    desc: "月圆人圆，温馨典雅",
    primaryColor: "#F59E0B",
    secondaryColor: "#FDE68A",
    bgGradient: "from-amber-900 to-orange-950",
    preview: "🥮",
    isFree: false,
    isUsing: false,
  },
  {
    id: "minimalist",
    name: "极简白",
    desc: "干净清爽，专注内容",
    primaryColor: "#6366F1",
    secondaryColor: "#818CF8",
    bgGradient: "from-slate-100 to-slate-200",
    preview: "⬜",
    isFree: true,
    isUsing: false,
  },
  {
    id: "ink",
    name: "水墨风",
    desc: "淡雅水墨，文人气质",
    primaryColor: "#374151",
    secondaryColor: "#9CA3AF",
    bgGradient: "from-stone-800 to-stone-900",
    preview: "🖌️",
    isFree: false,
    isUsing: false,
  },
]

// 挂件列表
const pendants = [
  { id: 1, name: "福字", icon: "福", position: "左上", isActive: true },
  { id: 2, name: "灯笼", icon: "🏮", position: "右上", isActive: false },
  { id: 3, name: "祥云", icon: "☁️", position: "顶部", isActive: false },
  { id: 4, name: "铜钱", icon: "🪙", position: "角落", isActive: true },
]

// 动效列表
const effects = [
  { id: 1, name: "入场特效", type: "enter", desc: "观众进入直播间动画", isEnabled: true },
  { id: 2, name: "点赞特效", type: "like", desc: "爱心上浮动画样式", isEnabled: true },
  { id: 3, name: "礼物特效", type: "gift", desc: "礼物飞屏动画", isEnabled: true },
  { id: 4, name: "弹幕样式", type: "danmaku", desc: "弹幕气泡外观", isEnabled: false },
]

export default function LiveThemePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("templates")
  const [selectedTheme, setSelectedTheme] = useState("default")
  const [customColor, setCustomColor] = useState("#8B5CF6")
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true)
  const [activePendants, setActivePendants] = useState<number[]>([1, 4])
  const [effectSettings, setEffectSettings] = useState({
    enter: true,
    like: true,
    gift: true,
    danmaku: false,
  })

  const currentTheme = themeTemplates.find(t => t.id === selectedTheme) || themeTemplates[0]

  const togglePendant = (id: number) => {
    setActivePendants(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const toggleEffect = (type: string) => {
    setEffectSettings(prev => ({
      ...prev,
      [type]: !prev[type as keyof typeof prev]
    }))
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">直播间装修</h1>
          </div>
          <Button size="sm">
            保存配置
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* 左侧配置区 */}
        <div className="flex-1 p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="templates" className="text-xs">
                <Palette className="w-3.5 h-3.5 mr-1" />
                主题模版
              </TabsTrigger>
              <TabsTrigger value="elements" className="text-xs">
                <Image className="w-3.5 h-3.5 mr-1" />
                视觉元素
              </TabsTrigger>
              <TabsTrigger value="effects" className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                动效配置
              </TabsTrigger>
            </TabsList>

            {/* 主题模版Tab */}
            <TabsContent value="templates" className="mt-4 space-y-4">
              {/* 预设模版 */}
              <div>
                <h3 className="text-sm font-medium mb-3">预设氛围模版</h3>
                <div className="grid grid-cols-2 gap-3">
                  {themeTemplates.map(theme => (
                    <Card 
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={cn(
                        "relative overflow-hidden cursor-pointer transition-all",
                        selectedTheme === theme.id 
                          ? "ring-2 ring-primary ring-offset-2" 
                          : "hover:shadow-md"
                      )}
                    >
                      {/* 主题预览 */}
                      <div className={cn(
                        "h-20 bg-gradient-to-br flex items-center justify-center",
                        theme.bgGradient
                      )}>
                        <span className="text-3xl">{theme.preview}</span>
                        
                        {/* 选中标记 */}
                        {selectedTheme === theme.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        {/* 付费标记 */}
                        {!theme.isFree && (
                          <Badge className="absolute top-2 left-2 bg-amber-500 text-[10px] px-1.5">
                            <Crown className="w-2.5 h-2.5 mr-0.5" />
                            会员
                          </Badge>
                        )}
                        
                        {/* 使用中标记 */}
                        {theme.isUsing && (
                          <Badge className="absolute bottom-2 right-2 bg-green-500 text-[10px]">
                            使用中
                          </Badge>
                        )}
                      </div>
                      
                      {/* 主题信息 */}
                      <div className="p-2.5">
                        <h4 className="text-sm font-medium">{theme.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{theme.desc}</p>
                        
                        {/* 主色调预览 */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.secondaryColor }}
                          />
                          <span className="text-[10px] text-muted-foreground ml-1">主色调</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 自定义主题 */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">自定义主题</h3>
                  <Badge variant="outline" className="text-[10px]">
                    <Crown className="w-2.5 h-2.5 mr-0.5" />
                    高级会员专享
                  </Badge>
                </div>

                {/* 品牌Logo上传 */}
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-2 block">品牌Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>支持PNG/JPG格式</p>
                      <p>建议尺寸200x200px</p>
                    </div>
                  </div>
                </div>

                {/* 主色调选择 */}
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-2 block">主色调</label>
                  <div className="flex items-center gap-2">
                    {["#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"].map(color => (
                      <button
                        key={color}
                        onClick={() => setCustomColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-transform",
                          customColor === color ? "scale-110 border-white shadow-lg" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <label className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                      <input type="color" className="absolute w-0 h-0 opacity-0" />
                    </label>
                  </div>
                </div>

                {/* 背景图上传 */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">自定义背景</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-muted-foreground mx-auto" />
                        <span className="text-[10px] text-muted-foreground mt-1 block">上传图片</span>
                      </div>
                    </div>
                    <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                      <div className="text-center">
                        <Play className="w-5 h-5 text-muted-foreground mx-auto" />
                        <span className="text-[10px] text-muted-foreground mt-1 block">上传视频</span>
                      </div>
                    </div>
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center cursor-pointer">
                      <span className="text-[10px] text-white font-medium">绿幕</span>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* 视觉元素Tab */}
            <TabsContent value="elements" className="mt-4 space-y-4">
              {/* 背景设置 */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">背景设置</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">背景模糊</span>
                    <div className="w-32">
                      <Slider defaultValue={[30]} max={100} step={10} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">背景暗度</span>
                    <div className="w-32">
                      <Slider defaultValue={[50]} max={100} step={10} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* 挂件配置 */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">直播间挂件</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    添加挂件
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {pendants.map(pendant => (
                    <div 
                      key={pendant.id}
                      onClick={() => togglePendant(pendant.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        activePendants.includes(pendant.id) 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
                        {pendant.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{pendant.name}</p>
                        <p className="text-[10px] text-muted-foreground">位置：{pendant.position}</p>
                      </div>
                      <Switch 
                        checked={activePendants.includes(pendant.id)} 
                        onCheckedChange={() => togglePendant(pendant.id)}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* 组件样式 */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">UI组件样式</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">观众列表样式</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">头像堆叠</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">礼物栏样式</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">底部横条</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">弹幕气泡样式</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">圆角气泡</Badge>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* 动效配置Tab */}
            <TabsContent value="effects" className="mt-4 space-y-4">
              {/* 动效开关 */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">动效开关</h3>
                <div className="space-y-3">
                  {effects.map(effect => (
                    <div 
                      key={effect.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          effectSettings[effect.type as keyof typeof effectSettings] 
                            ? "bg-primary/10 text-primary" 
                            : "bg-secondary text-muted-foreground"
                        )}>
                          {effect.type === "enter" && <Users className="w-5 h-5" />}
                          {effect.type === "like" && <Heart className="w-5 h-5" />}
                          {effect.type === "gift" && <Gift className="w-5 h-5" />}
                          {effect.type === "danmaku" && <Sparkles className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{effect.name}</p>
                          <p className="text-[10px] text-muted-foreground">{effect.desc}</p>
                        </div>
                      </div>
                      <Switch 
                        checked={effectSettings[effect.type as keyof typeof effectSettings]}
                        onCheckedChange={() => toggleEffect(effect.type)}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* 入场特效设置 */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">入场特效样式</h3>
                <div className="grid grid-cols-3 gap-2">
                  {["祥云入场", "金光闪烁", "简约淡入", "烟花绽放", "波纹扩散", "无特效"].map((style, idx) => (
                    <div 
                      key={style}
                      className={cn(
                        "p-3 rounded-lg border text-center cursor-pointer transition-colors",
                        idx === 0 ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary mx-auto mb-1.5 flex items-center justify-center text-sm">
                        {idx === 0 ? "☁️" : idx === 1 ? "✨" : idx === 2 ? "💫" : idx === 3 ? "🎆" : idx === 4 ? "🌊" : "⬜"}
                      </div>
                      <span className="text-[10px]">{style}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 点赞动效设置 */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">点赞动效样式</h3>
                <div className="grid grid-cols-4 gap-2">
                  {["❤️ 爱心", "👍 点赞", "🌸 花瓣", "⭐ 星星"].map((style, idx) => (
                    <div 
                      key={style}
                      className={cn(
                        "p-2 rounded-lg border text-center cursor-pointer transition-colors",
                        idx === 0 ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <span className="text-xs">{style}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧预览区 */}
        <div className="lg:w-80 p-4 lg:border-l border-border">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
              <span className="text-xs font-medium">实时预览</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary"
                >
                  {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {/* 直播间预览 */}
            <div className={cn(
              "aspect-[9/16] relative overflow-hidden bg-gradient-to-br",
              currentTheme.bgGradient
            )}>
              {/* 顶部信息栏 */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                  <Avatar className="w-6 h-6 border border-white/30">
                    <AvatarFallback className="text-[10px]">主</AvatarFallback>
                  </Avatar>
                  <span className="text-white text-[10px]">主播昵称</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                  <Eye className="w-3 h-3 text-white/70" />
                  <span className="text-white text-[10px]">1.2万</span>
                </div>
              </div>

              {/* 挂件预览 */}
              {activePendants.includes(1) && (
                <div className="absolute top-12 left-3 text-2xl opacity-80">福</div>
              )}
              {activePendants.includes(4) && (
                <div className="absolute top-12 right-3 text-xl opacity-80">🪙</div>
              )}

              {/* 弹幕预览 */}
              <div className="absolute left-3 bottom-32 space-y-1.5 max-w-[70%]">
                <div className="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full">
                  <span className="text-[10px] text-white">
                    <span className="text-amber-400 mr-1">用户A</span>
                    老师讲得真好！
                  </span>
                </div>
                <div className="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full">
                  <span className="text-[10px] text-white">
                    <span className="text-amber-400 mr-1">用户B</span>
                    涨知识了
                  </span>
                </div>
              </div>

              {/* 点赞动画预览 */}
              {effectSettings.like && isPreviewPlaying && (
                <div className="absolute right-6 bottom-40 space-y-2 animate-ai-float">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500 opacity-80" />
                  <Heart className="w-4 h-4 text-red-500 fill-red-500 opacity-60" />
                  <Heart className="w-3 h-3 text-red-500 fill-red-500 opacity-40" />
                </div>
              )}

              {/* 底部操作栏 */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-8 px-3 bg-white/10 backdrop-blur-sm rounded-full flex items-center">
                    <span className="text-[10px] text-white/50">说点什么...</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* 主题色指示 */}
              <div className="absolute bottom-16 left-3 right-3">
                <div 
                  className="h-1 rounded-full opacity-50"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
              </div>
            </div>
          </Card>

          {/* 当前配置摘要 */}
          <Card className="mt-4 p-3">
            <h4 className="text-xs font-medium mb-2">当前配置</h4>
            <div className="space-y-1.5 text-[10px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>主题模版</span>
                <span className="font-medium text-foreground">{currentTheme.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>已启用挂件</span>
                <span className="font-medium text-foreground">{activePendants.length}个</span>
              </div>
              <div className="flex items-center justify-between">
                <span>已启用动效</span>
                <span className="font-medium text-foreground">
                  {Object.values(effectSettings).filter(Boolean).length}个
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-pb">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            重置默认
          </Button>
          <Button className="flex-1">
            保存并应用
          </Button>
        </div>
      </div>
    </div>
  )
}
