<template>
  <view class="circle-page">
    <view class="header-sticky">
      <view class="search-row">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索圈子" />
          <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
        </view>
      </view>
      <scroll-view scroll-x class="cat-scroll">
        <view class="cat-row">
          <text v-for="c in categories" :key="c.id" class="cat-chip" :class="{ active: selectedCat === c.id }" @click="selectedCat = c.id">{{ c.name }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="body-area">
      <!-- 我的圈子 -->
      <view class="section">
        <view class="sec-head">
          <view class="sh-tabs">
            <text class="sht-item" :class="{ active: myTab === 'joined' }" @click="myTab = 'joined'">我加入的</text>
            <text class="sht-item" :class="{ active: myTab === 'created' }" @click="myTab = 'created'">我创建的</text>
          </view>
          <text class="sh-more" @click="goPage('/pages/my-circles/index')">全部 ›</text>
        </view>
        <scroll-view v-if="myCircles.length" scroll-x class="my-cc-scroll">
          <view v-for="c in myCircles" :key="c.id" class="my-cc" @click="goPage('/pages/circle/index?id=' + c.id)">
            <view class="my-cc-cover">
              <text class="my-cc-placeholder">🏮</text>
              <view v-if="c.unread > 0" class="my-cc-badge">{{ c.unread > 99 ? '99+' : c.unread }}</view>
            </view>
            <text class="my-cc-name">{{ c.name }}</text>
            <text class="my-cc-meta">{{ (c.members / 1000).toFixed(1) }}k 成员</text>
            <text class="my-cc-post">{{ c.lastPost }}</text>
          </view>
        </scroll-view>
        <view v-else class="empty-mini">{{ myTab === 'created' ? '你还没有创建任何圈子' : '你还没有加入任何圈子' }}</view>
      </view>

      <!-- 创建圈子入口 -->
      <view class="create-card" @click="goPage('/pages/circle/create/index')">
        <view class="cc-icon">＋</view>
        <view class="cc-info">
          <text class="cc-title">创建你的圈子</text>
          <text class="cc-desc">打造专属国学交流社区，聚集志同道合的朋友</text>
        </view>
        <text class="cc-arrow">›</text>
      </view>

      <!-- 热门圈子 -->
      <view class="section">
        <view class="sec-head">
          <view class="sec-title-row">
            <text class="sec-icon">🔥</text>
            <text class="sec-title">热门圈子</text>
          </view>
          <text class="sec-tag">精选优质社群</text>
        </view>
        <view v-for="(c, idx) in displayedHot" :key="c.id" class="hot-card" @click="goPage('/pages/circle/index?id=' + c.id)">
          <view class="hc-rank" :class="'r' + (idx + 1)">{{ idx + 1 }}</view>
          <view class="hc-body">
            <view class="hc-top">
              <view class="hc-cover-placeholder">🏮</view>
              <view class="hc-info">
                <view class="hc-name-row">
                  <text class="hc-name">{{ c.name }}</text>
                  <text v-if="c.isVerified" class="hc-v">V</text>
                </view>
                <text class="hc-desc">{{ c.description }}</text>
                <view class="hc-tags">
                  <text v-for="t in c.tags" :key="t" class="hc-tag">{{ t }}</text>
                </view>
              </view>
            </view>
            <view class="hc-bottom">
              <view class="hc-stats">
                <text class="hc-stat">👥 {{ (c.members / 1000).toFixed(1) }}k</text>
                <text class="hc-stat">📝 {{ c.todayPosts }}今日</text>
                <text class="hc-stat">⭐ {{ c.rating }}</text>
              </view>
              <view class="hc-join" :class="{ joined: joinedIds.includes(c.id) }" @click.stop="toggleJoin(c.id)">
                <text>{{ joinedIds.includes(c.id) ? '已加入' : (c.price > 0 ? '¥' + c.price + ' 加入' : '免费加入') }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="hotCircles.length > 5" class="expand-btn" @click="hotExpanded = !hotExpanded">
          <text>{{ hotExpanded ? '收起' : '查看更多热门圈子 (' + (hotCircles.length - 5) + ')' }}</text>
          <text class="expand-arrow" :class="{ open: hotExpanded }">›</text>
        </view>
      </view>

      <!-- 发现更多 -->
      <view class="section">
        <view class="sec-head">
          <view class="sec-title-row">
            <text class="sec-icon">✨</text>
            <text class="sec-title">发现更多</text>
          </view>
        </view>
        <view class="discover-grid">
          <view v-for="c in recommendCircles" :key="c.id" class="dis-card" @click="goPage('/pages/circle/index?id=' + c.id)">
            <view class="dis-cover">
              <text class="dis-placeholder">🏮</text>
            </view>
            <text class="dis-name">{{ c.name }}</text>
            <text class="dis-desc">{{ c.description }}</text>
            <view class="dis-bottom">
              <text class="dis-members">👥 {{ (c.members / 1000).toFixed(1) }}k</text>
              <view class="dis-join-sm" :class="{ joined: joinedIds.includes(c.id) }" @click.stop="toggleJoin(c.id)">
                <text>{{ joinedIds.includes(c.id) ? '已加入' : '+' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const selectedCat = ref('all')
const myTab = ref('joined')
const hotExpanded = ref(false)
const joinedIds = ref<number[]>([1, 2, 3, 5])

const categories = [
  { id: 'all', name: '全部' }, { id: 'bazi', name: '八字命理' }, { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' }, { id: 'liuyao', name: '六爻占卜' }, { id: 'meihua', name: '梅花易数' },
  { id: 'qimen', name: '奇门遁甲' }, { id: 'xiangshu', name: '相学' }, { id: 'dao', name: '道家文化' }, { id: 'guoxue', name: '国学经典' },
]

const myCircles = [
  { id: 1, name: '八字命理研习社', members: 12800, unread: 12, lastPost: '今日话题：如何看流年大运' },
  { id: 2, name: '紫微斗数精研会', members: 8560, unread: 3, lastPost: '紫微斗数案例分析第56期' },
  { id: 3, name: '风水堪舆学院', members: 6280, unread: 0, lastPost: '办公室风水布局要点' },
  { id: 5, name: '道家养生圈', members: 9800, unread: 8, lastPost: '道家呼吸法入门教程' },
]

const hotCircles = [
  { id: 1, name: '八字命理研习社', description: '专注八字命理学习与实践', members: 12800, todayPosts: 128, category: '八字命理', price: 99, owner: '周易大师', isVerified: true, tags: ['TOP1', '活跃'], rating: 4.9 },
  { id: 2, name: '紫微斗数精研会', description: '深入研究紫微斗数，探索命运密码', members: 8560, todayPosts: 86, category: '紫微斗数', price: 0, owner: '张玄风', isVerified: true, tags: ['免费', '新手友好'], rating: 4.8 },
  { id: 3, name: '风水堪舆学院', description: '实战派风水知识分享与交流', members: 6280, todayPosts: 45, category: '风水堪舆', price: 199, owner: '陈风水', isVerified: true, tags: ['大咖入驻', '实战派'], rating: 4.7 },
  { id: 4, name: '姓名学研究所', description: '姓名与命运的关系研究', members: 4560, todayPosts: 32, category: '姓名学', price: 0, owner: '王文昌', isVerified: true, tags: ['免费'], rating: 4.8 },
  { id: 5, name: '道家养生圈', description: '道家养生功法与理论', members: 9800, todayPosts: 98, category: '道家文化', price: 68, owner: '李道长', isVerified: true, tags: ['活跃', '干货多'], rating: 4.9 },
  { id: 6, name: '中医经络研习', description: '中医经络与穴位养生', members: 7200, todayPosts: 56, category: '中医养生', price: 0, owner: '张仲景传人', isVerified: false, tags: ['免费', '科普'], rating: 4.6 },
]

const recommendCircles = [
  { id: 11, name: '易经智慧应用', description: '易经智慧在现代生活中的应用', members: 4280, price: 0, category: '国学经典', rating: 4.7 },
  { id: 12, name: '塔罗牌占卜交流', description: '塔罗牌解读与交流', members: 3560, price: 38, category: '西方占卜', rating: 4.8 },
  { id: 13, name: '星座运势分析', description: '十二星座每日运势分享', members: 8920, price: 0, category: '星座', rating: 4.6 },
  { id: 14, name: '佛学禅修静心', description: '佛学经典解读，禅修入门指导', members: 6780, price: 0, category: '佛学', rating: 4.9 },
  { id: 15, name: '古典诗词赏析', description: '唐诗宋词元曲鉴赏交流', members: 5230, price: 0, category: '国学经典', rating: 4.7 },
  { id: 16, name: '书法练习打卡', description: '每日书法练习，互相监督进步', members: 2890, price: 28, category: '书法', rating: 4.5 },
]

const displayedHot = computed(() => hotExpanded.value ? hotCircles : hotCircles.slice(0, 5))

function toggleJoin(id: number) {
  const idx = joinedIds.value.indexOf(id)
  if (idx >= 0) joinedIds.value.splice(idx, 1)
  else joinedIds.value.push(id)
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.circle-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.search-row { padding: 14rpx 24rpx; }
.search-box { display: flex; align-items: center; height: 68rpx; background: #F0EDE5; border-radius: 34rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #2C2C2C; }
.search-clear { font-size: 20rpx; color: #999; padding: 8rpx; }

.cat-scroll { white-space: nowrap; }
.cat-row { display: flex; gap: 10rpx; padding: 10rpx 24rpx 14rpx; }
.cat-chip { font-size: 22rpx; color: #666; background: #fff; border: 1px solid #E8E0D5; padding: 6rpx 18rpx; border-radius: 28rpx; display: inline-block; }
.cat-chip.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }

.body-area { padding: 8rpx 24rpx; }

.section { margin-bottom: 24rpx; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.sh-tabs { display: flex; background: #F0EDE5; border-radius: 28rpx; padding: 3rpx; }
.sht-item { font-size: 22rpx; color: #666; padding: 8rpx 20rpx; border-radius: 28rpx; }
.sht-item.active { background: #fff; color: #2C2C2C; font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.sh-more { font-size: 22rpx; color: #C41E3A; }
.sec-title-row { display: flex; align-items: center; gap: 8rpx; }
.sec-icon { font-size: 28rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.sec-tag { font-size: 20rpx; color: #BBB; background: #F5F1EB; padding: 2rpx 10rpx; border-radius: 16rpx; }

.my-cc-scroll { white-space: nowrap; margin: 0 -24rpx; padding: 0 24rpx; }
.my-cc { display: inline-block; width: 200rpx; background: #fff; border-radius: 14rpx; overflow: hidden; margin-right: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.my-cc-cover { aspect-ratio: 4/3; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.my-cc-placeholder { font-size: 48rpx; opacity: 0.3; }
.my-cc-badge { position: absolute; top: 8rpx; right: 8rpx; min-width: 32rpx; height: 32rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; padding: 0 6rpx; }
.my-cc-name { font-size: 22rpx; font-weight: 600; color: #2C2C2C; display: block; padding: 10rpx 10rpx 2rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.my-cc-meta { font-size: 18rpx; color: #BBB; display: block; padding: 0 10rpx; }
.my-cc-post { font-size: 18rpx; color: #999; display: block; padding: 4rpx 10rpx 10rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-mini { text-align: center; padding: 36rpx; background: #F5F1EB; border-radius: 14rpx; font-size: 22rpx; color: #999; }

.create-card { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; border: 2px solid rgba(196,30,58,0.15); margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cc-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: linear-gradient(135deg, #C41E3A, #E02D4A); display: flex; align-items: center; justify-content: center; font-size: 44rpx; color: #fff; font-weight: 300; flex-shrink: 0; }
.cc-info { flex: 1; }
.cc-title { font-size: 28rpx; font-weight: 700; color: #C41E3A; display: block; }
.cc-desc { font-size: 22rpx; color: #999; margin-top: 2rpx; display: block; }
.cc-arrow { font-size: 36rpx; color: #C41E3A; }

.hot-card { display: flex; gap: 12rpx; background: #fff; border-radius: 16rpx; padding: 16rpx 18rpx; margin-bottom: 10rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.hc-rank { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; background: #F5F1EB; color: #999; flex-shrink: 0; }
.hc-rank.r1 { background: #FA8C16; color: #fff; }
.hc-rank.r2 { background: #BBB; color: #fff; }
.hc-rank.r3 { background: #C9A96E; color: #fff; }
.hc-body { flex: 1; min-width: 0; }
.hc-top { display: flex; gap: 12rpx; }
.hc-cover-placeholder { width: 88rpx; height: 88rpx; border-radius: 14rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.hc-info { flex: 1; min-width: 0; }
.hc-name-row { display: flex; align-items: center; gap: 6rpx; }
.hc-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.hc-v { font-size: 16rpx; color: #C9A96E; background: rgba(201,169,110,0.15); padding: 1rpx 6rpx; border-radius: 4rpx; }
.hc-desc { font-size: 20rpx; color: #999; display: block; margin: 4rpx 0; }
.hc-tags { display: flex; gap: 6rpx; }
.hc-tag { font-size: 16rpx; color: #C41E3A; background: rgba(196,30,58,0.06); padding: 1rpx 8rpx; border-radius: 4rpx; }
.hc-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.hc-stats { display: flex; gap: 12rpx; }
.hc-stat { font-size: 18rpx; color: #BBB; }
.hc-join { padding: 6rpx 18rpx; border-radius: 24rpx; background: #C41E3A; font-size: 20rpx; color: #fff; }
.hc-join.joined { background: #F5F1EB; color: #999; }

.expand-btn { display: flex; align-items: center; justify-content: center; gap: 4rpx; padding: 16rpx 0; font-size: 22rpx; color: #C41E3A; }
.expand-arrow { font-size: 28rpx; transition: transform 0.2s; display: inline-block; }
.expand-arrow.open { transform: rotate(90deg); }

.discover-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.dis-card { width: calc(50% - 7rpx); background: #fff; border-radius: 14rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.dis-cover { aspect-ratio: 16/10; background: #F5F1EB; display: flex; align-items: center; justify-content: center; }
.dis-placeholder { font-size: 48rpx; opacity: 0.3; }
.dis-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; padding: 8rpx 12rpx 2rpx; }
.dis-desc { font-size: 20rpx; color: #BBB; display: block; padding: 0 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dis-bottom { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 12rpx 12rpx; }
.dis-members { font-size: 18rpx; color: #BBB; }
.dis-join-sm { width: 40rpx; height: 40rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; }
.dis-join-sm.joined { background: #F5F1EB; color: #999; }
</style>
