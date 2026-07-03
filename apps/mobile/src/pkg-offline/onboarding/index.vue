<template>
  <view class="ob-page">
    <view class="ob-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ob-nav">
        <view class="ob-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
        <text class="ob-nav-title">开业指南</text>
        <view class="ob-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="ob-body">
      <!-- 三态 -->
      <view v-if="loading" class="ob-state">
        <view class="spinner" />
        <text class="ob-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="ob-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="ob-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else-if="data">
        <!-- 欢迎 + 进度环 -->
        <view class="ob-hero">
          <view class="ob-ring" :style="ringStyle">
            <view class="ob-ring-inner">
              <text class="ob-ring-num">{{ data.progress.done }}/{{ data.progress.total }}</text>
              <text class="ob-ring-label">已完成</text>
            </view>
          </view>
          <view class="ob-hero-text">
            <text class="ob-hero-title">{{ data.stationName }}</text>
            <text class="ob-hero-sub">开业第 {{ data.openDays }} 天 · {{ heroCopy }}</text>
          </view>
        </view>

        <!-- 三阶段手风琴 -->
        <view v-for="(stage, si) in data.stages" :key="stage.key" class="ob-stage">
          <view class="ob-stage-head" @tap="toggleStage(stage.key)">
            <view class="ob-stage-no" :class="{ full: stageDone(stage) === stageTotal(stage) }">
              <text class="ob-stage-no-text">{{ si + 1 }}</text>
            </view>
            <view class="ob-stage-info">
              <text class="ob-stage-title">{{ stage.title }}</text>
              <text class="ob-stage-sub">{{ stageDone(stage) }}/{{ stageTotal(stage) }} 项完成</text>
            </view>
            <app-icon :name="expanded[stage.key] ? 'chevron-up' : 'chevron-down'" :size="18" color="#c9beb2" />
          </view>
          <view v-if="expanded[stage.key]" class="ob-items">
            <view
              v-for="item in stage.items"
              :key="item.key"
              class="ob-item"
              :class="{ done: item.done === true }"
              @tap="onItem(item)"
            >
              <app-icon
                v-if="item.done === true"
                name="check-circle" :size="20" color="#16a34a"
              />
              <app-icon
                v-else-if="item.done === null"
                name="share-2" :size="18" color="#d4a017"
              />
              <app-icon v-else name="circle" :size="20" color="#d8cfc0" />
              <text class="ob-item-title" :class="{ strike: item.done === true }">{{ item.title }}</text>
              <template v-if="item.done !== true">
                <text class="ob-item-go">{{ item.done === null ? '去分享' : '去完成' }}</text>
                <app-icon name="chevron-right" :size="14" color="#c9beb2" />
              </template>
            </view>
          </view>
        </view>

        <!-- SOP 经营手册入口 -->
        <view class="ob-sop" @tap="goSop">
          <view class="ob-sop-left">
            <view class="ob-sop-icon"><app-icon name="book-open" :size="22" color="#9a2e25" /></view>
            <view>
              <text class="ob-sop-title">SOP 经营手册</text>
              <text class="ob-sop-sub">选址装修 · 课程排期 · 获客留存的完整打法</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="18" color="#c9beb2" />
        </view>

        <view class="ob-safe" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { offlineManageApi, type OnboardingData, type OnboardingItem, type OnboardingStage } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const data = ref<OnboardingData | null>(null)
const stationId = ref('')
const expanded = reactive<Record<string, boolean>>({})

/** 进度环：conic-gradient 按完成占比着色 */
const ringStyle = computed(() => {
  const p = data.value && data.value.progress.total > 0
    ? Math.round((data.value.progress.done / data.value.progress.total) * 360)
    : 0
  return { background: `conic-gradient(#ffd9a0 0deg ${p}deg, rgba(255,255,255,0.25) ${p}deg 360deg)` }
})

const heroCopy = computed(() => {
  if (!data.value) return ''
  const { done, total } = data.value.progress
  if (done >= total) return '全部里程碑达成，经营渐入佳境！'
  if (done === 0) return '按下面三步走，把驿站开起来'
  return `还差 ${total - done} 项，继续加油`
})

function stageTotal(s: OnboardingStage) { return s.items.filter((i) => i.done !== null).length }
function stageDone(s: OnboardingStage) { return s.items.filter((i) => i.done === true).length }

