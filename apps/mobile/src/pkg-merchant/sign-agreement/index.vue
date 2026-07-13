<!--
  M4 · 签约开通（V0 视觉稿 1:1 还原 · uni-app Vue3）
  两态：A 签约（协议 + 免保证金说明 + 同意签署）｜B 开通成功（引导进商家工作台 B1）。
  ⚠️ 不做真实收银台；保证金呈现「当前免缴」态（getDepositInfo 返回免保证金则展示免缴态）。
-->
<template>
  <view class="sa-page">
    <!-- 顶部导航 -->
    <view class="sa-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sa-nav-inner">
        <view v-if="!isSigned" class="sa-back" @tap="go('/merchant/application-status')">
          <AppIcon name="arrow-left" :size="18" color="#2C2C2C" />
        </view>
        <text class="sa-nav-ttl">{{ isSigned ? '开通成功' : '签约开通' }}</text>
      </view>
    </view>

    <!-- ═══════ 态B · 开通成功 ═══════ -->
    <view v-if="isSigned" class="sa-success" :style="{ paddingTop: statusBarHeight + 52 + 'px' }">
      <view class="sa-success-icon">
        <AppIcon name="check-circle-2" :size="42" color="#C41E3A" />
      </view>
      <text class="sa-success-title serif">店铺已开通</text>
      <text class="sa-success-desc">欢迎入驻热卜！你已成为平台供货商家，现在可以上架第一件商品了。</text>
      <view class="sa-checklist">
        <view v-for="(item, i) in checklist" :key="i" class="sa-ci">
          <view class="sa-ci-num serif"><text>{{ i + 1 }}</text></view>
          <text class="sa-ci-txt">{{ item }}</text>
        </view>
      </view>
      <view class="sa-foot" :style="{ paddingBottom: 18 + safeBottom + 'px' }">
        <view class="sa-cta" @tap="goDashboard"><text>进入商家工作台</text></view>
      </view>
    </view>

    <!-- ═══════ 态A · 签约 ═══════ -->
    <template v-else>
      <scroll-view scroll-y class="sa-scroll" :style="{ paddingTop: statusBarHeight + 52 + 'px' }" @scrolltolower="hasScrolled = true">
        <!-- 加载态 -->
        <view v-if="loading" class="sa-state"><text class="sa-state-t">协议加载中…</text></view>
        <!-- 错误态 -->
        <view v-else-if="error" class="sa-state">
          <text class="sa-state-t">{{ error }}</text>
          <view class="sa-state-btn" @tap="load"><text>重试</text></view>
        </view>

        <template v-else>
          <!-- 协议 -->
          <view class="sa-group">
            <view class="sa-group-t serif"><text>商家合作协议</text></view>
            <view class="sa-agreement">
              <text class="sa-ag-h4 serif">{{ agreement?.title || '热卜国学平台 · 商家合作协议' }}</text>
              <text v-for="(line, i) in contentLines" :key="i" class="sa-ag-p">{{ line }}</text>
              <view v-if="!hasScrolled" class="sa-ag-fade"><text>▾ 滑动阅读全文</text></view>
            </view>

            <!-- 保证金：免缴态 -->
            <view v-if="depositFree" class="sa-deposit">
              <view class="sa-deposit-ic">
                <AppIcon name="shield-check" :size="20" color="#A5843F" />
              </view>
              <view class="sa-deposit-body">
                <text class="sa-deposit-t">保证金：当前免缴</text>
                <text class="sa-deposit-d">本平台当前开放免保证金入驻，无需缴纳。（后续如调整，将另行通知并以届时协议为准）</text>
              </view>
            </view>
            <!-- 保证金：模拟已缴态（非免缴时的诚实呈现，不做真实收银台） -->
            <view v-else class="sa-deposit">
              <view class="sa-deposit-ic">
                <AppIcon name="shield-check" :size="20" color="#A5843F" />
              </view>
              <view class="sa-deposit-body">
                <text class="sa-deposit-t">保证金：¥{{ depositAmount }} · 已模拟到账</text>
                <text class="sa-deposit-d">保证金用于保障交易安全，退出经营且无违规时全额退还。当前为演示环境，已模拟缴纳，无需实际支付。</text>
              </view>
            </view>
          </view>

          <!-- 同意条款 -->
          <view class="sa-terms" @tap="toggleAgree">
            <view class="sa-terms-box" :class="{ 'sa-terms-box-on': agreed }">
              <AppIcon v-if="agreed" name="check" :size="12" color="#ffffff" />
            </view>
            <text class="sa-terms-txt">我已完整阅读并同意《商家合作协议》全部条款，理解供货、履约与结算规则。</text>
          </view>

          <view class="sa-scroll-pad" />
        </template>
      </scroll-view>

      <!-- 底部签署 -->
      <view v-if="!loading && !error" class="sa-foot" :style="{ paddingBottom: 18 + safeBottom + 'px' }">
        <view class="sa-cta" :class="{ 'sa-cta-disabled': !agreed && !isSigning, 'sa-cta-loading': isSigning }" @tap="handleSign">
          <template v-if="isSigning">
            <view class="sa-spin" /><text>签署中…</text>
          </template>
          <text v-else>同意并签署，开通店铺</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, reLaunch } from '@/utils/router'
