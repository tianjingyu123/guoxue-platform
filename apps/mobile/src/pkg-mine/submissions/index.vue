<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import { navigateTo } from '@/utils/router'
import {
  caseApi,
  pillarsText,
  type BaziCaseItem,
} from '@/pkg-paipan/lib/case-data'

type FilterKey = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
type Contribution = BaziCaseItem & { status: string; reviewNote?: string }

const items = ref<Contribution[]>([])
const approved = ref(0)
const badge = ref<string | null>(null)
const loading = ref(true)
const loaded = ref(false)
const refreshing = ref(false)
const error = ref('')
const filter = ref<FilterKey>('ALL')

const statusMeta: Record<string, { label: string; tone: string; hint: string }> = {
  PENDING: { label: '待审核', tone: 'waiting', hint: '平台正在核验内容与授权信息' },
  APPROVED: { label: '已收录', tone: 'approved', hint: '已进入公开案例库，可继续查看案例' },
  REJECTED: { label: '未收录', tone: 'rejected', hint: '可根据审核说明整理后重新投稿' },
}

const counts = computed(() => ({
  ALL: items.value.length,
  PENDING: items.value.filter((item) => item.status === 'PENDING').length,
  APPROVED: items.value.filter((item) => item.status === 'APPROVED').length,
  REJECTED: items.value.filter((item) => item.status === 'REJECTED').length,
}))

const tabs = computed(() => [
  { key: 'ALL' as const, label: '全部', count: counts.value.ALL },
  { key: 'PENDING' as const, label: '待审核', count: counts.value.PENDING },
  { key: 'APPROVED' as const, label: '已收录', count: counts.value.APPROVED },
  { key: 'REJECTED' as const, label: '未收录', count: counts.value.REJECTED },
])

const visibleItems = computed(() =>
  filter.value === 'ALL'
    ? items.value
    : items.value.filter((item) => item.status === filter.value),
)

const emptyCopy = computed(() => {
  if (!items.value.length) {
    return {
      title: '还没有投稿记录',
      desc: '分享经过授权的真实经历，帮助同好在案例中学习与印证。',
      action: '投稿第一个案例',
    }
  }
  const label = tabs.value.find((tab) => tab.key === filter.value)?.label || '当前'
  return {
    title: `暂无${label}投稿`,
    desc: '切换其他状态查看，或继续提交新的匿名案例。',
    action: '继续投稿',
  }
})

async function load() {
  if (!loaded.value) loading.value = true
  error.value = ''
  try {
    const result = await caseApi.mine()
    items.value = result?.items ?? []
    approved.value = result?.approved ?? 0
    badge.value = result?.badge ?? null
  } catch (e) {
    error.value = (e as Error)?.message || '投稿记录加载失败，请稍后重试'
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onShow(load)
async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await load()
  } finally {
    refreshing.value = false
  }
}

function metaOf(status: string) {
  return statusMeta[status] || { label: '处理中', tone: 'waiting', hint: '请稍后查看最新审核状态' }
}

function qualityTier(quality: number) {
  if (quality >= 80) return '精品档'
  if (quality >= 50) return '良好档'
  return '基础档'
}

function genderLabel(gender: string) {
  return gender === 'female' ? '女命' : '男命'
}

function goSubmit() {
  navigateTo('/pkg-paipan/cases/submit')
}

function openCase(item: Contribution) {
  if (item.status === 'APPROVED') {
    navigateTo(`/pkg-paipan/cases/detail?id=${item.id}`)
    return
  }
  if (item.status === 'REJECTED') goSubmit()
}
</script>

