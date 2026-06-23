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
        <text v-if="!isSigned" class="sa-version">{{ agreementInfo.version }}</text>
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
            <text class="sa-info-val">{{ agreementInfo.version }}</text>
          </view>
          <view class="sa-info-row">
            <text class="sa-info-label">签署时间</text>
            <text class="sa-info-val">{{ agreementInfo.signedAt }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 协议正文 -->
    <template v-else>
      <!-- 加载中 -->
      <view v-if="loading" class="sa-loading" :style="{ paddingTop: statusBarHeight + 44 + 80 + 'px' }">
        <view class="sa-spin"><AppIcon name="loader-2" :size="24" color="#999" /></view>
        <text class="sa-loading-text">加载协议中...</text>
      </view>
      <!-- 错误 -->
      <view v-else-if="error" class="sa-error" :style="{ paddingTop: statusBarHeight + 44 + 80 + 'px' }">
        <AppIcon name="alert-circle" :size="40" color="#dc2626" />
        <text class="sa-error-text">加载失败</text>
        <view class="sa-retry-btn" @tap="retryLoad">重试</view>
      </view>
      <!-- 内容 -->
      <scroll-view v-else scroll-y class="sa-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }" @scrolltolower="hasScrolled = true">
        <view class="sa-doc-wrap">
          <view class="sa-doc">
            <text class="sa-doc-title">热卜平台商家入驻协议</text>
            <text class="sa-doc-intro">欢迎您入驻热卜平台。在您完成入驻流程前，请仔细阅读本协议的全部内容。</text>
            <view v-for="(sec, i) in sections" :key="i" class="sa-doc-sec">
              <text class="sa-doc-h">{{ sec.h }}</text>
              <text v-for="(p, pi) in sec.ps" :key="pi" class="sa-doc-p">{{ p }}</text>
            </view>
            <text class="sa-doc-end">— 协议内容结束 —</text>
          </view>
          <text v-if="!hasScrolled" class="sa-scroll-hint">请滚动阅读完整协议内容</text>
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

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi } from '@/lib/merchant-data'

const agreementInfo = ref({ title: '', content: '', version: '', updatedAt: '', signedAt: '', signedIP: '' })
const loading = ref(true)
const error = ref(false)

const sections = [
  { h: '第一条 定义', ps: ['1.1 商家是指在平台上开设店铺、销售商品或提供服务的企业或个人。', '1.2 平台是指热卜运营的电子商务平台，包括但不限于网站、移动应用程序等。'] },
  { h: '第二条 入驻条件', ps: ['2.1 商家应具有合法的经营资质，包括但不限于营业执照、相关行业许可证等。', '2.2 商家应保证所提供的信息真实、准确、完整，如有变更应及时更新。'] },
  { h: '第三条 商家权利与义务', ps: ['3.1 商家有权使用平台提供的各项服务，包括但不限于商品上架、订单管理、数据统计等。', '3.2 商家应遵守国家法律法规和平台规则，不得从事违法违规经营活动。'] },
  { h: '第四条 费用与结算', ps: ['4.1 商家应按照平台规定的比例支付技术服务费。', '4.2 平台将在每笔订单完成后扣除相应佣金，剩余金额进入商家可提现账户。'] },
  { h: '第五条 保证金', ps: ['5.1 保证金用于保障消费者权益和平台交易安全。', '5.2 商家退出经营且无违规记录的情况下，保证金将在30个工作日内全额退还。'] },
  { h: '第六条 违约责任', ps: ['6.1 任何一方违反本协议约定，应承担相应的违约责任。'] },
  { h: '第七条 争议解决', ps: ['7.1 本协议的签订、履行、解释及争议解决均适用中华人民共和国法律。'] },
]

const hasScrolled = ref(false)
const agreed = ref(false)
const isSigning = ref(false)
const isSigned = ref(false)
const statusBarHeight = ref(0)

function toggleAgree() {
  if (!hasScrolled.value) {
    uni.showToast({ title: '请先滚动阅读完整协议', icon: 'none' })
    return
  }
  agreed.value = !agreed.value
}

onMounted(async () => {
  try {
    const res = await merchantApi.getAgreementPreview()
    agreementInfo.value = {
      title: res.title || '商家入驻协议',
      content: res.content || '',
      version: res.version || '',
      updatedAt: res.updatedAt || '',
      signedAt: '',
      signedIP: '',
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

function retryLoad() {
  loading.value = true
  error.value = false
  merchantApi.getAgreementPreview().then((res) => {
    agreementInfo.value = {
      title: res.title || '商家入驻协议',
      content: res.content || '',
      version: res.version || '',
      updatedAt: res.updatedAt || '',
      signedAt: '',
      signedIP: '',
    }
  }).catch(() => {
    error.value = true
  }).finally(() => {
    loading.value = false
  })
}

async function handleSign() {
  if (!agreed.value || isSigning.value) return
  isSigning.value = true
  try {
    const res = await merchantApi.signAgreement()
    if (res.success) {
      agreementInfo.value = {
        ...agreementInfo.value,
        signedAt: new Date().toLocaleString('zh-CN'),
      }
      isSigned.value = true
      setTimeout(() => navigateTo('/merchant/application-status'), 2000)
    } else {
      uni.showToast({ title: res.message || '签署失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '签署失败，请重试', icon: 'none' })
  } finally {
    isSigning.value = false
  }
}

function go(url: string) {
  navigateTo(url)
}

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
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
.sa-checkbox-on { background: #c41e3a; border-color: #c41e3a; }
.sa-checkbox-disabled { opacity: 0.5; }
.sa-agree-txt { font-size: 14px; color: #999; }
.sa-sign-btn { height: 48px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.sa-sign-btn text { font-size: 16px; font-weight: 500; color: #fff; }
.sa-sign-btn-disabled { opacity: 0.5; }
.sa-spin { display: inline-flex; animation: sa-spin 1s linear infinite; }
@keyframes sa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Loading / Error */
.sa-loading { padding: 0 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.sa-loading-text { font-size: 14px; color: #999; }
.sa-error { padding: 0 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.sa-error-text { font-size: 14px; color: #dc2626; }
.sa-retry-btn { height: 36px; padding: 0 24px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #1a1a1a; }
</style>
