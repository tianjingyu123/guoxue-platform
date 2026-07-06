<template>
  <view class="pv-page">
    <!-- 骨架屏 -->
    <view v-if="isLoading" class="pv-skel">
      <view class="pv-skel-cover" />
      <view class="pv-skel-body">
        <view class="pv-skel-card h32" /><view class="pv-skel-card h48" /><view class="pv-skel-card h48" />
      </view>
    </view>

    <template v-else>
      <!-- 封面 -->
      <view class="pv-cover">
        <smart-cover class="pv-cover-img" :src="circle.cover" :title="circle.name" type="circle" />
        <view class="pv-cover-mask" />
        <view class="pv-nav">
          <view class="pv-nav-btn" @tap="goBack"><app-icon name="chevron-left" :size="36" color="#ffffff" /></view>
          <view class="pv-nav-btn" @tap="onShare"><app-icon name="share-2" :size="34" color="#ffffff" /></view>
        </view>
        <view v-if="joinStatus.discount" class="pv-discount">
          <app-icon name="sparkles" :size="28" color="#fde047" />
          <text class="pv-discount-t">{{ joinStatus.discount }}</text>
        </view>
      </view>

      <!-- 信息卡 -->
      <view class="pv-info-wrap">
        <view class="pv-info-card">
          <view class="pv-info-row">
            <view class="pv-avatar-wrap">
              <image lazy-load class="pv-avatar" :src="circle.owner.avatar" mode="aspectFill" />
              <view class="pv-crown"><app-icon name="crown" :size="24" color="#ffffff" /></view>
            </view>
            <view class="pv-info-main">
              <text class="pv-name">{{ circle.name }}</text>
              <text class="pv-desc">{{ circle.description }}</text>
              <view class="pv-stats">
                <view class="pv-stat"><app-icon name="users" :size="24" color="#999999" /><text class="pv-stat-t">{{ circle.members.toLocaleString() }} 成员</text></view>
                <view class="pv-stat"><app-icon name="file-text" :size="24" color="#999999" /><text class="pv-stat-t">{{ circle.posts.toLocaleString() }} 帖子</text></view>
                <view class="pv-stat active"><view class="pv-dot" /><text class="pv-stat-t red">今日活跃 {{ circle.todayActive }}</text></view>
              </view>
            </view>
          </view>
          <view v-if="circle.tags" class="pv-tags">
            <text v-for="tag in circle.tags" :key="tag" class="pv-tag">#{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 精华内容 -->
      <view class="pv-section">
        <view class="pv-section-head">
          <app-icon name="star" :size="34" color="#C9A96E" :fill="true" />
          <text class="pv-section-title">精华内容预览</text>
          <text class="pv-section-sub">加入后解锁全部</text>
        </view>
        <view class="pv-posts">
          <view v-for="(post, index) in featuredPosts" :key="post.id" class="pv-post" @tap="handlePostClick(post.id)">
            <view v-if="showLockTip === post.id" class="pv-lock-overlay">
              <app-icon name="lock" :size="56" color="#ffffff" />
              <text class="pv-lock-t">加入圈子后查看详情</text>
            </view>
            <view class="pv-rank" :class="rankClass(index)"><text class="pv-rank-n">{{ index + 1 }}</text></view>
            <view class="pv-post-author">
              <image lazy-load class="pv-post-avatar" :src="post.author.avatar" mode="aspectFill" />
              <text class="pv-post-name">{{ post.author.name }}</text>
            </view>
            <view class="pv-post-content">
              <text class="pv-post-text">{{ post.preview }}</text>
              <view class="pv-post-fade" />
            </view>
            <view class="pv-post-meta">
              <view class="pv-pm"><app-icon name="heart" :size="26" color="#999999" /><text class="pv-pm-t">{{ post.likes }}</text></view>
              <view class="pv-pm"><app-icon name="message-circle" :size="26" color="#999999" /><text class="pv-pm-t">{{ post.comments }}</text></view>
            </view>
          </view>
        </view>
        <view class="pv-more">
          <app-icon name="lock" :size="44" color="#C9A96E" />
          <text class="pv-more-t">还有 <text class="pv-more-n">{{ circle.posts - featuredPosts.length }}</text> 篇精彩内容</text>
          <text class="pv-more-sub">加入圈子立即解锁</text>
        </view>
      </view>

      <!-- 圈子权益 -->
      <view class="pv-section">
        <text class="pv-benefit-title">加入后享有</text>
        <view class="pv-benefits">
          <view v-for="(item, i) in benefits" :key="i" class="pv-benefit">
            <view class="pv-benefit-icon"><app-icon :name="item.icon" :size="28" color="#C41E3A" /></view>
            <text class="pv-benefit-t">{{ item.text }}</text>
          </view>
        </view>
      </view>

      <!-- 底部加入栏 -->
      <view class="pv-footer">
        <view class="pv-footer-info">
          <view v-if="joinMethod === 'paid'" class="pv-price-row">
            <text class="pv-price">¥{{ formatPrice(joinStatus.price) }}</text>
            <text v-if="joinStatus.originalPrice" class="pv-price-old">¥{{ formatPrice(joinStatus.originalPrice) }}</text>
            <text class="pv-price-days">/ {{ joinStatus.membershipDays ?? 365 }}天</text>
          </view>
          <text v-else-if="joinMethod === 'approval'" class="pv-method">审核制圈子</text>
          <text v-else class="pv-method">免费加入</text>
          <text v-if="joinMethod === 'approval'" class="pv-method-sub">需圈主审核通过</text>
        </view>
        <view class="pv-join-btn" :class="{ disabled: approvalSubmitted }" @tap="handleJoin">
          {{ joinMethod === 'paid' ? '立即加入' : joinMethod === 'approval' ? (approvalSubmitted ? '申请已提交' : '申请加入') : '免费加入' }}
        </view>
      </view>

      <!-- 付费加入弹窗 -->
      <view v-if="showJoinModal" class="pv-modal-mask" @tap="showJoinModal = false">
        <view class="pv-modal" @tap.stop>
          <view class="pv-modal-bar" />
          <text class="pv-modal-title">加入{{ circle.name }}</text>
          <text class="pv-modal-sub">开启您的学习之旅</text>
          <view class="pv-pay-card">
            <view class="pv-pay-row"><text class="pv-pay-label">会员时长</text><text class="pv-pay-val">{{ joinStatus.membershipDays }} 天</text></view>
            <view class="pv-pay-row">
              <text class="pv-pay-label">支付金额</text>
              <view class="pv-price-row"><text class="pv-price">¥{{ formatPrice(joinStatus.price) }}</text><text v-if="joinStatus.originalPrice" class="pv-price-old">¥{{ formatPrice(joinStatus.originalPrice) }}</text></view>
            </view>
          </view>
          <view class="pv-pay-btn" @tap="toComingSoon">确认支付</view>
          <text class="pv-agreement">点击确认即表示同意<text class="pv-link">《用户协议》</text></text>
        </view>
      </view>

      <!-- 审核提交提示 -->
      <view v-if="approvalSubmitted" class="pv-approval-mask" @tap="approvalSubmitted = false">
        <view class="pv-approval" @tap.stop>
          <view class="pv-approval-icon"><app-icon name="check-circle" :size="44" color="#3D7A5C" /></view>
          <text class="pv-approval-title">申请已提交</text>
          <text class="pv-approval-sub">你的入圈申请已提交给圈主审核，审核结果将在"我的申请"中通知你。</text>
          <view class="pv-approval-btns">
            <view class="pv-ab outline" @tap="approvalSubmitted = false">我知道了</view>
            <view class="pv-ab primary" @tap="toComingSoon">查看申请</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 圈子预览页（从原型 app/circles/[id]/preview/page.tsx 高保真迁移）
 * 封面+信息卡+精华内容(点击锁定提示)+权益+底部加入栏(免费/付费/审核三种方式)+付费弹窗+审核提交弹窗
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import { formatPrice } from '@/utils/format'

