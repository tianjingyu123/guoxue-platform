<template>
  <view class="help-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack">
          <app-icon name="chevron-left" :size="44" color="#1A1A1A" />
        </view>
        <text class="nav-title">帮助中心</text>
        <view class="nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <view class="content">
        <!-- 搜索框 -->
        <view class="search-row">
          <view class="search-box">
            <app-icon name="search" :size="32" color="#9A9A9A" class="search-icon" />
            <input
              class="search-input"
              type="text"
              placeholder="输入问题关键词，快速查找答案"
              placeholder-class="search-ph"
              :value="searchQuery"
              @input="onSearch"
            />
          </view>
          <view class="ai-btn" @click="onAiSearch">
            <app-icon name="sparkles" :size="32" color="#C9A96E" />
          </view>
        </view>

        <!-- 问题分类 -->
        <view v-if="searchQuery === ''" class="section">
          <text class="section-title">问题分类</text>
          <view class="cat-grid">
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="cat-item"
              :class="{ 'cat-item-active': selectedCategory === cat.id }"
              @click="toggleCategory(cat.id)"
            >
              <view class="cat-icon" :style="{ background: cat.bg }">
                <app-icon :name="cat.icon" :size="40" :color="cat.color" />
              </view>
              <text class="cat-name">{{ cat.name }}</text>
            </view>
          </view>
          <text v-if="selectedCategory" class="clear-filter" @click="selectedCategory = null">清除筛选</text>
        </view>

        <!-- 热门问题 -->
        <view class="section">
          <view class="section-head">
            <text class="section-title">{{ listTitle }}</text>
            <app-icon v-if="!searchQuery && !selectedCategory" name="flame" :size="32" color="#F97316" />
          </view>

          <view v-if="filteredQuestions.length > 0" class="q-list">
            <view
              v-for="item in filteredQuestions"
              :key="item.id"
              class="q-card"
              :class="{ 'q-card-open': expandedId === item.id }"
            >
              <view class="q-head" @click="toggleExpand(item.id)">
                <app-icon name="help-circle" :size="40" color="#C41E3A" class="q-help-icon" />
                <view class="q-main">
                  <view class="q-title-row">
                    <text class="q-title">{{ item.question }}</text>
                    <text v-if="item.hot" class="q-hot">热门</text>
                  </view>
                  <text class="q-cat">{{ item.category }}</text>
                </view>
                <app-icon
                  name="chevron-down"
                  :size="32"
                  color="#9A9A9A"
                  class="q-chevron"
                  :class="{ 'q-chevron-open': expandedId === item.id }"
                />
              </view>
              <view v-if="expandedId === item.id" class="q-body">
                <view class="q-answer-wrap">
                  <text class="q-answer">{{ item.answer }}</text>
                  <view class="q-feedback">
                    <text class="q-feedback-q">这个回答有帮助吗？</text>
                    <text class="q-feedback-yes">有帮助</text>
                    <text class="q-feedback-no">没有帮助</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="empty">
            <view class="empty-icon">
              <app-icon name="search" :size="64" color="#9A9A9A" />
            </view>
            <text class="empty-title">没有找到相关问题</text>
            <text class="empty-desc">试试其他关键词，或联系客服获取帮助</text>
          </view>
        </view>

        <!-- 更多帮助 -->
        <view class="section">
          <text class="section-title">更多帮助</text>
          <view class="more-list">
            <view class="more-card" @click="go('/feedback')">
              <view class="more-left">
                <view class="more-icon" style="background: rgba(59,130,246,0.1)">
                  <app-icon name="message-circle" :size="40" color="#3B82F6" />
                </view>
                <view class="more-text">
                  <text class="more-title">意见反馈</text>
                  <text class="more-desc">提交建议或报告问题</text>
                </view>
              </view>
              <app-icon name="chevron-right" :size="32" color="#9A9A9A" />
            </view>
            <view class="more-card" @click="go('/about')">
              <view class="more-left">
                <view class="more-icon" style="background: rgba(168,85,247,0.1)">
                  <app-icon name="book-open" :size="40" color="#A855F7" />
                </view>
                <view class="more-text">
                  <text class="more-title">使用教程</text>
                  <text class="more-desc">图文视频新手指引</text>
                </view>
              </view>
              <app-icon name="chevron-right" :size="32" color="#9A9A9A" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部联系客服 -->
    <view class="footer">
      <view class="cs-btn" @click="go('/agent/customer-service')">
        <app-icon name="message-circle" :size="40" color="#FFFFFF" />
        <text class="cs-text">联系在线客服</text>
      </view>
      <text class="cs-time">工作时间：每日 9:00-22:00</text>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, goBack } from '@/utils/router'

const statusBarHeight = ref(0)
const navHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  navHeight.value = statusBarHeight.value + 44
} catch (e) {
  navHeight.value = 44
}

const searchQuery = ref('')
const expandedId = ref<number | null>(null)
const selectedCategory = ref<string | null>(null)

