"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Search, 
  Play, 
  Heart, 
  ShoppingBag, 
  Flame,
  TrendingUp,
  Video,
  Plus,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"

// 模拟视频数据
const mockVideos = [
  {
    id: "1",
    title: "八字命理入门：教你看懂自己的命盘 #八字 #命理入门",
    coverUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    duration: 68,
    author: { name: "易学张老师", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=teacher1" },
    likes: 12680,
    plays: 89000,
    hasProduct: true,
    isHot: true
  },
  {
    id: "2",
    title: "紫微斗数：你的命宫主星是什么？",
    coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop",
    duration: 95,
    author: { name: "紫微林师傅", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=teacher2" },
    likes: 8920,
    plays: 56000,
    hasProduct: false,
    isHot: false
  },
  {
    id: "3",
    title: "风水布局：客厅财位怎么找？这几点必须注意",
    coverUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=450&fit=crop",
    duration: 120,
    author: { name: "风水大师王", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=master1" },
    likes: 23500,
    plays: 156000,
    hasProduct: true,
    isHot: true
  },
  {
    id: "4",
    title: "姓名学：名字里这几个字最旺运势！",
    coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=550&fit=crop",
    duration: 85,
    author: { name: "姓名学专家陈", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=expert1" },
    likes: 45600,
    plays: 289000,
    hasProduct: true,
    isHot: true
  },
  {
    id: "5",
    title: "奇门遁甲入门：什么是九宫八门？",
    coverUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=480&fit=crop",
    duration: 156,
    author: { name: "奇门张师傅", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=qimen" },
    likes: 6780,
    plays: 42000,
    hasProduct: false,
    isHot: false
  },
  {
    id: "6",
    title: "面相学：从眉毛看一个人的性格和运势",
    coverUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=520&fit=crop",
    duration: 78,
    author: { name: "面相大师李", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=face" },
    likes: 18900,
    plays: 123000,
    hasProduct: true,
    isHot: false
  },
  {
    id: "7",
    title: "六爻预测：如何起卦？新手必看教程",
    coverUrl: "https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=400&h=600&fit=crop",
    duration: 145,
    author: { name: "六爻王老师", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=liuyao" },
    likes: 5600,
    plays: 34000,
    hasProduct: false,
    isHot: false
  },
  {
    id: "8",
    title: "手相入门：生命线、智慧线、感情线怎么看",
    coverUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=480&fit=crop",
    duration: 92,
    author: { name: "手相师小周", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=palm" },
    likes: 28900,
    plays: 198000,
    hasProduct: true,
    isHot: true
  },
]

// 热门话题
const hotTopics = [
  { id: "1", name: "八字入门", count: "128万" },
  { id: "2", name: "风水布局", count: "89万" },
  { id: "3", name: "取名改名", count: "56万" },
  { id: "4", name: "面相手相", count: "45万" },
]

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万"
  }
  return num.toString()
}

// 格式化时长
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function VideosPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'recommend' | 'follow' | 'hot'>('recommend')

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        {/* 搜索栏 */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <Link 
              href="/videos/search"
              className="flex-1 flex items-center gap-2 h-10 px-4 rounded-full bg-secondary"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">搜索视频、创作者</span>
            </Link>
            <Link 
              href="/videos/publish"
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-white" />
            </Link>
          </div>
        </div>
        
        {/* Tab切换 */}
        <div className="flex items-center justify-center gap-6 py-2 border-b border-border">
          {[
            { id: 'follow', label: '关注' },
            { id: 'recommend', label: '推荐' },
            { id: 'hot', label: '热门' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "relative pb-2 text-[15px] font-medium transition-colors",
                activeTab === tab.id ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 热门话题横栏 */}
      <div className="px-4 py-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {hotTopics.map(topic => (
            <Link
              key={topic.id}
              href={`/videos/topic/${topic.id}`}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
            >
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-medium">#{topic.name}</span>
              <span className="text-primary/60 text-[10px]">{topic.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 双列瀑布流视频列表 */}
      <div className="px-2">
        <div className="columns-2 gap-2 space-y-2">
          {mockVideos.map((video, index) => (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className="block break-inside-avoid mb-2"
            >
              <div className="bg-card rounded-xl overflow-hidden shadow-sm">
                {/* 封面 */}
                <div className="relative aspect-[3/4]" style={{ 
                  aspectRatio: index % 3 === 0 ? '3/4' : index % 3 === 1 ? '3/5' : '4/5' 
                }}>
                  <img 
                    src={video.coverUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 渐变遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* 热门标签 */}
                  {video.isHot && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FF6B35]">
                      <TrendingUp className="w-3 h-3 text-white" />
                      <span className="text-white text-[10px] font-medium">热门</span>
                    </div>
                  )}
                  
                  {/* 带货标签 */}
                  {video.hasProduct && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#FF6B35] to-[#FF9F43]">
                      <ShoppingBag className="w-3 h-3 text-white" />
                      <span className="text-white text-[10px] font-medium">带货</span>
                    </div>
                  )}
                  
                  {/* 时长 */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50">
                    <Play className="w-3 h-3 text-white fill-white" />
                    <span className="text-white text-[10px]">{formatDuration(video.duration)}</span>
                  </div>
                  
                  {/* 播放量 */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    <Video className="w-3 h-3 text-white/80" />
                    <span className="text-white/80 text-[10px]">{formatNumber(video.plays)}</span>
                  </div>
                </div>
                
                {/* 信息区 */}
                <div className="p-2.5">
                  {/* 标题 */}
                  <p className="text-foreground text-[13px] font-medium line-clamp-2 leading-tight mb-2">
                    {video.title}
                  </p>
                  
                  {/* 作者和点赞 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img 
                        src={video.author.avatar}
                        alt=""
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                      <span className="text-muted-foreground text-[11px] truncate">
                        {video.author.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground text-[11px]">{formatNumber(video.likes)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 发布视频浮动按钮 */}
      <Link 
        href="/videos/publish"
        className="fixed right-4 bottom-24 w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg flex items-center justify-center z-30"
      >
        <Video className="w-6 h-6 text-white" />
      </Link>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
