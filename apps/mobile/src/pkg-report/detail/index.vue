<template>
  <view class="rd-page">
    <view class="rd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rd-header-row">
        <view class="rd-icon-btn press" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2B2620" />
        </view>
        <text class="rd-header-title">举报详情</text>
        <view class="rd-header-spacer" />
      </view>
    </view>

    <view v-if="loading" class="rd-state">
      <view class="rd-spinner" />
      <text class="rd-state-title">正在读取处理进度</text>
      <text class="rd-state-desc">请稍候</text>
    </view>

    <view v-else-if="loadError || !report" class="rd-state">
      <view class="rd-state-icon">
        <app-icon name="alert-triangle" :size="52" color="#B4884A" />
      </view>
      <text class="rd-state-title">{{ reportId ? '未找到该举报记录' : '举报编号缺失' }}</text>
      <text class="rd-state-desc">{{ loadError || '请从“我的举报”进入详情' }}</text>
      <view v-if="reportId" class="rd-state-btn press" @tap="loadDetail">
        <text class="rd-state-btn-text">重新加载</text>
      </view>
      <view class="rd-state-link press" @tap="goList">
        <text class="rd-state-link-text">返回我的举报</text>
      </view>
    </view>

    <scroll-view v-else scroll-y class="rd-scroll">
      <view class="rd-body">
        <view class="rd-result-card" :class="'rd-result-' + uiStatus">
          <view class="rd-result-icon" :class="'rd-result-icon-' + uiStatus">
            <app-icon :name="statusIcon" :size="58" :color="statusColor" />
          </view>
          <text class="rd-result-title">{{ resultTitle }}</text>
          <text class="rd-result-sub">{{ resultSubtitle }}</text>
        </view>

        <view class="rd-progress">
          <view class="rd-progress-item done">
            <view class="rd-progress-dot"><app-icon name="check" :size="22" color="#FFFFFF" /></view>
            <view class="rd-progress-copy">
              <text class="rd-progress-title">举报已提交</text>
              <text class="rd-progress-time">{{ formatTime(report.createdAt) }}</text>
            </view>
          </view>
          <view class="rd-progress-line" :class="{ done: uiStatus !== 'pending' }" />
          <view class="rd-progress-item" :class="{ done: uiStatus !== 'pending' }">
            <view class="rd-progress-dot">
              <app-icon :name="uiStatus === 'pending' ? 'clock' : 'check'" :size="22" :color="uiStatus === 'pending' ? '#A67A38' : '#FFFFFF'" />
            </view>
            <view class="rd-progress-copy">
              <text class="rd-progress-title">{{ uiStatus === 'pending' ? '平台核查中' : '核查已完成' }}</text>
              <text class="rd-progress-time">{{ report.processedAt ? formatTime(report.processedAt) : '请耐心等待' }}</text>
            </view>
          </view>
        </view>

        <view class="rd-card">
          <view class="rd-card-head">
            <view class="rd-card-icon">
              <app-icon :name="targetIcon" :size="30" color="#8A6A3C" />
            </view>
            <view class="rd-card-copy">
              <text class="rd-card-title">已举报的{{ targetLabel }}</text>
              <text class="rd-card-sub">对象编号 {{ shortId(report.targetId) }}</text>
            </view>
          </view>
        </view>

        <view class="rd-card">
          <text class="rd-section-title">举报信息</text>
          <view class="rd-info-row">
            <text class="rd-info-key">举报编号</text>
            <text class="rd-info-val rd-mono">{{ shortId(report.id) }}</text>
          </view>
          <view class="rd-info-row">
            <text class="rd-info-key">问题类型</text>
            <text class="rd-info-tag">{{ reasonInfo.category }}</text>
          </view>
          <view class="rd-reason">
            <text class="rd-info-key">补充说明</text>
            <text class="rd-reason-text">{{ reasonInfo.detail }}</text>
          </view>
        </view>

        <view class="rd-card">
          <view class="rd-section-head">
            <text class="rd-section-title">{{ uiStatus === 'pending' ? '核查说明' : '处理说明' }}</text>
            <view class="rd-mini-status" :class="'rd-mini-' + uiStatus">
              <text class="rd-mini-text">{{ statusText }}</text>
            </view>
          </view>
          <text class="rd-result-description">{{ resultDescription }}</text>
          <view v-if="uiStatus === 'pending'" class="rd-processing-note">
            <app-icon name="info" :size="26" color="#9A7A48" />
            <text class="rd-processing-text">一般会在 1—3 个工作日内完成核查，结果更新后会发送站内信。</text>
          </view>
        </view>

        <view class="rd-card rd-link-card press" @tap="goRules">
          <view class="rd-link-icon">
            <app-icon name="shield-check" :size="34" color="#9A6F34" />
          </view>
          <view class="rd-link-copy">
            <text class="rd-link-title">平台内容规范</text>
            <text class="rd-link-sub">了解平台如何判定与处置违规内容</text>
          </view>
          <app-icon name="chevron-right" :size="30" color="#BDB4A7" />
        </view>

        <view class="rd-feedback">
          <text class="rd-feedback-text">对处理结果有疑问？</text>
          <text class="rd-feedback-link press" @tap="goHelp">联系平台客服复核</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="report && !loading" class="rd-footer">
      <view class="rd-footer-btn press" @tap="goList">
        <text class="rd-footer-text">返回我的举报</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { reportApi, type ReportRecord } from '@/lib/report-data'

