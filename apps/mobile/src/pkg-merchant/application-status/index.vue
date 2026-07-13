<!--
  M3 · 商家入驻申请状态（V0 视觉稿 1:1 还原 · 阶段二）
  三态：A 审核中(pending) / B 已通过(approved) / C 已驳回(rejected)。
  真连 merchantApi.getApplication()：
    - 审核中 PENDING_REVIEW → 展示提交信息 + 等待提示，仅「返回首页」。
    - 通过   DEPOSIT_PENDING/AGREEMENT_PENDING/ACTIVE → 「去签约开通」跳 M4。
    - 驳回   REVIEW_FAILED/SUSPENDED/CLOSED → 显示驳回原因 + 「修改重提」跳 M2。
  视觉 token 同 B3：页底 #FAF8F5、朱红 #C41E3A、金 #C9A96E、绿 #2E8B57。
-->
<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="36" color="#2C2C2C" />
      </view>
      <text class="nav-ttl">申请状态</text>
      <view class="nav-refresh" :class="{ spinning: refreshing }" @tap="onRefresh">
        <AppIcon name="refresh-cw" :size="36" color="#9A9A9A" />
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">
      <text class="state-t">加载中…</text>
    </view>

    <!-- 未申请态 -->
    <view v-else-if="notApplied" class="state">
      <view class="state-ic"><AppIcon name="store" :size="80" color="#C9A96E" /></view>
      <text class="state-title serif">尚未提交入驻申请</text>
      <text class="state-t">成为平台商家，开启你的国学生意</text>
      <view class="state-btn" @tap="goApply"><text>立即入驻</text></view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="state">
      <view class="state-ic err"><AppIcon name="alert-circle" :size="80" color="#C41E3A" /></view>
      <text class="state-title serif">加载失败</text>
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="load"><text>重试</text></view>
    </view>

    <!-- 三态主体 -->
    <view v-else class="body">
      <!-- 状态图标 -->
      <view class="icon" :class="phase">
        <!-- 审核中：时钟 -->
        <AppIcon v-if="phase === 'pending'" name="clock" :size="72" color="#C9A96E" />
        <!-- 通过：勾选 -->
        <AppIcon v-else-if="phase === 'approved'" name="check-circle-2" :size="76" color="#2E8B57" />
        <!-- 驳回：叉 -->
        <AppIcon v-else name="x-circle" :size="72" color="#C41E3A" />
      </view>

      <text class="st serif">{{ headTitle }}</text>
      <text class="sd">{{ headDesc }}</text>

      <!-- 进度指示（审核中 / 通过 显示三步）-->
      <view v-if="phase !== 'rejected'" class="steps">
        <!-- 步骤1 已提交（永远 done）-->
        <view class="dot done">
          <view class="c"><AppIcon name="check" :size="24" color="#fff" /></view>
          <text class="dot-t">已提交</text>
        </view>
        <view class="line done" />
        <!-- 步骤2 审核中 -->
        <view class="dot" :class="phase === 'pending' ? 'on' : 'done'">
          <view class="c">
            <AppIcon v-if="phase === 'approved'" name="check" :size="24" color="#fff" />
            <text v-else>2</text>
          </view>
          <text class="dot-t">审核中</text>
        </view>
        <view class="line" :class="{ done: phase === 'approved' }" />
        <!-- 步骤3 已通过 -->
        <view class="dot" :class="{ done: phase === 'approved' }">
          <view class="c">
            <AppIcon v-if="phase === 'approved'" name="check" :size="24" color="#fff" />
            <text v-else>3</text>
          </view>
          <text class="dot-t">已通过</text>
        </view>
      </view>

      <!-- 信息框（审核中 / 通过）-->
      <view v-if="phase !== 'rejected'" class="infobox">
        <text v-if="phase === 'pending'" class="info-line">提交时间：{{ submitTime }}</text>
        <text v-else class="info-line">审核通过时间：{{ reviewTime }}</text>
        <text class="info-line">主体名称：{{ app?.shopName || '—' }}</text>
        <text v-if="phase === 'pending'" class="info-line">主营类目：{{ categoryText }}</text>
        <text v-else class="info-line">下一步：签署《商家合作协议》并开通店铺。</text>
      </view>

      <!-- 驳回原因框 -->
      <view v-if="phase === 'rejected'" class="reason">
        <text class="reason-b">驳回原因：</text><text class="reason-txt">{{ rejectText }}</text>
        <text class="reason-time">审核时间：{{ reviewTime }}</text>
      </view>

      <!-- 底部固定 CTA -->
      <view class="foot">
        <view v-if="phase === 'pending'" class="cta ghost" @tap="goHome"><text>返回首页</text></view>
        <view v-else-if="phase === 'approved'" class="cta" @tap="goSign"><text>去签约开通</text></view>
        <view v-else class="cta" @tap="goApply"><text>修改重提</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, reLaunch, goBack } from '@/utils/router'
