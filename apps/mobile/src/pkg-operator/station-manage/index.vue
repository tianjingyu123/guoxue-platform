<template>
  <view class="sm-page">
    <!-- Header -->
    <view class="sm-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sm-header-inner">
        <view class="sm-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#1f1f1f" />
        </view>
        <text class="sm-title">站点管理</text>
      </view>
    </view>

    <!-- Tab bar -->
    <view class="sm-tabs" :style="{ top: statusBarHeight + 44 + 'px' }">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="sm-tab"
        :class="{ active: active === t.key }"
        @tap="active = t.key"
      >
        <app-icon :name="t.icon" :size="28" :color="active === t.key ? '#C41E3A' : '#9ca3af'" />
        <text class="sm-tab-txt">{{ t.label }}</text>
      </view>
    </view>

    <view class="sm-body">
      <!-- 基本信息 -->
      <view v-if="active === 'basic'" class="sm-section">
        <view v-for="f in basicFields" :key="f.key" class="sm-field">
          <text class="sm-label">{{ f.label }}</text>
          <input class="sm-input" v-model="basic[f.key]" />
        </view>
        <view class="sm-field">
          <text class="sm-label">站点介绍</text>
          <textarea class="sm-textarea" v-model="basic.intro" />
        </view>

        <text class="sm-group-title">功能开关</text>
        <view class="sm-switch-card">
          <view v-for="f in featureItems" :key="f.key" class="sm-switch-row">
            <text class="sm-switch-label">{{ f.label }}</text>
            <view class="sm-switch" :class="{ on: features[f.key] }" @tap="features[f.key] = !features[f.key]">
              <view class="sm-switch-knob" :class="{ on: features[f.key] }" />
            </view>
          </view>
        </view>

        <text class="sm-group-title">高级功能</text>
        <!-- FeatureGate 内联卡 -->
        <view class="sm-gate" :class="{ reviewing: liveStatus === 'reviewing' }" @tap="onGateClick">
          <view class="sm-gate-icon">
            <app-icon name="shopping-bag" :size="40" color="#C41E3A" />
          </view>
          <view class="sm-gate-main">
            <view class="sm-gate-head">
              <text class="sm-gate-label">电商直播</text>
              <app-icon v-if="liveStatus === 'approved'" name="check" :size="26" color="#3D7A5C" />
            </view>
            <text class="sm-gate-desc">{{ gateDesc }}</text>
          </view>
          <view class="sm-badge" :class="liveStatus">
            <app-icon v-if="liveStatus === 'reviewing'" name="clock" :size="22" color="#C9A96E" />
            <app-icon v-else-if="liveStatus === 'approved'" name="check" :size="22" color="#3D7A5C" />
            <app-icon v-else-if="liveStatus === 'rejected'" name="alert-circle" :size="22" color="#C41E3A" />
            <app-icon v-else name="chevron-right" :size="22" color="#9ca3af" />
            <text class="sm-badge-txt">{{ gateBadgeLabel }}</text>
          </view>
        </view>
      </view>

      <!-- 域名功能 -->
      <view v-else-if="active === 'domain'" class="sm-section">
        <view class="sm-field">
          <text class="sm-label">自定义域名</text>
          <view class="sm-domain-row">
            <input class="sm-input sm-domain-input" v-model="domain.custom" placeholder="example.com" />
            <view class="sm-verify-btn"><text class="sm-verify-txt">验证</text></view>
          </view>
          <text class="sm-hint">请将 CNAME 记录指向 cname.rebu.com</text>
        </view>
        <view class="sm-ssl-card">
          <view class="sm-ssl-info">
            <text class="sm-ssl-title">SSL 证书</text>
            <text class="sm-ssl-desc">自动签发 HTTPS 证书</text>
          </view>
          <view class="sm-switch" :class="{ on: domain.ssl }" @tap="domain.ssl = !domain.ssl">
            <view class="sm-switch-knob" :class="{ on: domain.ssl }" />
          </view>
        </view>
        <view class="sm-addr-card">
          <text class="sm-addr-title">当前访问地址</text>
          <text class="sm-addr-url">https://rebu.com/s/station001</text>
        </view>
      </view>

      <!-- 通知设置 -->
      <view v-else-if="active === 'notify'" class="sm-switch-card sm-notify">
        <view v-for="n in notifyItems" :key="n.key" class="sm-notify-row">
          <view class="sm-notify-info">
            <text class="sm-switch-label">{{ n.label }}</text>
            <text class="sm-notify-desc">{{ n.desc }}</text>
          </view>
          <view class="sm-switch" :class="{ on: notify[n.key] }" @tap="notify[n.key] = !notify[n.key]">
            <view class="sm-switch-knob" :class="{ on: notify[n.key] }" />
          </view>
        </view>
      </view>

      <!-- 安全设置 -->
      <view v-else class="sm-section">
        <view v-for="item in securityItems" :key="item.label" class="sm-sec-row">
          <app-icon :name="item.icon" :size="32" color="#C41E3A" />
          <text class="sm-sec-label">{{ item.label }}</text>
          <app-icon name="chevron-right" :size="28" color="#9ca3af" />
        </view>
        <view class="sm-danger">
          <text class="sm-danger-title">危险操作</text>
          <text class="sm-danger-desc">以下操作不可撤销，请谨慎操作</text>
          <view class="sm-danger-btn"><text class="sm-danger-btn-txt">申请注销站点</text></view>
        </view>
      </view>
    </view>

    <!-- 保存栏 -->
    <view v-if="active !== 'security'" class="sm-savebar">
      <view class="sm-save-btn" :class="{ saved }" @tap="handleSave">
        <app-icon v-if="saving" name="loader-2" :size="28" color="#ffffff" class="sm-spin" />
        <text class="sm-save-txt">{{ saving ? '保存中…' : saved ? '保存成功' : '保存设置' }}</text>
      </view>
    </view>

    <!-- 申请开通弹窗 -->
    <view v-if="showApply" class="sm-modal-mask" @tap="showApply = false">
      <view class="sm-modal" @tap.stop>
        <view class="sm-modal-bar" />
        <view class="sm-modal-head">
          <text class="sm-modal-title">申请开通电商直播</text>
          <view @tap="showApply = false"><app-icon name="x" :size="36" color="#9ca3af" /></view>
        </view>
        <text class="sm-modal-desc">开通后可在分站发起电商带货直播</text>
        <text class="sm-modal-label">申请理由 <text class="sm-req">*</text></text>
        <textarea class="sm-modal-textarea" v-model="applyReason" placeholder="请简要说明开通该功能的用途与计划" />
        <text class="sm-modal-label">补充说明</text>
        <textarea class="sm-modal-textarea sm-modal-textarea-sm" v-model="applyNote" placeholder="选填，可补充圈子运营情况等" />
        <view class="sm-modal-tip">
          <app-icon name="sparkles" :size="28" color="#C9A96E" />
          <text class="sm-modal-tip-txt">满足运营条件的圈子将自动通过审核，预计审核时长 3-5 个工作日。</text>
        </view>
        <view class="sm-modal-submit" :class="{ disabled: !applyReason.trim() || submitting }" @tap="submitApply">
          <text class="sm-modal-submit-txt">{{ submitting ? '提交中...' : '提交申请' }}</text>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { navigateTo } from '@/utils/router'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

