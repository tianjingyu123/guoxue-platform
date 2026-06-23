"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, Calendar, CheckCircle, Clock, Flame, ChevronRight, Trophy, Star, Users, BookOpen, Image, MessageCircle, Heart, ChevronLeft, ChevronDown, X, Camera, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// 打卡活动数据
const checkinActivity = {
  id: "1",
  title: "《滴天髓》共读打卡",
  description: "每日阅读一章，记录心得体会，坚持21天养成阅读习惯",
  cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
  startDate: "2024-01-01",
  endDate: "2024-01-21",
  currentDay: 15,
  totalDays: 21,
  participants: 328,
  todayCheckedIn: 186,
  reward: { xp: 10, badge: "阅读达人" },
  isJoined: true,
  hasCheckedToday: false,
  myStreak: 12,
  myTotalDays: 12,
  rules: [
    "每日阅读指定章节",
    "打卡需写下心得（至少50字）",
    "可配图分享精彩段落",
    "截止时间为每日23:59",
  ],
}

// 今日打卡内容
const todayContent = {
  chapter: "第十五章：论日主强弱",
  summary: "本章讲述如何判断日主的强弱，包括得令、得地、得生、得助等要点...",
  keyPoints: ["得令为重", "得地次之", "得生得助为辅"],
}

