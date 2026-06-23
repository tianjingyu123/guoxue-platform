'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Bell, Star, Plus, ChevronRight, Crown, LogOut } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataState } from '@/components/data-state'
import { circleApi, type Circle } from '@/lib/api'

export default function CirclesMinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [joinedCircles, setJoinedCircles] = useState<Circle[]>([])
  const [activeTab, setActiveTab] = useState<'joined' | 'created'>('joined')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await circleApi.my()
      setJoinedCircles(res || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const displayCircles = joinedCircles

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">我的圈子</h1>
          <button onClick={() => router.push('/circles/create')} className="p-1">
            <Plus className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex px-4 pt-4 gap-2">
        {(['joined', 'created'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {tab === 'joined' ? '已加入' : '我创建'}
          </button>
        ))}
      </div>

      <DataState
        loading={loading}
        empty={displayCircles.length === 0}
        skeleton={
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        }
        emptyText={activeTab === 'joined' ? '还没有加入任何圈子' : '还没有创建圈子'}
        emptyAction={
          <Button
            onClick={() => router.push('/circles')}
            className="bg-primary hover:bg-primary/90 mt-3"
          >
            {activeTab === 'joined' ? '去发现圈子' : '立即创建'}
          </Button>
        }
      >
        <div className="pb-20 px-4 mt-4 space-y-3">
          {displayCircles.map(circle => (
            <button
              key={circle.id}
              onClick={() => router.push(`/circles/${circle.id}`)}
              className="w-full p-4 rounded-xl border border-border hover:border-primary/30 bg-card transition-all text-left flex items-center gap-3"
            >
              <Avatar className="w-14 h-14 rounded-xl flex-shrink-0">
                <AvatarImage src={circle.cover} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                  {circle.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground truncate">{circle.name}</span>
                  {circle.memberRole === 'owner' && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 flex-shrink-0">
                      <Crown className="w-2.5 h-2.5 mr-0.5" /> 圈主
                    </Badge>
                  )}
                  {circle.memberRole === 'admin' && (
                    <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 flex-shrink-0">
                      管理员
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                  {circle.description || '国学文化交流圈子'}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3 h-3" /> {(circle.memberCount || 0).toLocaleString()} 成员
                  </span>
                  {circle.hasNewContent && (
                    <span className="flex items-center gap-0.5 text-primary">
                      <Bell className="w-3 h-3" /> 有新内容
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </button>
          ))}

          {/* 创建新圈子入口 */}
          <button
            onClick={() => router.push('/circles/create')}
            className="w-full p-4 rounded-xl border border-dashed border-border hover:border-primary/50 bg-background transition-all text-center"
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm">创建一个新圈子</span>
            </div>
          </button>
        </div>
      </DataState>
    </div>
  )
}
