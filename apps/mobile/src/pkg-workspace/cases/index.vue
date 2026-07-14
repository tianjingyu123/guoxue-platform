<script setup lang="ts">
/**
 * 案例库（对应 V0 case-library.tsx）
 *
 * 老师的私产：做过的单子沉淀成可检索的案例。价值在「复盘时能快速翻出同类盘」——
 * 遇到相似格局，先看自己当年怎么断的、后来验没验，比翻书快，也比翻书准。
 * 所以分类 + 关键词检索是这页的骨架，不是装饰。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import { wsApi, type CaseRecord } from '../lib/workspace-api'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'bazi', label: '八字' },
  { key: 'liuyao', label: '六爻' },
  { key: 'zeji', label: '择日' },
  { key: 'fengshui', label: '风水' },
  { key: 'hehun', label: '合婚' },
]
/** 弹层里可选的分类不含「全部」——「全部」是筛选态，不是案例属性 */
const PICKABLE = CATEGORIES.filter((c) => c.key)
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(PICKABLE.map((c) => [c.key, c.label]))

const category = ref('')
const keyword = ref('')
const loading = ref(true)
const failed = ref(false)
const list = ref<CaseRecord[]>([])

const editOpen = ref(false)
const saving = ref(false)
/** 非空即编辑态，空即新建态 —— 新建与编辑共用一个弹层，字段完全一样 */
const editingId = ref<string | null>(null)
const fTitle = ref('')
const fClient = ref('')
const fCategory = ref(PICKABLE[0].key)
const fSummary = ref('')
const fTags = ref('')
const fFee = ref('')
const fDate = ref(todayDate())

function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function money(n: unknown): string {
  const v = Number(n)
  return Number.isFinite(v) ? v.toFixed(2) : '0.00'
}