// 排行榜数据
const leaderboard = [
  { rank: 1, user: { name: "命理大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1" }, streak: 15, totalDays: 15 },
  { rank: 2, user: { name: "易学研究者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2" }, streak: 14, totalDays: 14 },
  { rank: 3, user: { name: "古籍爱好者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3" }, streak: 13, totalDays: 14 },
  { rank: 4, user: { name: "学习达人", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4" }, streak: 12, totalDays: 13 },
  { rank: 5, user: { name: "国学新手", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=5" }, streak: 11, totalDays: 12 },
]

// 历史打卡记录
const myCheckins = [
  { date: "2024-01-14", content: "今天阅读了论十神的章节，对于正财和偏财的区别有了更深的理解...", images: [], likes: 12, comments: 3 },
  { date: "2024-01-13", content: "格局篇真是精彩，八格的分类方法让我豁然开朗...", images: ["https://picsum.photos/200/200?random=1"], likes: 8, comments: 2 },
  { date: "2024-01-12", content: "开始学习用神的概念，这是八字命理的核心所在...", images: [], likes: 15, comments: 5 },
]

// 打卡动态流
const checkinFeed = [
  { id: "f1", user: { name: "命理大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1" }, content: "今天深入研究了日主强弱的判断方法，收获满满！书中所说「得令为重」确实是关键...", images: [], time: "10分钟前", likes: 28, comments: 6 },
  { id: "f2", user: { name: "易学研究者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2" }, content: "分享一段经典论述", images: ["https://picsum.photos/400/300?random=10"], time: "30分钟前", likes: 15, comments: 3 },
  { id: "f3", user: { name: "古籍爱好者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3" }, content: "坚持打卡第13天！感觉自己对八字的理解越来越深入了", images: [], time: "1小时前", likes: 22, comments: 8 },
]

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  const activityId = params.activityId as string
  
  const [activity, setActivity] = useState(checkinActivity)
  const [activeTab, setActiveTab] = useState<'today' | 'feed' | 'rank' | 'my'>('today')
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [checkinContent, setCheckinContent] = useState("")
  const [checkinImages, setCheckinImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // 日历数据生成
  const generateCalendarDays = () => {
    const days = []
    for (let i = 1; i <= activity.totalDays; i++) {
      const isCompleted = i <= activity.myTotalDays
      const isToday = i === activity.currentDay
      const isFuture = i > activity.currentDay
      days.push({ day: i, isCompleted, isToday, isFuture })
    }
    return days
  }

  const calendarDays = generateCalendarDays()
  const progressPercent = (activity.currentDay / activity.totalDays) * 100

  const handleCheckin = async () => {
    if (checkinContent.trim().length < 50) {
      alert("心得至少需要50字哦")
      return
    }
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsSubmitting(false)
    setShowCheckinModal(false)
    setShowSuccess(true)
    setActivity(prev => ({ ...prev, hasCheckedToday: true, myStreak: prev.myStreak + 1, myTotalDays: prev.myTotalDays + 1 }))
  }

  const tabs = [
    { id: 'today', label: '今日内容' },
    { id: 'feed', label: '打卡动态' },
    { id: 'rank', label: '排行榜' },
    { id: 'my', label: '我的记录' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部封面 */}
      <div className="relative h-52">
        <img src={activity.cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* 导航 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 活动信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[#52C41A] text-white text-[10px] rounded-full">进行中</span>
            <span className="text-white/80 text-[12px]">Day {activity.currentDay}/{activity.totalDays}</span>
          </div>
          <h1 className="text-white text-[20px] font-bold mb-1">{activity.title}</h1>
          <p className="text-white/70 text-[13px] line-clamp-2">{activity.description}</p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="px-4 py-3 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[#666]">活动进度</span>
          <span className="text-[12px] text-[#C41E3A] font-medium">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#C41E3A] to-[#FF6B6B] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 数据统计卡片 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-[20px] font-bold text-[#2C2C2C]">{activity.participants}</div>
            <div className="text-[11px] text-[#999]">参与人数</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-[20px] font-bold text-[#52C41A]">{activity.todayCheckedIn}</div>
            <div className="text-[11px] text-[#999]">今日已打卡</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-[20px] font-bold text-[#FF6B35]">{activity.myStreak}</div>
            <div className="text-[11px] text-[#999]">我的连续</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-[20px] font-bold text-[#C41E3A]">{activity.myTotalDays}</div>
            <div className="text-[11px] text-[#999]">累计打卡</div>
          </div>
        </div>
      </div>

      {/* 日历视图 */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-[#2C2C2C]">打卡日历</span>
            <span className="text-[12px] text-[#999]">{activity.startDate} - {activity.endDate}</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(day => (
              <div 
                key={day.day}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-[13px] font-medium transition-all",
                  day.isCompleted && "bg-[#52C41A] text-white",
                  day.isToday && !activity.hasCheckedToday && "bg-[#C41E3A] text-white ring-2 ring-[#C41E3A]/30",
                  day.isToday && activity.hasCheckedToday && "bg-[#52C41A] text-white ring-2 ring-[#52C41A]/30",
                  day.isFuture && "bg-[#F5F0E8] text-[#CCC]",
                  !day.isCompleted && !day.isToday && !day.isFuture && "bg-[#FFE4E4] text-[#C41E3A]"
                )}
              >
                {day.isCompleted ? <CheckCircle className="w-4 h-4" /> : day.day}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[#F5F0E8]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#52C41A]" />
              <span className="text-[11px] text-[#999]">已完成</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#FFE4E4]" />
              <span className="text-[11px] text-[#999]">已错过</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#F5F0E8]" />
              <span className="text-[11px] text-[#999]">未开始</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="px-4">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 py-2 text-[13px] font-medium rounded-lg transition-all",
                activeTab === tab.id 
                  ? "bg-[#C41E3A] text-white" 
                  : "text-[#666]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 py-4">
        {/* 今日内容 */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-[#C9A96E]" />
                <span className="font-medium text-[#2C2C2C]">今日阅读</span>
              </div>
              <h3 className="text-[16px] font-bold text-[#2C2C2C] mb-2">{todayContent.chapter}</h3>
              <p className="text-[13px] text-[#666] leading-relaxed mb-3">{todayContent.summary}</p>
              <div className="bg-[#FAF8F5] rounded-lg p-3">
                <div className="text-[12px] text-[#999] mb-2">核心要点</div>
                <div className="space-y-1.5">
                  {todayContent.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />
                      <span className="text-[13px] text-[#2C2C2C]">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 打卡规则 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-[#FF6B35]" />
                <span className="font-medium text-[#2C2C2C]">打卡规则</span>
              </div>
              <div className="space-y-2">
                {activity.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#F5F0E8] text-[11px] text-[#666] flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <span className="text-[13px] text-[#666]">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 奖励说明 */}
            <div className="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl p-4 border border-[#F0E6D3]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-[#C9A96E]" />
                <span className="font-medium text-[#2C2C2C]">完成奖励</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-[#C9A96E]" />
                  <span className="text-[13px] text-[#666]">每日 +{activity.reward.xp} 经验值</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#C9A96E]" />
                  <span className="text-[13px] text-[#666]">获得「{activity.reward.badge}」勋章</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 打卡动态 */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {checkinFeed.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <img src={item.user.avatar} alt="" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium text-[14px] text-[#2C2C2C]">{item.user.name}</div>
                    <div className="text-[11px] text-[#999]">{item.time}</div>
                  </div>
                  <div className="px-2 py-0.5 bg-[#52C41A]/10 text-[#52C41A] text-[10px] rounded-full">已打卡</div>
                </div>
                <p className="text-[14px] text-[#2C2C2C] leading-relaxed mb-3">{item.content}</p>
                {item.images.length > 0 && (
                  <div className="mb-3">
                    {item.images.map((img, idx) => (
                      <img key={idx} src={img} alt="" className="w-full rounded-lg" />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 pt-2 border-t border-[#F5F0E8]">
                  <button className="flex items-center gap-1 text-[#999]">
                    <Heart className="w-4 h-4" />
                    <span className="text-[12px]">{item.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-[#999]">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-[12px]">{item.comments}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 排行榜 */}
        {activeTab === 'rank' && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#F5F0E8]">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#C9A96E]" />
                <span className="font-medium text-[#2C2C2C]">连续打卡排行</span>
              </div>
            </div>
            <div>
              {leaderboard.map((item, idx) => (
                <div key={item.rank} className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  idx < leaderboard.length - 1 && "border-b border-[#F5F0E8]"
                )}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold",
                    item.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white" :
                    item.rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                    item.rank === 3 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white" :
                    "bg-[#F5F0E8] text-[#999]"
                  )}>
                    {item.rank}
                  </div>
                  <img src={item.user.avatar} alt="" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium text-[14px] text-[#2C2C2C]">{item.user.name}</div>
                    <div className="text-[11px] text-[#999]">累计{item.totalDays}天</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-[#FF6B35]" />
                      <span className="font-bold text-[#FF6B35]">{item.streak}</span>
                    </div>
                    <div className="text-[10px] text-[#999]">连续天数</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 我的记录 */}
        {activeTab === 'my' && (
          <div className="space-y-3">
            {myCheckins.length > 0 ? (
              myCheckins.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-[#52C41A]" />
                    <span className="text-[12px] text-[#999]">{item.date}</span>
                  </div>
                  <p className="text-[14px] text-[#2C2C2C] leading-relaxed mb-2">{item.content}</p>
                  {item.images.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {item.images.map((img, imgIdx) => (
                        <img key={imgIdx} src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-[12px] text-[#999]">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{item.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{item.comments}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <BookOpen className="w-12 h-12 text-[#E8E3DB] mb-3" />
                <p className="text-[#999] text-[14px]">还没有打卡记录</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部打卡按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 z-50">
        {activity.hasCheckedToday ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-[#F5F0E8] rounded-full">
            <CheckCircle className="w-5 h-5 text-[#52C41A]" />
            <span className="text-[#52C41A] font-medium">今日已打卡</span>
          </div>
        ) : (
          <button
            onClick={() => setShowCheckinModal(true)}
            className="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-medium rounded-full shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            立即打卡 (+{activity.reward.xp}经验)
          </button>
        )}
      </div>

      {/* 打卡弹窗 */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#E8E3DB]">
              <button onClick={() => setShowCheckinModal(false)} className="text-[#999]">
                <X className="w-6 h-6" />
              </button>
              <span className="font-semibold text-[#2C2C2C]">打卡</span>
              <div className="w-6" />
            </div>
            
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {/* 今日内容提示 */}
              <div className="bg-[#FAF8F5] rounded-xl p-3 mb-4">
                <div className="text-[12px] text-[#999] mb-1">今日阅读内容</div>
                <div className="text-[14px] font-medium text-[#2C2C2C]">{todayContent.chapter}</div>
              </div>

              {/* 心得输入 */}
              <div className="mb-4">
                <label className="text-[14px] font-medium text-[#2C2C2C] mb-2 block">
                  写下你的心得 <span className="text-[#C41E3A]">*</span>
                </label>
                <textarea
                  value={checkinContent}
                  onChange={(e) => setCheckinContent(e.target.value)}
                  placeholder="记录今天的阅读收获，至少50字..."
                  className="w-full h-32 p-3 bg-[#FAF8F5] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/30"
                />
                <div className="text-right text-[12px] text-[#999] mt-1">
                  {checkinContent.length}/50 {checkinContent.length < 50 && "(至少50字)"}
                </div>
              </div>

              {/* 添加图片 */}
              <div className="mb-4">
                <label className="text-[14px] font-medium text-[#2C2C2C] mb-2 block">
                  添加图片 <span className="text-[12px] text-[#999]">(选填)</span>
                </label>
                <button className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E8E3DB] flex flex-col items-center justify-center text-[#999]">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[11px]">添加</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-[#E8E3DB]">
              <button
                onClick={handleCheckin}
                disabled={isSubmitting || checkinContent.length < 50}
                className={cn(
                  "w-full py-3.5 rounded-full font-medium transition-all flex items-center justify-center gap-2",
                  checkinContent.length >= 50 && !isSubmitting
                    ? "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white shadow-lg"
                    : "bg-[#E8E3DB] text-[#999] cursor-not-allowed"
                )}
              >
                {isSubmitting ? "提交中..." : "确认打卡"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 打卡成功弹窗 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[85%] max-w-sm bg-white rounded-2xl p-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#52C41A] to-[#95DE64] flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-[20px] font-bold text-[#2C2C2C] mb-2">打卡成功!</h3>
            <p className="text-[#666] mb-4">
              连续打卡 <span className="text-[#FF6B35] font-bold">{activity.myStreak}</span> 天
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="px-3 py-1.5 bg-[#FFF8E7] rounded-full flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#C9A96E]" />
                <span className="text-[13px] text-[#C9A96E]">+{activity.reward.xp} 经验</span>
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-medium rounded-full"
            >
              太棒了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