import { merchantApi, categoryName, type MerchantApplication, type MerchantStatus } from '@/lib/merchant-data'

const statusBarH = ref(0)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const notApplied = ref(false)
const app = ref<MerchantApplication | null>(null)

// 后端 7 态 → V0 三态收敛
type Phase = 'pending' | 'approved' | 'rejected'
const phase = computed<Phase>(() => {
  const s: MerchantStatus = app.value?.status ?? 'PENDING_REVIEW'
  if (s === 'PENDING_REVIEW') return 'pending'
  // 审核已过（待缴费/待签约/已开通）→ 引导去签约开通
  if (s === 'DEPOSIT_PENDING' || s === 'AGREEMENT_PENDING' || s === 'ACTIVE') return 'approved'
  // REVIEW_FAILED / SUSPENDED / CLOSED → 驳回类（有原因、需修改重提）
  return 'rejected'
})

const headTitle = computed(() => {
  switch (phase.value) {
    case 'pending': return '审核中'
    case 'approved': return '审核通过'
    default: return '申请被驳回'
  }
})
const headDesc = computed(() => {
  switch (phase.value) {
    case 'pending': return '你的入驻申请已提交，平台将在 1-3 个工作日内完成审核，请耐心等待。'
    case 'approved': return '恭喜！你的入驻申请已通过审核，签署合作协议后即可开通店铺、上架商品。'
    default: return '很抱歉，你的入驻申请未通过审核，请根据原因修改后重新提交。'
  }
})

function fmtTime(v?: string | null): string {
  if (!v) return '—'
  // 兼容 ISO 字符串 → YYYY-MM-DD HH:mm
  const s = String(v)
  return s.length >= 16 ? s.slice(0, 16).replace('T', ' ') : s
}
const submitTime = computed(() => fmtTime(app.value?.createdAt))
const reviewTime = computed(() => fmtTime(app.value?.openedAt || app.value?.createdAt))
const categoryText = computed(() => {
  const ids = app.value?.categoryIds ?? []
  if (!ids.length) return '—'
  return ids.map((id) => categoryName(id)).join('、')
})
const rejectText = computed(() => app.value?.rejectReason || app.value?.remark || '请联系平台客服了解详情。')

