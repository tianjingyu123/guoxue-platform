<!--
  M1 · 成为商家（静态介绍页 · 合并 join + terms）
  V0 视觉稿真源：public/merchant/mockup/mockup-M1-成为商家.html
  规格：价值主张(如实陈述·禁收益承诺) + 4步入驻流程 + 供货/结算/保证金规则 + 条款入口(弹层) + 开始入驻→M2。
  真实接线：进页探测 merchantApi.getApplication()：已申请→按钮改为「查看申请状态」跳 M3；未申请(404)→「开始入驻」跳 M2。
-->
<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="36" color="#2C2C2C" />
      </view>
      <text class="nav-title">成为商家</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">
      <text class="state-t">加载中…</text>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="state">
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="load"><text>重试</text></view>
    </view>

    <!-- 正常态 -->
    <scroll-view v-else scroll-y class="scroll" :style="{ paddingTop: statusBarH + 44 + 'px' }">
      <!-- Hero 朱红品牌头 -->
      <view class="hero">
        <text class="hero-deco">商</text>
        <view class="hero-inner">
          <view class="hero-badge"><text>热卜 · 供货商家</text></view>
          <text class="hero-h">入驻热卜，成为供货商家</text>
          <text class="hero-s">把商品放进平台商品池，接入圈子 / 驿站 / 商城 / 站长主推位等多个分销渠道。你专注供货与履约，流量与分销由平台侧配置。</text>
        </view>
      </view>

      <!-- 入驻流程 -->
      <view class="sect">
        <view class="sect-t"><view class="sect-bar" /><text class="sect-tt">入驻流程</text></view>
        <view class="flow">
          <template v-for="(s, i) in flowSteps" :key="i">
            <view class="step">
              <view class="step-n"><text>{{ s.n }}</text></view>
              <text class="step-l">{{ s.l }}</text>
            </view>
            <view v-if="i < flowSteps.length - 1" class="flow-arrow"><text>›</text></view>
          </template>
        </view>
      </view>

      <!-- 合作规则 -->
      <view class="sect">
        <view class="sect-t"><view class="sect-bar" /><text class="sect-tt">合作规则</text></view>
        <view v-for="(r, i) in rules" :key="i" class="rule">
          <view class="rule-ic">
            <AppIcon :name="r.icon" :size="40" color="#C41E3A" :stroke-width="1.8" />
          </view>
          <view class="rule-body">
            <text class="rule-t">{{ r.title }}</text>
            <text class="rule-d">{{ r.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 合规提示（禁承诺式宣传） -->
      <view class="anno">
        <text class="anno-t">平台如实说明供货与结算规则，不作"月入过万 / 躺赚 / 包爆单"等收益承诺。实际收益取决于你的商品与经营。</text>
      </view>

      <!-- 条款入口 -->
      <view class="terms" @tap="toggleAgree">
        <view class="terms-box" :class="{ on: agreed }">
          <AppIcon v-if="agreed" name="check-circle-2" :size="24" color="#C41E3A" :fill="true" />
        </view>
        <view class="terms-txt">
          <text class="terms-line">我已阅读并同意</text>
          <text class="terms-link" @tap.stop="openTerms('merchant')">《商家入驻协议》</text>
          <text class="terms-line">与</text>
          <text class="terms-link" @tap.stop="openTerms('service')">《平台服务条款》</text>
        </view>
      </view>

      <view class="bottom-ph" />
    </scroll-view>

    <!-- 底部固定 CTA -->
    <view v-if="!loading && !error" class="foot" :style="{ paddingBottom: 'calc(18px + ' + safeBottom + 'px)' }">
      <view class="cta" :class="{ disabled: !agreed && !hasApplied }" @tap="onCta">
        <text>{{ ctaText }}</text>
      </view>
    </view>

    <!-- 条款弹层 -->
    <view v-if="termsShow" class="mask" @tap="termsShow = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ termsTitle }}</text>
          <view class="sheet-close" @tap="termsShow = false"><text>✕</text></view>
        </view>
        <scroll-view scroll-y class="sheet-scroll">
          <text class="sheet-update">最后更新：2026年07月01日</text>
          <text class="sheet-intro">{{ termsIntro }}</text>
          <view v-for="(sec, i) in currentTermsSections" :key="i" class="sheet-sec">
            <text class="sheet-sec-t">{{ sec.title }}</text>
            <text class="sheet-sec-c">{{ sec.content }}</text>
          </view>
          <view style="height: 24rpx" />
        </scroll-view>
        <view class="sheet-foot">
          <view class="sheet-btn" @tap="agreeFromSheet"><text>我已阅读并同意</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'
import { merchantApi } from '@/pkg-merchant/lib/merchant-data'

const statusBarH = ref(0)
const safeBottom = ref(0)
const loading = ref(true)
const error = ref('')
const agreed = ref(false)
// 已提交申请标记：进页探测，已申请则 CTA 指向状态页而非重复申请
const hasApplied = ref(false)

// ── 入驻流程（4 步，与 V0 一致） ──
const flowSteps = [
  { n: 1, l: '提交入驻申请' },
  { n: 2, l: '平台资质审核' },
  { n: 3, l: '签署合作协议' },
  { n: 4, l: '开通上架商品' },
]

// ── 合作规则（如实陈述供货/结算/保证金） ──
const rules = [
  { icon: 'package', title: '供货模式', desc: '商家供货入池，由平台各渠道分销；商家负责发货与售后履约。' },
  { icon: 'dollar-sign', title: '结算方式', desc: '按平台结算周期结算，可在「结算与收入」查看结算单与周期说明。' },
  { icon: 'shield-check', title: '保证金', desc: '本平台当前免保证金入驻。（后续如调整以协议为准）' },
]

// ── 条款弹层内容（并入自 terms 页） ──
const merchantSections = [
  { title: '1. 商家资质要求', content: '申请成为热卜平台商家，须具备合法的营业执照或个体工商户登记证明；具备履行本协议及提供相关服务的能力；不存在违法经营记录。个人卖家须提供身份证明及相关资质。' },
  { title: '2. 平台规则遵守', content: '商家须遵守平台内容审核规范，不得发布违法违规内容；须保证商品/服务信息的真实性和准确性；须按时履行与用户达成的交易；须妥善处理用户投诉。' },
  { title: '3. 供货与履约', content: '商家将商品放入平台商品池，由圈子 / 驿站 / 商城 / 站长主推位等渠道分销。商家负责按约定发货、售后与退换货履约，保证商品质量与库存真实。' },
  { title: '4. 结算与费率', content: '平台按结算周期结算商家应得款项，具体费率与结算周期以商家后台费率说明及本协议为准。相关税务由商家自行承担。' },
  { title: '5. 保证金', content: '本平台当前免保证金入驻。若后续政策调整需缴纳保证金，将以届时生效的协议条款为准，并提前告知商家。' },
  { title: '6. 违规处理', content: '商家违反平台规则，平台有权视情节采取警告整改、下架违规商品、暂停权限、解除合作并追缴违规所得等措施；情节严重者将向相关部门举报。' },
  { title: '7. 协议终止', content: '双方均可提前书面通知对方终止本协议。协议终止后，平台将结算商家应得款项，商家须停止使用平台提供的资源与工具。' },
]
const serviceSections = [
  { title: '1. 服务范围', content: '平台为商家提供商品池接入、多渠道分销配置、订单与结算工具、经营数据看板等服务。具体功能以平台实际提供为准，平台可依运营需要迭代调整。' },
  { title: '2. 账号与安全', content: '商家须妥善保管账号与密码，对账号下的一切操作负责。如发现账号异常应及时联系平台处理。' },
  { title: '3. 数据与隐私', content: '平台依法收集与处理经营必要的数据，保护用户与商家信息安全，不向无关第三方泄露。商家不得滥用平台内获取的用户信息。' },
  { title: '4. 责任与免责', content: '因不可抗力、第三方原因或商家自身过错导致的损失，平台在法律允许范围内不承担责任。平台对服务持续性尽合理努力，但不保证不间断可用。' },
  { title: '5. 条款变更', content: '平台可根据法律法规及运营需要修订本条款，修订后将以适当方式公示。商家继续使用即视为接受修订后的条款。' },
]

const termsShow = ref(false)
const termsType = ref<'merchant' | 'service'>('merchant')
const termsTitle = computed(() => (termsType.value === 'merchant' ? '商家入驻协议' : '平台服务条款'))
const termsIntro = computed(() =>
  termsType.value === 'merchant'
    ? '本协议规定了商家在热卜国学文化平台开展供货经营的权利与义务，请在申请入驻前仔细阅读。'
    : '本条款规定了平台向商家提供服务的范围、账号安全、数据隐私与责任边界，请仔细阅读。',
)
const currentTermsSections = computed(() =>
  termsType.value === 'merchant' ? merchantSections : serviceSections,
)

const ctaText = computed(() => (hasApplied.value ? '查看申请状态' : '开始入驻'))

function toggleAgree() {
  agreed.value = !agreed.value
}
function openTerms(type: 'merchant' | 'service') {
  termsType.value = type
  termsShow.value = true
}
function agreeFromSheet() {
  agreed.value = true
  termsShow.value = false
}

function onCta() {
  // 已提交申请：直接进状态页（M3），不重复申请
  if (hasApplied.value) {
    navigateTo('/pkg-merchant/apply/index')
    return
  }
  if (!agreed.value) {
    uni.showToast({ title: '请先阅读并同意入驻协议', icon: 'none' })
    return
  }
  navigateTo('/pkg-merchant/apply/index')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    // 探测是否已提交过申请（后端未申请返回 404 → 抛错，视为未申请）
    await merchantApi.getApplication()
    hasApplied.value = true
  } catch (e) {
    const msg = (e as Error)?.message || ''
    // 404 / 不存在 / 未申请 → 正常的未申请态，展示介绍页
    if (/404|不存在|未申请|未找到|no.*application/i.test(msg)) {
      hasApplied.value = false
    } else if (/登录|未授权|401|token/i.test(msg)) {
      // 未登录也允许浏览介绍页，仅当作未申请
      hasApplied.value = false
    } else {
      // 其余网络/服务异常仍不阻塞介绍页展示，静默降级为未申请
      hasApplied.value = false
    }
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarH.value = sys.statusBarHeight || 0
    safeBottom.value = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
  } catch (e) {
    statusBarH.value = 0
    safeBottom.value = 0
  }
  load()
})
</script>

