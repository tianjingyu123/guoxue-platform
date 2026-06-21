"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Play, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Clock,
  ChevronRight,
  Plus,
  BarChart3,
  Wallet,
  Settings,
  FileVideo,
  Star
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// 模拟创作者数据
const creatorStats = {
  // 概览数据
  totalViews: 1256800,
  totalLikes: 89600,
  totalComments: 12800,
  totalShares: 5680,
  followers: 28900,
  // 收益数据
  totalEarnings: 12680.50,
  pendingEarnings: 2350.00,
  withdrawnEarnings: 10330.50,
  // 带货数据
  totalSales: 568,
  totalGMV: 45680,
  commission: 4568,
  conversionRate: 3.2,
  // 趋势数据（相比上周）
  viewsTrend: 12.5,
  likesTrend: 8.3,
  followersTrend: 15.2,
  salesTrend: -2.5,
}

// 模拟视频列表
const myVideos = [
  {
    id: "1",
    title: "八字命理入门：教你看懂自己的命盘",
    cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop",
    views: 128000,
    likes: 8960,
    comments: 856,
    shares: 234,
    sales: 128,
    gmv: 8704,
    status: "published",
    publishTime: "2024-01-15",
    products: [{ id: "p1", name: "八字入门书籍", price: 68 }]
  },
  {
    id: "2", 
    title: "风水布局：客厅财位怎么找？",
    cover: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=300&fit=crop",
    views: 235000,
    likes: 15600,
    comments: 1280,
    shares: 567,
    sales: 256,
    gmv: 25600,
    status: "published",
    publishTime: "2024-01-12",
    products: [
      { id: "p2", name: "招财貔貅", price: 298 },
      { id: "p3", name: "五帝钱", price: 128 }
    ]
  },
  {
    id: "3",
    title: "姓名学：名字里这几个字最旺运势",
    cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=300&fit=crop",
    views: 456000,
    likes: 32800,
    comments: 3420,
    shares: 1890,
    sales: 184,
    gmv: 11376,
    status: "published",
    publishTime: "2024-01-10",
    products: [{ id: "p4", name: "姓名学全解", price: 88 }]
  },
]

