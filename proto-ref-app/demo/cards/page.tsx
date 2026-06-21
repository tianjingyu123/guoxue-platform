"use client"

import { useState } from "react"
import { ArrowLeft, Grid, List, Rows3, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContentCard, ArticleCard, PostCard, type ContentCardData } from "@/components/cards/content-card"
import { VideoCard, type VideoCardData } from "@/components/cards/video-card"

// ============================================================
// 卡片组件演示页面 - 展示不同展示形式和素材适配
// ============================================================

// 模拟数据 - 各种素材情况
const mockArticles: ContentCardData[] = [
  // 无图文章
  {
    id: "a1",
    type: "article",
    title: "八字命理入门：如何理解天干地支的基本概念与应用",
    content: "八字命理，又称四柱命理，是中国传统命理学的重要分支。它通过分析一个人出生时的年、月、日、时四柱天干地支，来推断人的命运走势。学习八字需要先掌握十天干和十二地支的基础知识...",
    author: { name: "周易大师", avatar: "/images/experts/expert-1.jpg" },
    circle: { id: "c1", name: "八字研习社", avatar: "/images/circles/circle-1.jpg" },
    views: 8560,
    likes: 1280,
    comments: 128,
    publishedAt: "2小时前",
  },
  // 单图-横版
  {
    id: "a2",
    type: "article",
    title: "风水布局的五大禁忌，你家中了几条？",
    images: [{ url: "/images/feed/article-1.jpg", ratio: "horizontal" }],
    author: { name: "陈风水", avatar: "/images/experts/expert-2.jpg" },
    circle: { id: "c2", name: "风水研究院" },
    views: 12800,
    likes: 2560,
    comments: 256,
    isFeatured: true,
  },
  // 单图-竖版
  {
    id: "a3",
    type: "article",
    title: "紫微斗数详解：十四主星的性格特征",
    images: [{ url: "/images/feed/post-1.jpg", ratio: "vertical" }],
    author: { name: "紫微先生" },
    circle: { id: "c3", name: "紫微斗数" },
    views: 6800,
    likes: 980,
    comments: 86,
  },
  // 双图
  {
    id: "a4",
    type: "article",
    title: "易经六十四卦图解：乾卦与坤卦的深度解读",
    images: [
      { url: "/images/feed/article-2.jpg" },
      { url: "/images/feed/article-1.jpg" },
    ],
    author: { name: "易学研究" },
    views: 5600,
    likes: 780,
    comments: 64,
  },
  // 三图
  {
    id: "a5",
    type: "article",
    title: "2024甲辰年运势解析：十二生肖全年运程",
    images: [
      { url: "/images/feed/post-2.jpg" },
      { url: "/images/feed/post-1.jpg" },
      { url: "/images/feed/article-1.jpg" },
    ],
    author: { name: "运势分析师" },
    circle: { id: "c1", name: "八字研习社" },
    views: 28600,
    likes: 5680,
    comments: 568,
    isFeatured: true,
  },
  // 多图(6张)
  {
    id: "a6",
    type: "article",
    title: "线下活动回顾：第三届国学文化交流会精彩瞬间",
    images: [
      { url: "/images/feed/article-1.jpg" },
      { url: "/images/feed/article-2.jpg" },
      { url: "/images/feed/post-1.jpg" },
      { url: "/images/feed/post-2.jpg" },
      { url: "/images/courses/course-1.jpg" },
      { url: "/images/courses/course-2.jpg" },
    ],
    author: { name: "活动组委会" },
    views: 18600,
    likes: 3280,
    comments: 286,
  },
]

