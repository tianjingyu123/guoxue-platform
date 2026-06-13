<template>
  <view class="bc-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">发布悬赏</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="bc-body">
      <view class="notice-card">
        <text class="notice-icon">🔥</text>
        <view class="notice-text">
          <text class="notice-title">发布须知</text>
          <text class="notice-desc">悬赏发布后将冻结对应金额，采纳满意答案后自动结算。若无满意回答，到期后原路退款。</text>
        </view>
      </view>

      <view class="form-card">
        <text class="form-label">悬赏标题 <text class="required">*</text></text>
        <input v-model="title" class="form-input" :class="{ error: errors.title }" placeholder="请用一句话概括你的问题（10-50字）" maxlength="50" />
        <view class="form-bottom">
          <text v-if="errors.title" class="form-error">⚠️ {{ errors.title }}</text>
          <text v-else />
          <text class="form-count">{{ title.length }}/50</text>
        </view>
      </view>

      <view class="form-card">
        <text class="form-label">问题描述 <text class="required">*</text></text>
        <textarea v-model="description" class="form-textarea" :class="{ error: errors.description }" placeholder="详细描述你的问题，提供更多背景信息有助于获得更好的回答（20-500字）" maxlength="500" />
        <view class="form-bottom">
          <text v-if="errors.description" class="form-error">⚠️ {{ errors.description }}</text>
          <text v-else />
          <text class="form-count">{{ description.length }}/500</text>
        </view>
      </view>

      <view class="form-card">
        <text class="form-label">补充说明</text>
        <text class="form-sub">可提供出生日期、地点等具体信息（选填）</text>
        <textarea v-model="content" class="form-textarea" placeholder="补充具体信息..." maxlength="500" />
      </view>

      <view class="form-card">
        <text class="form-label">悬赏金额 <text class="required">*</text></text>
        <view class="amount-grid">
          <view v-for="a in AMOUNT_PRESETS" :key="a" class="amount-chip" :class="{ active: !isCustom && selectedAmount === a }" @click="selectedAmount = a; isCustom = false; errors.amount = ''">
            ¥{{ a }}
          </view>
        </view>
        <view class="amount-custom" :class="{ active: isCustom }" @click="isCustom = true">
          <text>自定义金额</text>
        </view>
        <view v-if="isCustom" class="amount-input-wrap" :class="{ error: errors.amount }">
          <text class="amount-yen">¥</text>
          <input v-model="customAmount" type="number" class="amount-input" placeholder="请输入金额（10-10000）" />
        </view>
        <text v-if="errors.amount" class="form-error">⚠️ {{ errors.amount }}</text>
      </view>

      <view class="form-card">
        <text class="form-label">⏰ 有效期</text>
        <view class="expire-grid">
          <view v-for="opt in EXPIRE_OPTIONS" :key="opt.value" class="expire-chip" :class="{ active: expireDays === opt.value }" @click="expireDays = opt.value">
            <text class="expire-label">{{ opt.label }}</text>
            <text class="expire-desc">{{ opt.desc }}</text>
          </view>
        </view>
      </view>

      <view class="form-card">
        <text class="form-label">🏷️ 分类标签（选填）</text>
        <view class="cat-row">
          <text v-for="cat in CATEGORY_OPTIONS" :key="cat" class="cat-chip" :class="{ active: category === cat }" @click="category = category === cat ? '' : cat">{{ cat }}</text>
        </view>
        <view v-if="tags.length > 0" class="tag-row">
          <text v-for="t in tags" :key="t" class="tag-chip" @click="tags = tags.filter(x => x !== t)">#{{ t }} ×</text>
        </view>
        <view class="tag-input-row">
          <input v-model="tagInput" class="tag-input" placeholder="添加标签（最多5个，回车确认）" :disabled="tags.length >= 5" @confirm="handleAddTag" />
          <view class="tag-add-btn" :class="{ disabled: !tagInput.trim() || tags.length >= 5 }" @click="handleAddTag"><text>添加</text></view>
        </view>
      </view>

      <view class="form-card">
        <view class="vis-row">
          <view class="vis-left">
            <view class="vis-icon" :class="{ public: isPublic }">{{ isPublic ? '🌐' : '🔒' }}</view>
            <view>
              <text class="vis-title">{{ isPublic ? '公开悬赏' : '定向悬赏' }}</text>
              <text class="vis-desc">{{ isPublic ? '所有人均可查看并回答' : '仅特定答主可查看' }}</text>
            </view>
          </view>
          <view class="vis-toggle" :class="{ on: isPublic }" @click="isPublic = !isPublic">
            <view class="vis-toggle-dot" />
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bb-summary">
        <text class="bb-tip">悬赏金额将被冻结，采纳后结算</text>
        <view class="bb-total">
          <text class="bb-coin">🪙</text>
          <text class="bb-price">¥{{ finalAmount }}</text>
        </view>
      </view>
      <view class="bb-btn" @click="handleSubmit"><text>发布悬赏</text></view>
    </view>

    <view v-if="showPayConfirm" class="modal-mask" @click="showPayConfirm = false">
      <view class="modal-card" @click.stop>
        <view class="modal-handle" />
        <text class="modal-title">确认支付</text>
        <text class="modal-desc">支付成功后将发布悬赏，悬赏金额将被冻结</text>
        <view class="modal-summary">
          <view class="ms-row"><text class="ms-label">悬赏标题</text><text class="ms-val">{{ title }}</text></view>
          <view class="ms-row"><text class="ms-label">有效期</text><text>{{ expireDays }}天</text></view>
          <view class="ms-row"><text class="ms-label">可见范围</text><text>{{ isPublic ? '公开' : '定向' }}</text></view>
          <view class="ms-divider" />
          <view class="ms-row"><text class="ms-label bold">悬赏金额</text><text class="ms-price">¥{{ finalAmount }}</text></view>
        </view>
        <view class="ms-btns">
          <view class="ms-btn primary" :class="{ disabled: loading }" @click="handleConfirmPay">
            <text v-if="loading">支付中...</text>
            <text v-else>✅ 确认支付 ¥{{ finalAmount }}</text>
          </view>
          <view class="ms-btn cancel" @click="showPayConfirm = false"><text>取消</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const AMOUNT_PRESETS = [10, 20, 50, 100, 200, 500]