function dateText(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 后端存的是 ISO，picker 只认 YYYY-MM-DD */
function toPickerDate(iso?: string): string {
  if (!iso) return todayDate()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return todayDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const res = await wsApi.listCases({
      category: category.value || undefined,
      keyword: keyword.value.trim() || undefined,
    })
    list.value = res.list ?? []
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

function pickCategory(key: string) {
  category.value = key
  load()
}

function onDateChange(e: any) {
  fDate.value = e?.detail?.value ?? fDate.value
}

function openCreate() {
  editingId.value = null
  fTitle.value = ''
  fClient.value = ''
  fCategory.value = PICKABLE[0].key
  fSummary.value = ''
  fTags.value = ''
  fFee.value = ''
  fDate.value = todayDate()
  editOpen.value = true
}

function openEdit(c: CaseRecord) {
  editingId.value = c.id
  fTitle.value = c.title
  fClient.value = c.clientName ?? ''
  fCategory.value = c.category || PICKABLE[0].key
  fSummary.value = c.summary ?? ''
  fTags.value = (c.tags ?? []).join('，')
  fFee.value = c.fee === null || c.fee === undefined ? '' : String(c.fee)
  fDate.value = toPickerDate(c.occurredAt)
  editOpen.value = true
}

async function submit() {
  if (!fTitle.value.trim()) {
    uni.showToast({ title: '请填案例标题', icon: 'none' })
    return
  }
  // 中英文逗号都吃，老师不会切输入法
  const tags = fTags.value
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
  const fee = Number(fFee.value)
  const payload: Partial<CaseRecord> = {
    title: fTitle.value.trim(),
    clientName: fClient.value.trim() || undefined,
    category: fCategory.value,
    summary: fSummary.value.trim() || undefined,
    tags,
    fee: Number.isFinite(fee) && fee > 0 ? fee : 0,
    occurredAt: fDate.value,
  }
  saving.value = true
  try {
    if (editingId.value) await wsApi.updateCase(editingId.value, payload)
    else await wsApi.createCase(payload)
    editOpen.value = false
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(c: CaseRecord) {
  uni.showModal({
    title: '删除案例',
    content: `确定删除「${c.title}」？删除后不可恢复。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await wsApi.deleteCase(c.id)
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<template>
  <view class="cs-page">
    <ToolHeader title="案例库" subtitle="沉淀 · 复盘 · 翻旧盘" back-href="/pkg-workspace/index/index" />

    <view class="cs">
      <!-- 搜索 + 新建 -->
      <PaperCard gold padding="lg">
        <view class="cs-top">
          <view class="cs-search">
            <AppIcon name="search" :size="16" color="#9A8C7E" />
            <input
              v-model="keyword"
              class="cs-search-input"
              placeholder="搜标题 / 客户 / 标签"
              placeholder-class="cs-ph"
              confirm-type="search"
              @confirm="load"
            />
            <view v-if="keyword" class="cs-clear" @tap="keyword = ''; load()">
              <AppIcon name="x" :size="14" color="#B8AA9A" />
            </view>
          </view>
          <view class="cs-new" @tap="openCreate">
            <AppIcon name="plus" :size="16" color="#fff" />
            <text class="cs-new-txt">新建</text>
          </view>
        </view>
      </PaperCard>

      <!-- 分类 -->
      <scroll-view class="cs-tabs" scroll-x :show-scrollbar="false">
        <view class="cs-tabs-inner">
          <view
            v-for="c in CATEGORIES"
            :key="c.key"
            class="cs-tab"
            :class="{ 'cs-tab--on': category === c.key }"
            @tap="pickCategory(c.key)"
          >
            <text class="cs-tab-txt" :class="{ 'cs-tab-txt--on': category === c.key }">{{ c.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 列表 -->
      <view v-if="loading" class="cs-skeleton" />

      <PaperCard v-else-if="!list.length" padding="lg">
        <view class="cs-empty">
          <AppIcon name="book-marked" :size="40" color="#D5C9B8" />
          <text class="cs-empty-txt">还没有沉淀案例</text>
          <text class="cs-empty-sub">把做过的单子记下来，复盘时能快速翻出同类盘</text>
        </view>
      </PaperCard>

      <template v-else>
        <PaperCard v-for="c in list" :key="c.id" padding="lg">
          <view class="cs-card" @tap="openEdit(c)" @longpress="confirmDelete(c)">
            <view class="cs-card-head">
              <text class="cs-card-title">{{ c.title }}</text>
              <view class="cs-card-del" @tap.stop="confirmDelete(c)">
                <AppIcon name="trash-2" :size="16" color="#B8AA9A" />
              </view>
            </view>

            <view class="cs-card-meta">
              <text class="cs-card-cat">{{ CATEGORY_LABEL[c.category] || c.category }}</text>
              <text v-if="c.clientName" class="cs-card-client">{{ c.clientName }}</text>
              <text class="cs-card-date">{{ dateText(c.occurredAt) }}</text>
            </view>

            <text v-if="c.summary" class="cs-card-summary">{{ c.summary }}</text>

            <view class="cs-card-foot">
              <view class="cs-tags">
                <view v-for="t in c.tags" :key="t" class="cs-tag">
                  <AppIcon name="tag" :size="12" color="#8A6914" />
                  <text class="cs-tag-txt">{{ t }}</text>
                </view>
              </view>
              <text class="cs-card-fee">¥{{ money(c.fee) }}</text>
            </view>
          </view>
        </PaperCard>
      </template>

      <view v-if="failed" class="cs-failed" @tap="load">
        <text class="cs-failed-txt">加载失败，点击重试</text>
      </view>
    </view>

    <!-- 新建 / 编辑 -->
    <view v-if="editOpen" class="cs-mask" @tap="editOpen = false">
      <view class="cs-sheet" @tap.stop>
        <text class="cs-sheet-title">{{ editingId ? '编辑案例' : '新建案例' }}</text>

        <text class="cs-label">案例标题</text>
        <input v-model="fTitle" class="cs-input" placeholder="如：庚金身弱 · 转行择时" placeholder-class="cs-ph" />

        <text class="cs-label">客户称呼（选填）</text>
        <input v-model="fClient" class="cs-input" placeholder="如：陈女士" placeholder-class="cs-ph" />

        <text class="cs-label">分类</text>
        <view class="cs-chips">
          <view
            v-for="c in PICKABLE"
            :key="c.key"
            class="cs-chip"
            :class="{ 'cs-chip--on': fCategory === c.key }"
            @tap="fCategory = c.key"
          >
            <text class="cs-chip-txt" :class="{ 'cs-chip-txt--on': fCategory === c.key }">{{ c.label }}</text>
          </view>
        </view>

        <text class="cs-label">断语摘要（选填）</text>
        <textarea
          v-model="fSummary"
          class="cs-textarea"
          placeholder="当时怎么断的、后来验没验，写清楚，将来翻出来才有用"
          placeholder-class="cs-ph"
          :maxlength="-1"
        />

        <text class="cs-label">标签（逗号分隔）</text>
        <input v-model="fTags" class="cs-input" placeholder="如：身弱，用神取水，事业" placeholder-class="cs-ph" />

        <text class="cs-label">润金（元，选填）</text>
        <input v-model="fFee" type="digit" class="cs-input" placeholder="如：800" placeholder-class="cs-ph" />

        <text class="cs-label">成事日期</text>
        <picker mode="date" :value="fDate" @change="onDateChange">
          <view class="cs-picker">
            <text class="cs-picker-txt">{{ fDate }}</text>
            <AppIcon name="calendar-days" :size="16" color="#9A8C7E" />
          </view>
        </picker>

        <view class="cs-btn" @tap="submit">
          <text class="cs-btn-txt">{{ saving ? '保存中…' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.cs-page {
  min-height: 100vh;
  background: #F7F3EC;
}

.cs {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

/* 顶部 */
.cs-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.cs-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 64rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 32rpx;
  background: #fff;
}

.cs-search-input {
  flex: 1;
  min-width: 0;
  height: 60rpx;
  font-size: 26rpx;
  color: #3A2A1E;
}

.cs-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.cs-new {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: #C41E3A;
  flex-shrink: 0;
}

.cs-new-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

/* 分类 */
.cs-tabs {
  white-space: nowrap;
}

.cs-tabs-inner {
  display: inline-flex;
  gap: 12rpx;
  padding-bottom: 4rpx;
}

.cs-tab {
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  background: rgba(154, 140, 126, 0.1);
}

.cs-tab--on {
  background: #C41E3A;
}

.cs-tab-txt {
  font-size: 24rpx;
  color: #7A6C5E;
}

.cs-tab-txt--on {
  color: #fff;
  font-weight: 600;
}

/* 卡片 */
.cs-card-head {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.cs-card-title {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #3A2A1E;
}

.cs-card-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
}

.cs-card-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.cs-card-cat {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 20rpx;
  color: #C41E3A;
}

.cs-card-client,
.cs-card-date {
  font-size: 21rpx;
  color: #9A8C7E;
}

.cs-card-summary {
  display: -webkit-box;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #7A6C5E;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cs-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 20rpx;
}

.cs-tags {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.cs-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(184, 134, 11, 0.1);
}

.cs-tag-txt {
  font-size: 20rpx;
  color: #8A6914;
}

.cs-card-fee {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}

/* 空态 */
.cs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 24rpx;
}

.cs-empty-txt {
  font-size: 28rpx;
  color: #7A6C5E;
}

.cs-empty-sub {
  font-size: 22rpx;
  line-height: 1.6;
  color: #B8AA9A;
  text-align: center;
}

.cs-skeleton {
  height: 300rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.cs-failed {
  padding: 24rpx;
  text-align: center;
}

.cs-failed-txt {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 弹层 */
.cs-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.cs-sheet {
  width: 100%;
  max-height: 84vh;
  overflow-y: auto;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #FDFAF4;
}

.cs-sheet-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.cs-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.cs-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.cs-textarea {
  width: 100%;
  height: 180rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  box-sizing: border-box;
  font-size: 26rpx;
  line-height: 1.6;
  color: #3A2A1E;
}

.cs-ph {
  color: #C4B8A8;
}

.cs-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
}

.cs-picker-txt {
  font-size: 26rpx;
  color: #3A2A1E;
}

.cs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.cs-chip {
  padding: 10rpx 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 30rpx;
}

.cs-chip--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.cs-chip-txt {
  font-size: 24rpx;
  color: #3A2A1E;
}

.cs-chip-txt--on {
  color: #fff;
}

.cs-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-top: 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
}

.cs-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
