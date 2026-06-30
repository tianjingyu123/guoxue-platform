<script setup lang="ts">
/**
 * 圈子达人列表（视觉层沿用原型 consult/experts；逻辑层重写为真连后端）
 * 真连 GET /circles/:id/experts：展示真实达人 + 角色 + 金币咨询价 + 响应时限。
 * 原型臆想的评分/专长标签/在线状态/咨询数后端无支撑，已去除（不造假）。
 * 三态齐全；下单(电话/图文咨询)涉及扣金币资金流程，待规则确认后接入(@data-needs)。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { consultApi, type ConsultExpert } from '@/lib/circle-consult-data'

const circleId = ref('')
const search = ref('')
const loading = ref(true)
const error = ref('')
const experts = ref<ConsultExpert[]>([])

const filtered = computed(() => {
  const s = search.value.trim()
  if (!s) return experts.value
  return experts.value.filter(e => e.name.includes(s) || e.roleLabel.includes(s))
})

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

/** 图文咨询：跳发起付费提问页（带圈子/达人/价格/达人名） */
function goAsk(e: ConsultExpert) {
  if (!circleId.value || !e.questionPrice) return
  navigateTo(`/pkg-circle/circles/consult-ask?circleId=${circleId.value}&answererId=${e.id}&priceCoin=${e.questionPrice}&expertName=${encodeURIComponent(e.name)}`)
}
/** 语音/视频通话：后端已就绪，但实时音视频需真机 TRTC SDK，本地/H5 暂不可用 */
function onCallTap() {
  uni.showToast({ title: '语音/视频通话即将在 App 端开放', icon: 'none' })
}

onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
onMounted(load)
</script>

<template>
  <view class="ce-page">
    <view class="ce-nav">
      <view class="ce-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="ce-nav-title">专家列表</text>
    </view>

    <view class="ce-body">
      <view class="ce-search">
        <app-icon name="search" :size="28" color="#999999" />
        <input v-model="search" class="ce-search-input" placeholder="搜索达人" placeholder-class="ce-ph" />
      </view>

      <!-- 三态 -->
      <view v-if="loading" class="ce-state"><text class="ce-state-t">加载中…</text></view>
      <view v-else-if="error" class="ce-state">
        <text class="ce-state-t">{{ error }}</text>
        <view class="ce-retry" @tap="load"><text class="ce-retry-t">重试</text></view>
      </view>
      <view v-else-if="filtered.length === 0" class="ce-state">
        <text class="ce-state-t">{{ search ? '没有找到相关达人' : '本圈暂无开通咨询的达人' }}</text>
      </view>

      <view v-else class="ce-list">
        <view v-for="e in filtered" :key="e.id" class="ce-card">
          <view class="ce-card-top">
            <image lazy-load class="ce-avatar" :src="e.avatar" mode="aspectFill" />
            <view class="ce-card-info">
              <view class="ce-name-row">
                <text class="ce-name">{{ e.name }}</text>
                <view class="ce-role"><text class="ce-role-t">{{ e.roleLabel }}</text></view>
              </view>
              <view v-if="e.responseHours" class="ce-resp">
                <app-icon name="clock" :size="22" color="#16A34A" />
                <text class="ce-resp-t">{{ e.responseHours }}小时内响应</text>
              </view>
            </view>
          </view>

          <view class="ce-price-row">
            <view v-if="e.questionPrice" class="ce-price"><app-icon name="message-square" :size="22" color="#999999" /><text class="ce-price-t">图文 {{ e.questionPrice }}金币/次</text></view>
            <view v-if="e.callPrice" class="ce-price"><app-icon name="phone" :size="22" color="#999999" /><text class="ce-price-t">电话 {{ e.callPrice }}金币/分钟</text></view>
          </view>

          <view class="ce-actions">
            <view v-if="e.callPrice" class="ce-btn-outline" @tap="onCallTap"><app-icon name="phone" :size="26" color="#2C2C2C" /><text class="ce-btn-outline-t">电话咨询</text></view>
            <view v-if="e.questionPrice" class="ce-btn-primary" @tap="goAsk(e)"><app-icon name="message-square" :size="26" color="#ffffff" /><text class="ce-btn-primary-t">图文咨询</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ce-page { min-height: 100vh; background: #F5F1E8; }
.ce-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.ce-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ce-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ce-body { padding: 24rpx; padding-bottom: 48rpx; }
.ce-search { display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; height: 76rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 16rpx; margin-bottom: 24rpx; }
.ce-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.ce-ph { color: #b5aea3; }
.ce-state { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.ce-state-t { font-size: 26rpx; color: #999; }
.ce-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.ce-retry-t { font-size: 26rpx; color: #fff; }
.ce-list { display: flex; flex-direction: column; gap: 20rpx; }
.ce-card { padding: 24rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.ce-card-top { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.ce-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0; }
.ce-card-info { flex: 1; min-width: 0; }
.ce-name-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 8rpx; }
.ce-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.ce-role { padding: 2rpx 14rpx; border-radius: 999rpx; background: #FBF1F2; }
.ce-role-t { font-size: 20rpx; color: var(--brand); }
.ce-resp { display: flex; align-items: center; gap: 4rpx; }
.ce-resp-t { font-size: 22rpx; color: #16A34A; }
.ce-price-row { display: flex; gap: 24rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.ce-price { display: flex; align-items: center; gap: 6rpx; }
.ce-price-t { font-size: 22rpx; color: #999; }
.ce-actions { display: flex; gap: 16rpx; }
.ce-btn-outline { flex: 1; height: 64rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ce-btn-outline-t { font-size: 26rpx; color: #2C2C2C; }
.ce-btn-primary { flex: 1; height: 64rpx; background: var(--brand); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ce-btn-primary-t { font-size: 26rpx; color: #fff; }
</style>