import { merchantApi, type MerchantAgreement } from '@/lib/merchant-data'

const agreement = ref<MerchantAgreement | null>(null)
const loading = ref(true)
const error = ref('')
const hasScrolled = ref(false)
const agreed = ref(false)
const isSigning = ref(false)
const isSigned = ref(false)
const statusBarHeight = ref(0)
const safeBottom = ref(0)

// 保证金：免缴 / 金额（来自 getDepositInfo 真实数据）
const depositFree = ref(true)
const depositAmount = ref(0)

const checklist = [
  '完善店铺资料（店招 / 简介 / 客服）',
  '新建并上架第一件商品',
  '接收订单、发货履约、查看结算',
]

const contentLines = computed(() =>
  (agreement.value?.content || '').split('\n').map((l) => l.trim()).filter((l) => l !== '')
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    // 协议全文
    agreement.value = await merchantApi.getAgreementPreview()
    // 保证金信息（免缴则展示免缴态）
    try {
      const info = await merchantApi.getDepositInfo()
      const amount = Math.round(Number(info?.depositAmount || 0))
      depositAmount.value = amount
      depositFree.value = amount <= 0 || !!info?.depositPaid
    } catch {
      // 保证金接口异常不阻断签约，默认按免缴呈现
      depositFree.value = true
    }
  } catch (e) {
    error.value = (e as Error)?.message || '协议加载失败'
  } finally {
    loading.value = false
  }
}

function toggleAgree() {
  agreed.value = !agreed.value
}

async function handleSign() {
  if (!agreed.value || isSigning.value || !agreement.value) return
  isSigning.value = true
  try {
    await merchantApi.signAgreement(agreement.value.version)
    isSigned.value = true
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '签署失败', icon: 'none' })
  } finally {
    isSigning.value = false
  }
}

function go(url: string) {
  navigateTo(url)
}

// 进入商家工作台 B1（reLaunch 避免签约流程页残留在栈中）
function goDashboard() {
  reLaunch('/pkg-merchant/dashboard/index')
}

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0
      safeBottom.value = res.safeAreaInsets?.bottom || 0
    },
  })
  load()
})
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$ink2: #6E6E73;
$ink3: #999;
$line: #EDEAE4;
$wash: #F5F1EB;

.serif { font-family: "Songti SC", "STSong", serif; }

.sa-page { min-height: 100vh; background: $paper; }

/* 导航 */
.sa-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  background: rgba(250, 248, 245, 0.92);
  border-bottom: 1rpx solid $line;
}
.sa-nav-inner { position: relative; height: 52px; display: flex; align-items: center; justify-content: center; }
.sa-back {
  position: absolute; left: 36rpx; width: 68rpx; height: 68rpx; border-radius: 50%;
  background: $card; border: 1rpx solid $line;
  display: flex; align-items: center; justify-content: center;
}
.sa-nav-ttl { font-family: "Songti SC", "STSong", serif; font-size: 34rpx; font-weight: 700; color: $ink; }