const categories = [
  { id: 'guide', name: '用户指南', icon: 'book-open', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'payment', name: '支付与订单', icon: 'credit-card', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  { id: 'circle', name: '圈主指南', icon: 'users', color: '#A855F7', bg: 'rgba(168,85,247,0.1)' },
  { id: 'teacher', name: '讲师指南', icon: 'graduation-cap', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  { id: 'station', name: '站长指南', icon: 'store', color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
  { id: 'account', name: '账号问题', icon: 'settings', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
]

const hotQuestions = [
  { id: 1, question: '如何进行八字排盘？', answer: '在首页点击「八字排盘」，输入您的出生年月日时和性别，点击「开始排盘」即可查看完整的命盘分析。系统会自动生成四柱、十神、大运流年等信息。', category: '用户指南', hot: true },
  { id: 2, question: '购买课程后如何观看？', answer: '购买成功后，进入「我的」-「我的课程」即可找到已购课程，点击对应课程即可开始学习。课程支持反复观看，无观看次数限制。', category: '支付与订单', hot: true },
  { id: 3, question: '如何成为认证讲师？', answer: '进入「我的」-「讲师入驻」，提交您的资质证明、教学经验等信息，平台审核通过后即可成为认证讲师，开始上传课程。', category: '讲师指南', hot: true },
  { id: 4, question: '如何创建自己的圈子？', answer: '进入「圈子」页面，点击右上角「+」，填写圈子名称、简介、分类等信息，设置加入门槛后即可创建。创建后您将成为圈主。', category: '圈主指南' },
  { id: 5, question: '课程可以申请退款吗？', answer: '虚拟课程一经购买观看后原则上不支持退款。如遇课程质量问题或描述不符，可在购买后7天内联系客服申请退款。', category: '讲师指南' },
  { id: 6, question: '收益如何提现？', answer: '进入「我的」-「收益管理」-「申请提现」，输入提现金额（最低100元），选择提现方式（微信/支付宝/银行卡）。提现申请将在T+1至T+3个工作日内到账。', category: '圈主指南' },
  { id: 7, question: '如何修改登录密码？', answer: '进入「我的」-「设置」-「账号与安全」-「登录密码」，验证当前手机号后，输入新密码并确认即可完成修改。', category: '账号问题' },
  { id: 8, question: '如何开具发票？', answer: '订单支付成功后，进入「我的」-「我的订单」，找到对应订单，点击「申请发票」，填写发票抬头、税号等信息。电子发票将在3个工作日内发送至您的邮箱。', category: '支付与订单' },
]

const filteredQuestions = computed(() => {
  return hotQuestions.filter((q) => {
    const matchSearch =
      searchQuery.value === '' ||
      q.question.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.value.toLowerCase())
    const cat = categories.find((c) => c.id === selectedCategory.value)
    const matchCategory = selectedCategory.value === null || q.category === cat?.name
    return matchSearch && matchCategory
  })
})

const listTitle = computed(() => {
  if (searchQuery.value) return '搜索结果'
  if (selectedCategory.value) return categories.find((c) => c.id === selectedCategory.value)?.name || '常见问题'
  return '常见问题'
})

function onSearch(e: any) {
  searchQuery.value = e.detail.value
}
function onAiSearch() {
  uni.showToast({ title: 'AI 搜索', icon: 'none' })
}
function toggleCategory(id: string) {
  selectedCategory.value = selectedCategory.value === id ? null : id
}
function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}
function navigateBackSafe() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else navigateTo('/profile')
}
function go(url: string) {
  navigateTo(url)
}
</script>

<style scoped>
.help-page {
  min-height: 100vh;
  background: #F7F7F7;
}
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(247, 247, 247, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1rpx solid #ECECEC;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}
.content {
  padding: 32rpx;
  padding-bottom: 220rpx;
}
.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 48rpx;
}
.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 24rpx;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 80rpx;
  padding-left: 80rpx;
  padding-right: 32rpx;
  border-radius: 999rpx;
  background: #EFEFEF;
  font-size: 28rpx;
  color: #1A1A1A;
  box-sizing: border-box;
}
.search-ph {
  color: #9A9A9A;
}
.ai-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(201, 169, 110, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.section {
  margin-bottom: 48rpx;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  margin-top: 24rpx;
}
.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
}
.cat-item-active {
  background: rgba(196, 30, 58, 0.08);
  border: 1rpx solid rgba(196, 30, 58, 0.3);
}
.cat-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-name {
  font-size: 24rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.clear-filter {
  display: inline-block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #C41E3A;
}
.q-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.q-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
}
.q-card-open {
  background: #F3F3F3;
}
.q-head {
  padding: 32rpx;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.q-help-icon {
  margin-top: 4rpx;
  flex-shrink: 0;
}
.q-main {
  flex: 1;
  min-width: 0;
}
.q-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.q-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  line-height: 1.4;
}
.q-hot {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(249, 115, 22, 0.1);
  color: #F97316;
  flex-shrink: 0;
}
.q-cat {
  font-size: 24rpx;
  color: #9A9A9A;
  margin-top: 8rpx;
}
.q-chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
}
.q-chevron-open {
  transform: rotate(180deg);
}
.q-body {
  padding: 0 32rpx 32rpx;
}
.q-answer-wrap {
  padding-left: 64rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #ECECEC;
}
.q-answer {
  font-size: 28rpx;
  color: #6A6A6A;
  line-height: 1.6;
}
.q-feedback {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 24rpx;
}
.q-feedback-q {
  font-size: 24rpx;
  color: #9A9A9A;
}
.q-feedback-yes {
  font-size: 24rpx;
  color: #C41E3A;
}
.q-feedback-no {
  font-size: 24rpx;
  color: #9A9A9A;
}
.empty {
  padding: 96rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  background: #EFEFEF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 28rpx;
  color: #6A6A6A;
  margin-bottom: 16rpx;
}
.empty-desc {
  font-size: 24rpx;
  color: #9A9A9A;
}
.more-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}
.more-card {
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.more-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.more-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.more-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}
.more-desc {
  font-size: 24rpx;
  color: #9A9A9A;
  margin-top: 4rpx;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: rgba(247, 247, 247, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1rpx solid #ECECEC;
}
.cs-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.cs-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.cs-time {
  display: block;
  font-size: 24rpx;
  color: #9A9A9A;
  text-align: center;
  margin-top: 16rpx;
}
</style>
