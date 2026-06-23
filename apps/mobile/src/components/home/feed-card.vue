<script setup lang="ts">
/** 首页瀑布流卡片渲染器（原型 home-feed.tsx 多种卡片合一）
 *  按 kind/type 分支渲染：visual(课程/商品/直播/视频/电子书)/article/text-only(帖子/无封面文章)/
 *  poem_daily/poem/circle/agent。跨端：封面经 image，未迁移目标页 navigateTo fail→toastComingSoon。 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  type RenderItem,
  type FeedItem,
  typeConfig,
  agentThemes,
  coverAspect,
  formatLikes,
  formatCount,
} from '@/lib/home-data'

const props = defineProps<{ data: RenderItem }>()

const isAgent = computed(() => props.data.kind === 'agent')
const item = computed<FeedItem | null>(() => (props.data.kind === 'feed' ? props.data.item : null))
const agent = computed(() => (props.data.kind === 'agent' ? props.data.agent : null))

// 视觉卡：课程/商品/直播(竖)/视频/电子书
const VISUAL_TYPES = ['course', 'product', 'live', 'video', 'ebook']
const cardType = computed(() => item.value?.type ?? '')
const isVisual = computed(() => VISUAL_TYPES.includes(cardType.value) && !!item.value?.cover)
const isArticle = computed(() => cardType.value === 'article' && !!item.value?.cover)
const isTextOnly = computed(
  () => (!item.value?.cover && (cardType.value === 'article' || cardType.value === 'post')),
)
const isPoemDaily = computed(() => cardType.value === 'poem_daily')
const isPoem = computed(() => cardType.value === 'poem')
const isCircle = computed(() => cardType.value === 'circle')

const aspect = computed(() => coverAspect(item.value?.coverRatio))
const isLiveNow = computed(() => cardType.value === 'live' && item.value?.isLive)
const badge = computed(() => typeConfig[cardType.value])
const avatarChar = computed(() => {
  const a = item.value
  return (a?.authorAvatar || a?.author || '').charAt(0)
})

function go() {
  const it = item.value
  if (it) {
    const map: Record<string, string> = {
      live: `/pages/live/detail?id=${it.id}`,
      course: `/pages/course/detail?id=${it.id}`,
      video: `/pages/video/detail?id=${it.id}`,
      ebook: `/pages/ebook/detail?id=${it.id}`,
      product: `/pages/mall/product?id=${it.id}`,
      article: `/pages/article/detail?id=${it.id}`,
      post: `/pages/post/detail?id=${it.id}`,
      poem: `/pages/poetry/detail?id=${it.id}`,
      poem_daily: `/pages/poetry/detail?id=${it.id}`,
    }
    if (it.type === 'circle') {
      navigateTo(
        it.isMember
          ? `/pkg-circle/circles/detail?id=${it.id}`
          : `/pkg-circle/circles/preview?id=${it.id}`,
      )
      return
    }
    navigateTo(map[it.type] || `/pages/article/detail?id=${it.id}`)
    return
  }
  if (agent.value) navigateTo(`/pkg-agent/agent/chat?id=${agent.value.id}`)
}

const theme = computed(() => agentThemes[agent.value?.type ?? 'general'] ?? agentThemes.general)
</script>

<template>
  <!-- ============ 智能体卡 ============ -->
  <view v-if="isAgent && agent" class="card card-press" @tap="go">
    <view class="agent-cover gradient-flow" :class="theme.gradientClass">
      <view class="agent-mask" />
      <text class="ai-badge">AI</text>
      <text v-if="agent.isHot" class="hot-badge badge-flash">HOT</text>
      <view class="agent-center">
        <view class="agent-icon agent-icon-glow">
          <app-icon :name="theme.icon" :size="56" color="#ffffff" />
        </view>
        <text class="agent-intro">{{ agent.intro }}</text>
        <view v-if="agent.online" class="online">
          <view class="online-dot animate-online-glow" />
          <text class="online-text">在线</text>
        </view>
      </view>
    </view>
    <view class="info">
      <text class="agent-name">{{ agent.name }}</text>
      <text class="agent-desc">{{ agent.desc }}</text>
      <view class="agent-foot">
        <text class="agent-users">{{ agent.users }}人使用</text>
        <text class="agent-chat">立即对话</text>
      </view>
    </view>
  </view>

  <!-- ============ 视觉卡：课程/商品/直播/视频/电子书 ============ -->
  <view v-else-if="item && isVisual" class="card card-press" :class="{ 'live-card-glow': isLiveNow }" @tap="go">
    <view class="cover" :style="{ aspectRatio: aspect }">
      <image :src="item.cover!" class="cover-img" mode="aspectFill" />
      <text v-if="badge" class="type-badge" :style="{ background: badge.bg }">{{ badge.label }}</text>
      <!-- 直播中呼吸灯 -->
      <view v-if="isLiveNow" class="live-tag live-indicator">
        <view class="live-dot" /><text class="live-text">直播中</text>
      </view>
      <!-- 直播预约时间 -->
      <view v-if="cardType === 'live' && !item.isLive && item.time" class="time-tag">
        <app-icon name="clock" :size="20" color="#ffffff" /><text class="time-text">{{ item.time }}</text>
      </view>
      <!-- 商品标签 -->
      <text
        v-if="cardType === 'product' && item.tag"
        class="goods-tag"
        :class="item.tag === '秒杀' ? 'tag-danger' : item.tag === '热销' ? 'tag-brand' : 'tag-dim'"
      >{{ item.tag }}</text>
      <!-- 视频播放按钮 + 时长 -->
      <template v-if="cardType === 'video'">
        <view class="play-btn"><app-icon name="play" :size="36" color="#ffffff" :fill="true" /></view>
        <text class="duration">{{ item.duration }}</text>
      </template>
      <!-- 直播观看/预约数 -->
      <view v-if="cardType === 'live'" class="viewers">
        <app-icon name="eye" :size="20" color="#ffffff" />
        <text class="viewers-text">{{ formatCount(item.isLive ? item.viewers : item.reservations) }}</text>
      </view>
      <!-- 电子书价格 -->
      <text v-if="cardType === 'ebook'" class="ebook-price">{{ item.price ? '¥' + item.price : '会员免费' }}</text>
    </view>
    <view class="info">
      <text class="title clamp-2">{{ item.title }}</text>
      <!-- 价格行 -->
      <view v-if="cardType === 'course' || cardType === 'product'" class="price-row">
        <text class="price">¥{{ item.price }}</text>
        <text v-if="item.originalPrice" class="origin">¥{{ item.originalPrice }}</text>
      </view>
      <view v-if="cardType === 'ebook'" class="ebook-row">
        <text class="ebook-p">{{ item.price ? '¥' + item.price : '免费' }}</text>
        <text class="ebook-readers">{{ formatCount(item.readers) }}人读过</text>
      </view>
      <view class="foot">
        <text v-if="cardType === 'course'" class="meta">{{ formatCount(item.students) }}人已学</text>
        <text v-else-if="cardType === 'product'" class="meta">已售{{ formatCount(item.sales) }}</text>
        <view v-else class="author">
          <view class="avatar"><text class="avatar-char">{{ avatarChar }}</text></view>
          <text class="author-name">{{ item.author }}</text>
        </view>
        <view v-if="cardType === 'video'" class="like">
          <app-icon name="heart" :size="26" color="#999999" /><text class="like-num">{{ item.likes }}</text>
        </view>
        <text v-if="cardType === 'ebook'" class="ebook-author">{{ item.author }}</text>
      </view>
    </view>
  </view>

  <!-- ============ 文章卡（带封面） ============ -->
  <view v-else-if="item && isArticle" class="card card-press" @tap="go">
    <view class="cover" :style="{ aspectRatio: aspect }">
      <image :src="item.cover!" class="cover-img" mode="aspectFill" />
      <text class="type-badge" :style="{ background: typeConfig.article.bg }">文章</text>
    </view>
    <view class="info">
      <text class="title-serif clamp-2">{{ item.title }}</text>
      <text v-if="item.excerpt" class="excerpt clamp-2">{{ item.excerpt }}</text>
      <view class="foot">
        <view class="author">
          <view class="avatar"><text class="avatar-char">{{ avatarChar }}</text></view>
          <text class="author-name">{{ item.author }}</text>
        </view>
        <view class="like"><app-icon name="heart" :size="22" color="#999999" /><text class="like-num">{{ item.likes }}</text></view>
      </view>
    </view>
  </view>

  <!-- ============ 纯文字卡（无封面 文章/帖子） ============ -->
  <view v-else-if="item && isTextOnly" class="card card-press text-card" @tap="go">
    <view class="text-head">
      <text class="mini-badge" :style="{ background: (badge || typeConfig.article).bg }">{{ (badge || typeConfig.article).label }}</text>
      <view class="author">
        <view class="avatar"><text class="avatar-char">{{ avatarChar }}</text></view>
        <text class="author-name">{{ item.author }}</text>
      </view>
    </view>
    <text class="title-serif clamp-3">{{ item.title }}</text>
    <text v-if="item.excerpt || item.content" class="text-body clamp-5">{{ item.excerpt || item.content }}</text>
    <view class="text-foot">
      <view class="like"><app-icon name="heart" :size="22" color="#999999" /><text class="like-num">{{ item.likes }}</text></view>
      <view class="like"><app-icon name="message-circle" :size="22" color="#999999" /><text class="like-num">{{ item.comments }}</text></view>
    </view>
  </view>

  <!-- ============ 每日一首（深色书页风） ============ -->
  <view v-else-if="item && isPoemDaily" class="card card-press poem-daily" @tap="go">
    <view class="spine" />
    <view class="poem-inner">
      <view class="poem-head">
        <text class="seal">每日</text>
        <text class="dynasty">〔{{ item.dynasty }}〕{{ item.author }}</text>
      </view>
      <view class="poem-lines">
        <text v-for="(line, i) in item.lines" :key="i" class="poem-line">{{ line }}</text>
      </view>
      <view class="poem-foot">
        <text class="poem-title">{{ item.title }}</text>
        <view class="like"><app-icon name="heart" :size="22" color="#999999" /><text class="like-num">{{ formatLikes(item.likes) }}</text></view>
      </view>
    </view>
  </view>

  <!-- ============ 普通诗词卡（书签风） ============ -->
  <view v-else-if="item && isPoem" class="card card-press poem-card" @tap="go">
    <view class="poem-bar" />
    <view class="poem-body">
      <view class="poem-title-row">
        <text class="poem-name">{{ item.title }}</text>
        <text class="poem-author">· {{ item.author }}</text>
        <text v-if="item.form" class="poem-form">{{ item.form }}</text>
      </view>
      <text class="poem-preview">{{ item.preview }}</text>
      <view class="poem-foot">
        <view class="poem-tags">
          <text v-for="t in item.tags" :key="t" class="poem-tag">{{ t }}</text>
        </view>
        <view class="like"><app-icon name="heart" :size="20" color="#999999" /><text class="like-num">{{ formatLikes(item.likes) }}</text></view>
      </view>
    </view>
  </view>

  <!-- ============ 圈子卡（masonry 简版） ============ -->
  <view v-else-if="item && isCircle" class="card card-press" @tap="go">
    <view class="cover" :style="{ aspectRatio: aspect }">
      <image :src="item.cover!" class="cover-img" mode="aspectFill" />
      <text class="type-badge" :style="{ background: typeConfig.circle.bg }">圈子</text>
    </view>
    <view class="info">
      <view class="circle-name-row">
        <text class="title clamp-1">{{ item.circleName }}</text>
        <app-icon v-if="item.isVerified" name="badge-check" :size="26" color="#c9a96e" />
      </view>
      <text class="excerpt clamp-2">{{ item.content }}</text>
      <view class="circle-meta">
        <view class="cm-stat"><app-icon name="users" :size="22" color="#999999" /><text class="cm-num">{{ formatCount(item.members) }}</text></view>
        <text class="cm-price">{{ item.price ? '¥' + item.price : '免费' }}</text>
      </view>
      <view class="circle-foot">
        <text class="join-btn" :class="{ joined: item.isMember }">{{ item.isMember ? '已加入' : '加入' }}</text>
      </view>
    </view>
</template>

<style scoped lang="scss">
.card {
  margin-bottom: 12rpx;
  background: var(--card, #fff);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
}
.cover { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cover-img { width: 100%; height: 100%; }
.type-badge {
  position: absolute; top: 16rpx; left: 16rpx;
  font-size: 18rpx; color: rgba(255, 255, 255, 0.95); font-weight: 500;
  padding: 4rpx 16rpx; border-radius: 999rpx; letter-spacing: 1rpx;
}
.live-tag {
  position: absolute; top: 16rpx; right: 16rpx;
  display: flex; align-items: center; gap: 6rpx;
  padding: 4rpx 12rpx; border-radius: 999rpx; background: #c41e3a;
}
.live-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #fff; }
.live-text { font-size: 18rpx; color: #fff; }
.time-tag {
  position: absolute; top: 16rpx; right: 16rpx;
  display: flex; align-items: center; gap: 2rpx;
  padding: 4rpx 12rpx; border-radius: 999rpx; background: #4a7fa5;
}
.time-text { font-size: 18rpx; color: #fff; }
.goods-tag {
  position: absolute; top: 16rpx; right: 16rpx;
  font-size: 18rpx; padding: 4rpx 16rpx; border-radius: 999rpx; font-weight: 500;
}
.tag-danger { background: #d4380d; color: #fff; }
.tag-brand { background: #c41e3a; color: #fff; }
.tag-dim { background: rgba(0, 0, 0, 0.35); color: rgba(255, 255, 255, 0.95); }
.play-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 80rpx; height: 80rpx; border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
}
.duration {
  position: absolute; bottom: 16rpx; right: 16rpx;
  font-size: 18rpx; color: #fff; font-family: var(--font-mono);
  padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(0, 0, 0, 0.6);
}
.viewers {
  position: absolute; bottom: 16rpx; left: 16rpx;
  display: flex; align-items: center; gap: 2rpx;
  padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(0, 0, 0, 0.5);
}
.viewers-text { font-size: 18rpx; color: #fff; }
.ebook-price {
  position: absolute; bottom: 16rpx; left: 16rpx;
  font-size: 18rpx; color: #fff; font-weight: 500;
  padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(74, 127, 165, 0.9);
}
.info { padding: 20rpx; }
.title {
  display: block; font-size: 28rpx; font-weight: 500; line-height: 1.5;
  color: var(--text-ink, #2c2c2c); margin-bottom: 12rpx;
}
.title-serif {
  display: block; font-family: var(--font-serif); font-size: 28rpx; font-weight: 700;
  line-height: 1.4; color: var(--text-ink, #2c2c2c); margin-bottom: 12rpx;
}
.price-row { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 12rpx; }
.price { font-size: 32rpx; font-weight: 700; color: #c41e3a; font-family: var(--font-mono); }
.origin { font-size: 22rpx; color: var(--text-soft, #999); text-decoration: line-through; }
.ebook-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.ebook-p { font-size: 30rpx; font-weight: 700; color: #4a7fa5; font-family: var(--font-mono); }
.ebook-readers { font-size: 22rpx; color: var(--text-soft, #999); }
.foot { display: flex; align-items: center; justify-content: space-between; }
.meta { font-size: 22rpx; color: var(--text-soft, #555); }
.author { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.avatar {
  width: 32rpx; height: 32rpx; border-radius: 999rpx; flex-shrink: 0;
  background: rgba(150, 150, 150, 0.2);
  display: flex; align-items: center; justify-content: center;
}
.avatar-char { font-size: 16rpx; color: var(--text-soft, #555); }
.author-name { font-size: 22rpx; color: var(--text-soft, #555); max-width: 140rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.like { display: flex; align-items: center; gap: 4rpx; }
.like-num { font-size: 22rpx; color: var(--text-soft, #999); }
.ebook-author { font-size: 22rpx; color: #92715a; font-weight: 500; }
.excerpt { display: block; font-size: 24rpx; color: var(--text-soft, #555); line-height: 1.6; margin-bottom: 16rpx; }

/* 纯文字卡 */
.text-card { padding: 24rpx; }
.text-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.mini-badge { font-size: 18rpx; color: #fff; font-weight: 500; padding: 4rpx 12rpx; border-radius: 8rpx; }
.text-body { display: block; font-size: 26rpx; color: var(--text-soft, #555); line-height: 1.75; margin: 12rpx 0 20rpx; }
.text-foot { display: flex; align-items: center; gap: 32rpx; padding-top: 16rpx; border-top: 2rpx solid rgba(0, 0, 0, 0.06); }

/* 每日一首 */
.poem-daily { position: relative; border: 2rpx solid rgba(201, 169, 110, 0.2); }
.spine { position: absolute; left: 0; top: 0; bottom: 0; width: 6rpx; background: linear-gradient(180deg, #e8c87a, #c9a96e 50%, #b8985f); }
.poem-inner { padding: 28rpx 28rpx 24rpx 32rpx; }
.poem-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.seal {
  font-size: 18rpx; font-weight: 700; color: #c41e3a; letter-spacing: 4rpx;
  padding: 4rpx 16rpx; border-radius: 8rpx;
  border: 2rpx solid rgba(196, 30, 58, 0.5); background: rgba(196, 30, 58, 0.04);
}
.dynasty { font-size: 20rpx; color: var(--text-soft, #999); font-family: var(--font-serif); }
.poem-lines { display: flex; flex-direction: row-reverse; justify-content: center; gap: 28rpx; padding: 16rpx 0; min-height: 160rpx; }
.poem-line {
  font-family: var(--font-serif); font-size: 30rpx; color: var(--text-ink, #2c2c2c);
  writing-mode: vertical-rl; letter-spacing: 6rpx; line-height: 1.9;
}
.poem-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; padding-top: 20rpx; border-top: 2rpx solid rgba(201, 169, 110, 0.25); }
.poem-title { font-family: var(--font-serif); font-weight: 700; font-size: 28rpx; color: #c9a96e; letter-spacing: 2rpx; }

/* 普通诗词卡 */
.poem-card { background: linear-gradient(160deg, #fdfaf4 0%, #faf3e8 100%); border: 2rpx solid rgba(201, 169, 110, 0.22); }
.poem-bar { height: 6rpx; width: 100%; background: linear-gradient(90deg, #c9a96e 0%, #e8c87a 50%, rgba(201, 169, 110, 0.2) 100%); }
.poem-body { padding: 28rpx; }
.poem-title-row { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.poem-name { font-family: var(--font-serif); font-weight: 700; font-size: 30rpx; color: #c9a96e; }
.poem-author { font-size: 20rpx; color: var(--text-soft, #999); font-family: var(--font-serif); }
.poem-form { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(201, 169, 110, 0.12); color: #92715a; }
.poem-preview {
  display: block; font-size: 26rpx; line-height: 1.9; color: var(--text-ink, #2c2c2c);
  font-family: var(--font-serif); font-style: italic;
  padding-left: 20rpx; border-left: 4rpx solid rgba(201, 169, 110, 0.4); margin-bottom: 20rpx;
}
.poem-tags { display: flex; gap: 8rpx; flex-wrap: wrap; }
.poem-tag { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(201, 169, 110, 0.1); color: #92715a; }

/* 圈子卡 */
.circle-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.circle-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.cm-stat { display: flex; align-items: center; gap: 4rpx; }
.cm-num { font-size: 22rpx; color: var(--text-soft, #666); }
.cm-price { font-size: 24rpx; font-weight: 700; color: #c41e3a; }
.circle-foot { display: flex; justify-content: flex-end; }
.join-btn { font-size: 22rpx; color: #fff; background: #c41e3a; padding: 8rpx 28rpx; border-radius: 999rpx; }
.join-btn.joined { color: var(--text-soft, #999); background: var(--line-soft, #f5f0e8); }

/* 智能体卡 */
.agent-cover { position: relative; width: 100%; aspect-ratio: 4 / 5; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 24rpx; overflow: hidden; }
.agent-mask { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.2)); }
.ai-badge {
  position: absolute; top: 16rpx; left: 16rpx; z-index: 1;
  font-size: 18rpx; color: #fff; font-weight: 500;
  padding: 4rpx 12rpx; border-radius: 8rpx; background: #8b5cf6;
}
.hot-badge {
  position: absolute; top: 16rpx; right: 16rpx; z-index: 1;
  font-size: 18rpx; color: #fff; font-weight: 500;
  padding: 4rpx 12rpx; border-radius: 8rpx; background: #c41e3a;
}
.agent-center { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
.agent-icon {
  width: 128rpx; height: 128rpx; border-radius: 999rpx; margin-bottom: 20rpx;
  background: rgba(255, 255, 255, 0.2); border: 2rpx solid rgba(255, 255, 255, 0.2);
  display: flex; align-items: center; justify-content: center;
}
.agent-intro { font-size: 24rpx; color: rgba(255, 255, 255, 0.9); line-height: 1.6; margin-bottom: 16rpx; font-weight: 500; }
.online { display: flex; align-items: center; gap: 8rpx; padding: 4rpx 16rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.2); }
.online-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #4ade80; }
.online-text { font-size: 18rpx; color: #fff; }
.agent-name { display: block; font-size: 28rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.agent-desc { display: block; font-size: 22rpx; color: var(--text-soft, #555); margin-top: 4rpx; }
.agent-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; }
.agent-users { font-size: 22rpx; color: var(--text-soft, #999); }
.agent-chat { font-size: 22rpx; color: #fff; font-weight: 500; background: #8b5cf6; padding: 8rpx 24rpx; border-radius: 999rpx; }

/* 文本截断 */
.clamp-1 { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.clamp-2 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.clamp-3 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.clamp-5 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; overflow: hidden; }
</style>