type UiStatus = 'pending' | 'processed' | 'dismissed'

const props = defineProps<{ id?: string }>()
const reportId = computed(() => String(props.id || '').trim())
const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {
  statusBarHeight.value = 0
}

const loading = ref(true)
const loadError = ref('')
const report = ref<ReportRecord | null>(null)

const TARGET_META: Record<string, { label: string; icon: string }> = {
  POST: { label: '动态', icon: 'file-text' },
  ARTICLE: { label: '文章', icon: 'file-text' },
  COMMENT: { label: '评论', icon: 'message-circle' },
  CIRCLE: { label: '圈子', icon: 'users' },
  USER: { label: '用户', icon: 'user' },
  COURSE: { label: '课程', icon: 'book-open' },
  PRODUCT: { label: '商品', icon: 'shopping-bag' },
  LIVE: { label: '直播', icon: 'radio' },
  VIDEO: { label: '短视频', icon: 'video' },
}

const uiStatus = computed<UiStatus>(() => {
  const status = String(report.value?.status || '').toUpperCase()
  if (status === 'DISMISSED' || String(report.value?.result || '').startsWith('DISMISS')) return 'dismissed'
  if (status === 'PROCESSED') return 'processed'
  return 'pending'
})

const targetMeta = computed(() => TARGET_META[String(report.value?.targetType || '').toUpperCase()] || { label: '内容', icon: 'alert-circle' })
const targetLabel = computed(() => targetMeta.value.label)
const targetIcon = computed(() => targetMeta.value.icon)
const statusIcon = computed(() => uiStatus.value === 'pending' ? 'clock' : uiStatus.value === 'dismissed' ? 'info' : 'shield-check')
const statusColor = computed(() => uiStatus.value === 'pending' ? '#A67A38' : uiStatus.value === 'dismissed' ? '#777066' : '#2F855A')
const statusText = computed(() => uiStatus.value === 'pending' ? '核查中' : uiStatus.value === 'dismissed' ? '未发现违规' : '已处理')
const resultTitle = computed(() => uiStatus.value === 'pending' ? '平台正在核查' : uiStatus.value === 'dismissed' ? '暂未发现违规' : '举报已处理')
const resultSubtitle = computed(() => uiStatus.value === 'pending' ? '已进入平台治理队列' : `完成于 ${formatTime(report.value?.processedAt || '')}`)

const reasonInfo = computed(() => {
  const raw = String(report.value?.reason || '').trim()
  const match = raw.match(/^【([^】]+)】/)
  let detail = raw.replace(/^【[^】]+】/, '').trim()
  detail = detail.split(/\n\[凭证\]/)[0].trim()
  return { category: match?.[1] || '其他问题', detail: detail || '未填写补充说明' }
})

