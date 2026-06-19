'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Flame, Gift, Calendar, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BadgeUnlock, type BadgeUnlockData } from '@/components/common/badge-unlock'

// Mock data - 打卡数据
const mockCheckInData = {
  checkedToday: false,
  consecutiveDays: 7,
  totalCheckIns: 85,
  currentStreak: 18,
  longestStreak: 42,
  todayReward: 50,
  checkins: [
    { day: 1, reward: 10 },
    { day: 2, reward: 10 },
    { day: 3, reward: 10 },
    { day: 4, reward: 10 },
    { day: 5, reward: 10 },
    { day: 6, reward: 15, bonus: true },
    { day: 7, reward: 10 },
    { day: 8, reward: 10 },
    { day: 9, reward: 10 },
    { day: 10, reward: 10 },
    { day: 11, reward: 10 },
    { day: 12, reward: 10 },
    { day: 13, reward: 10 },
    { day: 14, reward: 20, bonus: true },
    { day: 15, reward: 10 },
    { day: 16, reward: 10 },
    { day: 17, reward: 10 },
    { day: 18, reward: 10, checked: true },
  ],
  rewards: [
    { days: 7, reward: '7日奖励', points: 50, icon: '🎁' },
    { days: 14, reward: '14日奖励', points: 150, icon: '🏆' },
    { days: 30, reward: '30日大奖', points: 500, icon: '👑' },
  ],
}

export default function CheckInPage() {
  const router = useRouter()
  const [checkedIn, setCheckedIn] = useState(mockCheckInData.checkedToday)
  const [unlock, setUnlock] = useState<BadgeUnlockData | null>(null)

  // 连续签到里程碑配置
  const milestones: Record<number, BadgeUnlockData> = {
    7: { title: '签到里程碑达成', name: '初心不改', description: '连续签到 7 天，贵在坚持', icon: 'flame', rarity: 'common', rewardPoints: 50 },
    14: { title: '签到里程碑达成', name: '持之以恒', description: '连续签到 14 天，难能可贵', icon: 'medal', rarity: 'rare', rewardPoints: 150 },
    30: { title: '签到里程碑达成', name: '百炼成钢', description: '连续签到 30 天，毅力非凡', icon: 'crown', rarity: 'legendary', rewardPoints: 500 },
  }

  const handleCheckIn = () => {
    setCheckedIn(true)
    // 签到成功后达到里程碑则触发解锁仪式（演示用当前连续天数）
    const days = mockCheckInData.consecutiveDays
    if (milestones[days]) {
      setTimeout(() => setUnlock(milestones[days]), 400)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">每日签到</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-20">
        {/* 签到卡片 */}
        <div className="mx-4 mt-4 p-6 bg-gradient-to-br from-primary to-red-700 text-white rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm opacity-80 mb-1">连续签到</div>
              <div className="text-4xl font-bold">{mockCheckInData.consecutiveDays}</div>
              <div className="text-sm opacity-80 mt-1">天</div>
            </div>
            <Flame className="w-12 h-12 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            <div>
              <div className="opacity-80">本周签到</div>
              <div className="font-bold text-lg">5/7</div>
            </div>
            <div>
              <div className="opacity-80">总签到数</div>
              <div className="font-bold text-lg">{mockCheckInData.totalCheckIns}</div>
            </div>
            <div>
              <div className="opacity-80">最长纪录</div>
              <div className="font-bold text-lg">{mockCheckInData.longestStreak}</div>
            </div>
          </div>
          {!checkedIn ? (
            <Button
              onClick={handleCheckIn}
              size="lg"
              className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              今日签到 + {mockCheckInData.todayReward} 积分
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 p-3 bg-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">今日已签到</span>
            </div>
          )}
        </div>

        {/* 签到日历 */}
        <div className="mx-4 mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">本月签到情况</h2>
          <div className="grid grid-cols-7 gap-2">
            {mockCheckInData.checkins.map(item => (
              <button
                key={item.day}
                className={`p-3 rounded-lg text-center text-sm font-medium transition-colors ${
                  item.checked
                    ? 'bg-primary text-white'
                    : item.bonus
                      ? 'bg-orange-100 text-orange-900 border border-orange-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <div>{item.day}</div>
                {item.bonus && <Flame className="w-3 h-3 mx-auto mt-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* 签到奖励 */}
        <div className="mx-4 mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">签到奖励</h2>
          <div className="space-y-2">
            {mockCheckInData.rewards.map((reward, idx) => (
              <Card
                key={idx}
                className={`p-4 flex items-center justify-between ${
                  reward.days <= mockCheckInData.consecutiveDays ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{reward.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{reward.reward}</h3>
                    <div className="text-xs text-muted-foreground">连续签到 {reward.days} 天</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">+{reward.points}</div>
                  <div className="text-xs text-muted-foreground">积分</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 说明 */}
        <div className="mx-4 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">签到说明</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• 每天可签到一次，获得积分奖励</li>
            <li>• 连续签到可获得额外奖励</li>
            <li>• 第6天和14天会获得双倍积分</li>
            <li>• 积分可用于兑换商城商品</li>
          </ul>
        </div>
      </div>

      <BadgeUnlock
        open={unlock !== null}
        data={unlock || { name: '', description: '', icon: 'award' }}
        onClose={() => setUnlock(null)}
        claimLabel="收下奖励"
      />
    </div>
  )
}
