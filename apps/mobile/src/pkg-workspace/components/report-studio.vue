<script setup lang="ts">
/**
 * 报告工坊（对应 V0 report-studio.tsx）
 * 报告列表（草稿/已定稿/已交付）+ 新建 + 进编辑器。
 *
 * 配额：免费版 3 份（后端闸门），超了引导开通会员——不在前端硬编数字，
 * 用后端返回的 quota，避免哪天改价改额度前端还在说旧话。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { wsApi, REPORT_TYPES, type ReportRecord } from '../lib/workspace-api'

const props = defineProps<{ initialId?: string | null }>()
const emit = defineEmits<{ (e: 'consumed'): void }>()

const TABS = [
  { key: '', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'final', label: '已定稿' },
  { key: 'delivered', label: '已交付' },
]
const STATUS_LABEL: Record<string, string> = { draft: '草稿', final: '已定稿', delivered: '已交付' }

const tab = ref('')
const keyword = ref('')
const loading = ref(true)
const failed = ref(false)
const list = ref<ReportRecord[]>([])
const quota = ref<{ used: number; limit: number | null; unlimited: boolean }>({ used: 0, limit: null, unlimited: false })

const newOpen = ref(false)
useOverlayScrollLock(() => newOpen.value)
const nType = ref(REPORT_TYPES[0].key)
const nClient = ref('')
const nBirth = ref('')
const creating = ref(false)

const quotaText = computed(() =>
  quota.value.unlimited
    ? `已存 ${quota.value.used} 份 · 会员不限`
    : `已存 ${quota.value.used} / ${quota.value.limit} 份（免费版）`,
)

async function load() {
  loading.value = true
  failed.value = false
  try {
    const res = await wsApi.listReports({ status: tab.value || undefined, keyword: keyword.value || undefined })
    list.value = res.list ?? []
    quota.value = res.quota ?? quota.value
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()
  // 从排盘页带种子进来的报告：直接进编辑器，省一次点击
  if (props.initialId) {
    openEditor(props.initialId)
    emit('consumed')
  }
})
onShow(() => {
  if (!loading.value) load()
})

function openEditor(id: string) {
  uni.navigateTo({ url: `/pkg-workspace/report/index?id=${id}` })
}

function goPro() {
  uni.navigateTo({ url: '/pkg-workspace/pro/index' })
}

async function createReport() {
  if (!nClient.value.trim()) {
    uni.showToast({ title: '请填客户称呼', icon: 'none' })
    return
  }
  const type = REPORT_TYPES.find((t) => t.key === nType.value)!
  creating.value = true
  try {
    const rec = await wsApi.createReport({
      type: type.key,
      typeLabel: type.label,
      title: `${nClient.value.trim()} · ${type.titleSuffix}`,
      clientName: nClient.value.trim(),
      clientBirth: nBirth.value || undefined,
      chapters: type.chapters.map((c) => ({ key: c.key, title: c.title, body: '' })),
    })
    newOpen.value = false
    nClient.value = ''
    nBirth.value = ''
    openEditor(rec.id)
  } catch (e: any) {
    // 配额用尽 → 后端返 403 带话术，原样透出并引导
    uni.showModal({
      title: '无法新建报告',
      content: e?.message || '创建失败',
      confirmText: '去开通',
      cancelText: '知道了',
      success: (r) => {
        if (r.confirm) uni.navigateTo({ url: '/pkg-workspace/pro/index' })
      },
    })
  } finally {
    creating.value = false
  }
}

function confirmDelete(r: ReportRecord) {
  uni.showModal({
    title: '删除报告',
    content: `确定删除「${r.title}」？删除后不可恢复。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await wsApi.deleteReport(r.id)
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

function dateText(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <view class="rs">
    <!-- 配额 + 新建 -->
    <PaperCard gold padding="lg">
      <view class="rs-top">
        <view class="rs-top-info">
          <text class="rs-top-title">报告工坊</text>
          <text class="rs-top-quota">{{ quotaText }}</text>
        </view>
        <view class="rs-new" @tap="newOpen = true">
          <AppIcon name="plus" :size="16" color="#fff" />
          <text class="rs-new-txt">新建</text>
        </view>
      </view>
      <view v-if="!quota.unlimited" class="rs-upsell" @tap="goPro">
        <AppIcon name="crown" :size="14" color="#B8860B" />
        <text class="rs-upsell-txt">开通从业者会员：报告不限份数、可生成只读链接交付客户、报告带你的品牌落款</text>
        <AppIcon name="chevron-right" :size="14" color="#B8860B" />
      </view>
    </PaperCard>

    <!-- 筛选 -->
    <view class="rs-tabs">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="rs-tab"
        :class="{ 'rs-tab--on': tab === t.key }"
        @tap="tab = t.key; load()"
      >
        <text class="rs-tab-txt" :class="{ 'rs-tab-txt--on': tab === t.key }">{{ t.label }}</text>
      </view>
    </view>

    <!-- 列表 -->
    <view v-if="loading" class="rs-skeleton" />
    <PaperCard v-else-if="!list.length" padding="lg">
      <view class="rs-empty">
        <AppIcon name="scroll-text" :size="40" color="#D5C9B8" />
        <text class="rs-empty-txt">还没有报告</text>
        <text class="rs-empty-sub">去排盘中心起个盘，在结果页点「生成报告」；或点上方「新建」手动建一份</text>
      </view>
    </PaperCard>

    <PaperCard v-else padding="none">
      <view
        v-for="(r, i) in list"
        :key="r.id"
        class="rs-item"
        :class="{ 'rs-item--line': i !== list.length - 1 }"
        @tap="openEditor(r.id)"
      >
        <view class="rs-item-main">
          <view class="rs-item-row">
            <text class="rs-item-title">{{ r.title }}</text>
            <text class="rs-item-status" :class="`rs-item-status--${r.status}`">{{ STATUS_LABEL[r.status] }}</text>
          </view>
          <view class="rs-item-meta">
            <text class="rs-item-type">{{ r.typeLabel }}</text>
            <text v-if="r.paipan?.toolLabel" class="rs-item-tool">盘面来自{{ r.paipan.toolLabel }}</text>
            <text class="rs-item-date">{{ dateText(r.updatedAt) }}</text>
          </view>
        </view>
        <view class="rs-item-del" @tap.stop="confirmDelete(r)">
          <AppIcon name="trash-2" :size="16" color="#B8AA9A" />
        </view>
      </view>
    </PaperCard>

    <view v-if="failed" class="rs-failed" @tap="load">
      <text class="rs-failed-txt">加载失败，点击重试</text>
    </view>

    <!-- 新建报告 -->
    <view v-if="newOpen" class="rs-mask" @tap="newOpen = false" @touchmove.self.prevent>
      <view class="rs-sheet" @tap.stop @touchmove.stop>
        <text class="rs-sheet-title">新建报告</text>

        <text class="rs-label">报告类型</text>
        <view class="rs-chips">
          <view
            v-for="t in REPORT_TYPES"
            :key="t.key"
            class="rs-chip"
            :class="{ 'rs-chip--on': nType === t.key }"
            @tap="nType = t.key"
          >
            <text class="rs-chip-txt" :class="{ 'rs-chip-txt--on': nType === t.key }">{{ t.label }}</text>
          </view>
        </view>

        <text class="rs-label">客户称呼</text>
        <input v-model="nClient" class="rs-input" placeholder="如：陈女士" placeholder-class="rs-ph" />

        <text class="rs-label">生辰（选填，写上 AI 解读更贴合）</text>
        <input v-model="nBirth" class="rs-input" placeholder="如：1985-07-05 06:12" placeholder-class="rs-ph" />

        <view class="rs-tip">
          <AppIcon name="info" :size="14" color="#9A8C7E" />
          <text class="rs-tip-txt">手建的报告没有盘面。想要图文并茂，请先在排盘中心起盘，再从结果页点「生成报告」。</text>
        </view>

        <view class="rs-btn" @tap="createReport">
          <text class="rs-btn-txt">{{ creating ? '创建中…' : '创建并编辑' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rs {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

.rs-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rs-top-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.rs-top-quota {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.rs-new {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: #C41E3A;
  flex-shrink: 0;
}

.rs-new-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

.rs-upsell {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 20rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: rgba(184, 134, 11, 0.08);
}

.rs-upsell-txt {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.5;
  color: #8A6914;
}

/* 筛选 */
.rs-tabs {
  display: flex;
  gap: 12rpx;
}

