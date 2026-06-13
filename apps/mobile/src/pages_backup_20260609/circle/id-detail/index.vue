<template>
  <view class="circle-intro">
    <!-- 封面区 -->
    <view class="cover-area">
      <view class="cover-bg">
        <view class="cover-overlay">
          <view class="cover-nav">
            <text class="cn-back" @click="uni.navigateBack()">‹</text>
            <text class="cn-share" @click="handleShare">↗</text>
          </view>
          <view class="cover-info">
            <text class="cover-name">{{ circle.name }}</text>
            <view class="cover-tags">
              <text v-for="tag in circle.tags" :key="tag" class="cover-tag">{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 核心数据 -->
    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-val">{{ fmtN(circle.memberCount) }}</text>
        <text class="stat-label">成员</text>
        <text class="stat-sub">近7天+{{ circle.newMembersWeek }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-val">{{ circle.contentCount }}</text>
        <text class="stat-label">内容</text>
      </view>
      <view class="stat-item">
        <text class="stat-val">{{ circle.rating }}%</text>
        <text class="stat-label">好评率</text>
      </view>
    </view>

    <!-- 简介 -->
    <view class="section">
      <text class="desc-text">{{ circle.description }}</text>
    </view>

    <!-- 视频介绍 -->
    <view v-if="circle.introVideo" class="section">
      <text class="section-title">视频介绍</text>
      <view class="video-card" @click="showVideo = true">
        <view class="video-cover">
          <view class="video-play">▶</view>
          <text class="video-duration">{{ circle.introVideo.duration }}</text>
        </view>
        <text class="video-title">{{ circle.introVideo.title }}</text>
      </view>
    </view>

    <!-- 图片介绍 -->
    <view v-if="circle.introImages?.length" class="section">
      <text class="section-title">图片介绍</text>
      <view class="img-grid">
        <view v-for="(img, i) in circle.introImages" :key="img.id" class="img-cell" @click="currentImg = i; showImages = true">
          <text class="img-ph">🖼</text>
          <text v-if="img.caption" class="img-cap">{{ img.caption }}</text>
        </view>
      </view>
    </view>

    <!-- 权益 -->
    <view class="section">
      <text class="section-title">加入圈子，你将获得</text>
      <view class="benefits-card">
        <view v-for="(b, i) in benefits" :key="i" class="benefit-item">
          <text class="bf-icon">{{ b.icon }}</text>
          <text class="bf-text">{{ b.text }}</text>
        </view>
      </view>
    </view>

    <!-- 圈主介绍 -->
    <view class="section">
      <text class="section-title">圈主介绍</text>
      <view class="owner-card">
        <view class="owner-top">
          <view class="owner-avatar">{{ circle.owner.name[0] }}</view>
          <view class="owner-info">
            <view class="owner-name-row">
              <text class="owner-name">{{ circle.owner.name }}</text>
              <text v-if="circle.owner.isVerified" class="owner-v">V</text>
            </view>
            <text class="owner-title">{{ circle.owner.title }}</text>
            <text class="owner-stats">{{ circle.owner.courseCount }}门课程 · {{ fmtN(circle.owner.studentCount) }}学员</text>
          </view>
        </view>
        <text class="owner-intro">{{ circle.owner.intro }}</text>
        <text class="owner-link" @click="goPage('/pages/profile/index')">查看圈主主页 ›</text>
      </view>
    </view>

    <!-- 精选内容 -->
    <view class="section">
      <text class="section-title">圈子精选内容</text>
      <scroll-view scroll-x class="fc-scroll" :show-scrollbar="false">
        <view v-for="c in circle.featuredContent" :key="c.id" class="fc-card">
          <view class="fc-type">
            <text>{{ c.type === 'article' ? '📄' : c.type === 'post' ? '💬' : '📖' }}</text>
            <text class="fc-type-tag">{{ c.type === 'article' ? '文章' : c.type === 'post' ? '帖子' : '课程' }}</text>
          </view>
          <text class="fc-title">{{ c.title }}</text>
          <text class="fc-preview">{{ c.preview }}</text>
          <text class="fc-lock">加入后查看完整内容</text>
        </view>
      </scroll-view>
    </view>

    <!-- 评价 -->
    <view class="section">
      <text class="section-title">成员评价</text>
      <view v-for="r in circle.reviews" :key="r.id" class="review-card">
        <view class="review-top">
          <view class="review-avatar">{{ r.user[0] }}</view>
          <view class="review-user">
            <text class="review-name">{{ r.user }}</text>
            <text class="review-date">{{ r.date }}</text>
          </view>
          <text class="review-stars">⭐⭐⭐⭐⭐</text>
        </view>
        <text class="review-text">{{ r.content }}</text>
      </view>
    </view>

    <!-- 相似推荐 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">✨ 猜你喜欢</text>
        <text class="section-more">更多圈子 ›</text>
      </view>
      <scroll-view scroll-x class="sim-scroll" :show-scrollbar="false">
        <view v-for="c in similarCircles" :key="c.id" class="sim-card" @click="goSim(c.id)">
          <view class="sim-cover">👥</view>
          <text class="sim-name">{{ c.name }}</text>
          <text class="sim-members">{{ c.members }}成员</text>
          <text class="sim-price">{{ c.price === 0 ? '免费' : '¥' + c.price }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 底部栏 -->
    <view class="bottom-bar">
      <view class="bb-collect" :class="{ on: isCollected }" @click="isCollected = !isCollected">
        <text>{{ isCollected ? '❤' : '🤍' }}</text>
        <text class="bb-label">收藏</text>
      </view>
      <view class="bb-main flex-1">
        <template v-if="joinStatus === 'joined'">
          <view class="join-btn entered" @click="goPage('/pages/circles/id-detail/index')">
            <text>进入圈子</text>
          </view>
        </template>
        <template v-else-if="joinStatus === 'pending'">
          <view class="join-btn pending">
            <text>审核中，请耐心等待</text>
          </view>
        </template>
        <template v-else>
          <view class="join-btn" :class="{ loading: isJoining }" @click="handleJoin">
            <text>{{ isJoining ? '处理中...' : circle.isFree ? '免费加入' : '¥' + circle.price + ' 立即加入' }}</text>
          </view>
        </template>
      </view>
      <text v-if="!circle.isFree && joinStatus === 'none'" class="joined-hint">已有 {{ fmtN(circle.memberCount) }} 人加入</text>
    </view>

    <!-- 支付弹窗 -->
    <view v-if="showPay" class="modal-mask" @click="showPay = false">
      <view class="modal-sheet" @click.stop>
        <view class="ms-head">
          <text class="ms-title">确认支付</text>
          <text class="ms-close" @click="showPay = false">✕</text>
        </view>
        <view class="ms-body">
          <view class="ms-circle-info">
            <view class="ms-avatar">👥</view>
            <view class="ms-ci-text">
              <text class="ms-ci-name">{{ circle.name }}</text>
              <text class="ms-ci-meta">{{ circle.memberCount }}成员 · 永久有效</text>
            </view>
            <text class="ms-price">¥{{ circle.price }}</text>
          </view>
          <text class="ms-section-label">选择支付方式</text>
          <view v-for="m in payMethods" :key="m.id" class="pay-method" :class="{ on: payMethod === m.id }" @click="payMethod = m.id">
            <text class="pm-icon">{{ m.icon }}</text>
            <view class="pm-info">
              <text class="pm-name">{{ m.name }}</text>
              <text v-if="m.desc" class="pm-desc">{{ m.desc }}</text>
            </view>
            <view class="pm-radio" :class="{ on: payMethod === m.id }">
              <text v-if="payMethod === m.id" class="pm-check">✓</text>
            </view>
          </view>
          <view class="pay-confirm-btn" @click="handlePay">
            <text>确认支付 ¥{{ circle.price }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 视频弹窗 -->
    <view v-if="showVideo" class="video-modal" @click="showVideo = false">
      <text class="vm-close">✕</text>
      <view class="vm-player">
        <text class="vm-play-icon">▶</text>
        <text class="vm-text">视频播放区域</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const circle = reactive({
  id: 1, name: '八字命理研习社', tags: ['八字命理', '四柱预测', '实战案例'],
  memberCount: 1280, newMembersWeek: 86, contentCount: 356, rating: 98,
  price: 199, isFree: false, needApproval: false,
  description: '专注八字命理学习与实践的高质量社群。圈主每周更新深度文章，定期举办直播答疑，带你系统掌握八字排盘与分析技法。',
  introImages: [{ id: 1, caption: '圈子学习氛围' }, { id: 2, caption: '线下活动剪影' }, { id: 3, caption: '学员成果展示' }],
  introVideo: { duration: '02:35', title: '周易大师带你走进八字命理研习社' },
  benefits: [],
  owner: { id: 1, name: '周易大师', isVerified: true, title: '八字命理资深讲师', intro: '从事命理研究20余年，师承多位名师，擅长八字精准分析与人生规划指导。已帮助超过10000位学员入门八字命理。', courseCount: 12, studentCount: 8560 },
  featuredContent: [
    { id: 1, type: 'article', title: '八字入门：如何快速记忆天干地支', preview: '天干地支是八字命理的基础...' },
    { id: 2, type: 'post', title: '实战案例：从八字看事业发展方向', preview: '今天分享一个典型案例，命主1985年出生...' },
    { id: 3, type: 'article', title: '十神详解：正官与七杀的区别', preview: '正官与七杀都是克日主的五行...' },
    { id: 4, type: 'course', title: '八字排盘实战课（圈友专享）', preview: '本课程专为圈友打造...' },
  ],
  reviews: [
    { id: 1, user: '命理爱好者', content: '加入这个圈子后，终于搞懂了八字的基本框架，周老师讲得太清楚了！', date: '2024-12-15' },
    { id: 2, user: '学习中的小白', content: '圈子里的氛围很好，大家互相帮助，老师也很耐心解答问题。', date: '2024-12-10' },
    { id: 3, user: '从业三年', content: '即使有一定基础，在这里也能学到很多实战技巧，物超所值。', date: '2024-12-05' },
  ],
})

const benefits = [
  { icon: '📖', text: '独家内容：圈主精华帖、深度文章、实战案例' },
  { icon: '🎓', text: '专属课程：圈子内课程享8折优惠' },
  { icon: '💬', text: '互动答疑：向圈主/嘉宾提问、参与讨论' },
  { icon: '📡', text: '圈内直播：知识授课直播、连麦互动' },
  { icon: '📚', text: '古籍共修：圈主领读《渊海子平》等经典' },
]

const similarCircles = [
  { id: 2, name: '紫微斗数学院', members: 2560, price: 299 },
  { id: 3, name: '风水堪舆研习', members: 1680, price: 0 },
  { id: 4, name: '姓名学交流圈', members: 860, price: 99 },
]

const payMethods = [
  { id: 'coin', name: '国学币支付', desc: '余额: 1280币 (可抵¥128)', icon: '🪙' },
  { id: 'wechat', name: '微信支付', desc: '', icon: '💚' },
  { id: 'alipay', name: '支付宝支付', desc: '', icon: '💙' },
]

const isCollected = ref(false)
const showPay = ref(false)
const showVideo = ref(false)
const showImages = ref(false)
const currentImg = ref(0)
const payMethod = ref('wechat')
const isJoining = ref(false)
const joinStatus = ref<'none' | 'pending' | 'joined'>('none')

function fmtN(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n) }

function handleJoin() {
  if (circle.isFree) {
    isJoining.value = true
    setTimeout(() => { isJoining.value = false; joinStatus.value = 'joined' }, 800)
  } else if (circle.needApproval) {
    isJoining.value = true
    setTimeout(() => { isJoining.value = false; joinStatus.value = 'pending' }, 800)
  } else {
    showPay.value = true
  }
}

function handlePay() {
  isJoining.value = true
  setTimeout(() => { isJoining.value = false; showPay.value = false; joinStatus.value = 'joined' }, 1200)
}

function handleShare() { uni.showToast({ title: '已复制分享链接', icon: 'none' }) }
function goPage(url: string) { uni.navigateTo({ url }) }
function goSim(id: number) { uni.navigateTo({ url: `/pages/circle/id-detail/index?id=${id}` }) }
</script>

<style scoped>
.circle-intro { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

.cover-area { }
.cover-bg { background: linear-gradient(135deg, rgba(196,30,58,0.3), rgba(201,169,110,0.2), #FAF8F5); }
.cover-overlay { padding: 0 24rpx 40rpx; background: linear-gradient(180deg, rgba(0,0,0,0.3), transparent); }
.cover-nav { display: flex; justify-content: space-between; padding-top: env(safe-area-inset-top); height: 88rpx; align-items: center; }
.cn-back, .cn-share { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(0,0,0,0.3); backdrop-filter: blur(8rpx); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.cover-info { margin-top: 60rpx; }
.cover-name { font-size: 48rpx; font-weight: 700; color: #fff; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3); }
.cover-tags { display: flex; gap: 12rpx; margin-top: 16rpx; }
.cover-tag { font-size: 22rpx; color: #fff; background: rgba(255,255,255,0.2); backdrop-filter: blur(4rpx); padding: 4rpx 16rpx; border-radius: 16rpx; }

.stats-card { display: flex; justify-content: space-around; margin: 16rpx 24rpx; padding: 28rpx 0; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.stat-item { text-align: center; }
.stat-val { font-size: 40rpx; font-weight: 700; color: #2C2C2C; display: block; }
.stat-label { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.stat-sub { font-size: 20rpx; color: #C9A96E; display: block; margin-top: 4rpx; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 16rpx; display: block; }
.section-more { font-size: 24rpx; color: #999; }
.desc-text { font-size: 26rpx; color: #666; line-height: 1.6; }

.video-card { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.video-cover { aspect-ratio: 16/9; background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.1)); display: flex; align-items: center; justify-content: center; position: relative; }
.video-play { width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: #C41E3A; }
.video-duration { position: absolute; bottom: 12rpx; right: 12rpx; font-size: 22rpx; color: #fff; background: rgba(0,0,0,0.6); padding: 4rpx 16rpx; border-radius: 8rpx; }
.video-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; padding: 16rpx 20rpx; display: block; }

.img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8rpx; }
.img-cell { aspect-ratio: 1; border-radius: 16rpx; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.img-ph { font-size: 56rpx; color: rgba(0,0,0,0.15); }
.img-cap { position: absolute; bottom: 0; left: 0; right: 0; font-size: 20rpx; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,0.6)); padding: 8rpx 12rpx; }

.benefits-card { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.benefit-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 12rpx 0; }
.benefit-item + .benefit-item { border-top: 1px solid #F5F1EB; }
.bf-icon { font-size: 32rpx; flex-shrink: 0; margin-top: 4rpx; }
.bf-text { font-size: 26rpx; color: #333; flex: 1; }

.owner-card { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.owner-top { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.owner-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(201,169,110,0.2); color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 600; border: 3rpx solid rgba(201,169,110,0.3); }
.owner-info { flex: 1; }
.owner-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.owner-name { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.owner-v { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.2); padding: 2rpx 8rpx; border-radius: 6rpx; }
.owner-title { font-size: 22rpx; color: #999; display: block; }
.owner-stats { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.owner-intro { font-size: 26rpx; color: #666; line-height: 1.6; margin-bottom: 12rpx; }
.owner-link { font-size: 26rpx; color: #C41E3A; display: block; text-align: center; }

.fc-scroll { white-space: nowrap; }
.fc-card { display: inline-block; width: 480rpx; background: #fff; border-radius: 20rpx; padding: 20rpx; margin-right: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); white-space: normal; }
.fc-type { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; font-size: 24rpx; }
.fc-type-tag { font-size: 20rpx; color: #999; background: #F5F1EB; padding: 2rpx 10rpx; border-radius: 6rpx; }
.fc-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8rpx; }
.fc-preview { font-size: 24rpx; color: #999; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fc-lock { font-size: 22rpx; color: #C41E3A; margin-top: 8rpx; display: block; }

.review-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.review-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.review-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; color: #666; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.review-user { flex: 1; }
.review-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.review-date { font-size: 20rpx; color: #999; }
.review-stars { font-size: 24rpx; }
.review-text { font-size: 26rpx; color: #666; line-height: 1.5; }

.sim-scroll { white-space: nowrap; }
.sim-card { display: inline-block; width: 240rpx; background: #fff; border-radius: 16rpx; overflow: hidden; margin-right: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.sim-cover { aspect-ratio: 4/3; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(201,169,110,0.08)); display: flex; align-items: center; justify-content: center; font-size: 64rpx; }
.sim-name { font-size: 24rpx; font-weight: 500; color: #333; padding: 8rpx 12rpx 0; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sim-members { font-size: 20rpx; color: #999; padding: 4rpx 12rpx; display: block; }
.sim-price { font-size: 24rpx; color: #C41E3A; font-weight: 500; padding: 0 12rpx 12rpx; display: block; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; padding: 12rpx 24rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); }
.bb-collect { display: flex; flex-direction: column; align-items: center; gap: 2rpx; width: 100rpx; }
.bb-collect text { font-size: 36rpx; }
.bb-label { font-size: 20rpx !important; color: #999; }
.bb-main { display: flex; align-items: center; flex: 1; }
.join-btn { flex: 1; padding: 20rpx 0; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; }
.join-btn.entered { background: #C9A96E; }
.join-btn.pending { background: #CCC; color: #999; }
.join-btn.loading { opacity: 0.7; }
.joined-hint { font-size: 20rpx; color: #999; text-align: center; width: 100%; display: block; padding-top: 8rpx; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.modal-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 80vh; }
.ms-head { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 32rpx; border-bottom: 1px solid #F0EDE5; }
.ms-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ms-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.ms-body { padding: 24rpx 32rpx 40rpx; }
.ms-circle-info { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; margin-bottom: 24rpx; border-bottom: 1px solid #F0EDE5; }
.ms-avatar { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.ms-ci-text { flex: 1; }
.ms-ci-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.ms-ci-meta { font-size: 22rpx; color: #999; }
.ms-price { font-size: 40rpx; font-weight: 700; color: #C41E3A; }
.ms-section-label { font-size: 26rpx; color: #999; margin-bottom: 16rpx; display: block; }
.pay-method { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; border-radius: 20rpx; border: 2rpx solid #F0EDE5; margin-bottom: 12rpx; }
.pay-method.on { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.pm-icon { font-size: 40rpx; }
.pm-info { flex: 1; }
.pm-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.pm-desc { font-size: 22rpx; color: #999; }
.pm-radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; }
.pm-radio.on { background: #C41E3A; border-color: #C41E3A; }
.pm-check { font-size: 24rpx; color: #fff; font-weight: 700; }
.pay-confirm-btn { width: 100%; padding: 24rpx 0; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; margin-top: 8rpx; }

.video-modal { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; }
.vm-close { position: absolute; top: 60rpx; right: 24rpx; font-size: 40rpx; color: #fff; padding: 16rpx; }
.vm-player { text-align: center; }
.vm-play-icon { font-size: 96rpx; color: rgba(255,255,255,0.6); display: block; margin-bottom: 16rpx; }
.vm-text { font-size: 26rpx; color: rgba(255,255,255,0.4); }
</style>