function toggleStage(key: string) { expanded[key] = !expanded[key] }

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    // 进度主数据 + 我的驿站（跳转管理页需 stationId）并行；驿站兜底失败不阻塞主体
    const [ob, st] = await Promise.allSettled([
      offlineManageApi.getOnboarding(),
      offlineManageApi.getMyStation(),
    ])
    if (ob.status === 'rejected') throw ob.reason
    data.value = ob.value
    if (st.status === 'fulfilled' && st.value) stationId.value = st.value.id
    // 默认展开第一个含未完成项的阶段（全完成则展开第一阶段）
    for (const s of data.value.stages) expanded[s.key] = false
    const firstUndone = data.value.stages.find((s) => s.items.some((i) => i.done === false))
    expanded[(firstUndone || data.value.stages[0])?.key || 'setup'] = true
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

/** 清单项 → 对应管理页跳转映射（profile/share 无编辑页/站外行为 → 跳驿站主页查看与分享） */
function onItem(item: OnboardingItem) {
  if (item.done === true) return
  const sid = stationId.value
  const withSid = (path: string) => (sid ? `${path}?stationId=${sid}` : path)
  const map: Record<string, string> = {
    profile: sid ? `/pkg-offline/station-detail/index?id=${sid}` : '',
    teacher: withSid('/pkg-offline/manage-teachers/index'),
    course: withSid('/pkg-offline/manage-courses/index'),
    product: withSid('/pkg-offline/manage-products/index'),
    registration: withSid('/pkg-offline/manage-courses/index'),
    event: withSid('/pkg-offline/manage-events/index'),
    circle: withSid('/pkg-offline/manage-courses/index'),
    review: withSid('/pkg-offline/manage-checkin/index'),
    share: sid ? `/pkg-offline/station-detail/index?id=${sid}` : '',
    students10: '/pkg-offline/students/index',
    event3: withSid('/pkg-offline/manage-events/index'),
  }
  const target = map[item.key]
  if (target) navigateTo(target)
  else uni.showToast({ title: '未找到关联驿站', icon: 'none' })
}

/** SOP 经营手册：跳转手册阅读页（内容种子 legal-documents.seed.ts·type=sop_offline） */
function goSop() {
  uni.navigateTo({ url: '/pkg-offline/sop/index' })
}
</script>

<style scoped>
.ob-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.ob-header { position: sticky; top: 0; z-index: 50; background: linear-gradient(135deg, #9a2e25, #b8453a); }
.ob-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.ob-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.ob-nav-title { font-size: 17px; font-weight: 600; color: #fff; }
.ob-body { flex: 1; }

.ob-state { padding: 90px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ob-state-text { font-size: 14px; color: #6b5d4f; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

/* 欢迎 + 进度环 */
.ob-hero { margin: 12px 16px; padding: 20px 16px; background: linear-gradient(135deg, #9a2e25, #b8453a); border-radius: 14px; display: flex; align-items: center; gap: 16px; }
.ob-ring { width: 84px; height: 84px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ob-ring-inner { width: 68px; height: 68px; border-radius: 50%; background: #9f352b; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.ob-ring-num { font-size: 17px; font-weight: 700; color: #fff; }
.ob-ring-label { font-size: 10px; color: rgba(255,255,255,0.75); }
.ob-hero-text { flex: 1; min-width: 0; }
.ob-hero-title { display: block; font-size: 17px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ob-hero-sub { display: block; font-size: 12px; color: rgba(255,255,255,0.85); margin-top: 6px; line-height: 1.5; }

/* 阶段手风琴 */
.ob-stage { margin: 12px 16px; background: #fff; border-radius: 14px; overflow: hidden; }
.ob-stage-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.ob-stage-no { width: 28px; height: 28px; border-radius: 9px; background: #f3ede2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ob-stage-no.full { background: #f0fdf4; }
.ob-stage-no-text { font-size: 13px; font-weight: 700; color: #9a2e25; }
.ob-stage-no.full .ob-stage-no-text { color: #16a34a; }
.ob-stage-info { flex: 1; min-width: 0; }
.ob-stage-title { display: block; font-size: 15px; font-weight: 700; color: #2a1f1a; }
.ob-stage-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.ob-items { border-top: 1px solid #f3ede2; padding: 4px 16px 8px; }
.ob-item { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid #f7f2ea; }
.ob-item:last-child { border-bottom: none; }
.ob-item-title { flex: 1; min-width: 0; font-size: 13px; color: #2a1f1a; line-height: 1.5; }
.ob-item-title.strike { color: #9ca3af; }
.ob-item-go { font-size: 12px; color: #9a2e25; flex-shrink: 0; }

/* SOP 手册入口 */
.ob-sop { margin: 12px 16px; padding: 14px 16px; background: #fff; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; }
.ob-sop-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ob-sop-icon { width: 42px; height: 42px; border-radius: 12px; background: rgba(154,46,37,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ob-sop-title { display: block; font-size: 14px; font-weight: 600; color: #2a1f1a; }
.ob-sop-sub { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.ob-safe { height: 24px; }
</style>