.rs-tab {
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  background: rgba(154, 140, 126, 0.1);
}

.rs-tab--on {
  background: #C41E3A;
}

.rs-tab-txt {
  font-size: 24rpx;
  color: #7A6C5E;
}

.rs-tab-txt--on {
  color: #fff;
  font-weight: 600;
}

/* 列表 */
.rs-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
}

.rs-item--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.rs-item-main {
  flex: 1;
  min-width: 0;
}

.rs-item-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.rs-item-title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rs-item-status {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.rs-item-status--draft {
  background: rgba(154, 140, 126, 0.14);
  color: #7A6C5E;
}

.rs-item-status--final {
  background: rgba(184, 134, 11, 0.12);
  color: #B8860B;
}

.rs-item-status--delivered {
  background: rgba(45, 122, 78, 0.12);
  color: #2D7A4E;
}

.rs-item-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}

.rs-item-type,
.rs-item-tool,
.rs-item-date {
  font-size: 21rpx;
  color: #9A8C7E;
}

.rs-item-tool {
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.06);
  color: #C41E3A;
}

.rs-item-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
}

/* 空态 */
.rs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 24rpx;
}

.rs-empty-txt {
  font-size: 28rpx;
  color: #7A6C5E;
}

.rs-empty-sub {
  font-size: 22rpx;
  line-height: 1.6;
  color: #B8AA9A;
  text-align: center;
}

.rs-skeleton {
  height: 300rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.rs-failed {
  padding: 24rpx;
  text-align: center;
}

.rs-failed-txt {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 弹层 */
.rs-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.rs-sheet {
  width: 100%;
  max-height: 84vh;
  overflow-y: auto;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #FDFAF4;
}

.rs-sheet-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.rs-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.rs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.rs-chip {
  padding: 10rpx 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 30rpx;
}

.rs-chip--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.rs-chip-txt {
  font-size: 24rpx;
  color: #3A2A1E;
}

.rs-chip-txt--on {
  color: #fff;
}

.rs-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.rs-ph {
  color: #C4B8A8;
}

.rs-tip {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 24rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.08);
}

.rs-tip-txt {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.6;
  color: #7A6C5E;
}

.rs-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-top: 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
}

.rs-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
