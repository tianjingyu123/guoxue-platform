<script setup lang="ts">
/**
 * 讲师认证徽章（F1 认证分级上前台 · 通用组件）
 * 数据源：GET /teachers/:userId/profile 的 verifiedTitle + institute（后端零改动）
 * 渲染优先级：SIGNED 研究院签约金标 > SENIOR/JUNIOR/PREPARATORY 等级标签；
 * verifiedTitle 线上认证头衔为独立灰金 chip，可与等级标签并排同时显示。
 * 诚实降级：无任何认证数据时整个组件不渲染。
 * 视觉对齐：等级配色对齐 pkg-institute/instructors（lecturerLevelColor/label）；
 * 金标风格对齐 teacher-profile 全站金标 #c9a96e。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface InstituteBadge { signed: boolean; lecturerLevel: string }

const props = withDefaults(defineProps<{
  /** 线上认证头衔（TeacherCertification.verifiedTitle·可空） */
  verifiedTitle?: string | null
  /** 研究院会籍（非在册成员后端省略 → 传 null/undefined 即不显示） */
  institute?: InstituteBadge | null
  size?: 'sm' | 'md'
}>(), { verifiedTitle: '', institute: null, size: 'md' })

/** 等级中文与配色（对齐 institute-data lecturerLevelLabel/Color·SIGNED 单独走金标） */
const levelMeta: Record<string, { label: string; color: string; bg: string }> = {
  PREPARATORY: { label: '储备讲师', color: '#0891b2', bg: '#ecfeff' },
  JUNIOR: { label: '初级讲师', color: '#16a34a', bg: '#f0fdf4' },
  SENIOR: { label: '高级讲师', color: '#2563eb', bg: '#eff6ff' },
}

/** 研究院签约（金标·最高优先级） */
const isSigned = computed(() => !!props.institute && (props.institute.signed || props.institute.lecturerLevel === 'SIGNED'))

/** 非签约的等级标签（未知等级如 NONE 诚实降级不显示） */
const level = computed(() => {
  if (isSigned.value || !props.institute) return null
  return levelMeta[props.institute.lecturerLevel] || null
})

const iconSize = computed(() => (props.size === 'sm' ? 20 : 24))
const hasAny = computed(() => isSigned.value || !!level.value || !!props.verifiedTitle)
</script>

<template>
  <view v-if="hasAny" class="cert-badges" :class="'cert-' + size">
    <!-- 研究院签约金标（印章感·SIGNED 最高优先级） -->
    <view v-if="isSigned" class="badge badge-signed">
      <app-icon name="badge-check" :size="iconSize" color="#7a5f33" />
      <text class="badge-txt badge-signed-txt">研究院签约讲师</text>
    </view>
    <!-- 研究院等级标签（SENIOR/JUNIOR/PREPARATORY 各自配色） -->
    <view v-else-if="level" class="badge" :style="{ background: level.bg }">
      <text class="badge-txt" :style="{ color: level.color }">{{ level.label }}</text>
    </view>
    <!-- 线上认证头衔（灰金 chip·与等级标签可并排） -->
    <view v-if="verifiedTitle" class="badge badge-title">
      <app-icon name="award" :size="iconSize" color="#8a6d3b" />
      <text class="badge-txt badge-title-txt">{{ verifiedTitle }}</text>
    </view>
  </view>
</template>

<style scoped>
.cert-badges { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 12rpx; }
.badge {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 8rpx 20rpx; border-radius: 999rpx;
}
.badge-txt { font-size: 24rpx; font-weight: 600; line-height: 1.2; }

/* 研究院签约金标：全站金标风格 #c9a96e */
.badge-signed {
  background: linear-gradient(135deg, #f3e7cf, #c9a96e);
  border: 1rpx solid #c9a96e;
  box-shadow: 0 2rpx 8rpx rgba(201, 169, 110, 0.35);
}
.badge-signed-txt { color: #7a5f33; font-weight: 700; }

/* 线上认证头衔灰金 chip */
.badge-title {
  background: linear-gradient(135deg, #fbf3e0, #f3e3c3);
  border: 1rpx solid #e6d3a8;
}
.badge-title-txt { color: #8a6d3b; }

/* 小号（列表/卡片内嵌） */
.cert-sm .badge { padding: 4rpx 14rpx; gap: 6rpx; }
.cert-sm .badge-txt { font-size: 20rpx; }
</style>