/* 状态占位 */
.sa-state { padding: 120rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.sa-state-t { font-size: 26rpx; color: $ink3; }
.sa-state-btn {
  padding: 16rpx 48rpx; border-radius: 999px; background: $red;
  display: flex; align-items: center; justify-content: center;
}
.sa-state-btn text { font-size: 26rpx; color: #fff; }

/* 滚动区 */
.sa-scroll { height: 100vh; box-sizing: border-box; }
.sa-scroll-pad { height: 200rpx; }

/* 分组 */
.sa-group { margin: 36rpx 40rpx 0; }
.sa-group-t {
  font-size: 30rpx; font-weight: 700; color: #3A3430; margin-bottom: 24rpx;
  display: flex; align-items: center; position: relative; padding-left: 20rpx;
}
.sa-group-t::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 8rpx; height: 30rpx; background: $red; border-radius: 4rpx;
}

/* 协议卡 */
.sa-agreement {
  background: $card; border: 1rpx solid $line; border-radius: 32rpx;
  padding: 36rpx; height: 560rpx; overflow: hidden; position: relative;
}
.sa-ag-h4 {
  display: block; font-size: 28rpx; margin-bottom: 24rpx; text-align: center; color: $ink; font-weight: 700;
}
.sa-ag-p { display: block; font-size: 24rpx; color: $ink2; line-height: 2; margin-bottom: 16rpx; }
.sa-ag-fade {
  position: absolute; left: 0; right: 0; bottom: 0; height: 140rpx;
  background: linear-gradient(rgba(255, 255, 255, 0), #fff);
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 20rpx;
}
.sa-ag-fade text { font-size: 24rpx; color: $gold; }

/* 保证金卡（金色描边 · 免缴态） */
.sa-deposit {
  border: 1rpx solid $gold; border-radius: 32rpx;
  background: linear-gradient(135deg, #FDF9F0, #F7F0E2);
  padding: 32rpx; margin-top: 28rpx; display: flex; gap: 24rpx;
}
.sa-deposit-ic {
  width: 80rpx; height: 80rpx; border-radius: 22rpx; background: rgba(201, 169, 110, 0.2);
  display: flex; align-items: center; justify-content: center; flex: none;
}
.sa-deposit-body { flex: 1; }
.sa-deposit-t { display: block; font-size: 26rpx; font-weight: 700; color: #8A6D2F; margin-bottom: 8rpx; }
.sa-deposit-d { display: block; font-size: 22rpx; color: #96814F; line-height: 1.55; }

/* 同意条款 */
.sa-terms {
  margin: 32rpx 40rpx 0; display: flex; align-items: flex-start; gap: 18rpx; line-height: 1.6;
}
.sa-terms-box {
  width: 34rpx; height: 34rpx; border: 3rpx solid $gold; border-radius: 10rpx;
  flex: none; margin-top: 2rpx; background: rgba(201, 169, 110, 0.12);
  display: flex; align-items: center; justify-content: center;
}
.sa-terms-box-on { background: $red; border-color: $red; }
.sa-terms-txt { flex: 1; font-size: 22rpx; color: $ink2; line-height: 1.6; }

/* 底部 CTA */
.sa-foot {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
  padding: 28rpx 40rpx 36rpx;
  background: rgba(250, 248, 245, 0.95); border-top: 1rpx solid $line;
}
.sa-cta {
  height: 100rpx; background: $red; border-radius: 999px;
  display: flex; align-items: center; justify-content: center; gap: 18rpx;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.32);
}
.sa-cta text { font-size: 30rpx; font-weight: 600; color: #fff; }
.sa-cta-disabled { background: #D8D2C8; box-shadow: none; }
.sa-cta-loading { opacity: 0.7; }
.sa-spin {
  width: 32rpx; height: 32rpx; border: 5rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff; border-radius: 50%; animation: sa-spin 0.7s linear infinite;
}
@keyframes sa-spin { to { transform: rotate(360deg); } }

/* ═══════ 态B · 成功 ═══════ */
.sa-success { min-height: 100vh; box-sizing: border-box; }
.sa-success-icon {
  width: 176rpx; height: 176rpx; border-radius: 50%; margin: 112rpx auto 44rpx;
  display: flex; align-items: center; justify-content: center; background: rgba(196, 30, 58, 0.08);
}
.sa-success-title { display: block; text-align: center; font-size: 48rpx; font-weight: 700; color: $ink; margin-bottom: 24rpx; }
.sa-success-desc {
  display: block; text-align: center; font-size: 24rpx; color: $ink2; line-height: 1.7; padding: 0 88rpx;
}
.sa-checklist { margin: 60rpx 56rpx; }
.sa-ci { display: flex; align-items: center; gap: 22rpx; margin-bottom: 32rpx; }
.sa-ci-num {
  width: 52rpx; height: 52rpx; border-radius: 50%; background: $wash; border: 1rpx solid $gold;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.sa-ci-num text { font-size: 24rpx; font-weight: 700; color: $gold; }
.sa-ci-txt { flex: 1; font-size: 26rpx; color: $ink; }
</style>
