<template>
  <view class="sa-page">
    <!-- 顶部导航 -->
    <view class="sa-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sa-header-inner">
        <view class="sa-header-left">
          <view class="sa-back" @tap="go('/merchant/application-status')">
            <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="sa-title">签署入驻协议</text>
        </view>
        <text v-if="!isSigned" class="sa-version">{{ agreement?.version }}</text>
      </view>
    </view>

    <!-- 成功态 -->
    <view v-if="isSigned" class="sa-content" :style="{ paddingTop: statusBarHeight + 44 + 16 + 'px' }">
      <view class="sa-success-card">
        <view class="sa-success-icon">
          <AppIcon name="check-circle-2" :size="48" color="#22c55e" />
        </view>
        <text class="sa-success-title">协议签署成功</text>
        <text class="sa-success-sub">店铺即将开通...</text>
        <view class="sa-success-info">
          <view class="sa-info-row">
            <text class="sa-info-label">协议版本</text>
            <text class="sa-info-val">{{ agreement?.version }}</text>
          </view>
          <view class="sa-info-row">
            <text class="sa-info-label">签署时间</text>
            <text class="sa-info-val">{{ signedAt }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 协议正文 -->
    <template v-else>
      <scroll-view scroll-y class="sa-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }" @scrolltolower="hasScrolled = true">
        <view class="sa-doc-wrap">
          <view v-if="loading" class="sa-doc">
            <text class="sa-doc-intro">协议加载中…</text>
          </view>
          <view v-else-if="error" class="sa-doc">
            <text class="sa-doc-intro">{{ error }}</text>
            <view class="sa-sign-btn" style="margin-top:16px;" @tap="load"><text>重试</text></view>
          </view>
          <view v-else class="sa-doc">
            <text class="sa-doc-title">{{ agreement?.title || '商家入驻协议' }}</text>
            <text v-for="(line, i) in contentLines" :key="i" class="sa-doc-p">{{ line }}</text>
            <text class="sa-doc-end">— 协议内容结束 —</text>
          </view>
          <text v-if="!loading && !error && !hasScrolled" class="sa-scroll-hint">请滚动阅读完整协议内容</text>
          <view class="sa-doc-placeholder" />
        </view>
      </scroll-view>

      <!-- 底部签署 -->
      <view class="sa-footer">
        <view class="sa-agree">
          <view class="sa-checkbox" :class="{ 'sa-checkbox-on': agreed, 'sa-checkbox-disabled': !hasScrolled }" @tap="toggleAgree">
            <AppIcon v-if="agreed" name="check" :size="12" color="#ffffff" />
          </view>
          <text class="sa-agree-txt">我已阅读并同意《商家入驻协议》</text>
        </view>
        <view class="sa-sign-btn" :class="{ 'sa-sign-btn-disabled': !agreed || isSigning }" @tap="handleSign">
          <template v-if="isSigning">
            <view class="sa-spin"><AppIcon name="loader-2" :size="18" color="#ffffff" /></view>
            <text>签署中...</text>
          </template>
          <text v-else>确认签署协议</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi, type MerchantAgreement } from '@/lib/merchant-data'

const agreement = ref<MerchantAgreement | null>(null)
const loading = ref(true)
const error = ref('')
const hasScrolled = ref(false)
const agreed = ref(false)
const isSigning = ref(false)
const isSigned = ref(false)
const signedAt = ref('')
const statusBarHeight = ref(0)

const contentLines = computed(() => (agreement.value?.content || '').split('\n').filter((l) => l.trim() !== ''))

function formatNow(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    agreement.value = await merchantApi.getAgreementPreview()
  } catch (e) {
    error.value = (e as Error)?.message || '协议加载失败'
  } finally {
    loading.value = false
  }
}

function toggleAgree() {
  if (!hasScrolled.value) {
    uni.showToast({ title: '请先滚动阅读完整协议', icon: 'none' })
    return
  }
  agreed.value = !agreed.value
}

async function handleSign() {
  if (!agreed.value || isSigning.value || !agreement.value) return
  isSigning.value = true
  try {
    await merchantApi.signAgreement(agreement.value.version)
    signedAt.value = formatNow()
    isSigned.value = true
    setTimeout(() => navigateTo('/merchant/application-status'), 2000)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '签署失败', icon: 'none' })
  } finally {
    isSigning.value = false
  }
}

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.sa-page { min-height: 100vh; background: #f5f5f5; display: flex; flex-direction: column; }

.sa-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.sa-header-inner { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 16px; }
.sa-header-left { display: flex; align-items: center; }
.sa-back { margin-right: 12px; }
.sa-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.sa-version { font-size: 12px; color: #999; }

/* 成功态 */
.sa-content { padding: 16px; }
.sa-success-card { background: #f0fdf4; border-radius: 12px; padding: 32px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.sa-success-icon { width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.sa-success-title { font-size: 20px; font-weight: 700; color: #16a34a; margin-bottom: 8px; }
.sa-success-sub { font-size: 14px; color: #999; margin-bottom: 16px; }
.sa-success-info { width: 100%; background: #fff; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.sa-info-row { display: flex; align-items: center; justify-content: space-between; }
.sa-info-label { font-size: 14px; color: #999; }
.sa-info-val { font-size: 14px; font-weight: 500; color: #1a1a1a; }

/* 协议正文 */
.sa-scroll { flex: 1; height: 100vh; box-sizing: border-box; }
.sa-doc-wrap { padding: 16px; }
.sa-doc { background: #fff; border-radius: 12px; padding: 16px; }
.sa-doc-title { display: block; font-size: 18px; font-weight: 700; color: #1a1a1a; text-align: center; margin-bottom: 16px; }
.sa-doc-intro { display: block; font-size: 14px; color: #999; line-height: 1.6; }
.sa-doc-sec { margin-top: 16px; }
.sa-doc-h { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.sa-doc-p { display: block; font-size: 14px; color: #444; line-height: 1.7; margin-bottom: 4px; }
.sa-doc-end { display: block; font-size: 14px; color: #999; text-align: center; margin-top: 24px; }
.sa-scroll-hint { display: block; font-size: 12px; color: #999; text-align: center; margin-top: 16px; }
.sa-doc-placeholder { height: 120px; }

/* Footer */
.sa-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px 16px calc(16px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid rgba(0,0,0,0.06); }
.sa-agree { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.sa-checkbox { width: 20px; height: 20px; border-radius: 4px; border: 2px solid #999; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sa-checkbox-on { background: var(--brand); border-color: var(--brand); }
.sa-checkbox-disabled { opacity: 0.5; }
.sa-agree-txt { font-size: 14px; color: #999; }
.sa-sign-btn { height: 48px; background: var(--brand); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.sa-sign-btn text { font-size: 16px; font-weight: 500; color: #fff; }
.sa-sign-btn-disabled { opacity: 0.5; }
.sa-spin { display: inline-flex; animation: sa-spin 1s linear infinite; }
@keyframes sa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
