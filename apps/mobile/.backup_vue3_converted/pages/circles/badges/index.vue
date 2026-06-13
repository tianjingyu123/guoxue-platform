<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack" class="p-1">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground flex-1">我的徽章</text>
      <text class="text-xs text-accent font-medium">{{ earned.length }}/{{ allBadges.length }}</text>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="px-4 pt-6">
      <view class="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
      <view class="grid grid-cols-3 gap-3 mb-8">
        <view v-for="i in 6" :key="i" class="flex flex-col items-center p-3 rounded-xl border border-border bg-muted/30">
          <view class="w-10 h-10 rounded-full bg-muted animate-pulse mb-2" />
          <view class="h-3 w-16 bg-muted rounded animate-pulse mb-1" />
          <view class="h-2 w-12 bg-muted rounded animate-pulse" />
        </view>
      </view>
      <view class="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
      <view v-for="i in 3" :key="i" class="flex items-center gap-3 p-3 rounded-xl bg-muted/40 animate-pulse mb-2">
        <view class="w-12 h-12 rounded-xl bg-muted" />
        <view class="flex-1 space-y-2">
          <view class="h-3 w-24 bg-muted rounded" />
          <view class="h-2.5 w-full bg-muted rounded" />
        </view>
      </view>
    </view>

    <!-- 分类Tab -->
    <view v-else class="px-4 pt-4 pb-20">
      <view class="flex gap-2 mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <view
          v-for="cat in badgeCategories"
          :key="cat.id"
          @click="activeCategory = cat.id"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="activeCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-muted-foreground border border-border'"
        >
          <text>{{ cat.icon }} {{ cat.label }}</text>
        </view>
      </view>

      <!-- 统计概览 -->
      <view class="bg-white rounded-xl p-4 border border-border mb-4">
        <view class="flex items-center justify-between">
          <view class="text-center flex-1">
            <text class="text-2xl font-bold text-primary block">{{ allBadges.length }}</text>
            <text class="text-[10px] text-muted-foreground">总徽章数</text>
          </view>
          <view class="w-px h-10 bg-[#E8E0D5]" />
          <view class="text-center flex-1">
            <text class="text-2xl font-bold text-green-500 block">{{ earned.length }}</text>
            <text class="text-[10px] text-muted-foreground">已获得</text>
          </view>
          <view class="w-px h-10 bg-[#E8E0D5]" />
          <view class="text-center flex-1">
            <text class="text-2xl font-bold text-accent block">{{ locked.length }}</text>
            <text class="text-[10px] text-muted-foreground">待解锁</text>
          </view>
        </view>
      </view>

      <!-- 已获得徽章 -->
      <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-3 block">
         已获得 {{ earned.length }} 枚
      </text>
      <view v-if="filteredEarned.length > 0" class="grid grid-cols-3 gap-3">
        <view
          v-for="badge in filteredEarned"
          :key="badge.id"
          class="flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-transform active:scale-95"
          :class="[RARITY_CFG[badge.rarity].bg, RARITY_CFG[badge.rarity].border]"
          @click="showBadgeDetail(badge)"
        >
          <text class="text-3xl mb-1">{{ badge.emoji }}</text>
          <text class="text-xs font-semibold text-foreground text-center line-clamp-1">{{ badge.name }}</text>
          <text class="text-[10px] mt-0.5" :class="RARITY_CFG[badge.rarity].text">{{ RARITY_CFG[badge.rarity].label }}</text>
          <text class="text-[10px] text-muted-foreground mt-0.5">✓ {{ badge.earnedAt }}</text>
        </view>
      </view>
      <view v-else class="flex items-center justify-center py-8 bg-background rounded-xl border border-dashed border-border mb-4">
        <text class="text-xs text-muted-foreground">该分类暂未获得徽章</text>
      </view>

      <!-- 待解锁徽章 -->
      <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3 block">
         待解锁 {{ locked.length }} 枚
      </text>
      <view class="space-y-2">
        <view
          v-for="badge in filteredLocked"
          :key="badge.id"
          class="flex items-center gap-3 p-3 bg-white border border-border rounded-xl cursor-pointer transition-transform active:scale-[0.99]"
          @click="showBadgeDetail(badge)"
        >
          <view class="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-2xl grayscale opacity-50">
            <text>{{ badge.emoji }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2 flex-wrap">
              <text class="text-sm font-medium text-foreground">{{ badge.name }}</text>
              <text
                class="text-[10px] px-1.5 py-0.5 rounded-full border"
                :class="[RARITY_CFG[badge.rarity].bg, RARITY_CFG[badge.rarity].border, RARITY_CFG[badge.rarity].text]"
              >{{ RARITY_CFG[badge.rarity].label }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-0.5 block">{{ badge.desc }}</text>
            <view v-if="badge.progress !== undefined && badge.total" class="mt-1.5 flex items-center gap-2">
              <view class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <view
                  class="h-full bg-primary/50 rounded-full transition-all"
                  :style="{ width: Math.min(100, (badge.progress / badge.total) * 100) + '%' }"
                />
              </view>
              <text class="text-[10px] text-muted-foreground flex-shrink-0">{{ badge.progress }}/{{ badge.total }}</text>
            </view>
          </view>
          <text class="text-muted-foreground flex-shrink-0"></text>
        </view>
      </view>

      <view v-if="filteredLocked.length === 0" class="flex items-center justify-center py-8 bg-background rounded-xl border border-dashed border-border">
        <text class="text-xs text-muted-foreground">所有徽章已解锁 </text>
      </view>
    </view>

    <!-- 徽章详情弹窗 -->
    <view v-if="detailBadge" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" @click="closeDetail">
      <view class="bg-white rounded-2xl p-6 w-full max-w-sm" @click.stop>
        <view class="flex flex-col items-center mb-4">
          <view
            class="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-3"
            :class="[RARITY_CFG[detailBadge.rarity].bg, RARITY_CFG[detailBadge.rarity].border, detailBadge.earned ? '' : 'grayscale opacity-50']"
          >
            <text>{{ detailBadge.emoji }}</text>
          </view>
          <text class="text-lg font-bold text-foreground">{{ detailBadge.name }}</text>
          <text
            class="text-xs px-2 py-0.5 rounded-full mt-1"
            :class="[RARITY_CFG[detailBadge.rarity].bg, RARITY_CFG[detailBadge.rarity].text]"
          >{{ RARITY_CFG[detailBadge.rarity].label }}徽章</text>
        </view>

        <view class="bg-background rounded-xl p-3 mb-4">
          <text class="text-xs text-foreground leading-relaxed">{{ detailBadge.desc }}</text>
        </view>

        <view v-if="detailBadge.earned" class="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
          <text> 获得时间</text>
          <text>{{ detailBadge.earnedAt }}</text>
        </view>

        <view v-if="!detailBadge.earned && detailBadge.progress !== undefined && detailBadge.total" class="mb-4">
          <view class="flex items-center justify-between text-xs mb-1">
            <text class="text-muted-foreground">解锁进度</text>
            <text class="text-foreground font-medium">{{ detailBadge.progress }}/{{ detailBadge.total }}</text>
          </view>
          <view class="h-2 bg-muted rounded-full overflow-hidden">
            <view
              class="h-full bg-primary rounded-full transition-all"
              :style="{ width: Math.min(100, (detailBadge.progress / detailBadge.total) * 100) + '%' }"
            />
          </view>
        </view>

        <view
          class="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium text-center"
          @click="closeDetail"
        >
          知道了
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Badge {
  id: string
  name: string
  desc: string
  emoji: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'achievement' | 'level' | 'activity'
  earned: boolean
  earnedAt?: string
  progress?: number
  total?: number
}

const RARITY_CFG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  common:    { label: '普通', bg: 'bg-slate-100',  border: 'border-slate-200',  text: 'text-slate-600' },
  rare:      { label: '稀有', bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-600' },
  epic:      { label: '史诗', bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-600' },
  legendary: { label: '传说', bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-600' },
}

const badgeCategories = [
  { id: 'all', icon: '', label: '全部' },
  { id: 'achievement', icon: '', label: '成就徽章' },
  { id: 'level', icon: '', label: '等级徽章' },
  { id: 'activity', icon: '', label: '活动徽章' },
]

// 加载状态
const loading = ref(true)
setTimeout(() => { loading.value = false }, 600)

const activeCategory = ref('all')

// 详细弹窗
const detailBadge = ref<Badge | null>(null)
function showBadgeDetail(badge: Badge) { detailBadge.value = badge }
function closeDetail() { detailBadge.value = null }

const allBadges: Badge[] = [
  { id: '1', name: '初入门径', desc: '加入第一个圈子', emoji: '🌱', rarity: 'common', category: 'achievement', earned: true, earnedAt: '2023-10-01' },
  { id: '2', name: '活跃探索', desc: '连续7天发帖', emoji: '', rarity: 'common', category: 'achievement', earned: true, earnedAt: '2023-10-15' },
  { id: '3', name: '知识布道', desc: '发布10篇精华内容', emoji: '', rarity: 'rare', category: 'achievement', earned: true, earnedAt: '2023-11-05' },
  { id: '4', name: '百人追随', desc: '获得100个粉丝', emoji: '', rarity: 'rare', category: 'achievement', earned: true, earnedAt: '2023-12-01' },
  { id: '5', name: '人气达人', desc: '单篇内容点赞超100', emoji: '', rarity: 'common', category: 'achievement', earned: true, earnedAt: '2023-12-15' },
  { id: '6', name: '青铜会员', desc: '达到LV5等级', emoji: '', rarity: 'common', category: 'level', earned: true, earnedAt: '2023-11-20' },
  { id: '7', name: '白银会员', desc: '达到LV10等级', emoji: '', rarity: 'rare', category: 'level', earned: true, earnedAt: '2024-01-10' },
  { id: '8', name: '黄金会员', desc: '达到LV20等级', emoji: '', rarity: 'epic', category: 'level', earned: false, progress: 15, total: 20 },
  { id: '9', name: '命理宗师', desc: '回答500个命理问题', emoji: '', rarity: 'epic', category: 'achievement', earned: false, progress: 342, total: 500 },
  { id: '10', name: '圈主传奇', desc: '圈子成员突破10000', emoji: '👑', rarity: 'legendary', category: 'achievement', earned: false, progress: 1280, total: 10000 },
  { id: '11', name: '月度达人', desc: '单月获赞超500', emoji: '🏅', rarity: 'epic', category: 'activity', earned: false, progress: 210, total: 500 },
  { id: '12', name: '古籍守护', desc: '收藏50部古籍', emoji: '📜', rarity: 'rare', category: 'achievement', earned: false, progress: 28, total: 50 },
  { id: '13', name: '活动先锋', desc: '参加3次平台活动', emoji: '🎪', rarity: 'common', category: 'activity', earned: true, earnedAt: '2024-02-14' },
  { id: '14', name: '分享大使', desc: '邀请10位好友注册', emoji: '', rarity: 'rare', category: 'activity', earned: false, progress: 6, total: 10 },
  { id: '15', name: '钻石会员', desc: '达到LV30等级', emoji: '💎', rarity: 'legendary', category: 'level', earned: false, progress: 22, total: 30 },
]

const earned = computed(() => allBadges.filter(b => b.earned))
const locked = computed(() => allBadges.filter(b => !b.earned))

const filteredEarned = computed(() => {
  if (activeCategory.value === 'all') return earned.value
  return earned.value.filter(b => b.category === activeCategory.value)
})

const filteredLocked = computed(() => {
  if (activeCategory.value === 'all') return locked.value
  return locked.value.filter(b => b.category === activeCategory.value)
})

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
