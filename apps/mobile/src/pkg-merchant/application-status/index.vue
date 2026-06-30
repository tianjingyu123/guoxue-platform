<template>
  <view class="as-page">
    <!-- 顶部导航 -->
    <view class="as-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="as-header-inner">
        <view class="as-header-left">
          <view class="as-back" @tap="go('/')">
            <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="as-title">入驻申请状态</text>
        </view>
        <view class="as-refresh" :class="{ 'as-spin': isLoading }" @tap="handleRefresh">
          <AppIcon name="refresh-cw" :size="20" color="#999" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="as-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <view class="as-body">
        <!-- Loading -->
        <view v-if="loading" class="as-state">
          <text class="as-state-txt">加载中…</text>
        </view>
        <!-- 未申请 -->
        <view v-else-if="notApplied" class="as-state">
          <AppIcon name="store" :size="48" color="#ccc" />
          <text class="as-state-title">您还未提交入驻申请</text>
          <text class="as-state-txt">成为平台商家，开启您的国学生意</text>
          <view class="as-btn as-btn-primary as-state-btn" @tap="go('/merchant/apply')">
            <text>立即入驻</text>
          </view>
        </view>
        <!-- Error -->
        <view v-else-if="error" class="as-state">
          <AppIcon name="alert-circle" :size="48" color="#dc2626" />
          <text class="as-state-title">加载失败</text>
          <text class="as-state-txt">{{ error }}</text>
          <view class="as-btn as-btn-outline as-state-btn" @tap="load">
            <text>重试</text>
          </view>
        </view>

        <template v-else>
        <!-- 状态卡片 -->
        <view class="as-status-card" :style="{ background: config.bg }">
          <view class="as-status-icon" :style="{ background: config.iconBg }">
            <AppIcon :name="config.icon" :size="40" :color="config.color" />
          </view>
          <text class="as-status-title">{{ config.title }}</text>
          <text class="as-status-desc">{{ config.desc }}</text>
          <view class="as-shop-name">
            <text class="as-shop-label">店铺名称：</text>
            <text class="as-shop-val">{{ app?.shopName }}</text>
          </view>
        </view>

        <!-- 申请进度 -->
        <view v-if="!['SUSPENDED', 'CLOSED'].includes(status)" class="as-card">
          <text class="as-card-title">申请进度</text>
          <view class="as-progress">
            <view class="as-progress-line" />
            <view class="as-progress-fill" :style="{ width: (progressIndex / (progressSteps.length - 1)) * 100 + '%' }" />
            <view v-for="(step, index) in progressSteps" :key="step.id" class="as-progress-step">
              <view class="as-progress-dot" :class="{ 'as-progress-dot-on': index <= progressIndex }">
                <AppIcon v-if="index < progressIndex" name="check-circle-2" :size="18" color="#ffffff" />
                <text v-else>{{ index + 1 }}</text>
              </view>
              <text class="as-progress-name" :class="{ 'as-progress-name-on': index === progressIndex }">{{ step.name }}</text>
            </view>
          </view>
        </view>

        <!-- 驳回原因 -->
        <view v-if="status === 'REVIEW_FAILED'" class="as-card as-card-red">
          <text class="as-block-title as-text-red">驳回原因</text>
          <text class="as-block-desc">{{ app?.rejectReason || '请联系客服了解详情' }}</text>
        </view>

        <!-- 保证金信息 -->
        <view v-if="status === 'DEPOSIT_PENDING'" class="as-card">
          <text class="as-card-title">保证金信息</text>
          <view class="as-deposit-amount">
            <text class="as-deposit-num">¥{{ depositAmountNum }}</text>
            <text class="as-deposit-cents">.00</text>
          </view>
          <text class="as-block-desc">保证金将在您退出经营时全额退还</text>
        </view>

        <!-- 暂停原因 -->
        <view v-if="status === 'SUSPENDED'" class="as-card as-card-orange">
          <text class="as-block-title as-text-orange">店铺已暂停经营</text>
          <text class="as-block-desc">{{ app?.remark || '如有疑问请联系平台客服或提交申诉。' }}</text>
        </view>

        <!-- 开店日期 -->
        <view v-if="status === 'ACTIVE'" class="as-card">
          <view class="as-row-between">
            <text class="as-block-desc">开店日期</text>
            <text class="as-row-val">{{ openDateText }}</text>
          </view>
        </view>

        <!-- 动作按钮 -->
        <view class="as-actions">
          <view v-if="status === 'PENDING_REVIEW'" class="as-btn as-btn-outline" @tap="go('/merchant/edit-application')">
            <text>修改申请</text>
          </view>
          <view v-if="status === 'REVIEW_FAILED'" class="as-btn as-btn-primary" @tap="go('/merchant/edit-application')">
            <text>修改申请</text>
          </view>
          <view v-if="status === 'DEPOSIT_PENDING'" class="as-btn as-btn-primary" @tap="go('/merchant/pay-deposit')">
            <AppIcon name="credit-card" :size="16" color="#ffffff" />
            <text>立即缴纳保证金</text>
          </view>
          <view v-if="status === 'AGREEMENT_PENDING'" class="as-btn as-btn-primary" @tap="go('/merchant/sign-agreement')">
            <AppIcon name="file-text" :size="16" color="#ffffff" />
            <text>查看协议并签署</text>
          </view>
          <view v-if="status === 'ACTIVE'" class="as-btn as-btn-primary" @tap="go('/merchant/dashboard')">
            <AppIcon name="store" :size="16" color="#ffffff" />
            <text>进入商家后台</text>
          </view>
          <template v-if="status === 'SUSPENDED'">
            <view class="as-btn as-btn-outline"><text>我要申诉</text></view>
            <view class="as-btn as-btn-ghost">
              <AppIcon name="headphones" :size="16" color="#666" />
              <text>联系客服</text>
            </view>
          </template>
          <view v-if="status === 'CLOSED'" class="as-btn as-btn-primary" @tap="go('/merchant/apply')">
            <text>重新申请入驻</text>
          </view>
        </view>

        </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi, type MerchantApplication, type MerchantStatus as Status } from '@/lib/merchant-data'

