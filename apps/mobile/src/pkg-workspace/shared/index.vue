<script setup lang="ts">
/**
 * 只读交付报告（对应 V0 readonly-report.tsx）—— 客户看到的那一面
 *
 * 无需登录：令牌即凭证（老师生成的高熵随机 token）。老师撤回后立刻 404。
 * 这是平台交到客户手里的**门面**，所以：
 *  · 落款用老师的品牌（工作室名/印章/联系方式），报告是他的作品
 *  · 免责声明固定挂底部，不可被去掉（合规红线 R3/R4）
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'

const loading = ref(true)
const notFound = ref(false)
const data = ref<any>(null)

/** 平台兜底免责声明：老师没自定义时用这句 */
const DEFAULT_DISCLAIMER =
  '本报告为传统文化解读，仅供参考，不构成医疗、投资、法律或其他专业决策依据。'

onLoad(async (q) => {
  const token = (q?.token as string) || ''
  if (!token) {
    notFound.value = true
    loading.value = false
    return
  }
  try {
    // 用 uni.request 直连而非 apiGet：这是公开页，客户没有登录态，
    // 走带鉴权拦截的请求层会在 401 时把人踢去登录页。
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/practitioner/reports/shared/${token}`,
        method: 'GET',
        success: (r) => resolve(r),
        fail: reject,
      })
    })
    const body = res?.data
    if (res.statusCode !== 200 || !body?.data) {
      notFound.value = true
    } else {
      data.value = body.data
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

function dateText(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
</script>

<template>
  <app-safe-area-top />
  <view class="sr">
    <view v-if="loading" class="sr-loading">
      <text class="sr-loading-txt">载入中…</text>
    </view>

    <view v-else-if="notFound" class="sr-404">
      <AppIcon name="file-text" :size="48" color="#D5C9B8" />
      <text class="sr-404-txt">报告不存在或已被撤回</text>
      <text class="sr-404-sub">请联系为你出具报告的老师</text>
    </view>

    <scroll-view v-else class="sr-body" scroll-y :show-scrollbar="false">
      <!-- 封面 -->
      <view class="sr-cover">
        <text class="sr-cover-brand">{{ data.brand.brandName || '热卜国学' }}</text>
        <view class="sr-cover-line" />
        <text class="sr-cover-title">{{ data.title }}</text>
        <text class="sr-cover-type">{{ data.typeLabel }}</text>
        <view class="sr-cover-meta">
          <text class="sr-cover-meta-txt">受测人：{{ data.clientName }}</text>
          <text v-if="data.clientBirth" class="sr-cover-meta-txt">生辰：{{ data.clientBirth }}</text>
        </view>
        <text v-if="data.brand.slogan" class="sr-cover-slogan">{{ data.brand.slogan }}</text>
      </view>

      <!-- 盘面 -->
      <view v-if="data.paipan" class="sr-card">
        <text class="sr-card-title">盘面</text>
        <text class="sr-card-sub">{{ data.paipan.toolLabel }}</text>
        <text v-if="data.paipan.summary" class="sr-paipan-summary">{{ data.paipan.summary }}</text>
      </view>

      <!-- 正文 -->
      <view v-for="(c, i) in data.chapters || []" :key="c.key" class="sr-card">
        <view class="sr-ch-head">
          <text class="sr-ch-idx">{{ i + 1 }}</text>
          <text class="sr-ch-title">{{ c.title }}</text>
        </view>
        <text class="sr-ch-body">{{ c.body || '（本章暂无内容）' }}</text>
      </view>

      <!-- 落款 -->
      <view class="sr-sign">
        <view class="sr-sign-left">
          <text v-if="data.brand.title" class="sr-sign-title">{{ data.brand.title }}</text>
          <text class="sr-sign-brand">{{ data.brand.brandName || '热卜国学' }}</text>
          <text v-if="data.sharedAt" class="sr-sign-date">{{ dateText(data.sharedAt) }}</text>
          <text v-if="data.brand.contact" class="sr-sign-contact">{{ data.brand.contact }}</text>
        </view>
        <view v-if="data.brand.sealText" class="sr-seal">
          <text class="sr-seal-txt">{{ data.brand.sealText }}</text>
        </view>
      </view>

      <!-- 免责声明（合规红线：不可去掉） -->
      <view class="sr-disclaimer">
        <text class="sr-disclaimer-txt">{{ data.brand.disclaimer || DEFAULT_DISCLAIMER }}</text>
      </view>

      <view class="sr-space" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.sr {
  min-height: 100vh;
  background: #F2ECE0;
}

.sr-loading,
.sr-404 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  min-height: 100vh;
}

.sr-loading-txt {
  font-size: 26rpx;
  color: #9A8C7E;
}

.sr-404-txt {
  font-size: 30rpx;
  color: #7A6C5E;
}

.sr-404-sub {
  font-size: 24rpx;
  color: #B8AA9A;
}

.sr-body {
  height: 100vh;
  padding: 32rpx 32rpx 0;
  box-sizing: border-box;
}

/* 封面 */
.sr-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 40rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
  border: 2rpx solid rgba(196, 30, 58, 0.2);
}

.sr-cover-brand {
  font-size: 24rpx;
  letter-spacing: 4rpx;
  color: #9A8C7E;
}

.sr-cover-line {
  width: 80rpx;
  height: 2rpx;
  margin: 24rpx 0;
  background: rgba(196, 30, 58, 0.35);
}

.sr-cover-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
  line-height: 1.4;
}

.sr-cover-type {
  margin-top: 12rpx;
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  color: #C41E3A;
}

.sr-cover-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-top: 32rpx;
}

.sr-cover-meta-txt {
  font-size: 24rpx;
  color: #7A6C5E;
}

.sr-cover-slogan {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #B8AA9A;
  font-style: italic;
}

/* 卡片 */
.sr-card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
}

.sr-card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.sr-card-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-paipan-summary {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: #3A2A1E;
}

.sr-ch-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.sr-ch-idx {
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

.sr-ch-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.sr-ch-body {
  font-size: 28rpx;
  line-height: 2;
  color: #3A2A1E;
  white-space: pre-wrap;
}

/* 落款 */
.sr-sign {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-radius: 16rpx;
  background: #FDFAF4;
}

.sr-sign-left {
  flex: 1;
  min-width: 0;
}

.sr-sign-title {
  display: block;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-sign-brand {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.sr-sign-date {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-sign-contact {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.sr-seal {
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

.sr-seal-txt {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
  text-align: center;
  line-height: 1.3;
}

/* 免责 */
.sr-disclaimer {
  padding: 24rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.1);
}

.sr-disclaimer-txt {
  font-size: 21rpx;
  line-height: 1.7;
  color: #9A8C7E;
}

.sr-space {
  height: 60rpx;
}
</style>
