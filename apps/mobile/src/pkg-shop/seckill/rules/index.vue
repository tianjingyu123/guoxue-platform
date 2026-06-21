<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @click="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <view class="nav-title">
          <AppIcon name="zap" :size="16" color="#f97316" />
          <text class="nav-title-text">秒杀活动规则</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="content">
        <!-- Hero -->
        <view class="hero">
          <view class="hero-head">
            <AppIcon name="zap" :size="20" color="#ffffff" />
            <text class="hero-title">限时秒杀</text>
          </view>
          <text class="hero-desc">全场低至1折，每天三场，错过等一年！参与前请仔细阅读以下规则。</text>
        </view>

        <!-- 活动规则 -->
        <view class="section">
          <view class="section-head">
            <AppIcon name="check-circle-2" :size="16" color="#8b1a1a" />
            <text class="section-title">活动规则</text>
          </view>
          <view class="rule-list">
            <view v-for="r in rules" :key="r.title" class="rule-item">
              <text class="rule-emoji">{{ r.icon }}</text>
              <view class="rule-body">
                <text class="rule-title">{{ r.title }}</text>
                <text class="rule-content">{{ r.content }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 常见问题 -->
        <view class="section">
          <view class="section-head">
            <AppIcon name="help-circle" :size="16" color="#8b1a1a" />
            <text class="section-title">常见问题</text>
          </view>
          <view class="faq-list">
            <view v-for="f in faqs" :key="f.q" class="faq-item">
              <text class="faq-q">Q：{{ f.q }}</text>
              <text class="faq-a">A：{{ f.a }}</text>
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="notice">
          <AppIcon name="alert-circle" :size="16" color="#d97706" />
          <text class="notice-text">平台保留活动最终解释权。如有疑问请联系客服。</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)

const rules = [
  { icon: '🎯', title: '参与资格', content: '所有注册用户均可参与秒杀活动。每个账号每次活动限购1件。不同的秒杀商品单独计算购买资格。' },
  { icon: '⏱️', title: '活动时间', content: '秒杀活动在指定时间段内进行，通常为每天10:00、14:00、20:00三个时段各1小时。具体时间以活动页面公示为准。' },
  { icon: '💳', title: '支付规则', content: '抢购成功后需在15分钟内完成支付，超时订单自动取消，商品重新投入秒杀池。支持微信支付、支付宝、余额等支付方式。' },
  { icon: '🚫', title: '禁止行为', content: '禁止使用脚本、外挂等技术手段抢购；禁止恶意下单不付款；禁止通过异常途径获取优惠。一经发现，取消参与资格并封禁账号。' },
  { icon: '↩️', title: '退款政策', content: '虚拟类商品（课程、VIP会员）付款成功后原则上不支持退款。如遇商品描述与实际严重不符，可在24小时内申请客服处理。' },
  { icon: '📦', title: '实物商品', content: '实物类秒杀商品将在3-5个工作日内发货，支持7天无理由退换货（限商品未拆封使用状态）。' },
]

const faqs = [
  { q: '秒杀价格是否包含运费？', a: '秒杀价格为商品本身价格，不包含运费。运费在支付页面单独显示。' },
  { q: '手慢没抢到可以等下次吗？', a: '秒杀商品库存有限，未抢到可关注该商品，下次活动时会收到推送通知。' },
  { q: '已购买的秒杀课程如何观看？', a: '购买成功后可在「我的课程」中找到对应课程，立即开始学习。' },
]

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
    scrollHeight.value = (res.windowHeight || 0) - statusBarHeight.value - 44
  },
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f7f7;
}
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #ffffff;
  border-bottom: 1px solid #ededed;
}
.nav-inner {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}
.nav-back {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.nav-title-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.scroll {
  margin-top: 44px;
  box-sizing: border-box;
}
.content {
  padding: 20px 16px 80px;
}
.hero {
  background: linear-gradient(90deg, #f97316, #ef4444);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
}
.hero-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.hero-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}
.hero-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}
.section {
  margin-bottom: 24px;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rule-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #ededed;
  border-radius: 12px;
}
.rule-emoji {
  font-size: 24px;
  flex-shrink: 0;
  line-height: 1.2;
}
.rule-body {
  display: flex;
  flex-direction: column;
}
.rule-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}
.rule-content {
  font-size: 12px;
  color: #999999;
  line-height: 1.6;
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.faq-item {
  padding: 12px;
  background: #ffffff;
  border: 1px solid #ededed;
  border-radius: 12px;
}
.faq-q {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 6px;
}
.faq-a {
  font-size: 12px;
  color: #999999;
  line-height: 1.6;
}
.notice {
  margin-top: 24px;
  display: flex;
  gap: 6px;
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
}
.notice-text {
  font-size: 12px;
  color: #b45309;
  line-height: 1.5;
}
</style>