const active = ref<'basic' | 'domain' | 'notify' | 'security'>('basic')
const saving = ref(false)
const saved = ref(false)

const tabs = [
  { key: 'basic', label: '基本信息', icon: 'settings' },
  { key: 'domain', label: '域名功能', icon: 'globe' },
  { key: 'notify', label: '通知设置', icon: 'bell' },
  { key: 'security', label: '安全设置', icon: 'shield' },
] as const

const basic = reactive<Record<string, string>>({
  name: '儒布命理文化站',
  slogan: '传承国学智慧，点亮人生方向',
  intro: '专注于传统命理文化传播与学习，汇聚百位名师，覆盖八字、紫微、风水等多个领域。',
  contactEmail: 'admin@station.com',
  contactPhone: '138-0000-1234',
})
const basicFields = [
  { label: '站点名称', key: 'name' },
  { label: '站点标语', key: 'slogan' },
  { label: '联系邮箱', key: 'contactEmail' },
  { label: '联系电话', key: 'contactPhone' },
]

const features = reactive<Record<string, boolean>>({ comment: true, share: true, community: true, ai: false, offline: true })
const featureItems = [
  { key: 'comment', label: '评论功能' },
  { key: 'share', label: '分享功能' },
  { key: 'community', label: '圈子社区' },
  { key: 'ai', label: 'AI 助手（Beta）' },
  { key: 'offline', label: '线下活动' },
]

const domain = reactive({ custom: 'minglijia.com', ssl: true })

const notify = reactive<Record<string, boolean>>({ newUser: true, newOrder: true, newReview: false, lowStock: true })
const notifyItems = [
  { key: 'newUser', label: '新用户注册', desc: '有新用户加入站点时通知' },
  { key: 'newOrder', label: '新订单提醒', desc: '有用户下单时通知' },
  { key: 'newReview', label: '新评价通知', desc: '有用户发表评价时通知' },
  { key: 'lowStock', label: '库存预警', desc: '商品剩余库存不足时通知' },
]

