<template>
  <view class="rk-page">
    <view class="rk-header">
      <view class="rkh-row">
        <text class="rkh-back" @click="uni.navigateBack()">‹</text>
        <view class="rkh-title-row">
          <text>🏆 热卜榜单</text>
        </view>
      </view>
    </view>

    <view class="cat-scroll">
      <scroll-view scroll-x class="cat-row">
        <text v-for="c in categories" :key="c.id" class="cat-chip" :class="{ active: activeCat === c.id }" @click="activeCat = c.id">
          {{ c.icon }} {{ c.label }}
        </text>
      </scroll-view>
    </view>

    <view class="time-filter">
      <view class="tf-row">
        <text v-for="t in timeFilters" :key="t.id" class="tf-chip" :class="{ active: timeRange === t.id }" @click="timeRange = t.id">
          {{ t.label }}
        </text>
      </view>
    </view>

    <view class="rank-list">
      <template v-if="activeCat === 'circles'">
        <view v-for="(item, idx) in circleRanks" :key="item.id" class="rank-card" :class="{ top3: idx < 3 }">
          <view class="rk-rank" :class="rankClass(idx)">{{ idx + 1 }}</view>
          <view class="rk-avatar">{{ item.name[0] }}</view>
          <view class="rk-info">
            <text class="rk-name">{{ item.name }}</text>
            <text class="rk-sub">圈主：{{ item.owner }}</text>
          </view>
          <view class="rk-right">
            <text class="rk-val">{{ (item.members / 1000).toFixed(1) }}k</text>
            <text class="rk-growth">+{{ item.growth }}</text>
          </view>
        </view>
      </template>

      <template v-if="activeCat === 'creators'">
        <view v-for="(item, idx) in creatorRanks" :key="item.id" class="rank-card" :class="{ top3: idx < 3 }">
          <view class="rk-rank" :class="rankClass(idx)">{{ idx + 1 }}</view>
          <view class="rk-avatar">{{ item.name[0] }}</view>
          <view class="rk-info">
            <text class="rk-name">{{ item.name }}</text>
            <text class="rk-sub">{{ item.title }}</text>
            <view class="rk-stats-row">
              <text class="rk-mini">👥 {{ (item.followers / 1000).toFixed(1) }}k</text>
              <text class="rk-mini">❤️ {{ (item.likes / 1000).toFixed(1) }}k</text>
              <text class="rk-mini">📖 {{ item.articles }}篇</text>
            </view>
          </view>
        </view>
      </template>

      <template v-if="activeCat === 'courses'">
        <view v-for="(item, idx) in courseRanks" :key="item.id" class="rank-card" :class="{ top3: idx < 3 }">
          <view class="rk-rank" :class="rankClass(idx)">{{ idx + 1 }}</view>
          <view class="rk-thumb">📚</view>
          <view class="rk-info">
            <text class="rk-name">{{ item.name }}</text>
            <text class="rk-sub">{{ item.teacher }}</text>
            <view class="rk-stats-row">
              <text class="rk-mini">{{ item.students }}人学习</text>
              <text class="rk-mini">⭐ {{ item.rating }}</text>
            </view>
          </view>
          <text class="rk-price">¥{{ item.price }}</text>
        </view>
      </template>

      <template v-if="activeCat === 'products'">
        <view v-for="(item, idx) in productRanks" :key="item.id" class="rank-card" :class="{ top3: idx < 3 }">
          <view class="rk-rank" :class="rankClass(idx)">{{ idx + 1 }}</view>
          <view class="rk-thumb">📦</view>
          <view class="rk-info">
            <text class="rk-name">{{ item.name }}</text>
            <view class="rk-stats-row">
              <text class="rk-mini">{{ item.sales }}人购买</text>
              <text class="rk-mini">⭐ {{ item.rating }}</text>
            </view>
          </view>
          <text class="rk-price">¥{{ item.price }}</text>
        </view>
      </template>

      <template v-if="activeCat === 'rising'">
        <view v-for="(item, idx) in risingRanks" :key="item.id" class="rank-card" :class="{ top3: idx < 3 }">
          <view class="rk-rank" :class="rankClass(idx)">{{ idx + 1 }}</view>
          <view class="rk-avatar rk-green">{{ item.name[0] }}</view>
          <view class="rk-info">
            <view class="rk-name-row">
              <text class="rk-name">{{ item.name }}</text>
              <text class="rk-new-badge">🔥 新星</text>
            </view>
            <text class="rk-sub">入驻{{ item.joinDays }}天</text>
          </view>
          <view class="rk-right">
            <text class="rk-gval">+{{ item.growth }}</text>
            <text class="rk-mini">{{ item.followers }}粉丝</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeCat = ref('circles')
const timeRange = ref('week')

const categories = [
  { id: 'circles', label: '圈子榜', icon: '👥' },
  { id: 'creators', label: '创作者榜', icon: '👑' },
  { id: 'courses', label: '课程榜', icon: '📖' },
  { id: 'products', label: '商品榜', icon: '🛍️' },
  { id: 'rising', label: '新星榜', icon: '📈' },
]

const timeFilters = [
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'total', label: '总榜' },
]

const circleRanks = [
  { id: 1, name: '八字命理研习社', members: 12680, growth: 1280, owner: '张道源' },
  { id: 2, name: '紫微斗数交流圈', members: 9856, growth: 856, owner: '李易卿' },
  { id: 3, name: '风水堪舆实战派', members: 8234, growth: 623, owner: '王文昌' },
  { id: 4, name: '易经智慧学堂', members: 7156, growth: 512, owner: '陈玄风' },
  { id: 5, name: '六爻预测研究会', members: 6023, growth: 389, owner: '周易安' },
]

