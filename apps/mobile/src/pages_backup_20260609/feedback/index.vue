<template>
  <view class="fb-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">意见反馈</text>
      </view>
    </view>

    <!-- Tab -->
    <view class="tab-row">
      <view class="tab" :class="{ active: activeTab === 'submit' }" @click="activeTab = 'submit'">提交反馈</view>
      <view class="tab" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">我的反馈</view>
    </view>

    <!-- 提交反馈 -->
    <view v-if="activeTab === 'submit'" class="fb-content">
      <template v-if="submitted">
        <view class="submit-success">
          <text class="ss-icon">✅</text>
          <text class="ss-title">提交成功</text>
          <text class="ss-desc">感谢您的反馈，我们会尽快处理</text>
          <view class="ss-btn" @click="resetForm">继续反馈</view>
        </view>
      </template>

      <template v-else>
        <!-- 反馈类型 -->
        <view class="form-section">
          <text class="fs-label">反馈类型</text>
          <view class="type-grid">
            <view v-for="t in fbTypes" :key="t.id" class="type-card" :class="{ sel: selectedType === t.id }" @click="selectedType = t.id">
              <text class="tc-icon">{{ t.icon }}</text>
              <text class="tc-name">{{ t.label }}</text>
            </view>
          </view>
        </view>

        <!-- 详细描述 -->
        <view class="form-section">
          <text class="fs-label">详细描述 <text class="required">*</text></text>
          <textarea v-model="content" class="fs-textarea" placeholder="请详细描述您遇到的问题或建议..." maxlength="500" />
          <text class="fs-count">{{ content.length }}/500</text>
        </view>

        <!-- 上传截图 -->
        <view class="form-section">
          <text class="fs-label">上传截图（选填）</text>
          <view class="img-list">
            <view v-for="(img, i) in images" :key="i" class="img-item">
              <text class="img-del" @click="images.splice(i, 1)">✕</text>
              <text class="img-num">{{ i + 1 }}</text>
            </view>
            <view v-if="images.length < 4" class="img-add">
              <text class="img-add-icon">📷</text>
              <text class="img-add-text">添加图片</text>
            </view>
          </view>
          <text class="fs-hint">最多上传4张图片</text>
        </view>

        <!-- 联系方式 -->
        <view class="form-section">
          <text class="fs-label">联系方式（选填）</text>
          <input v-model="contact" class="fs-input" placeholder="手机号或邮箱，方便我们与您联系" />
        </view>

        <!-- 提交 -->
        <view class="form-section">
          <view class="submit-btn" :class="{ off: !canSubmit || submiting }" @click="handleSubmit">
            <text>{{ submiting ? '提交中...' : '提交反馈' }}</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 历史反馈 -->
    <view v-else class="fb-content">
      <view v-if="historyList.length === 0" class="empty-wrap">
        <text class="empty-icon">📋</text>
        <text class="empty-title">暂无反馈记录</text>
      </view>
      <view v-else>
        <view v-for="item in historyList" :key="item.id" class="history-card">
          <view class="hc-row">
            <view class="hc-icon-wrap">
              <text class="hc-icon">{{ item.typeIcon }}</text>
            </view>
            <view class="hc-body">
              <view class="hc-top">
                <text class="hc-title">{{ item.title }}</text>
                <text class="hc-status" :class="item.status">{{ statusLabel(item.status) }}</text>
              </view>
              <text class="hc-content">{{ item.content }}</text>
              <text class="hc-time">{{ item.time }}</text>
              <!-- 回复 -->
              <view v-if="item.reply" class="hc-reply">
                <text class="hcr-label">官方回复</text>
                <text class="hcr-text">{{ item.reply }}</text>
              </view>
              <view v-if="item.status === 'processing'" class="hc-processing">
                <text>⏳ 工作人员正在处理中，请耐心等待</text>
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

const activeTab = ref<'submit' | 'history'>('submit')
const selectedType = ref<string | null>(null)
const content = ref('')
const contact = ref('')
const images = ref<string[]>([])
const submiting = ref(false)
const submitted = ref(false)

const fbTypes = [
  { id: 'bug', label: '问题反馈', icon: '🐛' },
  { id: 'suggestion', label: '功能建议', icon: '💡' },
  { id: 'complaint', label: '投诉举报', icon: '⚠️' },
  { id: 'other', label: '其他问题', icon: '❓' },
]

const historyList = ref([
  { id: 1, type: 'bug', typeIcon: '🐛', title: '课程视频播放卡顿', content: '在观看八字入门课程时，视频经常卡顿，影响学习体验...', time: '2026-03-15', status: 'resolved', reply: '感谢反馈，我们已优化视频服务器，请再试试。' },
  { id: 2, type: 'suggestion', typeIcon: '💡', title: '建议增加离线下载功能', content: '希望能支持课程视频离线下载，方便在地铁上学习...', time: '2026-03-10', status: 'processing', reply: '' },
  { id: 3, type: 'other', typeIcon: '❓', title: '如何申请成为讲师', content: '想了解成为平台讲师的条件和流程，请给予指导。', time: '2026-02-28', status: 'resolved', reply: '您好，您可以在研究院页面查看讲师申请条件和流程。' },
])

