<template>
  <view class="help-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">帮助中心</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="help-content">
      <!-- 搜索框 -->
      <view class="search-row">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="输入问题关键词，快速查找答案"
          />
        </view>
      </view>

      <!-- 问题分类 -->
      <view v-if="!searchQuery" class="section">
        <text class="section-title">问题分类</text>
        <view class="category-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-card"
            :class="{ sel: selectedCategory === cat.id }"
            @click="selectedCategory = selectedCategory === cat.id ? null : cat.id"
          >
            <view class="cat-icon" :class="cat.bgClass">
              <text class="cat-emoji">{{ cat.icon }}</text>
            </view>
            <text class="cat-name">{{ cat.name }}</text>
          </view>
        </view>
        <text v-if="selectedCategory" class="clear-filter" @click="selectedCategory = null">清除筛选</text>
      </view>

      <!-- 问题列表 -->
      <view class="section">
        <view class="section-title-row">
          <text class="section-title">
            {{ searchQuery ? '搜索结果' : selectedCategory ? getCategoryName(selectedCategory) : '常见问题' }}
          </text>
          <text v-if="!searchQuery && !selectedCategory" class="hot-icon">🔥</text>
        </view>

        <view v-if="filteredQuestions.length > 0" class="qa-list">
          <view
            v-for="item in filteredQuestions"
            :key="item.id"
            class="qa-card"
            :class="{ expanded: expandedId === item.id }"
            @click="expandedId = expandedId === item.id ? null : item.id"
          >
            <view class="qa-header">
              <text class="qa-q-icon">❓</text>
              <view class="qa-body">
                <view class="qa-title-row">
                  <text class="qa-question">{{ item.question }}</text>
                  <view v-if="item.hot" class="qa-hot-tag">热门</view>
                </view>
                <text class="qa-category">{{ item.category }}</text>
              </view>
              <text class="qa-arrow" :class="{ open: expandedId === item.id }">›</text>
            </view>
            <view v-if="expandedId === item.id" class="qa-answer">
              <text class="qa-answer-text">{{ item.answer }}</text>
              <view class="qa-feedback">
                <text class="qa-fb-label">这个回答有帮助吗？</text>
                <text class="qa-fb-btn">有帮助</text>
                <text class="qa-fb-btn muted">没有帮助</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-mini">
          <text class="em-icon">🔍</text>
          <text class="em-text">没有找到相关问题</text>
          <text class="em-sub">试试其他关键词，或联系客服获取帮助</text>
        </view>
      </view>

      <!-- 更多帮助 -->
      <view class="section">
        <text class="section-title">更多帮助</text>
        <view class="more-list">
          <view class="more-item" @click="goPage('/pages/feedback/index')">
            <view class="more-icon mi-blue">💬</view>
            <view class="more-info">
              <text class="more-title">意见反馈</text>
              <text class="more-desc">提交建议或报告问题</text>
            </view>
            <text class="more-arrow">›</text>
          </view>
          <view class="more-item" @click="goPage('/pages/about/index')">
            <view class="more-icon mi-purple">📖</view>
            <view class="more-info">
              <text class="more-title">使用教程</text>
              <text class="more-desc">图文视频新手指引</text>
            </view>
            <text class="more-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部联系客服 -->
    <view class="bottom-bar">
      <view class="bb-btn" @click="goPage('/pages/agent/customer-service/index')">
        <text>💬 联系在线客服</text>
      </view>
      <text class="bb-time">工作时间：每日 9:00-22:00</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const expandedId = ref<number | null>(null)
const selectedCategory = ref<string | null>(null)

const categories = [
  { id: 'guide', name: '用户指南', icon: '📘', bgClass: 'cat-blue' },
  { id: 'payment', name: '支付与订单', icon: '💳', bgClass: 'cat-green' },
  { id: 'circle', name: '圈主指南', icon: '👥', bgClass: 'cat-purple' },
  { id: 'teacher', name: '讲师指南', icon: '🎓', bgClass: 'cat-orange' },
  { id: 'station', name: '站长指南', icon: '🏪', bgClass: 'cat-pink' },
  { id: 'account', name: '账号问题', icon: '⚙️', bgClass: 'cat-cyan' },
]