const creatorRanks = [
  { id: 1, name: '张道源', title: '八字命理专家', followers: 28600, likes: 156800, articles: 326 },
  { id: 2, name: '李易卿', title: '紫微斗数研究员', followers: 21500, likes: 128600, articles: 245 },
  { id: 3, name: '王文昌', title: '风水堪舆大师', followers: 18900, likes: 98500, articles: 189 },
  { id: 4, name: '陈玄风', title: '易经学者', followers: 15600, likes: 86200, articles: 156 },
  { id: 5, name: '周易安', title: '六爻占卜师', followers: 12800, likes: 72300, articles: 128 },
]

const courseRanks = [
  { id: 1, name: '八字入门到精通', teacher: '张道源', students: 12680, rating: 4.9, price: 299 },
  { id: 2, name: '紫微斗数实战班', teacher: '李易卿', students: 8956, rating: 4.8, price: 399 },
  { id: 3, name: '阳宅风水精讲', teacher: '王文昌', students: 7234, rating: 4.9, price: 499 },
  { id: 4, name: '易经六十四卦详解', teacher: '陈玄风', students: 6156, rating: 4.7, price: 199 },
  { id: 5, name: '六爻预测从零开始', teacher: '周易安', students: 5023, rating: 4.8, price: 249 },
]

const productRanks = [
  { id: 1, name: '滴天髓精解', sales: 3268, rating: 4.9, price: 68 },
  { id: 2, name: '子平真诠评注', sales: 2856, rating: 4.8, price: 88 },
  { id: 3, name: '专业排盘罗盘', sales: 2134, rating: 4.9, price: 298 },
  { id: 4, name: '穷通宝鉴白话解', sales: 1956, rating: 4.7, price: 58 },
  { id: 5, name: '三命通会全套', sales: 1623, rating: 4.8, price: 168 },
]

const risingRanks = [
  { id: 1, name: '小易说命理', joinDays: 30, followers: 3680, growth: 2800 },
  { id: 2, name: '玄学新视角', joinDays: 45, followers: 2856, growth: 2100 },
  { id: 3, name: '紫微探秘', joinDays: 28, followers: 2234, growth: 1800 },
  { id: 4, name: '易学入门君', joinDays: 35, followers: 1956, growth: 1500 },
  { id: 5, name: '风水小课堂', joinDays: 42, followers: 1623, growth: 1200 },
]

function rankClass(idx: number) {
  if (idx === 0) return 'r1'
  if (idx === 1) return 'r2'
  if (idx === 2) return 'r3'
  return ''
}
</script>

<style scoped>
.rk-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.rk-header { background: linear-gradient(135deg, #FA8C16, #FF7A45); }
.rkh-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.rkh-back { font-size: 48rpx; color: #fff; width: 64rpx; }
.rkh-title-row text { font-size: 34rpx; font-weight: 700; color: #fff; }

.cat-scroll { background: #fff; border-bottom: 1px solid #E8E0D5; position: sticky; top: 0; z-index: 20; }
.cat-row { display: flex; padding: 8rpx 24rpx; white-space: nowrap; }
.cat-chip { font-size: 24rpx; color: #666; padding: 12rpx 24rpx; border-bottom: 2px solid transparent; margin-right: 4rpx; display: inline-block; }
.cat-chip.active { color: #FA8C16; border-bottom-color: #FA8C16; font-weight: 500; }

.time-filter { display: flex; justify-content: flex-end; padding: 14rpx 24rpx; }
.tf-row { display: flex; gap: 4rpx; background: #F5F1EB; border-radius: 32rpx; padding: 3rpx; }
.tf-chip { font-size: 22rpx; color: #999; padding: 8rpx 22rpx; border-radius: 32rpx; }
.tf-chip.active { background: #FA8C16; color: #fff; }

.rank-list { padding: 0 24rpx; }
.rank-card { display: flex; align-items: center; gap: 14rpx; background: #fff; border-radius: 14rpx; padding: 16rpx 18rpx; margin-bottom: 8rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.rank-card.top3 { border: 1px solid rgba(250,140,22,0.15); background: rgba(250,140,22,0.02); }

.rk-rank { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; background: #F5F1EB; color: #999; flex-shrink: 0; }
.rk-rank.r1 { background: #FA8C16; color: #fff; }
.rk-rank.r2 { background: #BBB; color: #fff; }
.rk-rank.r3 { background: #C9A96E; color: #fff; }

.rk-avatar { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #C41E3A; flex-shrink: 0; }
.rk-avatar.rk-green { background: rgba(82,196,26,0.08); color: #52C41A; }
.rk-thumb { width: 72rpx; height: 72rpx; border-radius: 14rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }

.rk-info { flex: 1; min-width: 0; }
.rk-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.rk-sub { font-size: 20rpx; color: #BBB; margin-top: 2rpx; display: block; }
.rk-stats-row { display: flex; gap: 12rpx; margin-top: 4rpx; }
.rk-mini { font-size: 18rpx; color: #BBB; }
.rk-name-row { display: flex; align-items: center; gap: 8rpx; }
.rk-new-badge { font-size: 16rpx; color: #52C41A; background: rgba(82,196,26,0.08); padding: 1rpx 8rpx; border-radius: 6rpx; }

.rk-right { text-align: right; flex-shrink: 0; }
.rk-val { font-size: 28rpx; font-weight: 700; color: #FA8C16; display: block; }
.rk-growth { font-size: 18rpx; color: #52C41A; display: block; }
.rk-gval { font-size: 28rpx; font-weight: 700; color: #52C41A; display: block; }
.rk-price { font-size: 26rpx; font-weight: 700; color: #C41E3A; flex-shrink: 0; }
</style>