<template>
  <view class="mc">
    <ToolHeader title="我的投稿" subtitle="匿名案例 · 审核进度" />

    <scroll-view
      class="mc-body"
      scroll-y
      :show-scrollbar="false"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <view v-if="loading" class="mc-skeletons">
        <view class="mc-skeleton mc-skeleton--summary" />
        <view v-for="n in 3" :key="n" class="mc-skeleton mc-skeleton--card" />
      </view>

      <PaperCard v-else-if="error" padding="lg">
        <view class="mc-state">
          <view class="mc-state-icon mc-state-icon--error">
            <AppIcon name="refresh-cw" :size="24" color="#B7483E" />
          </view>
          <text class="mc-state-title">暂时无法读取投稿记录</text>
          <text class="mc-state-desc">{{ error }}</text>
          <view class="mc-state-action" @tap="load">
            <text class="mc-state-action-txt">重新加载</text>
          </view>
        </view>
      </PaperCard>

      <template v-else>
        <PaperCard gold padding="lg">
          <view class="mc-summary">
            <view class="mc-summary-seal">
              <text class="mc-summary-seal-txt">{{ badge ? badge.slice(0, 1) : '案' }}</text>
            </view>
            <view class="mc-summary-copy">
              <text class="mc-summary-title">{{ badge || '案例贡献记录' }}</text>
              <text class="mc-summary-desc">每份投稿均匿名处理，审核通过后进入公开案例库。</text>
            </view>
            <view class="mc-summary-stat">
              <text class="mc-summary-num">{{ approved }}</text>
              <text class="mc-summary-lab">已收录</text>
            </view>
          </view>
        </PaperCard>

        <scroll-view class="mc-tabs" scroll-x :show-scrollbar="false">
          <view class="mc-tabs-inner">
            <view
              v-for="tab in tabs"
              :key="tab.key"
              class="mc-tab"
              :class="{ 'mc-tab--on': filter === tab.key }"
              @tap="filter = tab.key"
            >
              <text class="mc-tab-label" :class="{ 'mc-tab-label--on': filter === tab.key }">{{ tab.label }}</text>
              <text class="mc-tab-count" :class="{ 'mc-tab-count--on': filter === tab.key }">{{ tab.count }}</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="visibleItems.length" class="mc-list">
          <view v-for="item in visibleItems" :key="item.id" class="mc-card">
            <view class="mc-card-head">
              <view class="mc-card-heading">
                <text class="mc-card-title">{{ item.title }}</text>
                <text class="mc-card-sub">匿名投稿 · {{ genderLabel(item.gender) }}</text>
              </view>
              <view class="mc-status" :class="`mc-status--${metaOf(item.status).tone}`">
                <text class="mc-status-txt">{{ metaOf(item.status).label }}</text>
              </view>
            </view>

            <view class="mc-pillars" aria-label="四柱">
              <text class="mc-pillar">{{ item.yearPillar }}</text>
              <text class="mc-pillar">{{ item.monthPillar }}</text>
              <text class="mc-pillar mc-pillar--day">{{ item.dayPillar }}</text>
              <text class="mc-pillar">{{ item.hourPillar }}</text>
            </view>

            <view class="mc-meta-row">
              <text class="mc-meta">{{ pillarsText(item) }}</text>
              <text class="mc-tier">{{ qualityTier(item.quality) }} · {{ item.quality }} 分</text>
            </view>

            <view v-if="item.reviewNote" class="mc-note" :class="{ 'mc-note--rejected': item.status === 'REJECTED' }">
              <text class="mc-note-label">审核说明</text>
              <text class="mc-note-txt">{{ item.reviewNote }}</text>
            </view>

            <view class="mc-card-foot">
              <text class="mc-card-hint">{{ metaOf(item.status).hint }}</text>
              <view
                v-if="item.status === 'APPROVED' || item.status === 'REJECTED'"
                class="mc-card-action"
                :class="{ 'mc-card-action--secondary': item.status === 'REJECTED' }"
                @tap="openCase(item)"
              >
                <text class="mc-card-action-txt">{{ item.status === 'APPROVED' ? '查看案例' : '重新投稿' }}</text>
                <AppIcon name="chevron-right" :size="18" :color="item.status === 'APPROVED' ? '#FFFFFF' : '#9A6D2F'" />
              </view>
            </view>
          </view>
        </view>

        <PaperCard v-else padding="lg">
          <view class="mc-state">
            <view class="mc-state-icon">
              <AppIcon name="file-text" :size="28" color="#B38A4B" />
            </view>
            <text class="mc-state-title">{{ emptyCopy.title }}</text>
            <text class="mc-state-desc">{{ emptyCopy.desc }}</text>
            <view class="mc-state-action" @tap="goSubmit">
              <AppIcon name="plus" :size="18" color="#FFFFFF" />
              <text class="mc-state-action-txt">{{ emptyCopy.action }}</text>
            </view>
          </view>
        </PaperCard>

        <view class="mc-privacy">
          <AppIcon name="shield-check" :size="16" color="#6B7769" />
          <text class="mc-privacy-txt">平台不公开投稿人身份；请勿填写姓名、住址或联系方式。</text>
        </view>
      </template>

      <view class="mc-space" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.mc {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f4f1ea;
  overflow: hidden;
}

