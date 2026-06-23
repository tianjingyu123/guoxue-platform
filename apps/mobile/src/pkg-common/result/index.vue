<template>
  <view class="result-page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="22" color="#1f2937" />
      </view>
      <text class="nav-title">操作结果</text>
      <view class="nav-placeholder" />
    </view>

    <view class="body">
      <!-- 结果图标和信息 -->
      <view class="result-head">
        <view class="result-icon" :class="[isSuccess ? 'icon-success' : 'icon-failed', { 'icon-in': showAnimation }]">
          <view class="ping" :class="isSuccess ? 'ping-success' : 'ping-failed'" />
          <app-icon :name="isSuccess ? 'check' : 'x'" :size="40" :color="isSuccess ? '#22c55e' : '#ef4444'" />
        </view>

        <text class="result-title" :class="[isSuccess ? 'title-success' : 'title-failed', { 'fade-in': showAnimation }]">
          {{ customTitle || resultData.title }}
        </text>

        <text class="result-desc" :class="{ 'fade-in-2': showAnimation }">
          {{ customDesc || resultData.description }}
        </text>

        <!-- 订单号（成功） -->
        <view v-if="isSuccess && orderId" class="order-box" :class="{ 'fade-in-3': showAnimation }">
          <text class="order-text">订单号：<text class="order-id">{{ orderId }}</text></text>
        </view>

        <!-- 失败原因（失败） -->
        <view v-if="!isSuccess" class="fail-card" :class="{ 'fade-in-3': showAnimation }">
          <app-icon name="alert-circle" :size="20" color="#ef4444" />
          <view class="fail-info">
            <text class="fail-title">失败原因</text>
            <text class="fail-desc">{{ customDesc || resultData.description }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions" :class="{ 'fade-in-4': showAnimation }">
        <view class="btn" :class="isSuccess ? 'btn-primary' : 'btn-danger'" @tap="onPrimary">
          {{ resultData.primaryBtn.text }}
        </view>
        <view v-if="resultData.secondaryBtn" class="btn btn-secondary" @tap="onSecondary">
          {{ resultData.secondaryBtn.text }}
        </view>
      </view>

      <!-- 推荐（成功） -->
      <view v-if="isSuccess" class="recommend" :class="{ 'fade-in-5': showAnimation }">
        <view class="recommend-head">
          <view class="recommend-title-wrap">
            <app-icon name="sparkles" :size="16" color="#C9A96E" />
            <text class="recommend-title">猜你喜欢</text>
          </view>
          <view class="recommend-more" @tap="navigateTo('/discover')">
            <text class="more-text">更多</text>
            <app-icon name="chevron-right" :size="14" color="#9ca3af" />
          </view>
        </view>

        <view class="recommend-list">
          <view
            v-for="item in recommendations"
            :key="item.id"
            class="recommend-item"
            @tap="navigateTo(item.type === 'course' ? '/course/' + item.id : '/circle/' + item.id)"
          >
            <view class="item-cover">
              <app-icon :name="item.type === 'course' ? 'book-open' : 'users'" :size="24" :color="item.type === 'course' ? 'rgba(201,169,110,0.6)' : 'rgba(196,30,45,0.6)'" />
            </view>
            <view class="item-info">
              <view class="item-title-row">
                <text class="item-badge">{{ item.type === 'course' ? '课程' : '圈子' }}</text>
                <text class="item-title">{{ item.title }}</text>
              </view>
              <text class="item-meta">{{ item.type === 'course' ? item.students + '人学习' : item.members + '成员' }}</text>
              <text v-if="item.type === 'course' && item.price" class="item-price">¥{{ item.price }}</text>
            </view>
            <app-icon name="chevron-right" :size="16" color="#9ca3af" />
          </view>
        </view>
      </view>

      <!-- 帮助入口（失败） -->
      <view v-if="!isSuccess" class="help" :class="{ 'fade-in-5': showAnimation }">
        <text class="help-tip">遇到问题？</text>
        <text class="help-link" @tap="navigateTo('/help')">联系客服获取帮助</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

interface BtnConfig { text: string; href: string }
interface StatusConfig { title: string; description: string; primaryBtn: BtnConfig; secondaryBtn?: BtnConfig }
interface ResultConfig { success: StatusConfig; failed: StatusConfig }

const resultConfigs: Record<string, ResultConfig> = {
  payment: {
    success: { title: '支付成功', description: '订单已支付完成，我们已开始为您准备商品', primaryBtn: { text: '查看订单', href: '/orders' }, secondaryBtn: { text: '继续逛逛', href: '/mall' } },
    failed: { title: '支付失败', description: '余额不足，请充值后重试', primaryBtn: { text: '重新支付', href: '/checkout' }, secondaryBtn: { text: '返回首页', href: '/' } },
  },
  enroll: {
    success: { title: '报名成功', description: '您已成功报名，请准时参加课程', primaryBtn: { text: '查看详情', href: '/reservations' }, secondaryBtn: { text: '返回首页', href: '/' } },
    failed: { title: '报名失败', description: '名额已满，请选择其他场次', primaryBtn: { text: '重新报名', href: '/offline/courses/1' }, secondaryBtn: { text: '返回首页', href: '/' } },
  },
  submit: {
    success: { title: '提交成功', description: '您的申请已提交，我们将在1-3个工作日内审核', primaryBtn: { text: '查看进度', href: '/mine/submissions' }, secondaryBtn: { text: '返回首页', href: '/' } },
    failed: { title: '提交失败', description: '网络异常，请稍后重试', primaryBtn: { text: '重新提交', href: '' }, secondaryBtn: { text: '返回首页', href: '/' } },
  },
  verify: {
    success: { title: '认证成功', description: '您的实名认证已通过审核', primaryBtn: { text: '返回设置', href: '/settings' }, secondaryBtn: { text: '返回首页', href: '/' } },
    failed: { title: '认证失败', description: '证件信息不清晰，请重新上传', primaryBtn: { text: '重新认证', href: '/verification' }, secondaryBtn: { text: '返回首页', href: '/' } },
  },
  join: {
    success: { title: '加入成功', description: '欢迎加入圈子，开始您的学习之旅', primaryBtn: { text: '进入圈子', href: '/circle/1/home' }, secondaryBtn: { text: '继续发现', href: '/circle' } },
    failed: { title: '加入失败', description: '支付未完成，请重试', primaryBtn: { text: '重新加入', href: '/circle/1' }, secondaryBtn: { text: '返回首页', href: '/' } },
  },
  purchase: {
    success: { title: '购买成功', description: '课程已解锁，立即开始学习吧', primaryBtn: { text: '开始学习', href: '/learn/1' }, secondaryBtn: { text: '查看订单', href: '/orders' } },
    failed: { title: '购买失败', description: '支付过程中出现问题，请重试', primaryBtn: { text: '重新购买', href: '/course/1' }, secondaryBtn: { text: '返回首页', href: '/' } },
  },
}

const recommendations = [
  { id: 1, type: 'course', title: '紫微斗数精讲', price: 299, students: 856 },
  { id: 2, type: 'course', title: '八字进阶实战', price: 399, students: 1024 },
  { id: 3, type: 'circle', title: '风水堪舆学院', members: 2560 },
]

const type = ref('payment')
const status = ref('success')
const orderId = ref('')
const customTitle = ref('')
const customDesc = ref('')
const showAnimation = ref(false)

const isSuccess = computed(() => status.value === 'success')
const config = computed(() => resultConfigs[type.value] || resultConfigs.payment)
const resultData = computed(() => (isSuccess.value ? config.value.success : config.value.failed))

onLoad((options?: Record<string, string>) => {
  if (options?.type) type.value = options.type
  if (options?.status) status.value = options.status
  orderId.value = options?.orderId || ('20260509' + Math.random().toString().slice(2, 8))
  if (options?.title) customTitle.value = options.title
  if (options?.desc) customDesc.value = options.desc
  setTimeout(() => { showAnimation.value = true }, 50)
})

function onPrimary() {
  const href = resultData.value.primaryBtn.href
  if (href) navigateTo(href)
  else goBack()
}

function onSecondary() {
  const href = resultData.value.secondaryBtn?.href
  if (href) navigateTo(href)
}
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #fafaf9;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0);
  background: rgba(250, 250, 249, 0.95);
  border-bottom: 1rpx solid #e7e5e4;
}