const mockPreview = {
  circle: {
    id: '1', name: '八字命理研习社',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    description: '专注八字命理学习与交流，汇聚资深命理师与爱好者。从入门到精通，共同探索命理奥秘。',
    category: '命理', members: 12860, posts: 3280, isJoined: false, todayActive: 128, createdAt: '2023-01-01',
    owner: { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master' },
    rules: ['禁止发布广告', '尊重他人观点', '保持友善交流'],
    tags: ['八字', '命理', '易学', '传统文化'],
  },
  featuredPosts: [
    { id: '1', author: { name: '命理研究者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1' }, likes: 328, comments: 56, preview: '日支为配偶宫，看日支与其他地支的关系...' },
    { id: '2', author: { name: '易学传承', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2' }, likes: 256, comments: 42, preview: '食神制杀是八字中非常重要的格局之一...' },
    { id: '3', author: { name: '周易学堂', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3' }, likes: 412, comments: 89, preview: '比肩代表同类相助，劫财则有争夺之意...' },
    { id: '4', author: { name: '命理导师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4' }, likes: 198, comments: 34, preview: '官杀旺者适合从政或管理岗位...' },
  ],
  joinStatus: { isJoined: false, isPaid: true, price: 99, originalPrice: 199, membershipDays: 365, discount: '限时5折', joinMethod: 'paid' as 'free' | 'paid' | 'approval' },
}

const benefits = [
  { icon: 'file-text', text: '查看全部精华帖' },
  { icon: 'message-circle', text: '参与圈子讨论' },
  { icon: 'users', text: '结识同好圈友' },
  { icon: 'star', text: '专属会员活动' },
]

const isLoading = ref(true)
const showJoinModal = ref(false)
const showLockTip = ref<string | null>(null)
const approvalSubmitted = ref(false)

const circle = ref(mockPreview.circle)
const featuredPosts = ref(mockPreview.featuredPosts)
const joinStatus = ref(mockPreview.joinStatus)

const joinMethod = computed<'free' | 'paid' | 'approval'>(() => joinStatus.value.joinMethod ?? (joinStatus.value.isPaid ? 'paid' : 'free'))

function rankClass(i: number) { return i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'rn' }
function handlePostClick(id: string) {
  showLockTip.value = id
  setTimeout(() => { showLockTip.value = null }, 2000)
}
function onShare() { toastComingSoon() }
function toComingSoon() { toastComingSoon() }
function handleJoin() {
  if (joinMethod.value === 'paid') showJoinModal.value = true
  else if (joinMethod.value === 'approval') approvalSubmitted.value = true
  else toastComingSoon()
}

onMounted(() => { setTimeout(() => { isLoading.value = false }, 400) })
</script>

<style scoped lang="scss">
.pv-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 200rpx; }

.pv-skel-cover { height: 512rpx; background: #E8E3DB; }
.pv-skel-body { padding: 0 32rpx; margin-top: -128rpx; display: flex; flex-direction: column; gap: 32rpx; }
.pv-skel-card { background: #fff; border-radius: 32rpx; }
.pv-skel-card.h32 { height: 256rpx; } .pv-skel-card.h48 { height: 384rpx; }

.pv-cover { position: relative; height: 576rpx; }
.pv-cover-img { width: 100%; height: 100%; }
.pv-cover-mask { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 50%, rgba(0,0,0,0.7)); }
.pv-nav { position: absolute; top: 0; left: 0; right: 0; padding: 32rpx; display: flex; align-items: center; justify-content: space-between; }
.pv-nav-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.pv-discount { position: absolute; top: 32rpx; left: 50%; transform: translateX(-50%); padding: 12rpx 32rpx; background: linear-gradient(to right, var(--brand), #FF6B35); border-radius: 999rpx; display: flex; align-items: center; gap: 12rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.2); }
.pv-discount-t { font-size: 28rpx; font-weight: 700; color: #fff; }

.pv-info-wrap { padding: 0 32rpx; margin-top: -160rpx; position: relative; z-index: 10; }
.pv-info-card { background: #fff; border-radius: 32rpx; padding: 40rpx; box-shadow: 0 8rpx 48rpx rgba(0,0,0,0.1); }
.pv-info-row { display: flex; gap: 32rpx; }
.pv-avatar-wrap { position: relative; flex-shrink: 0; }
.pv-avatar { width: 128rpx; height: 128rpx; border-radius: 24rpx; border: 4rpx solid #fff; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1); background: #F5F0E8; }
.pv-crown { position: absolute; bottom: -8rpx; right: -8rpx; width: 48rpx; height: 48rpx; background: linear-gradient(135deg, #C9A96E, #A67C52); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.pv-info-main { flex: 1; min-width: 0; }
.pv-name { display: block; font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.pv-desc { display: block; font-size: 26rpx; color: #666666; line-height: 1.5; margin-bottom: 16rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pv-stats { display: flex; align-items: center; gap: 32rpx; flex-wrap: wrap; }
.pv-stat { display: flex; align-items: center; gap: 8rpx; } .pv-stat-t { font-size: 22rpx; color: #999999; } .pv-stat-t.red { color: var(--brand); }
.pv-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--brand); }
.pv-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 32rpx; }
.pv-tag { padding: 8rpx 20rpx; font-size: 22rpx; background: #F5F0E8; color: #666666; border-radius: 999rpx; }

.pv-section { padding: 0 32rpx; margin-top: 48rpx; }
.pv-section-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 32rpx; }
.pv-section-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.pv-section-sub { font-size: 22rpx; color: #999999; }
.pv-posts { display: flex; flex-direction: column; gap: 24rpx; }
.pv-post { position: relative; background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); overflow: hidden; }
.pv-lock-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx; z-index: 10; }
.pv-lock-t { font-size: 26rpx; font-weight: 500; color: #fff; }
.pv-rank { position: absolute; top: 0; right: 0; width: 64rpx; height: 64rpx; display: flex; align-items: flex-start; justify-content: flex-end; clip-path: polygon(0 0, 100% 0, 100% 100%); }
.pv-rank.r1 { background: linear-gradient(135deg, #FFD700, #FFA500); } .pv-rank.r2 { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); } .pv-rank.r3 { background: linear-gradient(135deg, #CD7F32, #A0522D); } .pv-rank.rn { background: #999999; }
.pv-rank-n { font-size: 22rpx; font-weight: 700; color: #fff; padding: 6rpx 10rpx 0 0; }
.pv-post-author { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.pv-post-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F0E8; }
.pv-post-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.pv-post-content { position: relative; }
.pv-post-text { font-size: 26rpx; color: #666666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pv-post-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 48rpx; background: linear-gradient(to top, #fff, transparent); }
.pv-post-meta { display: flex; align-items: center; gap: 32rpx; margin-top: 24rpx; }
.pv-pm { display: flex; align-items: center; gap: 8rpx; } .pv-pm-t { font-size: 22rpx; color: #999999; }
.pv-more { margin-top: 32rpx; padding: 32rpx; background: #F5F0E8; border-radius: 24rpx; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.pv-more-t { font-size: 26rpx; color: #666666; } .pv-more-n { font-weight: 700; color: var(--brand); }
.pv-more-sub { font-size: 22rpx; color: #999999; }

.pv-benefit-title { display: block; font-size: 32rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 24rpx; }
.pv-benefits { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.pv-benefit { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.pv-benefit-icon { width: 64rpx; height: 64rpx; border-radius: 50%; background: #FFF5F0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pv-benefit-t { font-size: 26rpx; color: #2C2C2C; }

.pv-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 32rpx; z-index: 50; }
.pv-footer-info { flex: 1; }
.pv-price-row { display: flex; align-items: baseline; gap: 16rpx; }
.pv-price { font-size: 48rpx; font-weight: 900; color: var(--brand); }
.pv-price-old { font-size: 26rpx; color: #999999; text-decoration: line-through; }
.pv-price-days { font-size: 22rpx; color: #666666; }
.pv-method { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.pv-method-sub { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
.pv-join-btn { padding: 24rpx 64rpx; background: linear-gradient(to right, var(--brand), #E74C3C); color: #fff; font-weight: 700; border-radius: 999rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.pv-join-btn.disabled { opacity: 0.6; }

.pv-modal-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.pv-modal { width: 100%; background: #fff; border-radius: 48rpx 48rpx 0 0; padding: 48rpx 48rpx 80rpx; }
.pv-modal-bar { width: 96rpx; height: 8rpx; background: #E8E3DB; border-radius: 999rpx; margin: 0 auto 48rpx; }
.pv-modal-title { display: block; text-align: center; font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.pv-modal-sub { display: block; text-align: center; font-size: 26rpx; color: #666666; margin-bottom: 48rpx; }
.pv-pay-card { padding: 32rpx; background: linear-gradient(135deg, #FFF5F0, #FFEBE5); border-radius: 32rpx; border: 1rpx solid rgba(196,30,58,0.2); margin-bottom: 48rpx; }
.pv-pay-row { display: flex; align-items: center; justify-content: space-between; }
.pv-pay-row + .pv-pay-row { margin-top: 24rpx; }
.pv-pay-label { font-size: 26rpx; color: #666666; } .pv-pay-val { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.pv-pay-btn { padding: 32rpx; background: linear-gradient(to right, var(--brand), #E74C3C); color: #fff; font-weight: 700; border-radius: 24rpx; text-align: center; font-size: 30rpx; }
.pv-agreement { display: block; text-align: center; font-size: 22rpx; color: #999999; margin-top: 32rpx; } .pv-link { color: var(--brand); }

.pv-approval-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 0 64rpx; }
.pv-approval { width: 100%; max-width: 560rpx; background: #fff; border-radius: 32rpx; padding: 48rpx; text-align: center; }
.pv-approval-icon { width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(61,122,92,0.1); margin: 0 auto 24rpx; display: flex; align-items: center; justify-content: center; }
.pv-approval-title { display: block; font-weight: 700; color: #2C2C2C; font-size: 32rpx; }
.pv-approval-sub { display: block; font-size: 26rpx; color: #666666; margin-top: 16rpx; line-height: 1.6; }
.pv-approval-btns { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; margin-top: 40rpx; }
.pv-ab { padding: 20rpx; border-radius: 999rpx; font-size: 28rpx; }
.pv-ab.outline { border: 1rpx solid #E8E3DB; color: #2C2C2C; }
.pv-ab.primary { background: var(--brand); color: #fff; }
</style>
