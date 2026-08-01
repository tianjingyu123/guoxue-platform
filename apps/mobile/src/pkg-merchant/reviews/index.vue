<!--
  B6 · 评价管理（V0 视觉稿 1:1 还原 · uni-app Vue3）
  评分汇总（综合分+好/中/差评占比条）+ 胶囊筛选 + 评价列表（金星/内容/商品/时间）+ 商家回复（replyReview）
  真连 merchantBackendApi.getReviews / replyReview · 三态 · token 见 style
-->
<template>
  <view class="page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="nav-title">评价管理</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state">
        <text class="state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="48" color="#C41E3A" />
        <text class="state-title">加载失败</text>
        <text class="state-txt">{{ error }}</text>
        <view class="retry" @tap="load"><text>重试</text></view>
      </view>

      <template v-else>
        <view class="body">
          <!-- 评分汇总 -->
          <view class="summary">
            <view class="score">
              <text class="score-n">{{ avgRating }}</text>
              <text class="score-s">综合评分</text>
              <view class="score-st">
                <app-icon
                  v-for="i in 5"
                  :key="i"
                  name="star"
                  :size="12"
                  :color="i <= Math.round(Number(avgRating)) ? '#C9A96E' : '#E8DFD3'"
                />
              </view>
            </view>
            <view class="bars">
              <view class="bar-row">
                <text class="bar-lbl">好评</text>
                <view class="track"><view class="fill" :style="{ width: goodPct + '%' }" /></view>
                <text class="bar-pct">{{ goodPct }}%</text>
              </view>
              <view class="bar-row">
                <text class="bar-lbl">中评</text>
                <view class="track"><view class="fill" :style="{ width: midPct + '%' }" /></view>
                <text class="bar-pct">{{ midPct }}%</text>
              </view>
              <view class="bar-row">
                <text class="bar-lbl">差评</text>
                <view class="track"><view class="fill" :style="{ width: badPct + '%' }" /></view>
                <text class="bar-pct">{{ badPct }}%</text>
              </view>
            </view>
          </view>

          <!-- 筛选 Tab（胶囊） -->
          <view class="tabs">
            <view
              v-for="t in tabs"
              :key="t.key"
              class="tab"
              :class="{ on: activeTab === t.key }"
              @tap="activeTab = t.key"
            >
              <text class="tab-txt" :class="{ 'tab-txt-on': activeTab === t.key }">{{ t.label }}</text>
            </view>
          </view>

          <!-- 评价列表 -->
          <view class="list">
            <view
              v-for="review in filteredReviews"
              :key="review.id"
              class="rcard"
              :class="{ warn: review.rating <= 2 && !review.reply }"
            >
              <!-- 头部：用户 + 星 -->
              <view class="rhead">
                <view class="ruser">
                  <view class="ravatar" />
                  <text class="ruser-name">匿名用户</text>
                </view>
                <view class="stars">
                  <app-icon
                    v-for="i in 5"
                    :key="i"
                    name="star"
                    :size="13"
                    :color="i <= review.rating ? '#C9A96E' : '#E8DFD3'"
                  />
                </view>
              </view>

              <!-- 评价内容 -->
              <text class="rtext">{{ review.content }}</text>

              <!-- 评价图片 -->
              <view v-if="review.images && review.images.length > 0" class="rimages">
                <view v-for="(img, i) in review.images" :key="i" class="rimage">
                  <image v-if="img" lazy-load :src="img" class="rimage-img" mode="aspectFill" />
                  <app-icon v-else name="image" :size="20" color="#999999" />
                </view>
              </view>

              <!-- 商品 · 时间 -->
              <text class="rmeta">{{ review.product?.title || '商品' }} · {{ dt(review.createdAt) }}</text>

              <!-- 已回复：展示回复内容 -->
              <view v-if="review.reply" class="reply">
                <text class="reply-b">商家回复：</text><text class="reply-txt">{{ review.reply }}</text>
              </view>

              <!-- 回复输入框 -->
              <view v-else-if="replyingId === review.id" class="reply-form">
                <textarea
                  v-model="replyText"
                  class="reply-textarea"
                  placeholder="输入回复内容…"
                  placeholder-class="ta-ph"
                  :maxlength="-1"
                />
                <view class="reply-actions">
                  <view class="rbtn ghost" @tap="cancelReply"><text class="rbtn-txt-ghost">取消</text></view>
                  <view class="rbtn pri" :class="{ disabled: submitting }" @tap="sendReply(review.id)">
                    <text class="rbtn-txt-pri">{{ submitting ? '发送中…' : '发送回复' }}</text>
                  </view>
                </view>
              </view>

              <!-- 未回复：回复按钮（中差评朱红优先，好评描边） -->
              <view v-else class="rfoot">
                <view
                  class="rbtn"
                  :class="review.rating <= 2 ? 'pri' : 'ghost'"
                  @tap="startReply(review.id)"
                >
                  <text :class="review.rating <= 2 ? 'rbtn-txt-pri' : 'rbtn-txt-ghost'">
                    {{ review.rating <= 2 ? '优先回复 ›' : '回复评价' }}
                  </text>
                </view>
              </view>
            </view>

            <!-- 空态 -->
            <view v-if="filteredReviews.length === 0" class="empty">
              <view class="empty-ic">
                <app-icon name="star" :size="40" color="#C9A96E" />
              </view>
              <text class="empty-title">还没有买家评价</text>
              <text class="empty-txt">买家完成订单并评价后会显示在这里。用心的商品与服务，是好评的开始。</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantBackendApi, type MerchantReview } from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const reviews = ref<MerchantReview[]>([])