const canSubmit = computed(() => selectedType.value && content.value.trim())

function statusLabel(s: string) {
  const m: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已解决' }
  return m[s] || s
}

function resetForm() {
  selectedType.value = null; content.value = ''; contact.value = ''; images.value = []; submitted.value = false
}

function handleSubmit() {
  if (!canSubmit.value || submiting.value) return
  submiting.value = true
  setTimeout(() => {
    submiting.value = false; submitted.value = true
    historyList.value.unshift({
      id: Date.now(),
      type: selectedType.value || 'other',
      typeIcon: fbTypes.find(t => t.id === selectedType.value)?.icon || '❓',
      title: content.value.slice(0, 30),
      content: content.value,
      time: '刚刚',
      status: 'pending',
      reply: '',
    })
  }, 1500)
}
</script>

<style scoped>
.fb-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 80rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

.tab-row { display: flex; border-bottom: 1px solid #E8E0D5; }
.tab { flex: 1; text-align: center; padding: 20rpx 0; font-size: 28rpx; color: #999; position: relative; }
.tab.active { color: #C41E3A; font-weight: 600; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.fb-content { padding: 16rpx 24rpx; }
.form-section { margin-bottom: 28rpx; }
.fs-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.required { color: #C41E3A; }

.type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.type-card { text-align: center; padding: 24rpx 12rpx; border-radius: 16rpx; border: 2rpx solid #F0EDE5; background: #fff; }
.type-card.sel { border-color: #C41E3A; background: rgba(196,30,58,0.02); }
.tc-icon { font-size: 40rpx; display: block; margin-bottom: 8rpx; }
.tc-name { font-size: 26rpx; font-weight: 500; color: #333; }

.fs-textarea { height: 200rpx; background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; color: #2C2C2C; width: 100%; box-sizing: border-box; border: 1px solid #F0EDE5; }
.fs-count { font-size: 22rpx; color: #999; text-align: right; margin-top: 8rpx; display: block; }

.img-list { display: flex; gap: 12rpx; flex-wrap: wrap; }
.img-item { width: 160rpx; height: 160rpx; border-radius: 16rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.img-del { position: absolute; top: -8rpx; right: -8rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #333; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }
.img-num { font-size: 36rpx; color: #CCC; }
.img-add { width: 160rpx; height: 160rpx; border-radius: 16rpx; border: 2rpx dashed #DDD; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.img-add-icon { font-size: 36rpx; }
.img-add-text { font-size: 18rpx; color: #999; }
.fs-hint { font-size: 20rpx; color: #BBB; margin-top: 8rpx; }

.fs-input { height: 88rpx; background: #fff; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: #2C2C2C; width: 100%; box-sizing: border-box; border: 1px solid #F0EDE5; }

.submit-btn { width: 100%; padding: 24rpx 0; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; }
.submit-btn.off { opacity: 0.5; background: #CCC; }

.submit-success { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; }
.ss-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.ss-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; }
.ss-desc { font-size: 26rpx; color: #999; margin: 12rpx 0 32rpx; }
.ss-btn { padding: 16rpx 48rpx; border-radius: 40rpx; border: 1px solid #C41E3A; color: #C41E3A; font-size: 28rpx; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 160rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 28rpx; color: #999; }

.history-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.hc-row { display: flex; gap: 16rpx; }
.hc-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 18rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hc-icon { font-size: 36rpx; }
.hc-body { flex: 1; min-width: 0; }
.hc-top { display: flex; justify-content: space-between; align-items: center; }
.hc-title { font-size: 28rpx; font-weight: 500; color: #333; }
.hc-status { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.hc-status.pending { background: #FFF3E0; color: #E65100; }
.hc-status.processing { background: #E3F2FD; color: #1565C0; }
.hc-status.resolved { background: #E8F5E9; color: #2E7D32; }
.hc-content { font-size: 24rpx; color: #777; margin-top: 8rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.hc-time { font-size: 20rpx; color: #BBB; margin-top: 8rpx; display: block; }
.hc-reply { margin-top: 16rpx; padding: 16rpx; background: rgba(196,30,58,0.03); border-radius: 12rpx; }
.hcr-label { font-size: 22rpx; color: #C41E3A; font-weight: 500; }
.hcr-text { font-size: 24rpx; color: #666; margin-top: 4rpx; display: block; line-height: 1.5; }
.hc-processing { margin-top: 16rpx; font-size: 22rpx; color: #1565C0; }
</style>