const EXPIRE_OPTIONS = [
  { value: 3, label: '3天', desc: '快速解答' },
  { value: 7, label: '7天', desc: '推荐' },
  { value: 14, label: '14天', desc: '复杂问题' },
  { value: 30, label: '30天', desc: '长期悬赏' },
]
const CATEGORY_OPTIONS = ['易经周易', '风水堪舆', '八字命理', '梅花易数', '六爻预测', '紫微斗数', '面相手相', '奇门遁甲', '太乙神数', '其他']

const title = ref('')
const description = ref('')
const content = ref('')
const selectedAmount = ref(50)
const customAmount = ref('')
const isCustom = ref(false)
const expireDays = ref(7)
const category = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const isPublic = ref(true)
const showPayConfirm = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const finalAmount = computed(() => isCustom.value ? (parseInt(customAmount.value) || 0) : selectedAmount.value)

function validate() {
  const e: Record<string, string> = {}
  if (!title.value.trim()) e.title = '请填写悬赏标题'
  else if (title.value.length < 10) e.title = '标题至少10个字'
  if (!description.value.trim()) e.description = '请填写问题描述'
  else if (description.value.length < 20) e.description = '描述至少20个字'
  if (finalAmount.value < 10) e.amount = '最低悬赏金额为10元'
  if (finalAmount.value > 10000) e.amount = '最高悬赏金额为10000元'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleAddTag() {
  const t = tagInput.value.trim().replace(/^#/, '')
  if (t && !tags.value.includes(t) && tags.value.length < 5) {
    tags.value.push(t)
    tagInput.value = ''
  }
}

function handleSubmit() {
  if (!validate()) return
  showPayConfirm.value = true
}

function handleConfirmPay() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    showPayConfirm.value = false
    uni.showToast({ title: '发布成功', icon: 'success' })
    uni.navigateBack()
  }, 1000)
}
</script>

<style scoped>
.bc-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 200rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; font-family: 'Noto Serif SC', serif; }
.header-spacer { width: 56rpx; }

.bc-body { padding: 24rpx; }