const activeTab = ref('all')
const replyingId = ref<string | null>(null)
const replyText = ref('')

const pendingCount = computed(() => reviews.value.filter((r) => !r.reply).length)
const avgRating = computed(() => {
  if (!reviews.value.length) return '0.0'
  const sum = reviews.value.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return (sum / reviews.value.length).toFixed(1)
})

// 好/中/差评占比（四舍五入到整数百分比）
function pct(n: number): number {
  if (!reviews.value.length) return 0
  return Math.round((n / reviews.value.length) * 100)
}
const goodPct = computed(() => pct(reviews.value.filter((r) => r.rating >= 4).length))
const midPct = computed(() => pct(reviews.value.filter((r) => r.rating === 3).length))
const badPct = computed(() => pct(reviews.value.filter((r) => r.rating <= 2).length))

const tabs = computed(() => [
  { key: 'all', label: '全部' },
  { key: 'pending', label: `待回复 ${pendingCount.value}` },
  { key: 'good', label: '好评' },
  { key: 'bad', label: '中差评' },
])

const filteredReviews = computed(() =>
  reviews.value.filter((r) => {
    if (activeTab.value === 'pending') return !r.reply
    if (activeTab.value === 'good') return r.rating >= 4
    if (activeTab.value === 'bad') return r.rating <= 3
    return true
  }),
)

function dt(v?: string | null) {
  return v ? String(v).slice(0, 10) : ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantBackendApi.getReviews({ pageSize: 50 })
    reviews.value = res.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function startReply(id: string) {
  replyingId.value = id
  replyText.value = ''
}
function cancelReply() {
  replyingId.value = null
  replyText.value = ''
}
async function sendReply(id: string) {
  if (submitting.value) return
  if (!replyText.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await merchantBackendApi.replyReview(id, replyText.value.trim())
    uni.showToast({ title: '回复成功', icon: 'success' })
    replyingId.value = null
    replyText.value = ''
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '回复失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  navHeight.value = (sys.statusBarHeight || 0) + 44
  load()
})
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$crimson: #c41e3a;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999999;
$line: #edeae4;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 顶部导航 · 朱红渐变 */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: linear-gradient(135deg, #c41e3a, #a01830);
}
.nav-bar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 32rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
}
.nav-placeholder {
  width: 64rpx;
}
.scroll {
  height: 100vh;
  box-sizing: border-box;
}
.body {
  padding: 32rpx 40rpx 60rpx;
}