// 模拟商品库
const productLibrary = [
  { id: "p1", name: "八字命理学入门书籍", price: 68, sales: 128, commission: 10, stock: 500, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop" },
  { id: "p2", name: "招财貔貅摆件", price: 298, sales: 256, commission: 15, stock: 200, image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop" },
  { id: "p3", name: "五帝钱挂件", price: 128, sales: 89, commission: 12, stock: 350, image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop" },
  { id: "p4", name: "姓名学全解", price: 88, sales: 184, commission: 10, stock: 800, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop" },
]

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万"
  }
  return num.toLocaleString()
}

export default function CreatorCenterPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'products' | 'earnings'>('overview')

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/videos" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-base font-bold text-foreground">创作者中心</h1>
          <Link href="/videos/creator/settings" className="p-1 -mr-1">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </header>

      {/* 创作者信息卡片 */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src="https://api.dicebear.com/7.x/notionists/svg?seed=creator" 
            alt="Creator"
            className="w-14 h-14 rounded-full border-2 border-white/30"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">易学张老师</span>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">认证创作者</Badge>
            </div>
            <p className="text-white/70 text-sm mt-0.5">{formatNumber(creatorStats.followers)} 粉丝</p>
          </div>
          <Link 
            href="/videos/publish"
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-primary rounded-full text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            发布
          </Link>
        </div>

        {/* 核心数据 */}
        <div className="grid grid-cols-4 gap-2 bg-white/10 rounded-xl p-3">
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(creatorStats.totalViews)}</p>
            <p className="text-white/70 text-xs mt-0.5">总播放</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(creatorStats.totalLikes)}</p>
            <p className="text-white/70 text-xs mt-0.5">总点赞</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{creatorStats.totalSales}</p>
            <p className="text-white/70 text-xs mt-0.5">带货订单</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">¥{formatNumber(creatorStats.totalEarnings)}</p>
            <p className="text-white/70 text-xs mt-0.5">累计收益</p>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex items-center border-b border-border bg-background sticky top-12 z-40">
        {[
          { id: 'overview', label: '数据概览', icon: BarChart3 },
          { id: 'videos', label: '我的作品', icon: FileVideo },
          { id: 'products', label: '商品管理', icon: Package },
          { id: 'earnings', label: '收益中心', icon: Wallet },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium relative transition-colors",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 数据概览 */}
      {activeTab === 'overview' && (
        <div className="p-4 space-y-4">
          {/* 趋势数据 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">数据趋势</h3>
              <span className="text-xs text-muted-foreground">较上周</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs">播放量</p>
                  <p className="font-bold text-lg">{formatNumber(creatorStats.totalViews)}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  creatorStats.viewsTrend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {creatorStats.viewsTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(creatorStats.viewsTrend)}%
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs">新增粉丝</p>
                  <p className="font-bold text-lg">+{formatNumber(Math.floor(creatorStats.followers * creatorStats.followersTrend / 100))}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  creatorStats.followersTrend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {creatorStats.followersTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(creatorStats.followersTrend)}%
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs">互动量</p>
                  <p className="font-bold text-lg">{formatNumber(creatorStats.totalLikes + creatorStats.totalComments)}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  creatorStats.likesTrend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {creatorStats.likesTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(creatorStats.likesTrend)}%
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs">带货销量</p>
                  <p className="font-bold text-lg">{creatorStats.totalSales}单</p>
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  creatorStats.salesTrend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {creatorStats.salesTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(creatorStats.salesTrend)}%
                </div>
              </div>
            </div>
          </Card>

          {/* 带货数据 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">带货数据</h3>
              <Link href="/videos/creator/sales" className="text-xs text-primary flex items-center">
                查看详情 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-bold text-lg">{creatorStats.totalSales}</p>
                <p className="text-muted-foreground text-xs">成交订单</p>
              </div>
              <div className="text-center p-3 bg-accent/5 rounded-lg">
                <DollarSign className="w-5 h-5 text-accent mx-auto mb-1" />
                <p className="font-bold text-lg">¥{formatNumber(creatorStats.totalGMV)}</p>
                <p className="text-muted-foreground text-xs">带货GMV</p>
              </div>
              <div className="text-center p-3 bg-green-500/5 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="font-bold text-lg">{creatorStats.conversionRate}%</p>
                <p className="text-muted-foreground text-xs">转化率</p>
              </div>
            </div>
          </Card>

          {/* 热门作品 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">热门作品</h3>
              <button 
                onClick={() => setActiveTab('videos')}
                className="text-xs text-primary flex items-center"
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {myVideos.slice(0, 2).map((video, index) => (
                <Link key={video.id} href={`/video/${video.id}`}>
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={video.cover} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      <Badge className="absolute top-1 left-1 bg-black/60 text-white border-0 text-[10px]">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Eye className="w-3.5 h-3.5" />{formatNumber(video.views)}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3.5 h-3.5" />{formatNumber(video.likes)}</span>
                      </div>
                      {video.products.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs text-primary font-medium">{video.sales}单 · ¥{formatNumber(video.gmv)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 我的作品 */}
      {activeTab === 'videos' && (
        <div className="p-4 space-y-3">
          {myVideos.map(video => (
            <Card key={video.id} className="overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={video.cover} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{video.publishTime}</p>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
                    <div className="text-center">
                      <p className="font-medium text-foreground">{formatNumber(video.views)}</p>
                      <p>播放</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{formatNumber(video.likes)}</p>
                      <p>点赞</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{video.comments}</p>
                      <p>评论</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{video.shares}</p>
                      <p>分享</p>
                    </div>
                  </div>
                  {video.products.length > 0 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">{video.products.length}件商品</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-primary font-medium">{video.sales}单</span>
                        <span className="text-muted-foreground"> · ¥{formatNumber(video.gmv)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 商品管理 */}
      {activeTab === 'products' && (
        <div className="p-4 space-y-4">
          {/* 添加商品入口 */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">我的商品库</h3>
                <p className="text-xs text-muted-foreground mt-0.5">已添加 {productLibrary.length} 件商品</p>
              </div>
              <Link 
                href="/videos/creator/products/add"
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                添加商品
              </Link>
            </div>
          </Card>

          {/* 商品列表 */}
          <div className="space-y-3">
            {productLibrary.map(product => (
              <Card key={product.id} className="p-3">
                <div className="flex gap-3">
                  <img 
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-primary font-bold">¥{product.price}</span>
                      <Badge className="bg-green-500/10 text-green-500 border-0 text-[10px]">
                        {product.commission}%佣金
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>销量 {product.sales}</span>
                      <span>库存 {product.stock}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-2">
                    <Link 
                      href={`/videos/publish?product=${product.id}`}
                      className="px-3 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
                    >
                      去带货
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 收益中心 */}
      {activeTab === 'earnings' && (
        <div className="p-4 space-y-4">
          {/* 收益概览 */}
          <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">累计收益 (元)</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  ¥{creatorStats.totalEarnings.toFixed(2)}
                </p>
              </div>
              <Link 
                href="/videos/creator/withdraw"
                className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium"
              >
                提现
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">待结算</p>
                <p className="font-bold text-lg mt-0.5">¥{creatorStats.pendingEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">已提现</p>
                <p className="font-bold text-lg mt-0.5">¥{creatorStats.withdrawnEarnings.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          {/* 收益明细 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">收益明细</h3>
              <Link href="/videos/creator/earnings/history" className="text-xs text-primary flex items-center">
                全部记录 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { type: "带货佣金", amount: 128.50, time: "今天 14:30", product: "八字入门书籍" },
                { type: "带货佣金", amount: 298.00, time: "今天 11:20", product: "招财貔貅摆件" },
                { type: "带货佣金", amount: 88.00, time: "昨天 16:45", product: "姓名学全解" },
                { type: "带货佣金", amount: 128.00, time: "昨天 09:15", product: "五帝钱挂件" },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.product} · {item.time}</p>
                  </div>
                  <span className="text-green-500 font-medium">+¥{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 收益规则 */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-2">收益规则</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>1. 带货佣金：按商品设定的佣金比例结算</p>
              <p>2. 结算周期：订单确认收货后7天自动结算</p>
              <p>3. 提现门槛：满100元可申请提现</p>
              <p>4. 到账时间：提现申请后1-3个工作日到账</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