const statusConfig: Record<Status, { icon: string; color: string; bg: string; iconBg: string; title: string; desc: string }> = {
  PENDING_REVIEW: { icon: 'clock', color: '#3b82f6', bg: '#eff6ff', iconBg: '#dbeafe', title: '申请已提交，正在审核中', desc: '预计1-3个工作日完成审核' },
  REVIEW_FAILED: { icon: 'x-circle', color: '#dc2626', bg: 'rgba(220,38,38,0.05)', iconBg: 'rgba(220,38,38,0.1)', title: '审核未通过', desc: '请根据驳回原因修改后重新提交' },
  DEPOSIT_PENDING: { icon: 'alert-circle', color: '#f59e0b', bg: '#fffbeb', iconBg: '#fef3c7', title: '审核已通过，请缴纳保证金', desc: '缴纳保证金后即可签署协议' },
  AGREEMENT_PENDING: { icon: 'file-text', color: '#3b82f6', bg: '#eff6ff', iconBg: '#dbeafe', title: '保证金已到账，请签署协议', desc: '签署入驻协议后即可开通店铺' },
  ACTIVE: { icon: 'check-circle-2', color: '#22c55e', bg: '#f0fdf4', iconBg: '#dcfce7', title: '恭喜！店铺已成功开通', desc: '您可以开始上架商品了' },
  SUSPENDED: { icon: 'pause-circle', color: '#f97316', bg: '#fff7ed', iconBg: '#ffedd5', title: '店铺已暂停经营', desc: '请查看暂停原因并进行申诉' },
  CLOSED: { icon: 'ban', color: '#999', bg: '#f5f5f5', iconBg: '#eeeeee', title: '店铺已关闭', desc: '如需继续经营，请重新申请入驻' },
}

const progressSteps = [
  { id: 'submit', name: '已提交' },
  { id: 'review', name: '审核中' },
  { id: 'deposit', name: '待缴费' },
  { id: 'agreement', name: '待签署' },
  { id: 'active', name: '已开通' },
]

const app = ref<MerchantApplication | null>(null)
const loading = ref(true)
const error = ref('')
const notApplied = ref(false)
const isLoading = ref(false) // 顶部刷新动画
const statusBarHeight = ref(0)

const status = computed<Status>(() => app.value?.status ?? 'PENDING_REVIEW')
const config = computed(() => statusConfig[status.value])
const depositAmountNum = computed(() => Math.round(Number(app.value?.depositAmount ?? 0)))
const openDateText = computed(() => (app.value?.openedAt ? String(app.value.openedAt).slice(0, 10) : ''))

