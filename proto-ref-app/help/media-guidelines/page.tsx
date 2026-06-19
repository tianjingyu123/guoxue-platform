"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Image, Video, FileText, BookOpen, Radio, ShoppingBag, 
  Users, Calendar, Trophy, HelpCircle, Check, X, AlertTriangle,
  Smartphone, Monitor, Square, RectangleHorizontal, RectangleVertical,
  Info, Lightbulb
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 各板块素材规范
const mediaSpecs = [
  {
    id: "article",
    name: "文章",
    icon: FileText,
    color: "bg-blue-500",
    description: "图文内容创作，支持长文排版",
    cover: {
      recommended: "16:9 横版",
      size: "1200 x 675px",
      minSize: "800 x 450px",
      maxSize: "4096 x 4096px",
      format: "JPG、PNG、WebP",
      maxFileSize: "10MB",
    },
    content: {
      images: {
        recommended: "正文图片建议宽度1080px",
        ratio: "不限，自动适配",
        maxCount: 20,
        tips: "横版图更适合阅读体验",
      },
    },
    adaptRules: [
      { case: "无封面图", handle: "显示文章摘要+渐变背景", status: "ok" },
      { case: "竖版封面", handle: "居中裁切为16:9", status: "warn" },
      { case: "超大图片", handle: "自动压缩至合理大小", status: "ok" },
      { case: "图片过小", handle: "放大并模糊背景填充", status: "warn" },
    ],
  },
  {
    id: "post",
    name: "帖子",
    icon: FileText,
    color: "bg-green-500",
    description: "轻量内容分享，类似朋友圈",
    cover: null,
    content: {
      images: {
        recommended: "1:1 方形 或 4:3 横版",
        size: "1080 x 1080px 或 1080 x 810px",
        ratio: "1:1 / 4:3 / 3:4 / 16:9 / 9:16",
        maxCount: 9,
        tips: "1-9张图片，自动适配网格布局",
      },
    },
    adaptRules: [
      { case: "无图片", handle: "纯文字卡片，显示完整内容", status: "ok" },
      { case: "单图横版", handle: "保持比例，aspect-video", status: "ok" },
      { case: "单图竖版", handle: "保持比例，限宽70%", status: "ok" },
      { case: "单图方形", handle: "保持比例，限宽80%", status: "ok" },
      { case: "2张图", handle: "2列并排，各50%", status: "ok" },
      { case: "3张图", handle: "1大+2小布局", status: "ok" },
      { case: "4张图", handle: "2x2网格", status: "ok" },
      { case: "5-9张图", handle: "3列网格", status: "ok" },
      { case: "超过9张", handle: "显示前9张，+N提示", status: "ok" },
      { case: "混合比例", handle: "统一裁切为方形", status: "warn" },
    ],
  },
  {
    id: "video",
    name: "短视频",
    icon: Video,
    color: "bg-red-500",
    description: "短视频内容，支持横竖屏",
    cover: {
      recommended: "与视频比例一致",
      size: "横版 1920x1080 / 竖版 1080x1920",
      format: "JPG、PNG",
      maxFileSize: "5MB",
      tips: "不上传则自动截取视频首帧",
    },
    content: {
      video: {
        horizontal: { ratio: "16:9", size: "1920 x 1080px", desc: "横版视频" },
        vertical: { ratio: "9:16", size: "1080 x 1920px", desc: "竖版视频（推荐）" },
        square: { ratio: "1:1", size: "1080 x 1080px", desc: "方形视频" },
        format: "MP4、MOV、WebM",
        maxDuration: "15分钟",
        maxFileSize: "500MB",
        codec: "H.264 推荐",
      },
    },
    adaptRules: [
      { case: "横版视频", handle: "信息流横版卡片，详情页16:9播放", status: "ok" },
      { case: "竖版视频", handle: "信息流竖版卡片，详情页全屏播放", status: "ok" },
      { case: "方形视频", handle: "信息流方形卡片，保持1:1", status: "ok" },
      { case: "非标准比例", handle: "自动检测最接近比例，黑边填充", status: "warn" },
      { case: "无封面", handle: "自动截取视频第1秒画面", status: "ok" },
      { case: "封面与视频比例不同", handle: "封面居中裁切适配", status: "warn" },
    ],
  },
  {
    id: "course",
    name: "课程",
    icon: BookOpen,
    color: "bg-purple-500",
    description: "在线课程，支持章节管理",
    cover: {
      recommended: "16:9 横版",
      size: "1280 x 720px",
      minSize: "640 x 360px",
      format: "JPG、PNG",
      maxFileSize: "5MB",
      tips: "课程封面会在多处展示，建议精心设计",
    },
    content: {
      video: {
        recommended: "16:9 横版",
        size: "1920 x 1080px（1080P）",
        format: "MP4",
        maxDuration: "单节不超过60分钟",
        maxFileSize: "2GB/节",
        tips: "建议每节10-30分钟，便于学习",
      },
      materials: {
        format: "PDF、PPT、Word、图片",
        maxFileSize: "50MB/个",
        tips: "配套资料提升学习效果",
      },
    },
    adaptRules: [
      { case: "无封面", handle: "使用默认课程封面模板", status: "warn" },
      { case: "竖版封面", handle: "居中裁切为16:9", status: "warn" },
      { case: "视频非16:9", handle: "保持原比例，两侧黑边", status: "ok" },
      { case: "超长视频", handle: "建议拆分章节", status: "warn" },
    ],
  },
  {
    id: "live",
    name: "直播",
    icon: Radio,
    color: "bg-orange-500",
    description: "实时直播，互动教学",
    cover: {
      recommended: "16:9 横版",
      size: "1280 x 720px",
      format: "JPG、PNG",
      maxFileSize: "5MB",
      tips: "直播封面吸引观众进入，建议突出主题",
    },
    content: {
      stream: {
        recommended: "16:9 横版推流",
        resolution: "1920x1080 或 1280x720",
        bitrate: "2500-6000 Kbps",
        fps: "30fps",
        tips: "稳定网络环境确保直播质量",
      },
    },
    adaptRules: [
      { case: "竖版推流", handle: "支持竖屏直播，手机观看体验更好", status: "ok" },
      { case: "低分辨率", handle: "自动适配，提示升级画质", status: "warn" },
      { case: "无封面", handle: "使用主播头像+直播标题生成", status: "ok" },
    ],
  },
  {
    id: "product",
    name: "商品",
    icon: ShoppingBag,
    color: "bg-amber-500",
    description: "商品展示，支持多图",
    cover: {
      recommended: "1:1 方形（主图）",
      size: "800 x 800px",
      minSize: "480 x 480px",
      format: "JPG、PNG",
      maxFileSize: "5MB",
      tips: "白底图或场景图，主图决定点击率",
    },
    content: {
      images: {
        recommended: "1:1 方形",
        size: "800 x 800px",
        maxCount: 9,
        tips: "建议5张以上，展示多角度",
        order: "主图 → 细节图 → 场景图 → 尺寸图",
      },
      detail: {
        recommended: "宽度750px长图",
        format: "JPG、PNG",
        tips: "详情页长图展示商品信息",
      },
    },
    adaptRules: [
      { case: "非方形主图", handle: "居中裁切为1:1", status: "warn" },
      { case: "图片过少", handle: "正常展示，建议补充", status: "warn" },
      { case: "横版商品图", handle: "列表页裁切，详情页完整", status: "ok" },
      { case: "白底/场景混合", handle: "主图白底，其余不限", status: "ok" },
    ],
  },
  {
    id: "circle",
    name: "圈子",
    icon: Users,
    color: "bg-indigo-500",
    description: "圈子封面和背景",
    cover: {
      recommended: "1:1 方形（头像）",
      size: "400 x 400px",
      format: "JPG、PNG",
      maxFileSize: "2MB",
    },
    content: {
      banner: {
        recommended: "3:1 横幅",
        size: "1200 x 400px",
        format: "JPG、PNG",
        maxFileSize: "5MB",
        tips: "圈子主页顶部横幅",
      },
    },
    adaptRules: [
      { case: "无头像", handle: "使用圈子名称首字生成", status: "ok" },
      { case: "无横幅", handle: "使用默认渐变背景", status: "ok" },
      { case: "横幅比例不对", handle: "居中裁切为3:1", status: "warn" },
    ],
  },
  {
    id: "activity",
    name: "活动",
    icon: Calendar,
    color: "bg-pink-500",
    description: "线上/线下活动",
    cover: {
      recommended: "16:9 横版",
      size: "1200 x 675px",
      format: "JPG、PNG",
      maxFileSize: "5MB",
      tips: "活动封面需突出主题和时间",
    },
    content: {
      poster: {
        recommended: "9:16 竖版海报",
        size: "1080 x 1920px",
        format: "JPG、PNG",
        tips: "用于分享传播",
      },
      images: {
        recommended: "活动现场图",
        maxCount: 20,
        tips: "活动结束后上传精彩瞬间",
      },
    },
    adaptRules: [
      { case: "无封面", handle: "使用活动标题+时间生成", status: "warn" },
      { case: "竖版封面", handle: "列表裁切16:9，详情完整展示", status: "ok" },
      { case: "无海报", handle: "根据封面自动生成分享海报", status: "ok" },
    ],
  },
  {
    id: "competition",
    name: "赛事",
    icon: Trophy,
    color: "bg-yellow-500",
    description: "比赛和竞赛活动",
    cover: {
      recommended: "16:9 横版",
      size: "1200 x 675px",
      format: "JPG、PNG",
      maxFileSize: "5MB",
      tips: "赛事封面需体现专业性和竞技感",
    },
    content: {
      banner: {
        recommended: "2:1 宽幅横幅",
        size: "1200 x 600px",
        tips: "赛事详情页顶部大图",
      },
      certificate: {
        recommended: "A4横版证书",
        size: "2480 x 1754px（300dpi）",
        tips: "获奖证书模板",
      },
    },
    adaptRules: [
      { case: "无封面", handle: "使用赛事模板+标题生成", status: "warn" },
      { case: "竖版封面", handle: "居中裁切为16:9", status: "warn" },
    ],
  },
]