/* 评分汇总 */
.summary {
  background: $card;
  border-radius: 18px;
  padding: 36rpx;
  display: flex;
  gap: 40rpx;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  margin-bottom: 32rpx;
}
.score {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-n {
  font-size: 76rpx;
  font-weight: 700;
  color: $crimson;
  line-height: 1;
}
.score-s {
  font-size: 22rpx;
  color: $t3;
  margin-top: 12rpx;
}
.score-st {
  display: flex;
  gap: 2rpx;
  margin-top: 6rpx;
}
.bars {
  flex: 1;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}
.bar-row:last-child {
  margin-bottom: 0;
}
.bar-lbl {
  width: 60rpx;
  font-size: 22rpx;
  color: $t2;
}
.track {
  flex: 1;
  height: 12rpx;
  background: #f0eae0;
  border-radius: 6rpx;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: $gold;
  border-radius: 6rpx;
}
.bar-pct {
  width: 64rpx;
  text-align: right;
  font-size: 22rpx;
  color: $t2;
}

/* Tab · 胶囊 */
.tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
  flex-wrap: wrap;
}
.tab {
  border: 1px solid #e0d8cc;
  border-radius: 999px;
  padding: 12rpx 28rpx;
  background: $card;
}
.tab.on {
  background: $crimson;
  border-color: $crimson;
}
.tab-txt {
  font-size: 24rpx;
  color: $t2;
}
.tab-txt-on {
  color: #ffffff;
  font-weight: 600;
}

/* 评价卡 */
.list {
  display: flex;
  flex-direction: column;
}
.rcard {
  background: $card;
  border-radius: 16px;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.rcard.warn {
  border: 1px solid #f0d0d5;
}
.rhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.ruser {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ravatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
}
.ruser-name {
  font-size: 26rpx;
  color: $t1;
}
.stars {
  display: flex;
  gap: 2rpx;
}
.rtext {
  display: block;
  font-size: 26rpx;
  color: $t1;
  line-height: 1.6;
  margin-bottom: 12rpx;
}
.rimages {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
}
.rimage {
  width: 128rpx;
  height: 128rpx;
  border-radius: 12rpx;
  background: #f5f1ea;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.rimage-img {
  width: 100%;
  height: 100%;
}
.rmeta {
  display: block;
  font-size: 22rpx;
  color: $t3;
}

/* 已回复 · 朱红左边框 */
.reply {
  margin-top: 20rpx;
  border-left: 3px solid $crimson;
  background: #fbeff0;
  padding: 20rpx 24rpx;
  border-radius: 0 20rpx 20rpx 0;
}
.reply-b {
  font-size: 24rpx;
  color: $crimson;
  font-weight: 600;
}
.reply-txt {
  font-size: 24rpx;
  color: $t2;
  line-height: 1.6;
}

/* 回复输入框 */
.reply-form {
  margin-top: 20rpx;
}
.reply-textarea {
  width: 100%;
  box-sizing: border-box;
  height: 144rpx;
  padding: 20rpx;
  border: 1px solid #e0d8cc;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $t1;
  background: $paper;
}
.ta-ph {
  color: $t3;
}
.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 16rpx;
}

/* 回复按钮 */
.rfoot {
  margin-top: 20rpx;
}
.rbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 12rpx 32rpx;
}
.rbtn.ghost {
  border: 1px solid #dddddd;
  background: $card;
}
.rbtn.pri {
  background: $crimson;
}
.rbtn.disabled {
  opacity: 0.6;
}
.rbtn-txt-ghost {
  font-size: 24rpx;
  color: $t2;
}
.rbtn-txt-pri {
  font-size: 24rpx;
  color: #ffffff;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 48rpx;
  text-align: center;
}
.empty-ic {
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  background: #f5f1ea;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 36rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $t1;
  margin-bottom: 16rpx;
}
.empty-txt {
  font-size: 24rpx;
  color: $t3;
  line-height: 1.7;
  max-width: 480rpx;
}

/* 三态 */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 48rpx;
  gap: 24rpx;
}
.state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $t1;
}
.state-txt {
  font-size: 26rpx;
  color: $t3;
  text-align: center;
}
.retry {
  margin-top: 16rpx;
  padding: 20rpx 64rpx;
  border: 1px solid $crimson;
  border-radius: 999px;
}
.retry text {
  font-size: 26rpx;
  color: $crimson;
}
</style>
