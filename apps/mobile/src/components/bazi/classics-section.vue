<script setup lang="ts">
/**
 * 古籍参考 —— 按【当前这一盘】检索。
 *
 * 🔴 2026-07-14 改真检索。此前是 4 本书封 + 4 段硬编码原文（「论丁火」「论丁生午月」），
 *    不管用户排的是什么八字都给同一份内容，页面上却标着《滴天髓》。那不是兜底，是假的针对性。
 *    现在按盘面特征（格局/用神/日主/月令/神煞/五行）从知识库召回，每条都标出命中理由；
 *    一条都没命中就诚实空态 —— 宁可不显示，也不塞不相干的原文冒充「参考」。
 */
import { ref, watch } from 'vue'
import SectionTitle from './section-title.vue'
import { baziApi, type ClassicRef } from '@/lib/bazi-result-data'

// data 为排盘结果聚合对象（adaptBazi 产物），多层嵌套，保留 any 与两个 mode 组件一致
const props = defineProps<{ data: any }>()

/** 天干五行（用于把日主折成五行信号） */
const GAN_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const list = ref<ClassicRef[]>([])
const loading = ref(false)
const failed = ref(false)
const expanded = ref<string | null>(null)

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
}

async function load() {
  const d = props.data
  const dayGan = d?.siZhu?.day?.gan || ''
  if (!dayGan) return
  const ss = d?.shenSha || {}
  loading.value = true
  failed.value = false
  try {
    list.value = await baziApi.classicsForBazi({
      dayGan,
      dayZhi: d?.siZhu?.day?.zhi || '',
      monthZhi: d?.siZhu?.month?.zhi || '',
      geju: d?.geJu?.name || '',
      yongshen: d?.geJu?.yongShen || '',
      shenSha: [...(ss.year || []), ...(ss.month || []), ...(ss.day || []), ...(ss.hour || [])],
      wuxing: GAN_WUXING[dayGan] || '',
    })
  } catch {
    list.value = []
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.data?.siZhu?.day?.gan, load, { immediate: true })
</script>

<template>
  <view class="cs">
    <section-title title="古籍参考">
      <template #extra><text class="cs-hint">按本盘检索</text></template>
    </section-title>

    <view v-if="loading" class="cs-empty"><text class="cs-empty-text">检索中…</text></view>

    <view v-else-if="list.length" class="cs-list">
      <view v-for="c in list" :key="c.id" class="cs-item" @tap="toggle(c.id)">
        <view class="cs-head">
          <text class="cs-title">{{ c.title }}</text>
          <text v-if="c.source" class="cs-source">{{ c.source }}</text>
        </view>
        <view class="cs-tags">
          <text v-for="m in c.matchedOn" :key="m" class="cs-tag">{{ m }}</text>
        </view>
        <text class="cs-body" :class="{ 'cs-body-fold': expanded !== c.id }">{{ c.content }}</text>
        <text class="cs-toggle">{{ expanded === c.id ? '收起' : '展开全文' }}</text>
      </view>
    </view>

    <!-- 诚实空态：说清楚为什么没有，不拿别的内容顶上 -->
    <view v-else class="cs-empty">
      <text class="cs-empty-text">{{ failed ? '古籍检索暂时不可用，稍后再试' : '这一盘暂未检索到相关古籍论断' }}</text>
      <text class="cs-empty-sub">古籍库仍在扩充，只展示与本盘格局、用神、日主真正对应的条目</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cs { background: var(--card); border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); overflow: hidden; }
.cs-hint { font-size: 22rpx; color: var(--text-soft); }
.cs-list { padding: 0 24rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.cs-item { background: rgba(0,0,0,0.02); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); border-radius: 16rpx; padding: 20rpx; }
.cs-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.cs-title { font-size: 28rpx; font-weight: 600; color: var(--text-ink); flex: 1; }
.cs-source { font-size: 22rpx; color: var(--brand); flex-shrink: 0; }
.cs-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin: 12rpx 0; }
.cs-tag { font-size: 20rpx; color: var(--text-soft); background: var(--card); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); border-radius: 999rpx; padding: 4rpx 14rpx; }
.cs-body { display: block; font-size: 26rpx; line-height: 1.7; color: var(--text-soft); white-space: pre-line; }
.cs-body-fold { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.cs-toggle { display: block; margin-top: 10rpx; font-size: 22rpx; color: var(--brand); }
.cs-empty { padding: 40rpx 24rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.cs-empty-text { font-size: 26rpx; color: var(--text-soft); }
.cs-empty-sub { font-size: 22rpx; color: var(--text-soft); opacity: 0.7; text-align: center; }
</style>