// 通用建议
const generalTips = [
  {
    title: "图片格式选择",
    content: "JPG适合照片，PNG适合图标/透明图，WebP体积更小加载更快",
  },
  {
    title: "图片压缩",
    content: "上传前建议压缩，保持清晰度的同时减小文件大小",
  },
  {
    title: "视频编码",
    content: "推荐H.264编码，兼容性最好；H.265体积更小但兼容性稍差",
  },
  {
    title: "命名规范",
    content: "文件名使用英文或数字，避免特殊字符和空格",
  },
]

export default function MediaGuidelinesPage() {
  const [activeTab, setActiveTab] = useState("article")
  const activeSpec = mediaSpecs.find(s => s.id === activeTab)!

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-muted">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/help" className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="font-medium text-foreground">素材上传规范</h1>
          </div>
        </div>
      </header>

      {/* 说明 */}
      <div className="px-4 py-4">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">为什么要遵循素材规范？</p>
              <p className="text-blue-600">
                遵循规范上传的素材，能在各种展示场景（信息流、详情页、分享卡片等）获得最佳展示效果。
                即使不完全遵循，系统也会自动适配，但可能有裁切或缩放。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 板块选择 */}
      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {mediaSpecs.map(spec => (
            <button
              key={spec.id}
              onClick={() => setActiveTab(spec.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === spec.id
                  ? "bg-primary text-white"
                  : "bg-white text-muted-foreground border border-muted"
              }`}
            >
              <spec.icon className="w-4 h-4" />
              {spec.name}
            </button>
          ))}
        </div>
      </div>

      {/* 当前板块规范详情 */}
      <div className="px-4 py-4 space-y-4">
        {/* 板块标题 */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${activeSpec.color} flex items-center justify-center`}>
            <activeSpec.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">{activeSpec.name}</h2>
            <p className="text-xs text-muted-foreground">{activeSpec.description}</p>
          </div>
        </div>

        {/* 封面图规范 */}
        {activeSpec.cover && (
          <Card className="p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              封面图规范
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">推荐比例</p>
                  <p className="font-medium text-foreground">{activeSpec.cover.recommended}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">推荐尺寸</p>
                  <p className="font-medium text-foreground">{activeSpec.cover.size}</p>
                </div>
                {activeSpec.cover.minSize && (
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">最小尺寸</p>
                    <p className="font-medium text-foreground">{activeSpec.cover.minSize}</p>
                  </div>
                )}
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">文件格式</p>
                  <p className="font-medium text-foreground">{activeSpec.cover.format}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">文件大小</p>
                  <p className="font-medium text-foreground">≤ {activeSpec.cover.maxFileSize}</p>
                </div>
              </div>
              {activeSpec.cover.tips && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{activeSpec.cover.tips}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 内容素材规范 */}
        {activeSpec.content && (
          <Card className="p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              {activeSpec.content.video ? (
                <Video className="w-4 h-4 text-primary" />
              ) : (
                <Image className="w-4 h-4 text-primary" />
              )}
              内容素材规范
            </h3>
            
            {/* 图片规范 */}
            {activeSpec.content.images && (
              <div className="space-y-3 mb-4">
                <p className="text-sm font-medium text-muted-foreground">图片</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">推荐比例</p>
                    <p className="font-medium text-foreground">{activeSpec.content.images.recommended}</p>
                  </div>
                  {activeSpec.content.images.size && (
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">推荐尺寸</p>
                      <p className="font-medium text-foreground">{activeSpec.content.images.size}</p>
                    </div>
                  )}
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">最多数量</p>
                    <p className="font-medium text-foreground">{activeSpec.content.images.maxCount}张</p>
                  </div>
                </div>
                {activeSpec.content.images.tips && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{activeSpec.content.images.tips}</p>
                  </div>
                )}
              </div>
            )}

            {/* 视频规范 */}
            {activeSpec.content.video && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">视频</p>
                
                {/* 视频比例选项 */}
                {activeSpec.content.video.horizontal && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-background rounded-lg text-center">
                      <RectangleHorizontal className="w-8 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs font-medium">{activeSpec.content.video.horizontal.ratio}</p>
                      <p className="text-[10px] text-muted-foreground">{activeSpec.content.video.horizontal.desc}</p>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg text-center border border-primary/20">
                      <RectangleVertical className="w-4 h-6 mx-auto mb-1 text-primary" />
                      <p className="text-xs font-medium text-primary">{activeSpec.content.video.vertical.ratio}</p>
                      <p className="text-[10px] text-primary">{activeSpec.content.video.vertical.desc}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg text-center">
                      <Square className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs font-medium">{activeSpec.content.video.square.ratio}</p>
                      <p className="text-[10px] text-muted-foreground">{activeSpec.content.video.square.desc}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">文件格式</p>
                    <p className="font-medium text-foreground">{activeSpec.content.video.format}</p>
                  </div>
                  {activeSpec.content.video.maxDuration && (
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">最长时长</p>
                      <p className="font-medium text-foreground">{activeSpec.content.video.maxDuration}</p>
                    </div>
                  )}
                  {activeSpec.content.video.maxFileSize && (
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">文件大小</p>
                      <p className="font-medium text-foreground">≤ {activeSpec.content.video.maxFileSize}</p>
                    </div>
                  )}
                  {activeSpec.content.video.codec && (
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">编码格式</p>
                      <p className="font-medium text-foreground">{activeSpec.content.video.codec}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 直播推流规范 */}
            {activeSpec.content.stream && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">推流设置</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">推荐分辨率</p>
                    <p className="font-medium text-foreground">{activeSpec.content.stream.resolution}</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">推荐码率</p>
                    <p className="font-medium text-foreground">{activeSpec.content.stream.bitrate}</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">帧率</p>
                    <p className="font-medium text-foreground">{activeSpec.content.stream.fps}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 详情图规范 */}
            {activeSpec.content.detail && (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium text-muted-foreground">详情图</p>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">推荐规格</p>
                  <p className="font-medium text-foreground">{activeSpec.content.detail.recommended}</p>
                </div>
                {activeSpec.content.detail.tips && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{activeSpec.content.detail.tips}</p>
                  </div>
                )}
              </div>
            )}

            {/* 横幅规范 */}
            {activeSpec.content.banner && (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium text-muted-foreground">横幅/Banner</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">推荐比例</p>
                    <p className="font-medium text-foreground">{activeSpec.content.banner.recommended}</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">推荐尺寸</p>
                    <p className="font-medium text-foreground">{activeSpec.content.banner.size}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 适配规则 */}
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            非标准素材适配规则
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            即使上传的素材不符合推荐规范，系统也会自动处理以确保正常展示
          </p>
          <div className="space-y-2">
            {activeSpec.adaptRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background">
                {rule.status === "ok" ? (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{rule.case}</p>
                  <p className="text-xs text-muted-foreground">{rule.handle}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 尺寸可视化对比 */}
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">常用比例对比</h3>
          <div className="flex items-end justify-around gap-2 py-4">
            <div className="text-center">
              <div className="w-16 h-9 bg-blue-100 rounded border border-blue-200 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">16:9</p>
              <p className="text-[10px] text-muted-foreground">视频/课程</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-9 bg-green-100 rounded border border-green-200 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">4:3</p>
              <p className="text-[10px] text-muted-foreground">传统照片</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded border border-purple-200 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">1:1</p>
              <p className="text-[10px] text-muted-foreground">商品/头像</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-12 bg-pink-100 rounded border border-pink-200 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">3:4</p>
              <p className="text-[10px] text-muted-foreground">竖版照片</p>
            </div>
            <div className="text-center">
              <div className="w-6 h-11 bg-red-100 rounded border border-red-200 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">9:16</p>
              <p className="text-[10px] text-muted-foreground">短视频</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 通用建议 */}
      <div className="px-4 pb-8">
        <h3 className="font-medium text-foreground mb-3">通用建议</h3>
        <div className="space-y-2">
          {generalTips.map((tip, i) => (
            <div key={i} className="p-3 bg-white rounded-xl border border-muted">
              <p className="text-sm font-medium text-foreground mb-1">{tip.title}</p>
              <p className="text-xs text-muted-foreground">{tip.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
