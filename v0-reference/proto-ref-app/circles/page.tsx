"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search, Users, MessageSquare, TrendingUp, Crown, Plus, ChevronRight, Flame, Calendar, Play, Bell, Star, Zap, Award, Clock, Radio, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { circleApi, type Circle } from "@/lib/api"

// 分类数据
const categories = [
  { id: "", name: "推荐", icon: Star },
  { id: "bazi", name: "八字命理", icon: BookOpen },
  { id: "ziwei", name: "紫微斗数", icon: BookOpen },
  { id: "fengshui", name: "风水堪舆", icon: BookOpen },
  { id: "yijing", name: "易经", icon: BookOpen },
  { id: "liuyao", name: "六爻", icon: BookOpen },
  { id: "qimen", name: "奇门遁甲", icon: BookOpen },
  { id: "yangsheng", name: "养生", icon: BookOpen },
  { id: "shufa", name: "书法", icon: BookOpen },
]

// 直播预告数据
const upcomingLives = [
  { id: "live1", title: "八字入门精讲（第3期）", host: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master", startTime: "今晚 20:00", viewers: 1280, circleId: "1", circleName: "八字研习社" },
  { id: "live2", title: "紫微斗数实战案例分析", host: "张玄风", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang", startTime: "明天 19:30", viewers: 860, circleId: "2", circleName: "紫微斗数学院" },
]

// 今日活动
const todayActivities = [
  { id: "act1", type: "checkin", title: "《易经》共读打卡 Day 15", participants: 328, deadline: "23:59", circleId: "4", reward: "+10经验" },
  { id: "act2", type: "homework", title: "八字案例分析作业", participants: 156, deadline: "本周日", circleId: "1", reward: "+50经验" },
  { id: "act3", type: "qa", title: "限时免费提问活动", participants: 89, deadline: "12:00", circleId: "1", reward: "免费" },
]

// 热门帖子（信息流）
const hotPosts = [
  { id: "p1", circleId: "1", circleName: "八字研习社", author: { name: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master", title: "圈主" }, content: "今天分享一个八字案例：某人八字为甲子、丙寅、戊辰、壬戌，这个八字有什么特点？从五行来看，日主戊土生于寅月...", images: ["https://picsum.photos/400/300?random=201"], likes: 328, comments: 56, time: "2小时前", isPinned: true },
  { id: "p2", circleId: "2", circleName: "紫微斗数学院", author: { name: "张玄风", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang", title: "嘉宾" }, content: "紫微斗数中的「四化」如何理解？化禄主福、化权主权、化科主名、化忌主烦。今天重点讲讲化忌...", images: [], likes: 256, comments: 42, time: "3小时前" },
  { id: "p3", circleId: "3", circleName: "风水堪舆交流", author: { name: "王德华", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wang" }, content: "分享一个商铺选址的风水案例。这家店位于T字路口，门前有一棵大树遮挡，开业三个月生意惨淡...", images: ["https://picsum.photos/400/300?random=202", "https://picsum.photos/400/300?random=203"], likes: 198, comments: 38, time: "5小时前" },
]

// 骨架屏
function CircleSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
          <div className="aspect-[4/3] bg-[#F2EFEA] rounded-lg mb-3" />
          <div className="h-4 bg-[#F2EFEA] rounded w-3/4 mb-2" />
          <div className="h-3 bg-[#F2EFEA] rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

// 圈子卡片
function CircleCard({ circle, onJoin }: { circle: Circle; onJoin: (id: string) => void }) {
  return (
    <Link href={`/circles/${circle.id}`} className="block">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#F5F0E8] active:scale-[0.98] transition-all">
        {/* 封面 */}
        <div className="aspect-[4/3] relative overflow-hidden">
          <img 
            src={circle.cover} 
            alt={circle.name}
            className="w-full h-full object-cover"
          />
          {/* 排名角标 */}
          {circle.rank && circle.rank <= 3 && (
            <div className={cn(
              "absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
              circle.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
              circle.rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400" :
              "bg-gradient-to-br from-orange-300 to-orange-400"
            )}>
              {circle.rank}
            </div>
          )}
          {/* 今日活跃 */}
          {circle.todayActive && circle.todayActive > 0 && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#C41E3A]/90 rounded text-[9px] text-white flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" />
              {circle.todayActive}
            </div>
          )}
        </div>
        
        {/* 信息 */}
        <div className="p-3">
          <h3 className="text-[14px] font-semibold text-[#2C2C2C] line-clamp-1 mb-1">{circle.name}</h3>
          <p className="text-[11px] text-[#999] line-clamp-1 mb-2">{circle.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-[#666]">
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {circle.members >= 10000 ? `${(circle.members/10000).toFixed(1)}万` : circle.members}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {circle.posts}
              </span>
            </div>
            
            {circle.isJoined ? (
              <span className="text-[10px] text-[#999] px-2 py-0.5 bg-[#F5F0E8] rounded-full">已加入</span>
            ) : (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin(circle.id); }}
                className="text-[10px] text-white px-2.5 py-1 bg-[#C41E3A] rounded-full"
              >
                加入
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// 排行榜入口
function RankingEntry({ circles }: { circles: Circle[] }) {
  return (
    <Link href="/circles/ranking">
      <div className="mx-4 mb-4 bg-gradient-to-r from-[#FFF9E6] to-[#FFF5F5] rounded-xl p-3 border border-[#F5E6D3]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-[#2C2C2C]">热门圈子排行</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#999]" />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {circles.slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex-shrink-0 flex items-center gap-1.5 bg-white rounded-full pl-1 pr-2.5 py-1">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                i === 0 ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400" :
                i === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400" :
                "bg-[#999]"
              )}>
                {i + 1}
              </div>
              <span className="text-[11px] text-[#2C2C2C] whitespace-nowrap">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function CirclesPage() {
  const router = useRouter()
  const [category, setCategory] = useState("")
  const [circles, setCircles] = useState<Circle[]>([])
  const [myCircles, setMyCircles] = useState<Circle[]>([])
  const [ranking, setRanking] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'discover' | 'feed' | 'mine'>('discover')
  const feedRef = useRef<HTMLDivElement>(null)

  // 模拟数据
  const mockCircles: Circle[] = [
    { id: "1", name: "八字研习社", cover: "https://picsum.photos/400/300?random=101", description: "专注八字命理学习与交流", category: "bazi", members: 12800, posts: 3560, isJoined: true, todayActive: 128, rank: 1 },
    { id: "2", name: "紫微斗数爱好者", cover: "https://picsum.photos/400/300?random=102", description: "探索紫微斗数的奥秘", category: "ziwei", members: 8600, posts: 2180, isJoined: false, todayActive: 86, rank: 2 },
    { id: "3", name: "风水学堂", cover: "https://picsum.photos/400/300?random=103", description: "风水堪舆知识分享", category: "fengshui", members: 6500, posts: 1820, isJoined: true, todayActive: 56, rank: 3 },
    { id: "4", name: "易经读书会", cover: "https://picsum.photos/400/300?random=104", description: "一起研读易经经典", category: "yijing", members: 5200, posts: 1560, isJoined: false, todayActive: 42 },
    { id: "5", name: "六爻预测交流", cover: "https://picsum.photos/400/300?random=105", description: "六爻占卜实战分享", category: "liuyao", members: 4800, posts: 1280, isJoined: false, todayActive: 38 },
    { id: "6", name: "奇门遁甲研究", cover: "https://picsum.photos/400/300?random=106", description: "奇门遁甲术数探讨", category: "qimen", members: 3600, posts: 960, isJoined: false, todayActive: 28 },
    { id: "7", name: "中医养生圈", cover: "https://picsum.photos/400/300?random=107", description: "传统养生智慧分享", category: "yangsheng", members: 9200, posts: 2860, isJoined: true, todayActive: 96 },
    { id: "8", name: "书法艺术", cover: "https://picsum.photos/400/300?random=108", description: "书法练习与鉴赏", category: "shufa", members: 7800, posts: 2340, isJoined: false, todayActive: 68 },
  ]

  useEffect(() => {
    loadData()
  }, [category])

  const loadData = async () => {
    setLoading(true)
    try {
      // 尝试调用 API，失败则使用 mock 数据
      const [listRes, myRes, rankRes] = await Promise.allSettled([
        circleApi.list({ category }),
        circleApi.my(),
        circleApi.getRanking(),
      ])
      
      const filtered = category 
        ? mockCircles.filter(c => c.category === category)
        : mockCircles
      
      setCircles(listRes.status === 'fulfilled' ? listRes.value.data : filtered)
      setMyCircles(myRes.status === 'fulfilled' ? myRes.value : mockCircles.filter(c => c.isJoined))
      setRanking(rankRes.status === 'fulfilled' ? rankRes.value : mockCircles.slice(0, 5).map((c, i) => ({ ...c, rank: i + 1 })))
    } catch {
      const filtered = category 
        ? mockCircles.filter(c => c.category === category)
        : mockCircles
      setCircles(filtered)
      setMyCircles(mockCircles.filter(c => c.isJoined))
      setRanking(mockCircles.slice(0, 5).map((c, i) => ({ ...c, rank: i + 1 })))
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (id: string) => {
    // 乐观更新
    setCircles(prev => prev.map(c => c.id === id ? { ...c, isJoined: true, members: c.members + 1 } : c))
    try {
      await circleApi.join(id)
    } catch {
      // 失败回滚
      setCircles(prev => prev.map(c => c.id === id ? { ...c, isJoined: false, members: c.members - 1 } : c))
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 - 简化版 */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-[20px] font-bold text-[#2C2C2C]">圈子</h1>
          <div className="flex items-center gap-2">
            <Link href="/circles/search" className="w-9 h-9 rounded-full bg-[#F5F0E8] flex items-center justify-center">
              <Search className="w-4.5 h-4.5 text-[#666]" />
            </Link>
            <Link href="/circles/calendar" className="w-9 h-9 rounded-full bg-[#F5F0E8] flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-[#666]" />
            </Link>
          </div>
        </div>
        
        {/* 主Tab切换 */}
        <div className="flex items-center border-b border-[#E8E3DB]">
          {[
            { id: 'discover', label: '发现' },
            { id: 'feed', label: '动态' },
            { id: 'mine', label: '我的' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 py-3 text-[14px] font-medium relative transition-colors",
                activeTab === tab.id ? "text-[#C41E3A]" : "text-[#999]"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 发现Tab内容 */}
      {activeTab === 'discover' && (
        <>
          {/* 直播预告横幅 */}
          {upcomingLives.length > 0 && (
            <div className="px-4 pt-4">
              <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full">
                  <Radio className="w-3 h-3 text-white animate-pulse" />
                  <span className="text-[10px] text-white font-medium">直播预告</span>
                </div>
                <div className="flex items-center gap-3">
                  <img src={upcomingLives[0].avatar} alt="" className="w-12 h-12 rounded-full border-2 border-white/20" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-[14px] truncate">{upcomingLives[0].title}</h3>
                    <p className="text-white/60 text-[12px] mt-0.5">{upcomingLives[0].host} · {upcomingLives[0].circleName}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[#FFD700] text-[12px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />{upcomingLives[0].startTime}
                      </span>
                      <span className="text-white/50 text-[11px]">{upcomingLives[0].viewers}人预约</span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[#C41E3A] text-white text-[12px] font-medium rounded-full flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" />预约
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 今日活动 */}
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FF6B35]" />
                <span className="font-semibold text-[#2C2C2C]">今日活动</span>
              </div>
              <Link href="/circles/activities" className="text-[12px] text-[#999] flex items-center">
                全部 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {todayActivities.map(act => (
                <Link 
                  key={act.id} 
                  href={`/circles/${act.circleId}/activity/${act.id}`}
                  className="flex-shrink-0 w-[200px] bg-white rounded-xl p-3 shadow-sm border border-[#F5F0E8]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {act.type === 'checkin' && <BookOpen className="w-4 h-4 text-[#52C41A]" />}
                    {act.type === 'homework' && <Award className="w-4 h-4 text-[#C41E3A]" />}
                    {act.type === 'qa' && <MessageSquare className="w-4 h-4 text-[#1890FF]" />}
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      act.type === 'checkin' ? "bg-[#52C41A]/10 text-[#52C41A]" :
                      act.type === 'homework' ? "bg-[#C41E3A]/10 text-[#C41E3A]" :
                      "bg-[#1890FF]/10 text-[#1890FF]"
                    )}>
                      {act.type === 'checkin' ? '打卡' : act.type === 'homework' ? '作业' : '问答'}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#2C2C2C] line-clamp-2 mb-2">{act.title}</h4>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#999]">{act.participants}人参与</span>
                    <span className="text-[#FF6B35]">{act.reward}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#F5F0E8] text-[10px] text-[#999]">
                    截止: {act.deadline}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 分类Tab */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all",
                    category === cat.id
                      ? "bg-[#C41E3A] text-white"
                      : "bg-white text-[#666] border border-[#E8E3DB]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 排行榜入口 */}
          {ranking.length > 0 && (
            <RankingEntry circles={ranking} />
          )}

          {/* 圈子列表 */}
          {loading ? (
            <CircleSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4">
              {circles.map(circle => (
                <CircleCard key={circle.id} circle={circle} onJoin={handleJoin} />
              ))}
            </div>
          )}
        </>
      )}

      {/* 动态Tab - 沉浸式信息流 */}
      {activeTab === 'feed' && (
        <div ref={feedRef} className="px-4 pt-4 space-y-4">
          {myCircles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[#999]" />
              </div>
              <p className="text-[#999] text-[14px] mb-2">还没有加入任何圈子</p>
              <p className="text-[#BBB] text-[12px] mb-4">加入圈子后，这里会显示最新动态</p>
              <button 
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-[#C41E3A] text-white text-[13px] rounded-full"
              >
                去发现圈子
              </button>
            </div>
          ) : (
            <>
              {hotPosts.map(post => (
                <Link key={post.id} href={`/circles/${post.circleId}/posts/${post.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    {/* 圈子来源 */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#F5F0E8]">
                      <Link href={`/circles/${post.circleId}`} className="flex items-center gap-2">
                        <span className="text-[12px] text-[#C41E3A] font-medium">#{post.circleName}</span>
                        {post.isPinned && <span className="text-[10px] px-1.5 py-0.5 bg-[#FFF0F0] text-[#C41E3A] rounded">置顶</span>}
                      </Link>
                      <span className="text-[11px] text-[#BBB]">{post.time}</span>
                    </div>
                    {/* 作者信息 */}
                    <div className="px-4 pt-3 flex items-center gap-2">
                      <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-medium text-[#2C2C2C]">{post.author.name}</span>
                          {post.author.title && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] rounded">{post.author.title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 内容 */}
                    <div className="px-4 py-3">
                      <p className="text-[14px] text-[#2C2C2C] leading-relaxed line-clamp-4">{post.content}</p>
                    </div>
                    {/* 图片 */}
                    {post.images.length > 0 && (
                      <div className={cn(
                        "px-4 pb-3 grid gap-2",
                        post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                      )}>
                        {post.images.map((img, idx) => (
                          <img key={idx} src={img} alt="" className={cn(
                            "w-full object-cover rounded-lg",
                            post.images.length === 1 ? "max-h-48" : "aspect-square"
                          )} />
                        ))}
                      </div>
                    )}
                    {/* 互动栏 */}
                    <div className="px-4 py-3 border-t border-[#F5F0E8] flex items-center gap-6">
                      <button className="flex items-center gap-1.5 text-[#666]">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[12px]">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-[#666]">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[12px]">{post.likes}</span>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      {/* 我的Tab */}
      {activeTab === 'mine' && (
        <div className="px-4 pt-4">
          {/* 我的圈子数据卡片 */}
          <div className="bg-gradient-to-br from-[#C41E3A] to-[#A01530] rounded-2xl p-4 text-white mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">我的圈子数据</span>
              <Link href="/circles/stats" className="text-[12px] text-white/70 flex items-center">
                详情 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-[20px] font-bold">{myCircles.length}</div>
                <div className="text-[11px] text-white/70">已加入</div>
              </div>
              <div>
                <div className="text-[20px] font-bold">156</div>
                <div className="text-[11px] text-white/70">发帖数</div>
              </div>
              <div>
                <div className="text-[20px] font-bold">2.8k</div>
                <div className="text-[11px] text-white/70">获赞数</div>
              </div>
              <div>
                <div className="text-[20px] font-bold">Lv.5</div>
                <div className="text-[11px] text-white/70">等级</div>
              </div>
            </div>
          </div>

          {/* 我的圈子列表 */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-[#2C2C2C]">我加入的圈子</span>
            <span className="text-[12px] text-[#999]">{myCircles.length}个</span>
          </div>
          
          {myCircles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-[#999]" />
              </div>
              <p className="text-[#999] text-[13px] mb-4">还没有加入任何圈子</p>
              <button 
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-[#C41E3A] text-white text-[13px] rounded-full"
              >
                去发现圈子
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myCircles.map(circle => (
                <Link key={circle.id} href={`/circles/${circle.id}`}>
                  <div className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <img src={circle.cover} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[14px] text-[#2C2C2C] truncate">{circle.name}</h4>
                      <p className="text-[12px] text-[#999] mt-0.5">{circle.members}成员 · {circle.posts}帖子</p>
                      {circle.todayActive && circle.todayActive > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Flame className="w-3 h-3 text-[#FF6B35]" />
                          <span className="text-[11px] text-[#FF6B35]">今日{circle.todayActive}条新动态</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#CCC]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {activeTab === 'discover' && !loading && circles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[#999]" />
          </div>
          <p className="text-[#999] text-[14px]">暂无相关圈子</p>
        </div>
      )}

      {/* 创建圈子浮动按钮 */}
      <Link 
        href="/circles/create"
        className="fixed right-4 bottom-24 w-12 h-12 bg-gradient-to-br from-[#C41E3A] to-[#A01530] rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-white" />
      </Link>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