const mockPosts: ContentCardData[] = [
  // 纯文字帖子
  {
    id: "p1",
    type: "post",
    title: "请问各位老师，八字中食神制杀格局应该如何理解？",
    content: "最近在学习八字，看到一个命盘是食神制杀格局，但不太理解为什么食神可以制杀，杀不是克日主的吗？希望各位老师能指点一二...",
    author: { name: "学习中的小白" },
    circle: { id: "c1", name: "八字研习社" },
    views: 560,
    likes: 45,
    comments: 28,
    visibility: "circle_only",
  },
  // 单图帖子
  {
    id: "p2",
    type: "post",
    title: "今日排盘分享，请大家帮忙看看这个八字格局",
    images: [{ url: "/images/bazi/chart-1.jpg", ratio: "square" }],
    author: { name: "命理爱好者" },
    circle: { id: "c1", name: "八字研习社" },
    views: 1280,
    likes: 86,
    comments: 45,
  },
  // 多图帖子
  {
    id: "p3",
    type: "post",
    title: "家里新装修，请各位风水老师帮忙看看布局有什么问题",
    images: [
      { url: "/images/feed/post-1.jpg" },
      { url: "/images/feed/post-2.jpg" },
      { url: "/images/feed/article-1.jpg" },
      { url: "/images/feed/article-2.jpg" },
    ],
    author: { name: "新房业主" },
    circle: { id: "c2", name: "风水研究院" },
    views: 2560,
    likes: 168,
    comments: 86,
  },
]

const mockVideos: VideoCardData[] = [
  // 横版视频
  {
    id: "v1",
    title: "八字入门第一课：什么是天干地支",
    cover: "/images/courses/course-1.jpg",
    videoRatio: "horizontal",
    author: "周易大师",
    plays: 28600,
    likes: 1860,
    duration: "15:32",
  },
  // 竖版视频（短视频）
  {
    id: "v2",
    title: "一分钟看懂你的本命年运势",
    cover: "/images/feed/post-1.jpg",
    videoRatio: "vertical",
    author: "运势小助手",
    plays: 168000,
    likes: 28600,
    comments: 1860,
    duration: "00:58",
  },
  // 方形视频
  {
    id: "v3",
    title: "易经智慧：如何用卦象指导人生选择",
    cover: "/images/feed/article-2.jpg",
    videoRatio: "square",
    author: "易学教授",
    plays: 8600,
    likes: 986,
    duration: "08:45",
  },
]

