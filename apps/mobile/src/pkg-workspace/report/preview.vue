<script setup lang="ts">
/**
 * 报告预览（对应 V0 report-preview.tsx）
 * 老师看「客户会看到什么」——排版与只读交付页(shared/index)保持一致，
 * 差别只是这里读自己的报告（要登录），且顶部多一条「这是客户视角」的提示。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import { wsApi } from '../lib/workspace-api'

const loading = ref(true)
const failed = ref(false)
const report = ref<any>(null)
const brand = ref<any>(null)

const DEFAULT_DISCLAIMER = '本报告为传统文化解读，仅供参考，不构成医疗、投资、法律或其他专业决策依据。'

onLoad(async (q) => {
  const id = (q?.id as string) || ''
  if (!id) {
    failed.value = true
    loading.value = false
    return
  }
  try {
    const [r, p] = await Promise.all([wsApi.getReport(id), wsApi.profile()])
    report.value = r
    brand.value = p.brand
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <view class="rp">
    <ToolHeader title="报告预览" subtitle="客户看到的样子" />

    <view v-if="loading" class="rp-loading">
      <text class="rp-loading-txt">载入中…</text>
    </view>
    <view v-else-if="failed" class="rp-loading">
      <text class="rp-loading-txt">加载失败</text>
    </view>

    <scroll-view v-else class="rp-body" scroll-y :show-scrollbar="false">
      <view class="rp-notice">
        <AppIcon name="eye" :size="14" color="#8A6914" />
        <text class="rp-notice-txt">这是客户视角的预览。生成交付链接后，客户看到的就是这个样子。</text>
      </view>

      <!-- 封面 -->
      <view class="rp-cover">
        <text class="rp-cover-brand">{{ brand?.brandName || '国学平台' }}</text>
        <view class="rp-cover-line" />
        <text class="rp-cover-title">{{ report.title }}</text>
        <text class="rp-cover-type">{{ report.typeLabel }}</text>
        <view class="rp-cover-meta">
          <text class="rp-cover-meta-txt">受测人：{{ report.clientName }}</text>
          <text v-if="report.clientBirth" class="rp-cover-meta-txt">生辰：{{ report.clientBirth }}</text>
        </view>
        <text v-if="brand?.slogan" class="rp-cover-slogan">{{ brand.slogan }}</text>
      </view>

      <!-- 盘面 -->
      <view v-if="report.paipan" class="rp-card">
        <text class="rp-card-title">盘面</text>
        <text class="rp-card-sub">{{ report.paipan.toolLabel }}</text>
        <text v-if="report.paipan.summary" class="rp-paipan">{{ report.paipan.summary }}</text>
      </view>

      <!-- 正文 -->
      <view v-for="(c, i) in report.chapters || []" :key="c.key" class="rp-card">
        <view class="rp-ch-head">
          <text class="rp-ch-idx">{{ i + 1 }}</text>
          <text class="rp-ch-title">{{ c.title }}</text>
        </view>
        <text class="rp-ch-body">{{ c.body || '（本章暂无内容）' }}</text>
      </view>

      <!-- 落款 -->
      <view class="rp-sign">
        <view class="rp-sign-left">
          <text v-if="brand?.title" class="rp-sign-title">{{ brand.title }}</text>
          <text class="rp-sign-brand">{{ brand?.brandName || '国学平台' }}</text>
          <text v-if="brand?.contact" class="rp-sign-contact">{{ brand.contact }}</text>
        </view>
        <view v-if="brand?.sealText" class="rp-seal">
          <text class="rp-seal-txt">{{ brand.sealText }}</text>
        </view>
      </view>

      <view class="rp-disclaimer">
        <text class="rp-disclaimer-txt">{{ brand?.disclaimer || DEFAULT_DISCLAIMER }}</text>
      </view>

      <view class="rp-space" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.rp {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F2ECE0;
}

.rp-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rp-loading-txt {
  font-size: 26rpx;
  color: #9A8C7E;
}

.rp-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx 32rpx 0;
  box-sizing: border-box;
}

.rp-notice {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 24rpx;
  border-radius: 12rpx;
  background: rgba(184, 134, 11, 0.1);
}

.rp-notice-txt {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.5;
  color: #8A6914;
}

.rp-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 40rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
  border: 2rpx solid rgba(196, 30, 58, 0.2);
}

.rp-cover-brand {
  font-size: 24rpx;
  letter-spacing: 4rpx;
  color: #9A8C7E;
}

.rp-cover-line {
  width: 80rpx;
  height: 2rpx;
  margin: 24rpx 0;
  background: rgba(196, 30, 58, 0.35);
}

.rp-cover-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
  line-height: 1.4;
}

.rp-cover-type {
  margin-top: 12rpx;
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  color: #C41E3A;
}

.rp-cover-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-top: 32rpx;
}

.rp-cover-meta-txt {
  font-size: 24rpx;
  color: #7A6C5E;
}

.rp-cover-slogan {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #B8AA9A;
}

.rp-card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
}

.rp-card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.rp-card-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.rp-paipan {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: #3A2A1E;
}

.rp-ch-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.rp-ch-idx {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #C41E3A;
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.rp-ch-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.rp-ch-body {
  font-size: 28rpx;
  line-height: 2;
  color: #3A2A1E;
  white-space: pre-wrap;
}

.rp-sign {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
}

.rp-sign-left {
  flex: 1;
  min-width: 0;
}

.rp-sign-title {
  display: block;
  font-size: 22rpx;
  color: #9A8C7E;
}

.rp-sign-brand {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.rp-sign-contact {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.rp-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
  background: #C41E3A;
  transform: rotate(-6deg);
}

.rp-seal-txt {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
  text-align: center;
  line-height: 1.3;
}

.rp-disclaimer {
  padding: 24rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.1);
}

.rp-disclaimer-txt {
  font-size: 21rpx;
  line-height: 1.7;
  color: #9A8C7E;
}

.rp-space {
  height: 60rpx;
}
</style>