const securityItems = [
  { label: '修改登录密码', icon: 'shield' },
  { label: '绑定双重验证', icon: 'shield' },
  { label: '操作日志', icon: 'file-text' },
  { label: '数据备份与导出', icon: 'file-text' },
]

// FeatureGate 电商直播
const liveStatus = ref<'not_applied' | 'reviewing' | 'approved' | 'rejected'>('not_applied')
const showApply = ref(false)
const applyReason = ref('')
const applyNote = ref('')
const submitting = ref(false)

const gateDesc = computed(() => {
  if (liveStatus.value === 'reviewing') return '审核中 · 预计 3-5 个工作日'
  if (liveStatus.value === 'rejected') return '申请未通过，点击查看原因'
  if (liveStatus.value === 'approved') return '已开通，点击进入'
  return '开通后可在分站发起电商带货直播'
})
const gateBadgeLabel = computed(() => {
  return { not_applied: '申请开通', reviewing: '审核中', approved: '已开通', rejected: '已驳回' }[liveStatus.value]
})

function onGateClick() {
  if (liveStatus.value === 'approved') { navigateTo('/pkg-operator/station-live/index'); return }
  if (liveStatus.value === 'reviewing') return
  showApply.value = true
}
async function submitApply() {
  if (!applyReason.value.trim() || submitting.value) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 800))
  submitting.value = false
  liveStatus.value = 'reviewing'
  showApply.value = false
}

function handleSave() {
  if (saving.value) return
  saving.value = true
  setTimeout(() => {
    saving.value = false
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  }, 900)
}

function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }
</script>