<style lang="scss" scoped>
$red: #c41e3a;
$gold: #c9a96e;
$paper: #faf8f5;
$card: #fff;
$ink: #2c2c2c;
$ink2: #6e6e73;
$ink3: #9a9a9a;
$line: #ece7e0;
$wash: #f5f1eb;

.page {
  min-height: 100vh;
  background: $paper;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(250, 248, 245, 0.94);
  border-bottom: 1rpx solid $line;
}
.nav-back {
  position: absolute;
  left: 28rpx;
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: $card;
  border: 1rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-family: 'Songti SC', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
}

/* 状态态 */
.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding-top: 260rpx;
}
.state-t {
  font-size: 27rpx;
  color: $ink3;
}
.state-btn {
  padding: 14rpx 44rpx;
  border: 1rpx solid $red;
  border-radius: 999rpx;
}
.state-btn text {
  font-size: 27rpx;
  color: $red;
}

/* 滚动区 */
.scroll {
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
}

/* Hero */
.hero {
  position: relative;
  margin: 32rpx 40rpx 0;
  border-radius: 40rpx;
  padding: 64rpx 44rpx;
  overflow: hidden;
  background: linear-gradient(140deg, #c41e3a, #9e1830);
  box-shadow: 0 20rpx 52rpx rgba(196, 30, 58, 0.28);
}
.hero-deco {
  position: absolute;
  right: -20rpx;
  bottom: -48rpx;
  font-family: 'Songti SC', serif;
  font-size: 240rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.08);
  line-height: 1;
}
.hero-inner {
  position: relative;
  display: flex;
  flex-direction: column;
}
.hero-badge {
  align-self: flex-start;
  border: 1rpx solid rgba(255, 255, 255, 0.4);
  border-radius: 999rpx;
  padding: 6rpx 24rpx;
  margin-bottom: 28rpx;
}
.hero-badge text {
  font-size: 22rpx;
  color: #fff;
  letter-spacing: 2rpx;
}
.hero-h {
  font-family: 'Songti SC', serif;
  font-size: 46rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 24rpx;
}
.hero-s {
  font-size: 24rpx;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.9);
}