const hotQuestions = [
  { id: 1, question: '如何使用八字排盘功能？', answer: '进入首页，点击底部导航栏中央的「排盘工具」按钮，选择「八字排盘」，输入出生日期、时间和性别，系统将自动生成您的八字命盘。会员用户可享受更详细的AI智能分析服务。', category: '用户指南', hot: true },
  { id: 2, question: '国学币如何充值？', answer: '进入「我的」-「钱包」页面，点击「充值」按钮，选择预设档位或输入自定义金额，支持微信和支付宝支付。国学币与人民币比例为10:1，部分档位还有额外赠送。', category: '支付与订单', hot: true },
  { id: 3, question: '如何创建自己的圈子？', answer: '您需要先完成实名认证，然后进入「我的」-「身份管理」，申请成为圈主。审核通过后，在「圈子」页面点击「创建圈子」，填写圈子名称、简介、封面图等信息即可。', category: '圈主指南', hot: true },
  { id: 4, question: '课程购买后可以退款吗？', answer: '虚拟商品（课程、电子书等）一经购买，原则上不支持退款。如遇特殊情况（如内容与描述严重不符），可联系客服申请退款，平台将在7个工作日内审核处理。', category: '支付与订单' },
  { id: 5, question: '如何成为平台讲师？', answer: '进入「我的」-「身份管理」，点击「申请成为讲师」，提交个人资质证明、从业经历、代表作品等材料。审核周期约3-5个工作日，审核通过后即可上传课程。', category: '讲师指南' },
  { id: 6, question: '收益如何提现？', answer: '进入「我的」-「收益管理」-「申请提现」，输入提现金额（最低100元），选择提现方式（微信/支付宝/银行卡）。提现申请将在T+1至T+3个工作日内到账。', category: '圈主指南' },
  { id: 7, question: '如何修改登录密码？', answer: '进入「我的」-「设置」-「账号与安全」-「登录密码」，验证当前手机号后，输入新密码并确认即可完成修改。', category: '账号问题' },
  { id: 8, question: '如何开具发票？', answer: '订单支付成功后，进入「我的」-「我的订单」，找到对应订单，点击「申请发票」，填写发票抬头、税号等信息。电子发票将在3个工作日内发送至您的邮箱。', category: '支付与订单' },
]

const filteredQuestions = computed(() => {
  return hotQuestions.filter(q => {
    const matchSearch = !searchQuery.value ||
      q.question.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCat = !selectedCategory.value || q.category === categories.find(c => c.id === selectedCategory.value)?.name
    return matchSearch && matchCat
  })
})

function getCategoryName(id: string) {
  return categories.find(c => c.id === id)?.name || ''
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.help-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-spacer { width: 64rpx; }

.help-content { padding: 16rpx 24rpx; }
.search-row { margin-bottom: 24rpx; }
.search-box { display: flex; align-items: center; background: #fff; border-radius: 48rpx; padding: 0 24rpx; height: 80rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }

.section { margin-bottom: 28rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 14rpx; }
.section-title-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 14rpx; }
.hot-icon { font-size: 28rpx; }

.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }
.cat-card { display: flex; flex-direction: column; align-items: center; padding: 20rpx 8rpx; background: #fff; border-radius: 16rpx; border: 2rpx solid transparent; }
.cat-card.sel { border-color: #C41E3A; background: rgba(196,30,58,0.02); }
.cat-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.cat-emoji { font-size: 36rpx; }
.cat-blue { background: rgba(74,144,217,0.1); }
.cat-green { background: rgba(82,196,26,0.1); }
.cat-purple { background: rgba(114,46,209,0.08); }
.cat-orange { background: rgba(250,140,22,0.1); }
.cat-pink { background: rgba(233,30,99,0.08); }
.cat-cyan { background: rgba(0,188,212,0.08); }
.cat-name { font-size: 22rpx; font-weight: 500; color: #333; }
.clear-filter { font-size: 22rpx; color: #C41E3A; margin-top: 12rpx; display: block; text-align: center; }

.qa-list { }
.qa-card { background: #fff; border-radius: 16rpx; margin-bottom: 12rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.qa-card.expanded { background: #FBF9F6; }
.qa-header { display: flex; align-items: flex-start; gap: 12rpx; padding: 20rpx 24rpx; }
.qa-q-icon { font-size: 32rpx; margin-top: 4rpx; flex-shrink: 0; }
.qa-body { flex: 1; min-width: 0; }
.qa-title-row { display: flex; align-items: center; gap: 8rpx; }
.qa-question { font-size: 26rpx; font-weight: 500; color: #333; flex: 1; }
.qa-hot-tag { font-size: 18rpx; color: #E65100; background: #FFF3E0; padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.qa-category { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.qa-arrow { font-size: 28rpx; color: #BBB; transition: transform 0.2s; flex-shrink: 0; display: inline-block; }
.qa-arrow.open { transform: rotate(90deg); }

.qa-answer { padding: 0 24rpx 20rpx 60rpx; border-top: 1px solid #F0EDE5; }
.qa-answer-text { font-size: 24rpx; color: #666; line-height: 1.7; }
.qa-feedback { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.qa-fb-label { font-size: 22rpx; color: #999; }
.qa-fb-btn { font-size: 22rpx; color: #C41E3A; }
.qa-fb-btn.muted { color: #BBB; }

.empty-mini { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; }
.em-icon { font-size: 72rpx; opacity: 0.3; margin-bottom: 16rpx; }
.em-text { font-size: 28rpx; color: #999; margin-bottom: 8rpx; }
.em-sub { font-size: 22rpx; color: #BBB; }

.more-list { }
.more-item { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.more-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.mi-blue { background: rgba(74,144,217,0.1); }
.mi-purple { background: rgba(114,46,209,0.08); }
.more-info { flex: 1; }
.more-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.more-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.more-arrow { font-size: 28rpx; color: #BBB; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 24rpx; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; }
.bb-btn { width: 100%; height: 88rpx; border-radius: 20rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.bb-time { font-size: 22rpx; color: #BBB; text-align: center; margin-top: 10rpx; display: block; }
</style>