.notice-card { background: #FFFBF0; border: 1px solid #F5E6C8; border-radius: 16rpx; padding: 18rpx; display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.notice-icon { font-size: 32rpx; flex-shrink: 0; }
.notice-text { flex: 1; }
.notice-title { font-size: 24rpx; font-weight: 600; color: #8B6914; display: block; margin-bottom: 4rpx; }
.notice-desc { font-size: 20rpx; color: #B8860B; line-height: 1.5; }

.form-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04); }
.form-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }
.form-sub { font-size: 20rpx; color: #999; display: block; margin-bottom: 10rpx; }
.required { color: #C41E3A; }
.form-input { background: #FAF8F5; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 24rpx; color: #333; border: 1px solid transparent; }
.form-input.error { border-color: #FF4D4F; }
.form-textarea { width: 100%; height: 160rpx; background: #FAF8F5; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 24rpx; color: #333; box-sizing: border-box; border: 1px solid transparent; }
.form-textarea.error { border-color: #FF4D4F; }
.form-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.form-error { font-size: 20rpx; color: #FF4D4F; }
.form-count { font-size: 20rpx; color: #999; margin-left: auto; }

.amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; margin-bottom: 12rpx; }
.amount-chip { padding: 18rpx 0; text-align: center; border-radius: 14rpx; font-size: 26rpx; font-weight: 600; background: #FAF8F5; border: 2px solid #E8E0D5; color: #333; }
.amount-chip.active { background: #C41E3A; border-color: #C41E3A; color: #fff; }
.amount-custom { padding: 18rpx; text-align: center; border-radius: 14rpx; font-size: 24rpx; background: #FAF8F5; border: 2px solid #E8E0D5; color: #666; margin-bottom: 10rpx; }
.amount-custom.active { background: #FFF5F5; border-color: #C41E3A; color: #C41E3A; }
.amount-input-wrap { display: flex; align-items: center; background: #FAF8F5; border-radius: 14rpx; padding: 0 18rpx; border: 1px solid transparent; }
.amount-input-wrap.error { border-color: #FF4D4F; }
.amount-yen { font-size: 24rpx; color: #999; margin-right: 8rpx; }
.amount-input { flex: 1; padding: 16rpx 0; font-size: 24rpx; color: #333; }

.expire-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.expire-chip { padding: 16rpx 0; text-align: center; border-radius: 14rpx; background: #FAF8F5; border: 2px solid #E8E0D5; }
.expire-chip.active { background: #FFF5F5; border-color: #C41E3A; }
.expire-label { font-size: 26rpx; font-weight: 600; color: #333; display: block; }
.expire-chip.active .expire-label { color: #C41E3A; }
.expire-desc { font-size: 18rpx; color: #999; display: block; margin-top: 2rpx; }

.cat-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 14rpx; }
.cat-chip { font-size: 20rpx; padding: 8rpx 16rpx; border-radius: 24rpx; background: #FAF8F5; border: 1px solid #E8E0D5; color: #666; }
.cat-chip.active { background: #C41E3A; border-color: #C41E3A; color: #fff; }
.tag-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 12rpx; }
.tag-chip { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 24rpx; background: rgba(201,169,110,0.1); border: 1px solid rgba(201,169,110,0.3); color: #C9A96E; }
.tag-input-row { display: flex; gap: 10rpx; }
.tag-input { flex: 1; background: #FAF8F5; border-radius: 14rpx; padding: 14rpx 18rpx; font-size: 22rpx; color: #333; }
.tag-add-btn { padding: 14rpx 22rpx; background: #FAF8F5; border: 1px solid #E8E0D5; border-radius: 14rpx; }
.tag-add-btn.disabled { opacity: 0.4; }
.tag-add-btn text { font-size: 24rpx; color: #666; }

.vis-row { display: flex; justify-content: space-between; align-items: center; }
.vis-left { display: flex; align-items: center; gap: 14rpx; }
.vis-icon { width: 56rpx; height: 56rpx; border-radius: 50%; background: #FAF8F5; display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.vis-icon.public { background: #F0FFF0; }
.vis-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.vis-desc { font-size: 20rpx; color: #999; display: block; }
.vis-toggle { width: 64rpx; height: 34rpx; border-radius: 17rpx; background: #E8E0D5; position: relative; transition: background 0.2s; }
.vis-toggle.on { background: #C41E3A; }
.vis-toggle-dot { width: 28rpx; height: 28rpx; border-radius: 50%; background: #fff; position: absolute; top: 3rpx; left: 3rpx; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1); }
.vis-toggle.on .vis-toggle-dot { left: 33rpx; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.bb-tip { font-size: 20rpx; color: #999; }
.bb-total { display: flex; align-items: center; gap: 6rpx; }
.bb-coin { font-size: 24rpx; }
.bb-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.bb-btn { background: #C41E3A; border-radius: 16rpx; padding: 22rpx; text-align: center; }
.bb-btn text { font-size: 30rpx; font-weight: 600; color: #fff; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.modal-card { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 28rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.modal-handle { width: 60rpx; height: 6rpx; background: #E8E0D5; border-radius: 3rpx; margin: 0 auto 24rpx; }
.modal-title { font-size: 32rpx; font-weight: 700; color: #333; text-align: center; display: block; font-family: 'Noto Serif SC', serif; }
.modal-desc { font-size: 24rpx; color: #999; text-align: center; display: block; margin: 10rpx 0 24rpx; }
.modal-summary { background: #FAF8F5; border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.ms-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; font-size: 24rpx; color: #333; }
.ms-label { color: #999; }
.ms-label.bold { color: #333; font-weight: 500; }
.ms-val { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-price { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.ms-divider { height: 1px; background: #E8E0D5; margin: 14rpx 0; }
.ms-btns { }
.ms-btn { padding: 20rpx; border-radius: 16rpx; text-align: center; margin-bottom: 12rpx; }
.ms-btn.primary { background: #C41E3A; }
.ms-btn.primary text { font-size: 28rpx; color: #fff; font-weight: 600; }
.ms-btn.primary.disabled { opacity: 0.6; }
.ms-btn.cancel { }
.ms-btn.cancel text { font-size: 26rpx; color: #999; }
</style>
