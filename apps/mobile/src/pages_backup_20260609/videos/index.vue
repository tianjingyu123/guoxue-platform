<template>
  <view class="video-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <view class="search-box" @click="goPage('/pages/videos/search/index')">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索视频、创作者</text>
        </view>
        <view class="publish-btn" @click="goPage('/pages/videos/publish/index')">
          <text class="pb-plus">+</text>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="tab-row">
        <text v-for="t in tabs" :key="t.id" class="tab-item" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
          {{ t.label }}
          <view v-if="activeTab === t.id" class="tab-line" />
        </text>
      </view>
    </view>

    <!-- 热门话题 -->
    <scroll-view scroll-x class="topics-row">
      <view v-for="t in hotTopics" :key="t.id" class="topic-chip" @click="goPage('/pages/videos/topic/index?id=' + t.id)">
        <text class="topic-fire">🔥</text>
        <text class="topic-name">#{{ t.name }}</text>
        <text class="topic-count">{{ t.count }}</text>
      </view>
    </scroll-view>

    <!-- 双列瀑布流 -->
    <view class="video-grid">
      <view class="vg-col">
        <view v-for="v in leftVideos" :key="v.id" class="video-card" @click="goPage('/pages/videos/detail/index?id=' + v.id)">
          <view class="vc-cover" :class="'aspect-' + (v.aspect || '34')">
            <view class="vc-img" />
            <view v-if="v.isHot" class="vc-badge hot">
              <text>📈 热门</text>
            </view>
            <view v-if="v.hasProduct" class="vc-badge shop">
              <text>🛍️ 带货</text>
            </view>
            <view class="vc-bottom">
              <view class="vc-plays">
                <text>▶ {{ formatNum(v.plays) }}</text>
              </view>
              <view class="vc-duration">
                <text>{{ formatDuration(v.duration) }}</text>
              </view>
            </view>
          </view>
          <view class="vc-info">
            <text class="vc-title">{{ v.title }}</text>
            <view class="vc-author">
              <view class="vca-avatar">{{ v.author.name[0] }}</view>
              <text class="vca-name">{{ v.author.name }}</text>
              <view class="vca-likes">
                <text>❤️ {{ formatNum(v.likes) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="vg-col">
        <view v-for="v in rightVideos" :key="v.id" class="video-card" @click="goPage('/pages/videos/detail/index?id=' + v.id)">
          <view class="vc-cover" :class="'aspect-' + (v.aspect || '35')">
            <view class="vc-img" />
            <view v-if="v.isHot" class="vc-badge hot">
              <text>📈 热门</text>
            </view>
            <view v-if="v.hasProduct" class="vc-badge shop">
              <text>🛍️ 带货</text>
            </view>
            <view class="vc-bottom">
              <view class="vc-plays">
                <text>▶ {{ formatNum(v.plays) }}</text>
              </view>
              <view class="vc-duration">
                <text>{{ formatDuration(v.duration) }}</text>
              </view>
            </view>
          </view>
          <view class="vc-info">
            <text class="vc-title">{{ v.title }}</text>
            <view class="vc-author">
              <view class="vca-avatar">{{ v.author.name[0] }}</view>
              <text class="vca-name">{{ v.author.name }}</text>
              <view class="vca-likes">
                <text>❤️ {{ formatNum(v.likes) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 发布浮动按钮 -->
    <view class="float-publish" @click="goPage('/pages/publish/video/index')">
      <text class="fp-icon">🎬</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref<'recommend' | 'follow' | 'hot'>('recommend')

const tabs = [
  { id: 'follow' as const, label: '关注' },
  { id: 'recommend' as const, label: '推荐' },
  { id: 'hot' as const, label: '热门' },
]

const hotTopics = [
  { id: '1', name: '八字入门', count: '128万' },
  { id: '2', name: '风水布局', count: '89万' },
  { id: '3', name: '取名改名', count: '56万' },
  { id: '4', name: '面相手相', count: '45万' },
]

interface Video {
  id: string
  title: string
  duration: number
  author: { name: string }
  likes: number
  plays: number
  hasProduct: boolean
  isHot: boolean
  aspect: string
}

const videos = ref<Video[]>([
  { id: '1', title: '八字命理入门：教你看懂自己的命盘 #八字 #命理入门', duration: 68, author: { name: '易学张老师' }, likes: 12680, plays: 89000, hasProduct: true, isHot: true, aspect: '34' },
  { id: '2', title: '紫微斗数：你的命宫主星是什么？', duration: 95, author: { name: '紫微林师傅' }, likes: 8920, plays: 56000, hasProduct: false, isHot: false, aspect: '35' },
  { id: '3', title: '风水布局：客厅财位怎么找？这几点必须注意', duration: 120, author: { name: '风水大师王' }, likes: 23500, plays: 156000, hasProduct: true, isHot: true, aspect: '45' },
  { id: '4', title: '姓名学：名字里这几个字最旺运势！', duration: 85, author: { name: '姓名学专家陈' }, likes: 45600, plays: 289000, hasProduct: true, isHot: true, aspect: '34' },
  { id: '5', title: '奇门遁甲入门：什么是九宫八门？', duration: 156, author: { name: '奇门张师傅' }, likes: 6780, plays: 42000, hasProduct: false, isHot: false, aspect: '35' },
  { id: '6', title: '面相学：从眉毛看一个人的性格和运势', duration: 78, author: { name: '面相大师李' }, likes: 18900, plays: 123000, hasProduct: true, isHot: false, aspect: '45' },
  { id: '7', title: '六爻预测：如何起卦？新手必看教程', duration: 145, author: { name: '六爻王老师' }, likes: 5600, plays: 34000, hasProduct: false, isHot: false, aspect: '34' },
  { id: '8', title: '手相入门：生命线、智慧线、感情线怎么看', duration: 92, author: { name: '手相师小周' }, likes: 28900, plays: 198000, hasProduct: true, isHot: true, aspect: '35' },
])

const leftVideos = computed(() => videos.value.filter((_, i) => i % 2 === 0))
const rightVideos = computed(() => videos.value.filter((_, i) => i % 2 === 1))

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m + ':' + String(sec).padStart(2, '0')
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.video-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 80rpx; }

.header-sticky { position: sticky; top: 0; z-index: 40; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 14rpx 24rpx; gap: 16rpx; }
.search-box { flex: 1; display: flex; align-items: center; height: 68rpx; background: #F5F1EB; border-radius: 34rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-placeholder { font-size: 24rpx; color: #999; }
.publish-btn { width: 68rpx; height: 68rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.pb-plus { font-size: 40rpx; color: #fff; line-height: 1; }

.tab-row { display: flex; align-items: center; justify-content: center; gap: 48rpx; padding: 10rpx 0; }
.tab-item { position: relative; font-size: 28rpx; font-weight: 500; color: #999; padding-bottom: 8rpx; }
.tab-item.active { color: #2C2C2C; }
.tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.topics-row { display: flex; padding: 14rpx 24rpx; white-space: nowrap; }
.topic-chip { display: inline-flex; align-items: center; gap: 4rpx; padding: 8rpx 16rpx; background: rgba(196,30,58,0.06); border-radius: 24rpx; margin-right: 10rpx; }
.topic-fire { font-size: 20rpx; }
.topic-name { font-size: 20rpx; color: #C41E3A; }
.topic-count { font-size: 18rpx; color: rgba(196,30,58,0.5); }

.video-grid { display: flex; gap: 12rpx; padding: 0 16rpx; }
.vg-col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.video-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }

.vc-cover { position: relative; background: #F0EDE5; overflow: hidden; }
.vc-cover.aspect-34 { aspect-ratio: 3/4; }
.vc-cover.aspect-35 { aspect-ratio: 3/5; }
.vc-cover.aspect-45 { aspect-ratio: 4/5; }
.vc-img { width: 100%; height: 100%; }
.vc-badge { position: absolute; top: 10rpx; padding: 2rpx 10rpx; border-radius: 4rpx; font-size: 18rpx; color: #fff; display: flex; align-items: center; gap: 2rpx; }
.vc-badge.hot { left: 10rpx; background: #FF6B35; }
.vc-badge.shop { right: 10rpx; background: linear-gradient(90deg, #FF6B35, #FF9F43); }
.vc-bottom { position: absolute; bottom: 8rpx; left: 8rpx; right: 8rpx; display: flex; justify-content: space-between; align-items: center; }
.vc-plays { font-size: 18rpx; color: rgba(255,255,255,0.8); }
.vc-duration { font-size: 18rpx; color: #fff; background: rgba(0,0,0,0.5); padding: 2rpx 8rpx; border-radius: 4rpx; }

.vc-info { padding: 16rpx; }
.vc-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 10rpx; }
.vc-author { display: flex; align-items: center; gap: 8rpx; }
.vca-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; flex-shrink: 0; }
.vca-name { flex: 1; font-size: 20rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vca-likes { font-size: 20rpx; color: #BBB; flex-shrink: 0; }

.float-publish { position: fixed; right: 32rpx; bottom: 160rpx; width: 104rpx; height: 104rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #E85A70); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; z-index: 30; }
.fp-icon { font-size: 40rpx; }
</style>
