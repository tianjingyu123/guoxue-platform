'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Users, FileText, MessageCircle, Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const weeklyData = [
  { day: '周一', members: 12420, posts: 285, views: 18500 },
  { day: '周二', members: 12580, posts: 312, views: 21200 },
  { day: '周三', members: 12630, posts: 298, views: 19800 },
  { day: '周四', members: 12800, posts: 356, views: 24600 },
  { day: '周五', members: 12950, posts: 401, views: 28300 },
  { day: '周六', members: 13120, posts: 520, views: 35000 },
  { day: '周日', members: 13280, posts: 486, views: 32100 },
]

const kpis = [
  { label: '总成员',   value: '13,280', trend: 12,  Icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50' },
  { label: '总帖子',   value: '45,620', trend: 8,   Icon: FileText,      color: 'text-green-600',  bg: 'bg-green-50' },
  { label: '本周回复', value: '8,956',  trend: -3,  Icon: MessageCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: '本周浏览', value: '179,500',trend: 22,  Icon: Eye,           color: 'text-purple-600', bg: 'bg-purple-50' },
]

export default function CirclesStatsPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">圈子统计</h1>
      </header>

      <div className="px-4 pb-20">
        <div className="grid grid-cols-2 gap-3 mt-4">
          {kpis.map(({ label, value, trend, Icon, color, bg }) => {
            const up = trend >= 0
            return (
              <Card key={label} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trend)}%
                  </span>
                </div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </Card>
            )
          })}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">成员增长（本周）</h2>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="members" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="成员数" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">帖子 & 浏览（本周）</h2>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="posts" fill="hsl(var(--primary))" name="帖子" radius={[2,2,0,0]} />
                <Bar dataKey="views" fill="#C9A96E" name="浏览" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  )
}