async function load() {
  loading.value = true
  error.value = ''
  notApplied.value = false
  try {
    app.value = await merchantApi.getApplication()
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 未申请：后端 404「未找到入驻申请」→ 引导入驻
    if (/未找到|不存在|404|未申请|未登录/.test(msg)) notApplied.value = true
    else error.value = msg || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  await load()
  refreshing.value = false
}

function goHome() { reLaunch('/pages/index/index') }
function goSign() { navigateTo('/merchant/sign-agreement') } // → M4
function goApply() { navigateTo('/merchant/apply') }          // → M2

onLoad(() => {
  try {
    statusBarH.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch (e) {
    statusBarH.value = 0
  }
  load()
})
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #fff;
$red: #c41e3a;
$gold: #c9a96e;
$green: #2e8b57;
$ink: #2c2c2c;
$ink2: #6e6e73;
$ink3: #9a9a9a;
$line: #ece7e0;

.page {
  min-height: 100vh;
  background: $paper;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.nav {
  position: relative;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid $line;
  background: $paper;
  flex-shrink: 0;
}
.nav-back {
  position: absolute;
  left: 32rpx;
  width: 62rpx;
  height: 62rpx;
  border-radius: 50%;
  background: $card;
  border: 1rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-ttl {
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
}
.nav-refresh {
  position: absolute;
  right: 32rpx;
  width: 62rpx;
  height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 状态占位（加载/未申请/错误） */
.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 200rpx 80rpx 0;
}
.state-ic {
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.state-ic.err {
  background: rgba(196, 30, 58, 0.1);
}
.state-title {
  font-size: 38rpx;
  font-weight: 700;
  color: $ink;
}
.state-t {
  font-size: 26rpx;
  color: $ink2;
  text-align: center;
  line-height: 1.7;
}
.state-btn {
  margin-top: 28rpx;
  height: 92rpx;
  width: 360rpx;
  background: $red;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28);
}
.state-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

/* 三态主体 */
.body {
  flex: 1;
  position: relative;
  padding-bottom: 200rpx; /* 给底部固定 CTA 留白 */
}

/* 状态图标 */
.icon {
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  margin: 88rpx auto 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon.pending {
  background: rgba(201, 169, 110, 0.15);
}
.icon.approved {
  background: rgba(46, 139, 87, 0.12);
}
.icon.rejected {
  background: rgba(196, 30, 58, 0.1);
}

.st {
  display: block;
  text-align: center;
  font-size: 44rpx;
  font-weight: 700;
  color: $ink;
  margin-bottom: 20rpx;
}
.sd {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: $ink2;
  line-height: 1.7;
  padding: 0 88rpx;
}

/* 进度指示 */
.steps {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  margin: 56rpx 40rpx 0;
}
.dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  font-size: 22rpx;
  color: $ink3;
}
.dot .c {
  width: 52rpx;
  height: 52rpx;
  border: 3rpx solid $line;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $card;
}
.dot .c text {
  font-size: 24rpx;
  color: $ink3;
}
.dot-t {
  font-size: 22rpx;
  color: $ink3;
}
.dot.on {
  color: $ink;
}
.dot.on .c {
  background: $red;
  border-color: $red;
}
.dot.on .c text {
  color: #fff;
}
.dot.on .dot-t {
  color: $ink;
  font-weight: 600;
}
.dot.done {
  color: $ink;
}
.dot.done .c {
  background: $green;
  border-color: $green;
}
.dot.done .dot-t {
  color: $ink;
  font-weight: 600;
}
.line {
  width: 60rpx;
  height: 4rpx;
  background: $line;
  margin-bottom: 32rpx;
}
.line.done {
  background: $green;
}

/* 信息框 */
.infobox {
  margin: 44rpx 40rpx 0;
  background: $card;
  border: 1rpx solid $line;
  border-radius: 28rpx;
  padding: 28rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.info-line {
  font-size: 24rpx;
  color: $ink2;
  line-height: 1.5;
}

/* 驳回原因框 */
.reason {
  margin: 44rpx 40rpx 0;
  border: 1rpx solid rgba(196, 30, 58, 0.25);
  background: rgba(196, 30, 58, 0.04);
  border-radius: 28rpx;
  padding: 28rpx 32rpx;
  display: flex;
  flex-direction: column;
}
.reason-b {
  font-size: 26rpx;
  font-weight: 600;
  color: $red;
  line-height: 1.7;
}
.reason-txt {
  font-size: 26rpx;
  color: $ink2;
  line-height: 1.7;
}
.reason-time {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $ink3;
}

/* 底部固定 CTA */
.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 28rpx 40rpx calc(36rpx + env(safe-area-inset-bottom));
  background: $paper;
}
.cta {
  height: 100rpx;
  background: $red;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.32);
}
.cta text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}
.cta.ghost {
  background: $card;
  border: 1rpx solid $line;
  box-shadow: none;
}
.cta.ghost text {
  color: $ink2;
}
</style>