.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #1f2937; }
.nav-placeholder { width: 56rpx; }

.body { padding: 48rpx; }

.result-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: 64rpx;
  padding-bottom: 48rpx;
}

.result-icon {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s ease;
}

.icon-in { opacity: 1; transform: scale(1); }
.icon-success { background: rgba(34, 197, 94, 0.1); }
.icon-failed { background: rgba(239, 68, 68, 0.1); }

.ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0.3;
  animation: ping 1.5s ease-out 2;
}
.ping-success { background: #22c55e; }
.ping-failed { background: #ef4444; }

@keyframes ping {
  75%, 100% { transform: scale(1.4); opacity: 0; }
}

.result-title {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.1s;
}
.title-success { color: #16a34a; }
.title-failed { color: #ef4444; }

.result-desc {
  font-size: 28rpx;
  color: #6b7280;
  max-width: 480rpx;
  line-height: 1.5;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.2s;
}

.fade-in { opacity: 1 !important; transform: translateY(0) !important; }
.fade-in-2 { opacity: 1 !important; transform: translateY(0) !important; }
.fade-in-3 { opacity: 1 !important; transform: translateY(0) !important; }
.fade-in-4 { opacity: 1 !important; transform: translateY(0) !important; }
.fade-in-5 { opacity: 1 !important; transform: translateY(0) !important; }

.order-box {
  margin-top: 32rpx;
  padding: 16rpx 32rpx;
  background: #f3f4f6;
  border-radius: 16rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.3s;
}
.order-text { font-size: 22rpx; color: #6b7280; }
.order-id { color: #1f2937; font-family: monospace; }

.fail-card {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-top: 32rpx;
  padding: 32rpx;
  background: rgba(239, 68, 68, 0.05);
  border: 1rpx solid rgba(239, 68, 68, 0.2);
  border-radius: 24rpx;
  text-align: left;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.3s;
}
.fail-info { flex: 1; }
.fail-title { display: block; font-size: 28rpx; font-weight: 500; color: #ef4444; }
.fail-desc { display: block; font-size: 22rpx; color: #6b7280; margin-top: 4rpx; }

.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.4s;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  border-radius: 24rpx;
  font-size: 30rpx;
  font-weight: 500;
}
.btn-primary { background: #c41e3a; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-secondary { background: #f3f4f6; color: #1f2937; }

.recommend {
  margin-top: 64rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.5s;
}

.recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.recommend-title-wrap { display: flex; align-items: center; gap: 12rpx; }
.recommend-title { font-size: 28rpx; font-weight: 500; color: #1f2937; }
.recommend-more { display: flex; align-items: center; gap: 4rpx; }
.more-text { font-size: 22rpx; color: #9ca3af; }

.recommend-list { display: flex; flex-direction: column; gap: 24rpx; }

.recommend-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  border: 1rpx solid #f0f0f0;
}

.item-cover {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-info { flex: 1; min-width: 0; }
.item-title-row { display: flex; align-items: center; gap: 12rpx; }
.item-badge {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 6rpx;
  flex-shrink: 0;
}
.item-title { font-size: 28rpx; font-weight: 500; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { display: block; font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; }
.item-price { display: block; font-size: 28rpx; color: #c41e3a; font-weight: 500; margin-top: 8rpx; }

.help {
  margin-top: 64rpx;
  text-align: center;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease 0.5s;
}
.help-tip { display: block; font-size: 28rpx; color: #6b7280; margin-bottom: 8rpx; }
.help-link { font-size: 28rpx; color: #c41e3a; }
</style>
