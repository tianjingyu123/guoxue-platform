<script setup lang="ts">
/**
 * 达人咨询 · 达人列表 — V0 circle-consult-experts.html 还原（2026-07-10 批④）
 * 结构：顶栏(我的咨询) → 平台担保条 → 本圈达人卡(身份标签三类 + 服务价格明码 + 未开通不渲染)。
 * 数据：consultApi.listExperts(circleId) 真连 GET /circles/:id/experts。
 * 降级（后端缺字段·不造假）：认证徽章/头衔简介/已答数/好评率/平均回复时长均无字段→不渲染，
 *   仅展示真实 responseHours（提问响应时限）。
 * 通话：TRTC 仅 App 端，H5/小程序按 V0 做「去 App 预约」弱化按钮 → 通话预约页(booking)。
 */
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { consultApi, type ConsultExpert } from '@/lib/circle-consult-data'

const circleId = ref('')
const loading = ref(true)
const error = ref('')
const experts = ref<ConsultExpert[]>([])

/** 身份标签样式三类：圈主金实底 / 合伙人金描边 / 嘉宾灰描边 */
function roleClass(label: string) {
  if (label === '圈主') return 'owner'
  if (label === '合伙人') return 'partner'
  return 'guest'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    experts.value = await consultApi.listExperts(circleId.value)
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

/** 图文提问：跳发起付费提问页（带圈子/达人/价格/达人名） */
function goAsk(e: ConsultExpert) {
  if (!circleId.value || !e.questionPrice) return
  navigateTo(`/pkg-circle/circles/consult-ask?circleId=${circleId.value}&answererId=${e.id}&priceCoin=${e.questionPrice}&expertName=${encodeURIComponent(e.name)}&expertAvatar=${encodeURIComponent(e.avatar || '')}`)
}
/** 连麦咨询：通话预约页（App/H5 对照·预约页内分端降级） */
function goBook(e: ConsultExpert) {
  if (!circleId.value || !e.callPrice) return
  navigateTo(`/pkg-circle/circles/booking?circleId=${circleId.value}&expertId=${e.id}&name=${encodeURIComponent(e.name)}&avatar=${encodeURIComponent(e.avatar || '')}&price=${e.callPrice}`)
}
function goMyOrders() {
  navigateTo(`/pkg-circle/circles/consult-orders?circleId=${circleId.value}`)
}

onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
onMounted(load)
</script>

<template>
  <view class="ce-page">
    <!-- 顶栏 -->
    <view class="ce-topbar">
      <view class="ce-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="ce-title">达人咨询</text>
      <text class="ce-my-link" @tap="goMyOrders">我的咨询</text>
    </view>

    <!-- 平台担保：扣费前的信任基础 -->
    <view class="ce-trust">
      <app-icon name="shield" :size="28" color="#C9A96E" />
      <text class="ce-trust-t">平台金币托管：提问 48 小时未回复自动全额退还；通话预扣费用、按实际时长结算，多扣部分自动退回。</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="ce-state">
      <view class="ce-skel" /><view class="ce-skel" />
    </view>
    <view v-else-if="error" class="ce-state">
      <text class="ce-state-t">{{ error }}</text>
      <view class="ce-retry" @tap="load"><text class="ce-retry-t">重试</text></view>
    </view>
    <view v-else-if="experts.length === 0" class="ce-state">
      <text class="ce-state-t">本圈暂无开通咨询的达人</text>
    </view>

    <template v-else>
      <text class="ce-label">本圈达人 · {{ experts.length }} 位</text>

      <view v-for="e in experts" :key="e.id" class="ce-card">
        <view class="ce-head">
          <view class="ce-avatar" :class="{ 'ring-owner': roleClass(e.roleLabel) === 'owner' }">
            <image v-if="e.avatar" lazy-load class="ce-avatar-img" :src="e.avatar" mode="aspectFill" />
            <view v-else class="ce-avatar-img ce-avatar-ph"><app-icon name="user" :size="40" color="#C9A96E" /></view>
          </view>
          <view class="ce-main">
            <view class="ce-name-line">
              <text class="ce-name">{{ e.name || '达人' }}</text>
              <text class="ce-role" :class="'ce-role-' + roleClass(e.roleLabel)">{{ e.roleLabel }}</text>
            </view>
            <text v-if="e.responseHours" class="ce-stats">图文提问 <text class="ce-stats-b">{{ e.responseHours }}</text> 小时内响应</text>
          </view>
        </view>

        <!-- 服务与价格：金币计价明码；未开通的服务不渲染 -->
        <view class="ce-services">
          <view v-if="e.questionPrice" class="ce-service">
            <view class="ce-service-icon"><app-icon name="message-square" :size="34" color="#6E6E73" /></view>
            <view class="ce-service-main">
              <text class="ce-service-name">图文提问</text>
              <text class="ce-service-desc">图文详述问题{{ e.responseHours ? `，${e.responseHours} 小时内图文详答` : '，达人图文详答' }}</text>
            </view>
            <view class="ce-service-price">
              <text class="ce-price-num">{{ e.questionPrice }}</text>
              <text class="ce-price-unit"> 金币/次</text>
            </view>
            <view class="ce-btn" @tap="goAsk(e)"><text class="ce-btn-t">提问</text></view>
          </view>

          <view v-if="e.callPrice" class="ce-service">
            <view class="ce-service-icon"><app-icon name="phone" :size="34" color="#6E6E73" /></view>
            <view class="ce-service-main">
              <text class="ce-service-name">连麦咨询</text>
              <text class="ce-service-desc">一对一深度沟通，按分钟计费</text>
              <text class="ce-service-note">实时通话需在 App 内进行，网页端仅支持查看记录</text>
            </view>
            <view class="ce-service-price">
              <text class="ce-price-num">{{ e.callPrice }}</text>
              <text class="ce-price-unit"> 金币/分钟</text>
            </view>
            <view class="ce-btn ce-btn-degrade" @tap="goBook(e)"><text class="ce-btn-degrade-t">去预约</text></view>
          </view>
        </view>
      </view>

      <text class="ce-foot">达人未开通的服务不显示。所有咨询以金币结算，金币可在「个人中心 · 钱包」充值。</text>
    </template>
  </view>
</template>

<style scoped lang="scss">
.ce-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 */
.ce-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.ce-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.ce-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ce-my-link { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }

/* 担保条 */
.ce-trust {
  margin: 24rpx 32rpx 0; padding: 22rpx 28rpx;
  display: flex; align-items: flex-start; gap: 16rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.ce-trust-t { flex: 1; font-size: 24rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }

/* 三态 */
.ce-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.ce-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.ce-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.ce-retry-t { font-size: 26rpx; color: #fff; }
.ce-skel { width: 100%; height: 260rpx; border-radius: 36rpx; background: #ede7dd; }

/* 分区标签 */
.ce-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }

/* 达人卡 */
.ce-card {
  margin: 0 32rpx 24rpx; padding: 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ce-head { display: flex; gap: 24rpx; }
.ce-avatar { width: 112rpx; height: 112rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.ce-avatar.ring-owner { box-shadow: 0 0 0 3rpx var(--gold, #c9a96e); }
.ce-avatar-img { width: 112rpx; height: 112rpx; border-radius: 999rpx; }
.ce-avatar-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.ce-main { flex: 1; min-width: 0; }
.ce-name-line { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; margin-top: 6rpx; }
.ce-name { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ce-role { padding: 3rpx 14rpx; border-radius: 10rpx; font-size: 20rpx; line-height: 1.6; flex-shrink: 0; }
.ce-role-owner { background: var(--gold, #c9a96e); color: #fff; }
.ce-role-partner { border: 1rpx solid var(--gold, #c9a96e); color: var(--gold, #c9a96e); }
.ce-role-guest { border: 1rpx solid var(--separator, #ede7dd); color: var(--text-tertiary, #999); }
.ce-stats { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 8rpx; }
.ce-stats-b { color: var(--text-secondary, #6e6e73); font-weight: 600; }

/* 服务行 */
.ce-services { margin-top: 24rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.ce-service { display: flex; align-items: center; gap: 20rpx; padding: 22rpx 0; }
.ce-service + .ce-service { border-top: 1rpx solid var(--separator, #ede7dd); }
.ce-service-icon { flex-shrink: 0; display: flex; }
.ce-service-main { flex: 1; min-width: 0; }
.ce-service-name { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.ce-service-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.ce-service-note { display: block; font-size: 20rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.ce-service-price { flex-shrink: 0; text-align: right; }
.ce-price-num { font-size: 30rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.ce-price-unit { font-size: 20rpx; color: var(--text-tertiary, #999); }
.ce-btn { flex-shrink: 0; padding: 14rpx 32rpx; border-radius: 32rpx; background: var(--brand, #c41e3a); }
.ce-btn:active { opacity: 0.88; }
.ce-btn-t { font-size: 24rpx; font-weight: 600; color: #fff; }
.ce-btn-degrade { background: transparent; border: 1rpx solid var(--separator, #ede7dd); }
.ce-btn-degrade-t { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }

.ce-foot { display: block; margin: 32rpx 40rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; text-align: center; }
</style>
