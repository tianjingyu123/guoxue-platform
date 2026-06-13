<template>
  <view class="min-h-screen bg-background" style="padding-bottom:32px">
    <!-- 顶部 -->
    <view class="bg-gradient-to-br from-[#2C2C2C] to-[#1a1a1a] pt-4" style="padding-bottom:32px">
      <!-- 导航 -->
      <view class="px-4 mb-6 flex items-center justify-between">
        <view @click="goBack" class="w-9 h-9 rounded-full flex items-center justify-center" style="background:rgba(255,255,255,0.1)">
          <text class="text-xl text-white">←</text>
        </view>
        <text class="text-white font-semibold">我的等级</text>
        <view @click="goRank" class="text-[12px] text-white/70 flex items-center">
          排行 <text class="text-sm">›</text>
        </view>
      </view>

      <!-- 用户等级卡片 -->
      <view class="px-4">
        <view class="rounded-2xl p-5" style="background:linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));backdrop-filter:blur(10px)">
          <view class="flex items-center gap-4 mb-4">
            <view class="relative">
              <image :src="userData.avatar" mode="aspectFill" class="w-16 h-16 rounded-full" :style="'border:2px solid ' + currentLevel.color" />
              <view class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" :style="'background-color:' + currentLevel.color">
                <text>{{ currentLevel.level }}</text>
              </view>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2 mb-1">
                <text class="text-white font-semibold text-[16px]">{{ userData.name }}</text>
                <text class="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" :style="'background-color:' + currentLevel.color">
                  Lv.{{ currentLevel.level }} {{ currentLevel.name }}
                </text>
              </view>
              <text class="text-white/60 text-[12px]">
                圈内排名 #{{ userData.rank }} · 已加入{{ userData.joinedDays }}天
              </text>
            </view>
          </view>

          <!-- 经验进度 -->
          <view class="rounded-xl p-3" style="background:rgba(0,0,0,0.2)">
            <view class="flex items-center justify-between mb-2">
              <text class="text-white/70 text-[12px]">经验值</text>
              <text class="text-white text-[12px]">{{ userData.currentXp }} / {{ nextLevel ? nextLevel.minXp : 'MAX' }}</text>
            </view>
            <view class="h-2 rounded-full overflow-hidden" style="background:rgba(0,0,0,0.3)">
              <view class="h-full rounded-full transition-all duration-500" :style="'width:' + progressToNext + '%;background-color:' + currentLevel.color" />
            </view>
            <text v-if="nextLevel" class="text-white/50 text-[11px] mt-1.5 block">
              距离 Lv.{{ nextLevel.level }} {{ nextLevel.name }} 还需 {{ nextLevel.minXp - userData.currentXp }} 经验
            </text>
          </view>

          <!-- 数据统计 -->
          <view class="grid grid-cols-4 gap-3 mt-4">
            <view class="text-center">
              <text class="text-white font-bold text-[18px] block">{{ userData.posts }}</text>
              <text class="text-white/50 text-[11px]">发帖</text>
            </view>
            <view class="text-center">
              <text class="text-white font-bold text-[18px] block">{{ userData.likes }}</text>
              <text class="text-white/50 text-[11px]">获赞</text>
            </view>
            <view class="text-center">
              <text class="text-white font-bold text-[18px] block">{{ userData.badges }}</text>
              <text class="text-white/50 text-[11px]">勋章</text>
            </view>
            <view class="text-center">
              <text class="text-white font-bold text-[18px] block">{{ userData.totalXp }}</text>
              <text class="text-white/50 text-[11px]">总经验</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="px-4 relative z-10" style="margin-top:-16px">
      <view class="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm">
        <view v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          :class="['flex-1 py-2.5 text-[13px] font-medium rounded-lg text-center transition-all', activeTab === tab.id ? 'bg-foreground text-white' : 'text-ink-soft']">
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="px-4 py-4">
      <!-- 等级详情 -->
      <view v-if="activeTab === 'level'" class="space-y-4">
        <!-- 等级进度图 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center gap-2 mb-4">
            <text class="text-lg text-primary">📊</text>
            <text class="font-medium text-foreground">等级体系</text>
          </view>
          <view class="space-y-3">
            <view v-for="level in levels" :key="level.level"
              :class="['flex items-center gap-3 p-3 rounded-xl transition-all', level.level === currentLevel.level ? 'bg-background ring-2' : '', level.level < currentLevel.level ? 'opacity-60' : '']"
              :style="level.level === currentLevel.level ? 'ring-color:' + level.color + '30' : ''">
              <view :class="['w-10 h-10 rounded-full flex items-center justify-center text-white font-bold', level.level > currentLevel.level ? 'bg-[#E8E0D5] text-muted-foreground' : '']"
                :style="level.level <= currentLevel.level ? 'background-color:' + level.color : ''">
                <text v-if="level.level > currentLevel.level"></text>
                <text v-else>{{ level.level }}</text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text :class="['font-medium text-[14px]', level.level > currentLevel.level ? 'text-muted-foreground' : 'text-foreground']">
                    Lv.{{ level.level }} {{ level.name }}
                  </text>
                  <text v-if="level.level === currentLevel.level" class="px-2 py-0.5 bg-primary text-white text-[10px] rounded-full">当前</text>
                  <text v-if="level.level < currentLevel.level" class="text-sm text-success">✓</text>
                </view>
                <text class="text-[11px] text-muted-foreground">{{ level.minXp }} - {{ level.maxXp === 999999 ? '∞' : level.maxXp }} 经验</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 当前等级特权 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center gap-2 mb-4">
            <text class="text-lg text-accent">🎁</text>
            <text class="font-medium text-foreground">当前等级特权</text>
          </view>
          <view class="grid grid-cols-2 gap-2">
            <view v-for="(privilege, idx) in currentPrivileges" :key="idx" class="flex items-center gap-2 px-3 py-2 bg-background rounded-lg">
              <text class="text-sm text-success">✓</text>
              <text class="text-[13px] text-foreground">{{ privilege }}</text>
            </view>
          </view>
        </view>

        <!-- 下一等级特权 -->
        <view v-if="nextLevel" class="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl p-4 border border-[#F0E6D3]">
          <view class="flex items-center gap-2 mb-3">
            <text class="text-lg text-accent"></text>
            <text class="font-medium text-foreground">Lv.{{ nextLevel.level }} {{ nextLevel.name }} 解锁特权</text>
          </view>
          <view class="flex flex-wrap gap-2">
            <view v-for="(privilege, idx) in (levelPrivileges.find(p => p.level === nextLevel.level)?.privileges || [])" :key="idx"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full">
              <text class="text-sm text-accent"></text>
              <text class="text-[12px] text-ink-soft">{{ privilege }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的勋章 -->
      <view v-if="activeTab === 'badges'" class="space-y-4">
        <!-- 已获得勋章 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center justify-between mb-4">
            <view class="flex items-center gap-2">
              <text class="text-lg text-accent"></text>
              <text class="font-medium text-foreground">已获得勋章</text>
            </view>
            <text class="text-[12px] text-muted-foreground">{{ badges.filter(b => b.obtained).length }}个</text>
          </view>
          <view class="grid grid-cols-3 gap-3">
            <view v-for="badge in obtainedBadges" :key="badge.id" class="flex flex-col items-center p-3 bg-background rounded-xl">
              <view class="w-12 h-12 rounded-full flex items-center justify-center mb-2" :style="'background-color:' + badge.color + '15'">
                <text class="text-2xl" :style="'color:' + badge.color">{{ badgeIcon(badge.name) }}</text>
              </view>
              <text class="text-[12px] font-medium text-foreground text-center">{{ badge.name }}</text>
              <text class="text-[10px] text-muted-foreground">{{ badge.obtainedAt }}</text>
            </view>
          </view>
        </view>

        <!-- 未获得勋章 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center justify-between mb-4">
            <view class="flex items-center gap-2">
              <text class="text-lg text-muted-foreground"></text>
              <text class="font-medium text-foreground">待解锁勋章</text>
            </view>
            <text class="text-[12px] text-muted-foreground">{{ unObtainedBadges.length }}个</text>
          </view>
          <view class="space-y-3">
            <view v-for="badge in unObtainedBadges" :key="badge.id" class="flex items-center gap-3 p-3 bg-background rounded-xl">
              <view class="w-12 h-12 rounded-full flex items-center justify-center opacity-50" :style="'background-color:' + badge.color + '15'">
                <text class="text-2xl" :style="'color:' + badge.color">{{ badgeIcon(badge.name) }}</text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text class="font-medium text-[14px] text-foreground">{{ badge.name }}</text>
                  <text class="text-sm text-muted-foreground"></text>
                </view>
                <text class="text-[12px] text-muted-foreground block">{{ badge.desc }}</text>
                <view v-if="badge.progress !== undefined && badge.total !== undefined" class="mt-1.5">
                  <view class="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <text>进度</text>
                    <text>{{ badge.progress }}/{{ badge.total }}</text>
                  </view>
                  <view class="h-1.5 bg-[#E8E0D5] rounded-full overflow-hidden">
                    <view class="h-full rounded-full" :style="'width:' + (badge.progress / badge.total * 100) + '%;background-color:' + badge.color" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 获取经验 -->
      <view v-if="activeTab === 'xp'" class="space-y-4">
        <!-- 经验获取途径 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center gap-2 mb-4">
            <text class="text-lg text-[#FF6B35]">⚡</text>
            <text class="font-medium text-foreground">经验获取途径</text>
          </view>
          <view class="space-y-2">
            <view v-for="(source, idx) in xpSources" :key="idx" class="flex items-center gap-3 p-3 bg-background rounded-xl">
              <view class="w-10 h-10 rounded-xl flex items-center justify-center" :style="'background-color:' + source.color + '15'">
                <text class="text-lg" :style="'color:' + source.color">{{ source.icon }}</text>
              </view>
              <view class="flex-1">
                <text class="font-medium text-[14px] text-foreground block">{{ source.title }}</text>
                <text class="text-[12px] text-muted-foreground block">{{ source.desc }}</text>
              </view>
              <text class="text-[14px] font-bold" :style="'color:' + source.color">{{ source.xp }}</text>
            </view>
          </view>
        </view>

        <!-- 每日签到 -->
        <view class="bg-gradient-to-r from-primary to-[#E74C3C] rounded-xl p-4">
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <text class="text-lg text-white"></text>
              <text class="font-medium text-white">每日签到</text>
            </view>
            <text class="text-white/70 text-[12px]">已连续签到 7 天</text>
          </view>
          <view class="grid grid-cols-7 gap-2 mb-3">
            <view v-for="(xp, idx) in [5, 5, 5, 10, 10, 15, 20]" :key="idx"
              :class="['aspect-square rounded-lg flex flex-col items-center justify-center', idx < 3 ? 'bg-white/20' : idx === 3 ? 'bg-white' : 'bg-white/10']">
              <text v-if="idx < 3" class="text-sm text-white">✓</text>
              <template v-else>
                <text :class="['text-[10px]', idx === 3 ? 'text-primary' : 'text-white/70']">+{{ xp }}</text>
                <text :class="['text-[8px]', idx === 3 ? 'text-primary' : 'text-white/50']">Day{{ idx + 1 }}</text>
              </template>
            </view>
          </view>
          <view class="w-full py-2.5 bg-white text-primary font-medium rounded-lg text-center">
            立即签到 (+10经验)
          </view>
        </view>

        <!-- 经验记录 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center justify-between mb-4">
            <text class="font-medium text-foreground">最近获得</text>
            <text class="text-[12px] text-primary">全部记录</text>
          </view>
          <view class="space-y-2">
            <view v-for="(item, idx) in xpRecords" :key="idx" class="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
              <view>
                <text class="text-[13px] text-foreground block">{{ item.title }}</text>
                <text class="text-[11px] text-muted-foreground block">{{ item.time }}</text>
              </view>
              <text class="text-[14px] font-medium text-success">{{ item.xp }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 等级数据
const levels = [
  { level: 1, name: '入门学徒', minXp: 0, maxXp: 100, color: '#999', icon: 'student' },
  { level: 2, name: '初窥门径', minXp: 100, maxXp: 300, color: '#52C41A', icon: 'leaf' },
  { level: 3, name: '略有小成', minXp: 300, maxXp: 600, color: '#1890FF', icon: 'book' },
  { level: 4, name: '登堂入室', minXp: 600, maxXp: 1000, color: '#722ED1', icon: 'door' },
  { level: 5, name: '炉火纯青', minXp: 1000, maxXp: 1500, color: '#FF6B35', icon: 'fire' },
  { level: 6, name: '出神入化', minXp: 1500, maxXp: 2200, color: '#C41E3A', icon: 'star' },
  { level: 7, name: '登峰造极', minXp: 2200, maxXp: 3000, color: '#C9A96E', icon: 'mountain' },
  { level: 8, name: '一代宗师', minXp: 3000, maxXp: 999999, color: '#FFD700', icon: 'crown' },
]

// 勋章数据
const badges = [
  { id: 'b1', name: '阅读达人', desc: '完成阅读打卡21天', color: '#52C41A', obtained: true, obtainedAt: '2024-01-15' },
  { id: 'b2', name: '热心助人', desc: '回答问题获得100赞', color: '#FF6B6B', obtained: true, obtainedAt: '2024-01-10' },
  { id: 'b3', name: '笔耕不辍', desc: '发布帖子50篇', color: '#1890FF', obtained: true, obtainedAt: '2024-01-08' },
  { id: 'b4', name: '知识分享者', desc: '原创内容被加精10次', color: '#C9A96E', obtained: false, progress: 7, total: 10 },
  { id: 'b5', name: '问答之星', desc: '付费问答获得好评50次', color: '#722ED1', obtained: false, progress: 32, total: 50 },
  { id: 'b6', name: '圈子达人', desc: '加入10个圈子', color: '#FF6B35', obtained: false, progress: 5, total: 10 },
]

// 等级特权
const levelPrivileges = [
  { level: 1, privileges: ['基础功能', '每日签到'] },
  { level: 2, privileges: ['发布帖子', '参与讨论'] },
  { level: 3, privileges: ['头像挂件', '专属昵称色'] },
  { level: 4, privileges: ['优先展示', '免费精华'] },
  { level: 5, privileges: ['专属勋章', '提问折扣'] },
  { level: 6, privileges: ['圈主推荐', '专栏投稿'] },
  { level: 7, privileges: ['嘉宾申请', '活动优先'] },
  { level: 8, privileges: ['终身会员', '专属服务'] },
]

// 经验获取方式
const xpSources = [
  { icon: '✓', title: '每日签到', desc: '连续签到奖励更多', xp: '+5~20', color: '#52C41A' },
  { icon: '', title: '发布帖子', desc: '发布优质内容', xp: '+10', color: '#1890FF' },
  { icon: '', title: '获得精华', desc: '帖子被加精', xp: '+50', color: '#C9A96E' },
  { icon: '', title: '获得点赞', desc: '每10个赞', xp: '+5', color: '#FF6B6B' },
  { icon: '', title: '完成打卡', desc: '参与打卡活动', xp: '+10', color: '#722ED1' },
  { icon: '', title: '问答采纳', desc: '回答被采纳', xp: '+30', color: '#FF6B35' },
]

const xpRecords = [
  { title: '发布帖子', time: '今天 10:30', xp: '+10' },
  { title: '每日签到', time: '今天 09:00', xp: '+10' },
  { title: '获得点赞', time: '昨天 22:15', xp: '+5' },
  { title: '完成打卡', time: '昨天 21:00', xp: '+10' },
]

// 用户数据
const userData = {
  name: '命理学习者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
  level: 5, currentXp: 1280, totalXp: 1500, joinedDays: 128,
  posts: 156, likes: 2800, badges: 3, rank: 28,
}

const activeTab = ref<'level' | 'badges' | 'xp'>('level')
const tabs = [
  { id: 'level', label: '等级详情' },
  { id: 'badges', label: '我的勋章' },
  { id: 'xp', label: '获取经验' },
]

const currentLevel = computed(() =>
  levels.find(l => userData.currentXp >= l.minXp && userData.currentXp < l.maxXp) || levels[levels.length - 1]
)
const nextLevel = computed(() => levels.find(l => l.level === currentLevel.value.level + 1))
const progressToNext = computed(() =>
  nextLevel.value
    ? ((userData.currentXp - currentLevel.value.minXp) / (nextLevel.value.minXp - currentLevel.value.minXp)) * 100
    : 100
)
const currentPrivileges = computed(() =>
  levelPrivileges.filter(p => p.level <= currentLevel.value.level).flatMap(p => p.privileges)
)
const obtainedBadges = computed(() => badges.filter(b => b.obtained))
const unObtainedBadges = computed(() => badges.filter(b => !b.obtained))

function badgeIcon(name: string): string {
  const icons: Record<string, string> = {
    '阅读达人': '', '热心助人': '', '笔耕不辍': '',
    '知识分享者': '', '问答之星': '', '圈子达人': '👑',
  }
  return icons[name] || '🏅'
}

function goBack() { uni.navigateBack() }
function goRank() { /* router push */ }
</script>
<style scoped>/* 样式由 Tailwind 处理 */</style>