<style scoped lang="scss">
.sm-page { min-height: 100vh; background: #f7f7f7; }

.sm-header { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #ededed; }
.sm-header-inner { height: 88rpx; display: flex; align-items: center; padding: 0 24rpx; gap: 24rpx; }
.sm-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.sm-title { font-size: 32rpx; font-weight: 600; color: #1f1f1f; }

.sm-tabs { position: sticky; z-index: 19; display: flex; background: #fff; border-bottom: 1rpx solid #ededed; }
.sm-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 24rpx 0; border-bottom: 4rpx solid transparent; }
.sm-tab.active { border-bottom-color: #C41E3A; }
.sm-tab-txt { font-size: 24rpx; font-weight: 500; color: #9ca3af; }
.sm-tab.active .sm-tab-txt { color: #C41E3A; }

.sm-body { padding: 32rpx 32rpx 220rpx; }
.sm-section { display: flex; flex-direction: column; gap: 32rpx; }

.sm-field { display: flex; flex-direction: column; }
.sm-label { font-size: 24rpx; font-weight: 500; color: #1f1f1f; margin-bottom: 12rpx; }
.sm-input { height: 72rpx; padding: 0 24rpx; background: #fff; border: 1rpx solid #e5e5e5; border-radius: 16rpx; font-size: 28rpx; color: #1f1f1f; }
.sm-textarea { width: 100%; min-height: 180rpx; padding: 16rpx 24rpx; background: #fff; border: 1rpx solid #e5e5e5; border-radius: 16rpx; font-size: 28rpx; color: #1f1f1f; box-sizing: border-box; }

.sm-group-title { font-size: 24rpx; font-weight: 600; color: #1f1f1f; padding-top: 8rpx; }
.sm-switch-card { background: #fff; border: 1rpx solid #ededed; border-radius: 20rpx; }
.sm-switch-row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.sm-switch-row:last-child { border-bottom: none; }
.sm-switch-label { font-size: 28rpx; color: #1f1f1f; }

.sm-switch { width: 88rpx; height: 48rpx; border-radius: 24rpx; background: #d1d5db; position: relative; transition: background .2s; flex-shrink: 0; }
.sm-switch.on { background: #C41E3A; }
.sm-switch-knob { position: absolute; top: 4rpx; left: 4rpx; width: 40rpx; height: 40rpx; background: #fff; border-radius: 50%; box-shadow: 0 2rpx 6rpx rgba(0,0,0,.15); transition: left .2s; }
.sm-switch-knob.on { left: 44rpx; }

/* FeatureGate */
.sm-gate { display: flex; align-items: center; gap: 24rpx; padding: 32rpx; background: #fff; border: 1rpx solid #ededed; border-radius: 20rpx; }
.sm-gate.reviewing { opacity: .6; }
.sm-gate-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: #f3f3f3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sm-gate-main { flex: 1; min-width: 0; }
.sm-gate-head { display: flex; align-items: center; gap: 12rpx; }
.sm-gate-label { font-size: 28rpx; font-weight: 500; color: #1f1f1f; }
.sm-gate-desc { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.sm-badge { display: flex; align-items: center; gap: 6rpx; padding: 8rpx 20rpx; border-radius: 999rpx; flex-shrink: 0; background: #f3f3f3; }
.sm-badge.reviewing { background: rgba(201,169,110,.1); }
.sm-badge.approved { background: rgba(61,122,92,.1); }
.sm-badge.rejected { background: rgba(196,30,58,.1); }
.sm-badge-txt { font-size: 22rpx; color: #6b7280; }
.sm-badge.reviewing .sm-badge-txt { color: #C9A96E; }
.sm-badge.approved .sm-badge-txt { color: #3D7A5C; }
.sm-badge.rejected .sm-badge-txt { color: #C41E3A; }

/* Domain */
.sm-domain-row { display: flex; gap: 16rpx; }
.sm-domain-input { flex: 1; }
.sm-verify-btn { padding: 0 28rpx; height: 72rpx; display: flex; align-items: center; background: #C41E3A; border-radius: 16rpx; }
.sm-verify-txt { font-size: 24rpx; color: #fff; }
.sm-hint { font-size: 22rpx; color: #999; margin-top: 12rpx; }
.sm-ssl-card { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: #fff; border: 1rpx solid #ededed; border-radius: 20rpx; }
.sm-ssl-title { font-size: 28rpx; color: #1f1f1f; }
.sm-ssl-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.sm-addr-card { padding: 24rpx; background: #f0f0f0; border-radius: 20rpx; }
.sm-addr-title { font-size: 22rpx; font-weight: 500; color: #1f1f1f; margin-bottom: 8rpx; display: block; }
.sm-addr-url { font-size: 22rpx; color: #C41E3A; font-family: monospace; }

/* Notify */
.sm-notify-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.sm-notify-row:last-child { border-bottom: none; }
.sm-notify-info { flex: 1; }
.sm-notify-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

/* Security */
.sm-sec-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #fff; border: 1rpx solid #ededed; border-radius: 20rpx; }
.sm-sec-label { font-size: 28rpx; color: #1f1f1f; flex: 1; }
.sm-danger { padding: 24rpx; margin-top: 8rpx; background: rgba(196,30,58,.05); border: 1rpx solid rgba(196,30,58,.2); border-radius: 20rpx; }
.sm-danger-title { font-size: 28rpx; font-weight: 600; color: #C41E3A; margin-bottom: 8rpx; display: block; }
.sm-danger-desc { font-size: 22rpx; color: #999; margin-bottom: 24rpx; display: block; }
.sm-danger-btn { width: 100%; padding: 20rpx 0; display: flex; align-items: center; justify-content: center; border: 1rpx solid rgba(196,30,58,.4); border-radius: 16rpx; }
.sm-danger-btn-txt { font-size: 24rpx; color: #C41E3A; font-weight: 500; }

/* Save bar */
.sm-savebar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #ededed; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.sm-save-btn { height: 88rpx; border-radius: 20rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.sm-save-btn.saved { background: #6ed24a; }
.sm-save-txt { font-size: 28rpx; font-weight: 600; color: #fff; }
.sm-spin { animation: sm-spin 1s linear infinite; }
@keyframes sm-spin { to { transform: rotate(360deg); } }

/* Modal */
.sm-modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; }
.sm-modal { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 40rpx 40rpx 64rpx; }
.sm-modal-bar { width: 80rpx; height: 8rpx; background: #e5e5e5; border-radius: 999rpx; margin: 0 auto 32rpx; }
.sm-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.sm-modal-title { font-size: 32rpx; font-weight: 700; color: #1f1f1f; }
.sm-modal-desc { font-size: 24rpx; color: #999; margin-bottom: 32rpx; display: block; }
.sm-modal-label { font-size: 28rpx; font-weight: 500; color: #1f1f1f; margin-bottom: 12rpx; display: block; }
.sm-req { color: #C41E3A; }
.sm-modal-textarea { width: 100%; min-height: 140rpx; padding: 20rpx; border: 1rpx solid #e5e5e5; border-radius: 16rpx; font-size: 28rpx; color: #1f1f1f; box-sizing: border-box; margin-bottom: 24rpx; }
.sm-modal-textarea-sm { min-height: 100rpx; }
.sm-modal-tip { display: flex; align-items: flex-start; gap: 12rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(201,169,110,.1); margin-bottom: 32rpx; }
.sm-modal-tip-txt { font-size: 22rpx; color: #8B7355; line-height: 1.6; flex: 1; }
.sm-modal-submit { width: 100%; padding: 28rpx 0; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.sm-modal-submit.disabled { opacity: .5; }
.sm-modal-submit-txt { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
