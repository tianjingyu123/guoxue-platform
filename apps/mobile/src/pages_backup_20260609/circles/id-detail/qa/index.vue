<template>
  <view class="circle-qa-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">付费问答</text>
        <text class="header-ask-btn" @click="showAskModal = true">我要提问</text>
      </view>
      <!-- 筛选Tab -->
      <view class="tab-row">
        <view v-for="tab in tabs" :key="tab.id" class="tab-item" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          <text>{{ tab.label }}({{ tab.count }})</text>
        </view>
      </view>
    </view>

    <!-- 问答列表 -->
    <view class="qa-list">
      <template v-if="filteredQA.length">
        <view v-for="qa in filteredQA" :key="qa.id" class="qa-card" @click="goPage('/pages/qa/id-detail/index?id=' + qa.id)">
          <!-- 提问者信息 -->
          <view class="qa-header">
            <view class="qa-asker">
              <view class="qa-avatar">匿</view>
              <text class="qa-asker-name">{{ qa.asker.name }}</text>
              <text class="qa-time">{{ qa.askTime }}</text>
            </view>
            <text class="qa-status" :class="qa.status === 'answered' ? 'answered' : 'pending'">{{ qa.status === 'answered' ? '已回答' : '待回答' }}</text>
          </view>

          <!-- 问题内容 -->
          <view class="qa-question">
            <text class="qq-icon">❓</text>
            <text class="qq-text">{{ qa.question }}</text>
          </view>

          <!-- 回答内容 -->
          <view v-if="qa.status === 'answered' && qa.answer" class="qa-answer">
            <view class="qa-answerer">
              <view class="qa-avatar small">{{ qa.answerer.name[0] }}</view>
              <text class="qa-answerer-name">{{ qa.answerer.name }}</text>
              <text class="qa-answerer-role">{{ qa.answerer.role }}</text>
            </view>
            <text class="qa-answer-text">{{ qa.answer }}</text>
          </view>

          <!-- 底部数据 -->
          <view class="qa-footer">
            <view class="qa-stats">
              <text>👁️ {{ qa.viewCount }}人围观</text>
              <text v-if="qa.status === 'answered'">🪙 {{ qa.viewPrice }}币围观</text>
            </view>
            <text class="qa-arrow">›</text>
          </view>
        </view>
      </template>
      <view v-else class="empty-state">
        <text class="empty-icon">💬</text>
        <text class="empty-text">还没有人提问</text>
        <text class="empty-hint">成为第一个提问者吧</text>
        <text class="empty-btn" @click="showAskModal = true">我要提问</text>
      </view>
    </view>

    <!-- 提问弹窗 -->
    <view v-if="showAskModal" class="modal-mask" @click="showAskModal = false">
      <view class="ask-panel" @click.stop>
        <view class="ap-header">
          <text class="ap-cancel" @click="showAskModal = false">取消</text>
          <text class="ap-title">发起提问</text>
          <view class="ap-spacer" />
        </view>

        <view class="ap-body">
          <!-- 选择提问对象 -->
          <view class="ap-section">
            <text class="ap-label">选择提问对象 <text class="required">*</text></text>
            <view class="answerer-list">
              <view v-for="person in answerers" :key="person.id" class="answerer-item" :class="{ active: selectedAnswerer?.id === person.id }" @click="selectedAnswerer = person">
                <view class="ai-avatar">{{ person.name[0] }}</view>
                <view class="ai-info">
                  <view class="ai-name-row">
                    <text class="ai-name">{{ person.name }}</text>
                    <text class="ai-role">{{ person.role }}</text>
                  </view>
                  <view class="ai-meta">
                    <text>回复率 {{ person.responseRate }}%</text>
                    <text>平均 {{ person.avgTime }}</text>
                  </view>
                </view>
                <view class="ai-price">
                  <text class="aip-num">{{ person.price }}币</text>
                  <text class="aip-label">提问价格</text>
                </view>
                <view v-if="selectedAnswerer?.id === person.id" class="ai-check">✓</view>
              </view>
            </view>
          </view>

          <!-- 问题标题 -->
          <view class="ap-section">
            <text class="ap-label">问题标题 <text class="required">*</text></text>
            <input v-model="questionTitle" class="ap-input" placeholder="请简要描述你的问题" maxlength="50" />
            <text class="ap-count">{{ questionTitle.length }}/50</text>
          </view>

          <!-- 问题详情 -->
          <view class="ap-section">
            <text class="ap-label">详细描述 <text class="optional">(选填)</text></text>
            <textarea v-model="questionDetail" class="ap-textarea" placeholder="请详细描述你的问题，提供更多背景信息有助于获得更精准的回答" maxlength="500" />
            <text class="ap-count">{{ questionDetail.length }}/500</text>
          </view>

          <!-- 匿名设置 -->
          <view class="toggle-row">
            <view class="toggle-info">
              <text class="toggle-label">匿名提问</text>
              <text class="toggle-desc">其他用户将无法看到你的身份</text>
            </view>
            <view class="toggle-switch" :class="{ active: isAnonymous }" @click="isAnonymous = !isAnonymous">
              <view class="ts-knob" />
            </view>
          </view>

          <!-- 费用说明 -->
          <view v-if="selectedAnswerer" class="price-card">
            <view class="pc-row">
              <text class="pc-label">提问费用</text>
              <text class="pc-price">{{ selectedAnswerer.price }} 国学币</text>
            </view>
            <text class="pc-hint">提问后若7天内未获回答，费用将自动退还</text>
          </view>
        </view>

        <!-- 底部操作 -->
        <view class="ap-footer">
          <view class="ap-submit" :class="{ disabled: !selectedAnswerer || !questionTitle.trim() || isSubmitting }" @click="handleSubmit">
            <text>{{ isSubmitting ? '提交中...' : '确认支付并提问' + (selectedAnswerer ? '(' + selectedAnswerer.price + '币)' : '') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提问成功弹窗 -->
    <view v-if="showSuccessModal" class="modal-mask center" @click="showSuccessModal = false">
      <view class="success-panel" @click.stop>
        <view class="sp-icon">✓</view>
        <text class="sp-title">提问成功</text>
        <text class="sp-desc">你的问题已提交，请耐心等待回答。回答后会通过消息通知你。</text>
        <text class="sp-btn" @click="showSuccessModal = false">知道了</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref<'all' | 'answered' | 'pending'>('all')
const showAskModal = ref(false)
const showSuccessModal = ref(false)
const selectedAnswerer = ref<any>(null)
const questionTitle = ref('')
const questionDetail = ref('')
const isAnonymous = ref(true)
const isSubmitting = ref(false)

const tabs = [
  { id: 'all', label: '全部', count: 4 },
  { id: 'answered', label: '已回答', count: 3 },
  { id: 'pending', label: '待回答', count: 1 },
]

const qaList = ref([
  { id: 1, asker: { name: '匿名用户' }, question: '八字中日主偏弱，是否一定要补强？有没有弱而不补反而更好的情况？', askTime: '2小时前', answerer: { name: '周易大师', role: '圈主' }, answer: '这是一个很好的问题。八字论命，并非简单的强弱补泄。有些格局如「从格」，日主极弱反而要顺其势，补强反为不美...', answerTime: '1小时前', status: 'answered', viewCount: 128, viewPrice: 1 },
  { id: 2, asker: { name: '匿名用户' }, question: '请问紫微斗数中的「四化」如何理解？特别是化忌在不同宫位的含义有什么区别？', askTime: '5小时前', answerer: { name: '张玄风', role: '嘉宾' }, answer: '四化是紫微斗数的精髓，化禄主福、化权主权、化科主名、化忌主烦...', answerTime: '3小时前', status: 'answered', viewCount: 256, viewPrice: 2 },
  { id: 3, asker: { name: '匿名用户' }, question: '风水布局中，客厅沙发背后是窗户怎么化解？', askTime: '1天前', answerer: { name: '周易大师', role: '圈主' }, answer: null, answerTime: null, status: 'pending', viewCount: 0, viewPrice: 1 },
  { id: 4, asker: { name: '匿名用户' }, question: '八字中的「桃花」和「红鸾」有什么区别？对感情的影响一样吗？', askTime: '2天前', answerer: { name: '周易大师', role: '圈主' }, answer: '桃花与红鸾虽都主感情桃花，但性质不同。桃花多指异性缘、人缘，有正桃花和烂桃花之分...', answerTime: '1天前', status: 'answered', viewCount: 512, viewPrice: 1 },
])

const answerers = ref([
  { id: 1, name: '周易大师', role: '圈主', price: 10, responseRate: 98, avgTime: '2小时内' },
  { id: 2, name: '张玄风', role: '嘉宾', price: 20, responseRate: 95, avgTime: '4小时内' },
  { id: 3, name: '李易安', role: '嘉宾', price: 15, responseRate: 90, avgTime: '6小时内' },
])

const filteredQA = computed(() => {
  if (activeTab.value === 'all') return qaList.value
  return qaList.value.filter(q => q.status === activeTab.value)
})

function handleSubmit() {
  if (!selectedAnswerer.value || !questionTitle.value.trim()) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    showAskModal.value = false
    showSuccessModal.value = true
    selectedAnswerer.value = null
    questionTitle.value = ''
    questionDetail.value = ''
  }, 1500)
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.circle-qa-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-ask-btn { font-size: 24rpx; padding: 10rpx 22rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; }
.tab-row { display: flex; gap: 32rpx; padding: 0 24rpx; height: 72rpx; border-top: 1px solid #F5F1EB; }
.tab-item { position: relative; display: flex; align-items: center; }
.tab-item text { font-size: 26rpx; color: #999; }
.tab-item.active text { color: #C41E3A; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

.qa-list { padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }

.qa-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.qa-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.qa-asker { display: flex; align-items: center; gap: 12rpx; }
.qa-avatar { width: 44rpx; height: 44rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #999; flex-shrink: 0; }
.qa-avatar.small { width: 36rpx; height: 36rpx; font-size: 16rpx; background: rgba(201,169,110,0.2); color: #C9A96E; }
.qa-asker-name { font-size: 22rpx; color: #999; }
.qa-time { font-size: 20rpx; color: #BBB; }
.qa-status { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.qa-status.answered { background: rgba(34,197,94,0.1); color: #22C55E; }
.qa-status.pending { background: rgba(249,115,22,0.1); color: #F97316; }

.qa-question { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.qq-icon { font-size: 28rpx; flex-shrink: 0; margin-top: 2rpx; }
.qq-text { font-size: 26rpx; color: #333; line-height: 1.5; }

.qa-answer { padding-left: 40rpx; margin-bottom: 16rpx; }
.qa-answerer { display: flex; align-items: center; gap: 10rpx; margin-bottom: 10rpx; }
.qa-answerer-name { font-size: 22rpx; font-weight: 500; color: #333; }
.qa-answerer-role { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(201,169,110,0.1); color: #C9A96E; }
.qa-answer-text { font-size: 24rpx; color: #666; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; display: block; }

.qa-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16rpx; border-top: 1px solid #F5F1EB; }
.qa-stats { display: flex; gap: 20rpx; }
.qa-stats text { font-size: 20rpx; color: #999; }
.qa-arrow { font-size: 32rpx; color: #999; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }
.empty-hint { font-size: 22rpx; color: #BBB; margin-top: 6rpx; }
.empty-btn { margin-top: 24rpx; padding: 18rpx 48rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 26rpx; }

/* 提问弹窗 */
.modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.modal-mask.center { align-items: center; }
.ask-panel { width: 100%; max-width: 600rpx; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 90vh; display: flex; flex-direction: column; }
.ap-header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; border-bottom: 1px solid #E8E0D5; flex-shrink: 0; }
.ap-cancel { font-size: 26rpx; color: #999; }
.ap-title { font-size: 30rpx; font-weight: 600; color: #333; }
.ap-spacer { width: 80rpx; }
.ap-body { flex: 1; overflow-y: auto; padding: 24rpx; }
.ap-section { margin-bottom: 24rpx; }
.ap-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }
.required { color: #C41E3A; }
.optional { font-size: 22rpx; color: #BBB; }

.answerer-list { display: flex; flex-direction: column; gap: 12rpx; }
.answerer-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; border-radius: 16rpx; border: 2rpx solid transparent; background: #FAF8F5; }
.answerer-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.ai-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #C9A96E; flex-shrink: 0; }
.ai-info { flex: 1; min-width: 0; }
.ai-name-row { display: flex; align-items: center; gap: 8rpx; }
.ai-name { font-size: 26rpx; font-weight: 500; color: #333; }
.ai-role { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(201,169,110,0.1); color: #C9A96E; }
.ai-meta { display: flex; gap: 16rpx; margin-top: 4rpx; }
.ai-meta text { font-size: 20rpx; color: #999; }
.ai-price { text-align: right; flex-shrink: 0; }
.aip-num { font-size: 28rpx; font-weight: 600; color: #C41E3A; display: block; }
.aip-label { font-size: 18rpx; color: #999; }
.ai-check { width: 40rpx; height: 40rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #fff; }

.ap-input { width: 100%; height: 72rpx; padding: 0 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; font-size: 24rpx; box-sizing: border-box; background: #FAF8F5; }
.ap-textarea { width: 100%; height: 180rpx; padding: 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; font-size: 24rpx; box-sizing: border-box; background: #FAF8F5; }
.ap-count { font-size: 20rpx; color: #BBB; text-align: right; display: block; margin-top: 6rpx; }

.toggle-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.toggle-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.toggle-desc { font-size: 20rpx; color: #BBB; }
.toggle-switch { width: 72rpx; height: 40rpx; border-radius: 20rpx; background: #E8E0D5; position: relative; transition: background 0.2s; }
.toggle-switch.active { background: #C41E3A; }
.ts-knob { width: 32rpx; height: 32rpx; border-radius: 50%; background: #fff; position: absolute; top: 4rpx; left: 4rpx; transition: transform 0.2s; }
.toggle-switch.active .ts-knob { transform: translateX(32rpx); }

.price-card { background: rgba(201,169,110,0.05); border-radius: 16rpx; padding: 20rpx; border: 1rpx solid rgba(201,169,110,0.2); }
.pc-row { display: flex; justify-content: space-between; align-items: center; }
.pc-label { font-size: 24rpx; color: #999; }
.pc-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.pc-hint { font-size: 20rpx; color: #999; margin-top: 8rpx; display: block; }

.ap-footer { padding: 20rpx 24rpx; border-top: 1px solid #E8E0D5; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); flex-shrink: 0; }
.ap-submit { padding: 24rpx; border-radius: 16rpx; background: #C41E3A; text-align: center; }
.ap-submit.disabled { background: #F5F1EB; }
.ap-submit text { font-size: 28rpx; font-weight: 600; color: #fff; }
.ap-submit.disabled text { color: #BBB; }

/* 成功弹窗 */
.success-panel { width: 560rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; text-align: center; }
.sp-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center; font-size: 44rpx; color: #22C55E; margin: 0 auto 20rpx; }
.sp-title { font-size: 32rpx; font-weight: 600; color: #333; display: block; margin-bottom: 12rpx; }
.sp-desc { font-size: 24rpx; color: #999; display: block; margin-bottom: 28rpx; line-height: 1.5; }
.sp-btn { display: block; padding: 22rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; font-size: 26rpx; }
</style>