/* 分区标题 */
.sect {
  margin: 48rpx 40rpx 0;
}
.sect-t {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.sect-bar {
  width: 8rpx;
  height: 32rpx;
  background: $red;
  border-radius: 4rpx;
}
.sect-tt {
  font-family: 'Songti SC', serif;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
}

/* 流程 */
.flow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.step-n {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: $gold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.step-n text {
  font-family: 'Songti SC', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}
.step-l {
  font-size: 20rpx;
  color: $ink2;
  line-height: 1.45;
}
.flow-arrow {
  padding-top: 16rpx;
}
.flow-arrow text {
  color: $gold;
  font-size: 28rpx;
}

/* 规则卡 */
.rule {
  background: $card;
  border: 1rpx solid $line;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 22rpx;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(80, 60, 40, 0.04);
}
.rule-ic {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: $wash;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rule-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.rule-t {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 6rpx;
}
.rule-d {
  font-size: 22rpx;
  color: $ink2;
  line-height: 1.55;
}

/* 合规提示 */
.anno {
  margin: 28rpx 40rpx 0;
  background: rgba(196, 30, 58, 0.05);
  border: 1rpx solid rgba(196, 30, 58, 0.18);
  border-radius: 18rpx;
  padding: 20rpx 22rpx;
}
.anno-t {
  font-size: 21rpx;
  color: $red;
  line-height: 1.6;
}

/* 条款入口 */
.terms {
  margin: 32rpx 40rpx 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.terms-box {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid $gold;
  border-radius: 10rpx;
  background: rgba(201, 169, 110, 0.12);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.terms-box.on {
  border-color: $red;
  background: rgba(196, 30, 58, 0.08);
}
.terms-txt {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.terms-line {
  font-size: 22rpx;
  color: $ink2;
  line-height: 1.6;
}
.terms-link {
  font-size: 22rpx;
  color: $red;
  text-decoration: underline;
  line-height: 1.6;
}

.bottom-ph {
  height: 160rpx;
}

/* 底部固定 CTA */
.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 28rpx 40rpx 36rpx;
  background: rgba(250, 248, 245, 0.96);
  border-top: 1rpx solid $line;
}
.cta {
  height: 100rpx;
  background: $red;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.32);
}
.cta text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}
.cta.disabled {
  background: #d9b6bd;
  box-shadow: none;
}

/* 条款弹层 */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  max-height: 82vh;
  background: $paper;
  border-radius: 36rpx 36rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sheet-head {
  position: relative;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid $line;
  flex-shrink: 0;
}
.sheet-title {
  font-family: 'Songti SC', serif;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
}
.sheet-close {
  position: absolute;
  right: 32rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-close text {
  font-size: 34rpx;
  color: $ink3;
}
.sheet-scroll {
  flex: 1;
  padding: 32rpx 40rpx;
  box-sizing: border-box;
}
.sheet-update {
  display: block;
  font-size: 22rpx;
  color: $ink3;
  margin-bottom: 20rpx;
}
.sheet-intro {
  display: block;
  font-size: 24rpx;
  color: $ink2;
  line-height: 1.7;
  margin-bottom: 32rpx;
}
.sheet-sec {
  margin-bottom: 32rpx;
}
.sheet-sec-t {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 12rpx;
}
.sheet-sec-c {
  font-size: 24rpx;
  color: $ink2;
  line-height: 1.75;
}
.sheet-foot {
  padding: 20rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $line;
  background: $card;
  flex-shrink: 0;
}
.sheet-btn {
  height: 92rpx;
  background: $red;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-btn text {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
</style>
