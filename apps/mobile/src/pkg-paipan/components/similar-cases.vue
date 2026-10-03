<script setup lang="ts">
/**
 * 同类八字（八字结果页）
 *
 * 排完盘，若案例库里有「日柱相同 + 年/月/时另任意两柱相同」的案例，提示可参考。
 *
 * 克制：结果页是用户的主视线，不弹窗、不自动展开、没命中就整块不出现。
 * 用户点了才进案例 —— 参考是选项，不是推销。
 */
import { ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { caseApi, SOURCE_LABEL, type BaziCaseItem } from '@/pkg-paipan/lib/case-data'

const props = defineProps<{
  /** 四柱（干支拼好，如「甲子」）。缺任一柱则不查 */
  pillars: { year: string; month: string; day: string; hour: string } | null
}>()

const items = ref<BaziCaseItem[]>([])
const total = ref(0)
const open = ref(false)

watch(
  () => props.pillars,
  async (p) => {
    if (!p?.year || !p?.month || !p?.day || !p?.hour) return
    try {
      const res = await caseApi.similar(p, 5)
      items.value = res?.items ?? []
      total.value = res?.total ?? 0
    } catch {
      // 查不到就当没有 —— 绝不因为这个功能影响用户看盘
      items.value = []
      total.value = 0
    }
  },
  { immediate: true },
)

function go(c: BaziCaseItem) {
  navigateTo(`/pkg-paipan/cases/detail?id=${c.id}&method=BAZI`)
}
function goLib() {
  navigateTo('/pkg-paipan/cases/index?method=BAZI')
}
</script>

<template>
  <!-- 没命中就整块不出现 -->
  <view v-if="total > 0" class="sc">
    <view class="sc-head" @tap="open = !open">
      <AppIcon name="users" :size="18" color="#C41E3A" />
      <view class="sc-head-body">
        <text class="sc-title">案例库中有 {{ total }} 个同类八字</text>
        <text class="sc-sub">日柱相同，且年/月/时另有两柱相同 —— 可参考他们的真实人生经历</text>
      </view>
      <AppIcon :name="open ? 'chevron-up' : 'chevron-down'" :size="18" color="#B8AA9A" />
    </view>

    <view v-if="open" class="sc-list">
      <view v-for="c in items" :key="c.id" class="sc-item" @tap="go(c)">
        <view class="sc-item-main">
          <view class="sc-item-head">
            <text class="sc-item-title">{{ c.title }}</text>
            <text class="sc-item-src">{{ SOURCE_LABEL[c.source] || c.source }}</text>
          </view>
          <view class="sc-same">
            <text v-for="s in c.samePillars" :key="s" class="sc-same-tag">{{ s }}柱同</text>
          </view>
        </view>
        <AppIcon name="chevron-right" :size="16" color="#B8AA9A" />
      </view>

      <view class="sc-more" @tap="goLib">
        <text class="sc-more-txt">进案例库看更多</text>
        <AppIcon name="chevron-right" :size="14" color="#C41E3A" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.sc {
  margin: 24rpx 0;
  border-radius: 14rpx;
  background: #fff;
  border: 1rpx solid rgba(196, 30, 58, 0.2);
  overflow: hidden;
}

.sc-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 24rpx;
  background: rgba(196, 30, 58, 0.04);
}
.sc-head-body {
  flex: 1;
  min-width: 0;
}
.sc-title {
  display: block;
  font-size: 27rpx;
  font-weight: 700;
  color: #3a2a1e;
}
.sc-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  line-height: 1.5;
  color: #9a8c7e;
}

.sc-list {
  border-top: 1rpx solid rgba(58, 42, 30, 0.06);
}
.sc-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.05);
}
.sc-item-main {
  flex: 1;
  min-width: 0;
}
.sc-item-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.sc-item-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #3a2a1e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-item-src {
  flex-shrink: 0;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  background: rgba(154, 140, 126, 0.12);
  color: #7a6c5e;
  font-size: 17rpx;
}
.sc-same {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}
.sc-same-tag {
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  background: rgba(196, 30, 58, 0.08);
  color: #c41e3a;
  font-size: 18rpx;
}

.sc-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 22rpx;
}
.sc-more-txt {
  font-size: 24rpx;
  color: #c41e3a;
  font-weight: 600;
}
</style>
