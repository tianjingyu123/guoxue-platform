'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Share2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'

const topPosts = [
  { id: '1', title: '八字五行详解：从生克制化到格局分析', author: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', views: 12580, likes: 864, comments: 203, shares: 156 },
  { id: '2', title: '紫微斗数十四主星性格分析全集',          author: '张玄风',   avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60', views: 9840,  likes: 620, comments: 145, shares: 98 },
  { id: '3', title: '2024年甲辰年各生肖运势完整版',          author: '李玄机',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60', views: 8720,  likes: 512, comments: 89,  shares: 234 },
  { id: '4', title: '风水布局实战：客厅财位的正确摆放',      author: '王德华',   avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', views: 7350,  likes: 430, comments: 67,  shares: 112 },
  { id: '5', title: '奇门遁甲基础：九宫八卦布局详解',        author: '林奇门',   avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=60', views: 6200,  likes: 398, comments: 54,  shares: 87 },
]

const chartData = [
  { day: '周一', views: 4200, likes: 280 },
  { day: '周二', views: 5100, likes: 340 },
  { day: '周三', views: 4800, likes: 310 },
  { day: '周四', views: 6200, likes: 420 },
  { day: '周五', views: 7800, likes: 530 },
  { day: '周六', views: 9500, likes: 680 },
  { day: '周日', views: 8300, likes: 590 },
]

export default function AnalyticsContentsPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">内容分析</h1>
      </header>

      <div className="px-4 pb-20">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: '总浏览', value: '44,690', Icon: Eye,           cls: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: '总点赞', value: '2,824',  Icon: Heart,         cls: 'text-red-500',    bg: 'bg-red-50' },
            { label: '总评论', value: '558',    Icon: MessageCircle, cls: 'text-green-600',  bg: 'bg-green-50' },
            { label: '总分享', value: '687',    Icon: Share2,        cls: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, value, Icon, cls, bg }) => (
            <Card key={label} className="p-3 text-center">
              <div className={`w-7 h-7 rounded-lg mx-auto mb-1.5 flex items-center justify-center ${bg}`}>
                <Icon className={`w-3.5 h-3.5 ${cls}`} />
              </div>
              <p className="text-sm font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">本周浏览 & 点赞趋势</h2>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" name="浏览" radius={[2,2,0,0]} />
                <Bar dataKey="likes" fill="#C9A96E" name="点赞" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top posts */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />热门内容 TOP 5
          </h2>
          <div className="space-y-3">
            {topPosts.map((post, idx) => (
              <div key={post.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                <span className={`text-lg font-black w-6 flex-shrink-0 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">{post.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Avatar className="w-4 h-4"><AvatarImage src={post.avatar} /><AvatarFallback>{post.author[0]}</AvatarFallback></Avatar>
                      {post.author}
                    </div>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{post.likes}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.comments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