export default function CardDemoPage() {
  const [contentVariant, setContentVariant] = useState<"feed" | "list" | "compact" | "text-only" | "featured">("feed")
  const [videoVariant, setVideoVariant] = useState<"feed" | "list" | "rail" | "fullscreen">("feed")

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-lg">卡片组件演示</h1>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {/* 文章/帖子卡片演示 */}
        <section className="px-4 py-4">
          <h2 className="text-lg font-bold mb-3">文章/帖子卡片</h2>
          <p className="text-sm text-muted-foreground mb-4">
            支持无图、单图(横/竖/方)、多图(2-9张)等多种素材情况，自动适配展示
          </p>
          
          {/* 变体切换 */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Button 
              variant={contentVariant === "feed" ? "default" : "outline"} 
              size="sm"
              onClick={() => setContentVariant("feed")}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              瀑布流
            </Button>
            <Button 
              variant={contentVariant === "list" ? "default" : "outline"} 
              size="sm"
              onClick={() => setContentVariant("list")}
            >
              <Rows3 className="w-4 h-4 mr-1" />
              列表
            </Button>
            <Button 
              variant={contentVariant === "compact" ? "default" : "outline"} 
              size="sm"
              onClick={() => setContentVariant("compact")}
            >
              <List className="w-4 h-4 mr-1" />
              紧凑
            </Button>
            <Button 
              variant={contentVariant === "text-only" ? "default" : "outline"} 
              size="sm"
              onClick={() => setContentVariant("text-only")}
            >
              纯文字
            </Button>
            <Button 
              variant={contentVariant === "featured" ? "default" : "outline"} 
              size="sm"
              onClick={() => setContentVariant("featured")}
            >
              精选大图
            </Button>
          </div>

          {/* 卡片展示 */}
          {contentVariant === "feed" && (
            <div className="columns-2 gap-2">
              {[...mockArticles, ...mockPosts].map((item) => (
                <ContentCard key={item.id} data={item} variant="feed" />
              ))}
            </div>
          )}
          
          {contentVariant === "list" && (
            <div className="space-y-2">
              {[...mockArticles, ...mockPosts].map((item) => (
                <ContentCard key={item.id} data={item} variant="list" />
              ))}
            </div>
          )}
          
          {contentVariant === "compact" && (
            <div className="space-y-0 divide-y divide-border">
              {[...mockArticles, ...mockPosts].map((item) => (
                <ContentCard key={item.id} data={item} variant="compact" />
              ))}
            </div>
          )}
          
          {contentVariant === "text-only" && (
            <div className="space-y-2">
              {[...mockArticles, ...mockPosts].map((item) => (
                <ContentCard key={item.id} data={item} variant="text-only" />
              ))}
            </div>
          )}
          
          {contentVariant === "featured" && (
            <div className="space-y-3">
              {mockArticles.filter(a => a.isFeatured).map((item) => (
                <ContentCard key={item.id} data={item} variant="featured" />
              ))}
            </div>
          )}
        </section>

        {/* 视频卡片演示 */}
        <section className="px-4 py-4 border-t border-border mt-4">
          <h2 className="text-lg font-bold mb-3">视频卡片</h2>
          <p className="text-sm text-muted-foreground mb-4">
            支持横版(16:9)、竖版(9:16)、方形(1:1)三种视频比例自动适配
          </p>
          
          {/* 变体切换 */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <Button 
              variant={videoVariant === "feed" ? "default" : "outline"} 
              size="sm"
              onClick={() => setVideoVariant("feed")}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              瀑布流
            </Button>
            <Button 
              variant={videoVariant === "list" ? "default" : "outline"} 
              size="sm"
              onClick={() => setVideoVariant("list")}
            >
              <Rows3 className="w-4 h-4 mr-1" />
              列表
            </Button>
            <Button 
              variant={videoVariant === "rail" ? "default" : "outline"} 
              size="sm"
              onClick={() => setVideoVariant("rail")}
            >
              横滑
            </Button>
            <Button 
              variant={videoVariant === "fullscreen" ? "default" : "outline"} 
              size="sm"
              onClick={() => setVideoVariant("fullscreen")}
            >
              全屏竖版
            </Button>
          </div>

          {/* 卡片展示 */}
          {videoVariant === "feed" && (
            <div className="columns-2 gap-2">
              {mockVideos.map((item) => (
                <VideoCard key={item.id} data={item} variant="feed" />
              ))}
            </div>
          )}
          
          {videoVariant === "list" && (
            <div className="space-y-2">
              {mockVideos.map((item) => (
                <VideoCard key={item.id} data={item} variant="list" />
              ))}
            </div>
          )}
          
          {videoVariant === "rail" && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {mockVideos.map((item) => (
                <VideoCard key={item.id} data={item} variant="rail" />
              ))}
            </div>
          )}
          
          {videoVariant === "fullscreen" && (
            <div className="space-y-3">
              {mockVideos.filter(v => v.videoRatio === "vertical").map((item) => (
                <VideoCard key={item.id} data={item} variant="fullscreen" />
              ))}
            </div>
          )}
        </section>

        {/* 素材适配说明 */}
        <section className="px-4 py-4 border-t border-border mt-4">
          <h2 className="text-lg font-bold mb-3">素材适配规则</h2>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-secondary rounded-lg">
              <h3 className="font-medium mb-2">图片适配</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 无图：显示文字摘要或渐变背景</li>
                <li>• 单图横版(16:9/4:3)：保持比例，aspect-video</li>
                <li>• 单图竖版(9:16/3:4)：保持比例，限制最大宽度70%</li>
                <li>• 单图方形(1:1)：保持比例，限制最大宽度80%</li>
                <li>• 2张图：2列并排，各占50%</li>
                <li>• 3张图：1大+2小布局</li>
                <li>• 4张图：2x2网格</li>
                <li>• 5-9张图：3列网格，超出显示+N</li>
              </ul>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <h3 className="font-medium mb-2">视频适配</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 横版视频(16:9)：标准视频比例</li>
                <li>• 竖版视频(9:16)：短视频/全屏模式</li>
                <li>• 方形视频(1:1)：社交媒体常见</li>
                <li>• 自动根据封面/视频比例检测</li>
              </ul>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <h3 className="font-medium mb-2">卡片变体</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• feed：瀑布流/网格竖卡，首页/发现页</li>
                <li>• list：横向列表卡，搜索结果/收藏</li>
                <li>• compact：紧凑卡片，侧边栏/相关推荐</li>
                <li>• rail：横滑小卡，推荐栏</li>
                <li>• featured：精选大图，首页Banner</li>
                <li>• text-only：纯文字卡片</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