const resultDescription = computed(() => {
  if (uiStatus.value === 'pending') return '平台已收到你的举报，正在结合内容、上下文和相关证据进行核查。'
  const raw = String(report.value?.result || '').trim()
  const actionMap: Record<string, string> = {
    DELETE_CONTENT: '经核查内容存在违规，平台已将相关内容下架。',
    BAN_USER: '经核查存在严重违规，平台已对相关账号采取处置措施。',
    WARN_USER: '平台已提醒相关用户整改，并将持续关注后续行为。',
    DISMISS: '经核查，现有信息暂不足以认定违规。',
  }
  for (const [action, fallback] of Object.entries(actionMap)) {
    if (raw === action) return fallback
    if (raw.startsWith(`${action}:`)) return raw.slice(action.length + 1).trim() || fallback
  }
  if (raw) return raw
  return uiStatus.value === 'dismissed' ? '经核查，现有信息暂不足以认定违规。' : '平台已完成核查与处理。'
})

function formatTime(value: string) {
  const d = new Date(value)
  if (!value || Number.isNaN(d.getTime())) return '时间未知'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function shortId(id: string) {
  const value = String(id || '')
  return value.length > 12 ? `${value.slice(0, 12)}…` : value
}

async function loadDetail() {
  if (!reportId.value) {
    loading.value = false
    loadError.value = '举报编号缺失，请从“我的举报”重新进入'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    report.value = await reportApi.detail(reportId.value)
  } catch (e) {
    report.value = null
    loadError.value = (e as Error)?.message || '记录可能不存在，或你无权查看'
  } finally {
    loading.value = false
  }
}

function goRules() {
  navigateTo('/content/community-rules')
}

function goHelp() {
  navigateTo('/help')
}

function goList() {
  navigateTo('/report/result')
}

function goBack() {
  navigateBack()
}

onMounted(loadDetail)
</script>

<style scoped>
.rd-page { min-height: 100vh; background: #FAF8F5; color: #2B2620; padding-bottom: calc(126rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.rd-header { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,.96); backdrop-filter: blur(18px); border-bottom: 1rpx solid rgba(99,77,49,.08); }
.rd-header-row { height: 96rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.rd-icon-btn, .rd-header-spacer { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; }
.rd-header-title { font-family: var(--font-serif); font-size: 32rpx; font-weight: 700; }
.rd-scroll { height: calc(100vh - 96rpx - 126rpx); }
.rd-body { padding: 28rpx 28rpx 44rpx; }
.rd-result-card { padding: 38rpx 30rpx; text-align: center; border-radius: 26rpx; border: 1rpx solid transparent; }
.rd-result-pending { background: linear-gradient(145deg,#FFF9E9,#FFF3D2); border-color: #F2D99A; }
.rd-result-processed { background: linear-gradient(145deg,#F0FAF4,#E3F4EA); border-color: #B9DEC7; }
.rd-result-dismissed { background: linear-gradient(145deg,#F7F6F3,#EFEEE9); border-color: #DDD9D1; }
.rd-result-icon { width: 104rpx; height: 104rpx; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 34rpx; }
.rd-result-icon-pending { background: rgba(166,122,56,.12); }
.rd-result-icon-processed { background: rgba(47,133,90,.12); }
.rd-result-icon-dismissed { background: rgba(119,112,102,.10); }
.rd-result-title { display: block; margin-top: 24rpx; font-size: 34rpx; font-weight: 700; }
.rd-result-sub { display: block; margin-top: 9rpx; font-size: 23rpx; color: #81786D; }
.rd-progress { margin: 22rpx 0; padding: 24rpx 26rpx; background: #FFF; border-radius: 22rpx; border: 1rpx solid rgba(93,71,43,.08); }
.rd-progress-item { display: flex; align-items: center; gap: 18rpx; }
.rd-progress-dot { width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; background: #F3E8D5; border: 2rpx solid #D8B879; box-sizing: border-box; }
.rd-progress-item.done .rd-progress-dot { background: #B4884A; border-color: #B4884A; }
.rd-progress-line { width: 3rpx; height: 32rpx; margin: 3rpx 0 3rpx 19rpx; background: #E8DFD2; }
.rd-progress-line.done { background: #B4884A; }
.rd-progress-copy { flex: 1; }
.rd-progress-title { display: block; font-size: 25rpx; font-weight: 600; }
.rd-progress-time { display: block; margin-top: 4rpx; font-size: 21rpx; color: #A1988C; }
.rd-card { margin-top: 18rpx; padding: 26rpx; background: #FFF; border-radius: 22rpx; border: 1rpx solid rgba(93,71,43,.08); box-shadow: 0 4rpx 18rpx rgba(76,58,35,.04); }
.rd-card-head { display: flex; align-items: center; gap: 18rpx; }
.rd-card-icon, .rd-link-icon { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 18rpx; background: #F6EFE3; }
.rd-card-copy, .rd-link-copy { flex: 1; min-width: 0; }
.rd-card-title, .rd-link-title { display: block; font-size: 27rpx; font-weight: 650; }
.rd-card-sub, .rd-link-sub { display: block; margin-top: 6rpx; font-size: 21rpx; color: #A1988C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.rd-section-title { display: block; font-size: 28rpx; font-weight: 700; }
.rd-info-row { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 22rpx 0; border-bottom: 1rpx solid #F0EBE3; }
.rd-info-key { font-size: 23rpx; color: #8A8277; }
.rd-info-val { max-width: 68%; font-size: 23rpx; color: #3D3832; text-align: right; }
.rd-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.rd-info-tag { padding: 7rpx 15rpx; border-radius: 999rpx; background: #F5ECDE; font-size: 21rpx; color: #8A6533; }
.rd-reason { padding-top: 22rpx; }
.rd-reason-text { display: block; margin-top: 12rpx; font-size: 25rpx; line-height: 1.65; color: #504A42; word-break: break-word; }
.rd-mini-status { padding: 6rpx 14rpx; border-radius: 999rpx; }
.rd-mini-pending { background: #FFF4D8; }
.rd-mini-processed { background: #E8F6EE; }
.rd-mini-dismissed { background: #EFEEEA; }
.rd-mini-text { font-size: 20rpx; color: #806536; }
.rd-result-description { display: block; margin-top: 20rpx; font-size: 25rpx; line-height: 1.72; color: #4F4941; }
.rd-processing-note { display: flex; align-items: flex-start; gap: 10rpx; margin-top: 20rpx; padding: 18rpx; border-radius: 16rpx; background: #FBF6EC; }
.rd-processing-text { flex: 1; font-size: 21rpx; line-height: 1.55; color: #81725D; }
.rd-link-card { display: flex; align-items: center; gap: 16rpx; }
.rd-feedback { display: flex; justify-content: center; gap: 8rpx; padding: 32rpx 0 10rpx; }
.rd-feedback-text, .rd-feedback-link { font-size: 22rpx; }
.rd-feedback-text { color: #A1988C; }
.rd-feedback-link { color: #9A6F34; font-weight: 600; }
.rd-footer { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom)); background: rgba(250,248,245,.96); border-top: 1rpx solid rgba(99,77,49,.08); backdrop-filter: blur(18px); }
.rd-footer-btn { height: 84rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; background: #2B2620; box-shadow: 0 8rpx 20rpx rgba(43,38,32,.16); }
.rd-footer-text { font-size: 28rpx; font-weight: 650; color: #FFF; }
.rd-state { min-height: 720rpx; padding: 80rpx 64rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.rd-state-icon { width: 116rpx; height: 116rpx; display: flex; align-items: center; justify-content: center; border-radius: 34rpx; background: #F5ECDE; }
.rd-state-title { margin-top: 28rpx; font-size: 30rpx; font-weight: 650; }
.rd-state-desc { margin-top: 12rpx; font-size: 24rpx; line-height: 1.6; color: #9C9387; }
.rd-state-btn { margin-top: 28rpx; padding: 16rpx 36rpx; border-radius: 999rpx; background: #2B2620; }
.rd-state-btn-text { font-size: 25rpx; color: #FFF; }
.rd-state-link { padding: 24rpx 30rpx; }
.rd-state-link-text { font-size: 24rpx; color: #9A6F34; }
.rd-spinner { width: 50rpx; height: 50rpx; border: 5rpx solid #E6DCCB; border-top-color: #B4884A; border-radius: 50%; animation: spin .85s linear infinite; }
.press:active { opacity: .72; transform: scale(.985); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