.mc-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.mc-body > view { margin-bottom: 20rpx; }

.mc-summary {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.mc-summary-seal {
  width: 82rpx;
  height: 82rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx double rgba(166, 52, 44, 0.72);
  border-radius: 14rpx 8rpx 16rpx 10rpx;
  transform: rotate(-2deg);
  background: rgba(166, 52, 44, 0.05);
}

.mc-summary-seal-txt {
  font-family: var(--font-serif);
  font-size: 38rpx;
  font-weight: 700;
  color: #a6342c;
}

.mc-summary-copy { flex: 1; min-width: 0; }
.mc-summary-title {
  display: block;
  font-family: var(--font-serif);
  font-size: 30rpx;
  font-weight: 700;
  color: #2d2925;
}
.mc-summary-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.55;
  color: #786f64;
}
.mc-summary-stat { flex-shrink: 0; text-align: center; }
.mc-summary-num {
  display: block;
  font-family: var(--font-serif);
  font-size: 40rpx;
  font-weight: 700;
  color: #2d2925;
}
.mc-summary-lab { display: block; margin-top: 2rpx; font-size: 20rpx; color: #8f8579; }

.mc-tabs { width: 100%; white-space: nowrap; }
.mc-tabs-inner { display: inline-flex; gap: 10rpx; min-width: 100%; }
.mc-tab {
  min-width: 142rpx;
  height: 88rpx;
  padding: 0 18rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.68);
  border: 1rpx solid rgba(45, 41, 37, 0.08);
}
.mc-tab--on { background: #2d2925; border-color: #2d2925; }
.mc-tab-label { font-size: 24rpx; color: #746b61; }
.mc-tab-label--on { color: #fff; font-weight: 600; }
.mc-tab-count {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  box-sizing: border-box;
  font-size: 18rpx;
  line-height: 32rpx;
  text-align: center;
  color: #8c8175;
  background: rgba(45, 41, 37, 0.06);
}
.mc-tab-count--on { color: #2d2925; background: #e7d5ae; }

.mc-list { display: flex; flex-direction: column; gap: 18rpx; }
.mc-card {
  padding: 26rpx;
  border-radius: 20rpx;
  background: #fffdf9;
  border: 1rpx solid rgba(45, 41, 37, 0.09);
  box-shadow: 0 3rpx 12rpx rgba(56, 47, 38, 0.045);
}
.mc-card-head { display: flex; align-items: flex-start; gap: 18rpx; }
.mc-card-heading { flex: 1; min-width: 0; }
.mc-card-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-serif);
  font-size: 30rpx;
  font-weight: 700;
  color: #2d2925;
}
.mc-card-sub { display: block; margin-top: 6rpx; font-size: 21rpx; color: #998f83; }
.mc-status { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 10rpx; }
.mc-status--waiting { background: #f5ead3; color: #8d651f; }
.mc-status--approved { background: #e4eee5; color: #4f6f55; }
.mc-status--rejected { background: #f5e5e2; color: #a13f36; }
.mc-status-txt { font-size: 21rpx; font-weight: 600; color: inherit; }

.mc-pillars { display: flex; gap: 12rpx; margin-top: 20rpx; }
.mc-pillar {
  flex: 1;
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #f6f2ea;
  border: 1rpx solid rgba(45, 41, 37, 0.08);
  font-family: var(--font-serif);
  font-size: 27rpx;
  color: #3e3832;
}
.mc-pillar--day {
  color: #a6342c;
  font-weight: 700;
  background: rgba(166, 52, 44, 0.055);
  border-color: rgba(166, 52, 44, 0.28);
}

.mc-meta-row { display: flex; align-items: center; gap: 16rpx; margin-top: 14rpx; }
.mc-meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20rpx;
  color: #a3998d;
}
.mc-tier { flex-shrink: 0; font-size: 21rpx; color: #9a6d2f; }

.mc-note {
  margin-top: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 12rpx;
  background: #f1f5f0;
  border-left: 5rpx solid #6d846f;
}
.mc-note--rejected { background: #fbf0ee; border-left-color: #b7483e; }
.mc-note-label { display: block; font-size: 20rpx; font-weight: 600; color: #5f6f61; }
.mc-note--rejected .mc-note-label { color: #9b4038; }
.mc-note-txt { display: block; margin-top: 5rpx; font-size: 22rpx; line-height: 1.55; color: #645c54; word-break: break-all; }

.mc-card-foot {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(45, 41, 37, 0.07);
}
.mc-card-hint { flex: 1; min-width: 0; font-size: 21rpx; line-height: 1.45; color: #8d8479; }
.mc-card-action {
  flex-shrink: 0;
  min-width: 184rpx;
  height: 88rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border-radius: 44rpx;
  background: #a6342c;
}
.mc-card-action--secondary { background: #f5ead3; border: 1rpx solid #d9bf8d; }
.mc-card-action-txt { font-size: 23rpx; font-weight: 600; color: #fff; }
.mc-card-action--secondary .mc-card-action-txt { color: #9a6d2f; }

.mc-state { display: flex; flex-direction: column; align-items: center; padding: 68rpx 20rpx 52rpx; text-align: center; }
.mc-state-icon {
  width: 104rpx;
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx 14rpx 26rpx 16rpx;
  background: #f4ead5;
  transform: rotate(-2deg);
}
.mc-state-icon--error { background: #f7e9e6; }
.mc-state-title { margin-top: 24rpx; font-family: var(--font-serif); font-size: 30rpx; font-weight: 700; color: #2d2925; }
.mc-state-desc { max-width: 520rpx; margin-top: 10rpx; font-size: 23rpx; line-height: 1.65; color: #80766b; }
.mc-state-action {
  min-width: 260rpx;
  height: 88rpx;
  margin-top: 30rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 44rpx;
  background: #a6342c;
}
.mc-state-action-txt { font-size: 25rpx; font-weight: 600; color: #fff; }

.mc-privacy { display: flex; align-items: flex-start; justify-content: center; gap: 8rpx; padding: 6rpx 24rpx; }
.mc-privacy-txt { flex: 1; font-size: 21rpx; line-height: 1.55; color: #7a8178; }

.mc-skeletons { display: flex; flex-direction: column; gap: 18rpx; }
.mc-skeleton {
  border-radius: 20rpx;
  background: linear-gradient(90deg, #e9e4db 25%, #f5f1ea 50%, #e9e4db 75%);
  background-size: 200% 100%;
  animation: mc-shimmer 1.4s infinite;
}
.mc-skeleton--summary { height: 158rpx; }
.mc-skeleton--card { height: 300rpx; }
.mc-space { height: calc(40rpx + env(safe-area-inset-bottom)); }

@keyframes mc-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .mc-skeleton { animation: none; }
}
</style>