const progressIndex = computed(() => {
  switch (status.value) {
    case 'PENDING_REVIEW': return 1
    case 'REVIEW_FAILED': return 1
    case 'DEPOSIT_PENDING': return 2
    case 'AGREEMENT_PENDING': return 3
    case 'ACTIVE': return 4
    default: return 0
  }
})

async function load() {
  loading.value = true
  error.value = ''
  notApplied.value = false
  try {
    app.value = await merchantApi.getApplication()
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 未提交过申请：后端返回「未找到入驻申请」→ 引导去入驻
    if (msg.includes('未找到') || msg.includes('不存在') || msg.includes('未登录')) notApplied.value = true
    else error.value = msg || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  if (isLoading.value) return
  isLoading.value = true
  await load()
  isLoading.value = false
}

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.as-page { min-height: 100vh; background: #f5f5f5; }

.as-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.as-header-inner { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 16px; }
.as-header-left { display: flex; align-items: center; }
.as-back { margin-right: 12px; }
.as-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.as-refresh { padding: 4px; }
.as-spin { animation: as-spin 1s linear infinite; }
@keyframes as-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.as-scroll { height: 100vh; box-sizing: border-box; }
.as-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

/* 状态卡片 */
.as-status-card { border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.as-status-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.as-status-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.as-status-desc { font-size: 14px; color: #999; }
.as-shop-name { margin-top: 16px; padding: 8px 16px; background: rgba(255,255,255,0.7); border-radius: 8px; }
.as-shop-label { font-size: 14px; color: #999; }
.as-shop-val { font-size: 14px; font-weight: 500; color: #1a1a1a; }

/* Card */
.as-card { background: #fff; border-radius: 12px; padding: 16px; }
.as-card-red { background: rgba(220,38,38,0.05); }
.as-card-orange { background: #fff7ed; }
.as-card-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 16px; }
.as-block-title { display: block; font-size: 15px; font-weight: 500; margin-bottom: 8px; }
.as-block-desc { font-size: 14px; color: #999; line-height: 1.5; }
.as-text-red { color: #dc2626; }
.as-text-orange { color: #ea580c; }
.as-row-between { display: flex; align-items: center; justify-content: space-between; }
.as-row-val { font-size: 14px; font-weight: 500; color: #1a1a1a; }

/* 进度条 */
.as-progress { position: relative; display: flex; align-items: flex-start; justify-content: space-between; }
.as-progress-line { position: absolute; top: 16px; left: 0; right: 0; height: 2px; background: #eee; }
.as-progress-fill { position: absolute; top: 16px; left: 0; height: 2px; background: var(--brand); transition: width 0.3s; }
.as-progress-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.as-progress-dot { width: 32px; height: 32px; border-radius: 50%; background: #eee; color: #999; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; }
.as-progress-dot text { color: #999; }
.as-progress-dot-on { background: var(--brand); }
.as-progress-dot-on text { color: #fff; }
.as-progress-name { font-size: 12px; color: #999; margin-top: 8px; }
.as-progress-name-on { color: var(--brand); font-weight: 500; }

/* 保证金 */
.as-deposit-amount { display: flex; align-items: baseline; margin-bottom: 8px; }
.as-deposit-num { font-size: 30px; font-weight: 700; color: var(--brand); }
.as-deposit-cents { font-size: 14px; color: #999; }

/* Actions */
.as-actions { display: flex; flex-direction: column; gap: 12px; }
.as-btn { height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.as-btn text { font-size: 16px; font-weight: 500; }
.as-btn-primary { background: var(--brand); }
.as-btn-primary text { color: #fff; }
.as-btn-outline { border: 1px solid #ddd; background: #fff; }
.as-btn-outline text { color: #1a1a1a; }
.as-btn-ghost { background: transparent; }
.as-btn-ghost text { color: #666; }
.as-btn-sm { height: 36px; }
.as-btn-sm text { font-size: 14px; }

/* 三态 */
.as-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; gap: 12px; }
.as-state-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
.as-state-txt { font-size: 14px; color: #999; text-align: center; line-height: 1.5; }
.as-state-btn { width: 200px; margin-top: 8px; }
</style>
