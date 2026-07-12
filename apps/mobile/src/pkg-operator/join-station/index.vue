<template>
  <view class="js-page">
    <!-- 自定义导航（statusBarHeight 留白） -->
    <view class="js-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="js-nav-bar">
        <view class="js-nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="js-nav-title">成为站长</text>
        <view class="js-nav-holder" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-loading" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-loading-text">加载中...</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state-error" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-error-text">{{ error }}</text>
      <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
    </view>

    <!-- 正常内容 -->
    <template v-else>
      <scroll-view scroll-y class="js-scroll" :style="{ paddingTop: navHeight + 'px' }">
        <!-- Hero -->
        <view class="js-hero">
          <view class="js-hero-badge">
            <app-icon name="home" :size="30" color="#ffffff" />
          </view>
          <text class="js-hero-title serif">开你的分站</text>
          <text class="js-hero-sub">在平台各板块主推位选品、推广拉客{{ '\n' }}你引流来的客户消费，即为你带来分销佣金</text>
        </view>

        <!-- 运营商邀请归属横幅（仅邀请开通态显示） -->
        <view v-if="invitedByOperator" class="js-invite">
          <view class="js-invite-av">
            <text class="js-invite-av-text">{{ operatorInitial }}</text>
          </view>
          <view class="js-invite-info">
            <text class="js-invite-n">{{ operatorName }} 邀请你开通分站</text>
            <text class="js-invite-s">开通后你将归属该运营商团队</text>
          </view>
          <view class="js-invite-badge"><text class="js-invite-badge-text">邀请码已验证</text></view>
        </view>

        <!-- 费用说明 -->
        <text class="js-sec-title serif">费用说明</text>
        <view class="js-fee">
          <view class="js-fee-tag"><text class="js-fee-tag-text">无门槛加入</text></view>
          <text class="js-fee-name">系统租赁费</text>
          <view class="js-fee-price serif">
            <text class="js-fee-price-yuan">¥</text>
            <text class="js-fee-price-num">999</text>
            <text class="js-fee-price-unit"> / 年</text>
          </view>
          <text class="js-fee-nolimit">开通无门槛 · 人人可开</text>
          <view class="js-fee-div" />
          <text class="js-rule-title">减免与退还规则</text>
          <!-- 原样措辞·勿改 -->
          <view class="js-rule">
            <view class="js-rule-ic waive"><text class="js-rule-ic-text">免</text></view>
            <text class="js-rule-tx">若分站收入累计<text class="js-b">小于 5 倍</text>系统租赁费，则<text class="js-b">不用再交</text>租赁费。</text>
          </view>
          <view class="js-rule">
            <view class="js-rule-ic refund"><text class="js-rule-ic-text">退</text></view>
            <text class="js-rule-tx">若分站收入<text class="js-b">一年内累计达到 10 倍</text>平台系统租赁费，则<text class="js-b">退还</text>租赁费，<text class="js-b">仅限第一年有效</text>。</text>
          </view>
        </view>

        <!-- 开通后你可以 -->
        <text class="js-sec-title serif">开通后你可以</text>
        <view class="js-steps">
          <view class="js-step">
            <view class="js-step-ic"><app-icon name="grid" :size="20" color="#C41E3A" /></view>
            <view class="js-step-body">
              <text class="js-step-n">主推位选品</text>
              <text class="js-step-d">平台每个板块保留 6 个主推位，你从内容库挑选内容锁定</text>
            </view>
          </view>
          <view class="js-step">
            <view class="js-step-ic"><app-icon name="share-2" :size="20" color="#C41E3A" /></view>
            <view class="js-step-body">
              <text class="js-step-n">推广拉客</text>
              <text class="js-step-d">专属推广码 / 海报 / 文案，引流客户到平台消费</text>
            </view>
          </view>
          <view class="js-step">
            <view class="js-step-ic"><app-icon name="trending-up" :size="20" color="#C41E3A" /></view>
            <view class="js-step-body">
              <text class="js-step-n">获得分销佣金</text>
              <text class="js-step-d">归属客户消费后，按约定比例结算佣金</text>
            </view>
          </view>
        </view>

        <!-- 风险提示（合规红线·逐字） -->
        <view class="js-risk">
          <view class="js-risk-t">
            <app-icon name="alert-triangle" :size="15" color="#9A6E24" />
            <text class="js-risk-t-text">加入前请务必阅读</text>
          </view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">请先评估你是否具备推广渠道与资源；若没有推广能力，请勿加入。</text></view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">这是投资行为，存在亏损风险，收益取决于你的推广，平台不作任何收益承诺。</text></view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">请理性决策，量力而行。</text></view>
        </view>

        <!-- 运营商邀请码（选填·自主开通态可填） -->
        <template v-if="!invitedByOperator">
          <text class="js-sec-title serif">运营商邀请码（选填）</text>
          <view class="js-invite-input-card">
            <input
              v-model="inviteCode"
              class="js-invite-input"
              placeholder="如有运营商邀请码请填写"
              placeholder-class="js-invite-ph"
              @blur="verifyInvite"
            />
            <text class="js-invite-input-note">填写并验证邀请码可加入运营商团队；不填写则自主开通。费用规则一致。</text>
          </view>
        </template>

        <!-- 常见问题（逐字照 mockup） -->
        <text class="js-sec-title serif">常见问题</text>
        <view class="js-faqs">
          <view v-for="(f, i) in faqs" :key="i" class="js-faq">
            <view class="js-faq-q" @tap="toggleFaq(i)">
              <text class="js-faq-qt">{{ f.q }}</text>
              <view class="js-faq-ar" :class="{ open: expandedFaq === i }">
                <app-icon name="chevron-right" :size="26" color="#9A9A9A" />
              </view>
            </view>
            <view v-if="expandedFaq === i" class="js-faq-a">
              <text class="js-faq-a-text">{{ f.a }}</text>
            </view>
          </view>
        </view>

        <view class="js-bottom-pad" />
      </scroll-view>

      <!-- 底部 CTA -->
      <view class="js-cta">
        <text class="js-cta-price">系统租赁费 <text class="js-cta-price-b">¥999 / 年</text> · 达标可减免/退还</text>
        <text class="js-cta-hint">点击即表示已阅读并同意 <text class="js-cta-hint-link" @tap="openAgreement">《站长服务协议》</text></text>
        <view class="js-cta-btn" @tap="handleOpen">
          <text class="js-cta-btn-text">{{ invitedByOperator ? '确认开通（归属 ' + operatorName + '）' : '确认开通我的分站' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi } from '@/lib/operator-data'

// ===== 状态栏留白（自定义导航） =====
const statusBarHeight = ref(20)
const navHeight = ref(64)

// ===== 三态 =====
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

// ===== 邀请开通态 =====
const inviteCode = ref('')
const operatorName = ref('')
const invitedByOperator = computed(() => !!operatorName.value)
const operatorInitial = computed(() => operatorName.value ? operatorName.value.charAt(0) : '运')

// ===== FAQ（合规文案·逐字照 mockup-C2） =====
const expandedFaq = ref<number | null>(0)
const faqs = [
  { q: '什么是「主推位」？', a: '平台每个板块保留 6 个主推位，由你从平台内容库挑内容锁定。你引流来的客户浏览平台该板块时，会优先看到你锁定的内容，其余位置照常走平台推荐。你不需要、也不能装修页面。' },
  { q: '999 元租赁费什么情况能减免/退还？', a: '若分站收入累计小于 5 倍系统租赁费，则不用再交租赁费；若分站收入一年内累计达到 10 倍平台系统租赁费，则退还租赁费，仅限第一年有效。' },
  { q: '需要单独注册账号吗？', a: '无需单独注册，沿用你的平台账号即可开通，无分站装修、无独立页面、无独立账号。' },
  { q: '佣金什么时候结算？', a: '归属客户消费后，按平台约定比例结算佣金。佣金仅基于真实交易结算，收益取决于你的实际推广，平台不作任何收益承诺。' },
]

async function fetchData() {
  try {
    // 复用现有数据调用作为三态骨架（费用费率）；页面展示文案以 mockup 为准内联
    await operatorApi.getStationPricing()
    // 读取邀请码入参（运营商邀请开通态）
    const pages = getCurrentPages()
    const cur: any = pages[pages.length - 1]
    const code = cur?.options?.inviteCode || cur?.options?.code || ''
    if (code) {
      inviteCode.value = code
      await verifyInvite()
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  loading.value = true
  error.value = ''
  await fetchData()
}

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = (info.statusBarHeight || 20) + 44
  } catch (e) { /* 降级默认值 */ }
  fetchData()
})

// 验证运营商邀请码（activate/激活接口复用；后端无验证端点时诚实降级为不阻断开通）
async function verifyInvite() {
  const code = inviteCode.value.trim()
  if (!code) { operatorName.value = ''; return }
  // 后端暂无 GET /station/invite/:code 验证端点 → 诚实降级：
  // 仅在提交时把 inviteCode 带给 apply，归属关系由后端解析；此处不虚构运营商姓名。
  // 若后续补齐验证端点，可在此填充 operatorName 以显示归属横幅。
}

function toggleFaq(i: number) {
  expandedFaq.value = expandedFaq.value === i ? null : i
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => navigateTo('/pages/index/index') })
}

function openAgreement() {
  navigateTo('/pkg-operator/agreement-station/index')
}

async function handleOpen() {
  if (submitting.value) return
  submitting.value = true
  try {
    // 沿用平台账号开通 · POST /station/apply { inviteCode? }（后端未开通时提示）
    uni.showToast({ title: '开通功能开发中', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ===== token ===== */
.js-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
.serif { font-family: 'Songti SC', 'STSong', serif; }
.js-b { color: #2C2C2C; font-weight: 600; }

/* ===== 自定义导航 ===== */
.js-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #FAF8F5; }
.js-nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 38rpx; }
.js-nav-back { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: flex-start; margin-left: -20rpx; }
.js-nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.js-nav-holder { width: 88rpx; height: 88rpx; }

.js-scroll { flex: 1; }

/* ===== Hero ===== */
.js-hero { text-align: center; padding: 40rpx 38rpx 46rpx; display: flex; flex-direction: column; align-items: center; }
.js-hero-badge { width: 124rpx; height: 124rpx; border-radius: 35rpx; margin-bottom: 30rpx; background: linear-gradient(135deg, #C41E3A, #A01828); display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 20rpx rgba(196,30,58,0.32); }
.js-hero-title { font-size: 50rpx; font-weight: 700; color: #2C2C2C; }
.js-hero-sub { font-size: 25rpx; color: #6E6E73; margin-top: 19rpx; line-height: 1.7; }

/* ===== 邀请归属横幅 ===== */
.js-invite { margin: 0 38rpx 8rpx; background: linear-gradient(135deg, rgba(201,169,110,0.16), rgba(201,169,110,0.06)); border: 1rpx solid rgba(201,169,110,0.4); border-radius: 27rpx; padding: 25rpx 29rpx; display: flex; align-items: center; gap: 23rpx; }
.js-invite-av { width: 77rpx; height: 77rpx; border-radius: 999rpx; flex-shrink: 0; background: linear-gradient(135deg, #C9A96E, #B8935A); display: flex; align-items: center; justify-content: center; }
.js-invite-av-text { color: #fff; font-weight: 600; font-size: 30rpx; }
.js-invite-info { flex: 1; min-width: 0; }
.js-invite-n { font-size: 27rpx; font-weight: 600; color: #2C2C2C; }
.js-invite-s { display: block; font-size: 21rpx; color: #6E6E73; margin-top: 6rpx; }
.js-invite-badge { flex-shrink: 0; background: rgba(46,139,87,0.12); border-radius: 13rpx; padding: 6rpx 15rpx; }
.js-invite-badge-text { font-size: 19rpx; color: #2E8B57; }

/* ===== 区块标题 ===== */
.js-sec-title { display: block; font-size: 31rpx; font-weight: 600; color: #2C2C2C; padding: 27rpx 38rpx 23rpx; }

/* ===== 费用卡 ===== */
.js-fee { margin: 0 38rpx; background: #FFFFFF; border: 4rpx solid #C9A96E; border-radius: 35rpx; padding: 42rpx 38rpx; position: relative; box-shadow: 0 2rpx 20rpx rgba(201,169,110,0.14); }
.js-fee-tag { position: absolute; top: 0; right: 42rpx; background: #C9A96E; border-radius: 0 0 17rpx 17rpx; padding: 8rpx 23rpx; }
.js-fee-tag-text { font-size: 21rpx; font-weight: 600; color: #fff; }
.js-fee-name { font-size: 27rpx; font-weight: 600; color: #6E6E73; }
.js-fee-price { display: flex; align-items: baseline; margin-top: 15rpx; }
.js-fee-price-yuan { font-size: 35rpx; font-weight: 700; color: #C41E3A; }
.js-fee-price-num { font-size: 73rpx; font-weight: 700; color: #C41E3A; line-height: 1; }
.js-fee-price-unit { font-size: 29rpx; color: #9A9A9A; font-weight: 500; }
.js-fee-nolimit { display: block; font-size: 23rpx; color: #9A9A9A; margin-top: 15rpx; }
.js-fee-div { height: 1rpx; background: #EFEBE4; margin: 35rpx 0; }
.js-rule-title { display: block; font-size: 25rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 23rpx; }
.js-rule { display: flex; gap: 21rpx; align-items: flex-start; margin-top: 21rpx; }
.js-rule-ic { width: 54rpx; height: 54rpx; border-radius: 17rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.js-rule-ic.waive { background: rgba(46,139,87,0.12); }
.js-rule-ic.refund { background: rgba(196,30,58,0.1); }
.js-rule-ic-text { font-size: 25rpx; font-weight: 600; }
.js-rule-ic.waive .js-rule-ic-text { color: #2E8B57; }
.js-rule-ic.refund .js-rule-ic-text { color: #C41E3A; }
.js-rule-tx { flex: 1; font-size: 24rpx; color: #6E6E73; line-height: 1.7; }

/* ===== 权益步骤 ===== */
.js-steps { padding: 0 38rpx; display: flex; flex-direction: column; gap: 19rpx; }
.js-step { background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 27rpx 31rpx; display: flex; gap: 25rpx; align-items: flex-start; }
.js-step-ic { width: 73rpx; height: 73rpx; border-radius: 21rpx; background: rgba(196,30,58,0.08); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.js-step-body { flex: 1; }
.js-step-n { font-size: 27rpx; font-weight: 600; color: #2C2C2C; }
.js-step-d { display: block; font-size: 23rpx; color: #6E6E73; margin-top: 8rpx; line-height: 1.6; }

/* ===== 风险提示 ===== */
.js-risk { margin: 31rpx 38rpx 0; background: #FCF3E4; border-left: 6rpx solid #DDA149; border-radius: 23rpx; padding: 31rpx; }
.js-risk-t { display: flex; align-items: center; gap: 12rpx; margin-bottom: 19rpx; }
.js-risk-t-text { font-size: 25rpx; font-weight: 700; color: #9A6E24; }
.js-risk-i { display: flex; gap: 15rpx; margin-top: 12rpx; align-items: flex-start; }
.js-risk-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #DDA149; flex-shrink: 0; margin-top: 13rpx; }
.js-risk-i-text { flex: 1; font-size: 23rpx; color: #8a6a30; line-height: 1.7; }

/* ===== 邀请码输入 ===== */
.js-invite-input-card { margin: 0 38rpx; background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 31rpx; }
.js-invite-input { height: 88rpx; background: rgba(138,129,120,0.06); border-radius: 17rpx; padding: 0 27rpx; font-size: 26rpx; color: #2C2C2C; }
.js-invite-ph { color: #9A9A9A; }
.js-invite-input-note { display: block; font-size: 21rpx; color: #9A9A9A; margin-top: 19rpx; line-height: 1.6; }

/* ===== FAQ ===== */
.js-faqs { padding: 0 38rpx; display: flex; flex-direction: column; gap: 17rpx; }
.js-faq { background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 29rpx 31rpx; }
.js-faq-q { display: flex; align-items: center; justify-content: space-between; gap: 19rpx; min-height: 44rpx; }
.js-faq-qt { font-size: 27rpx; font-weight: 500; color: #2C2C2C; flex: 1; }
.js-faq-ar { flex-shrink: 0; transition: transform 0.2s; }
.js-faq-ar.open { transform: rotate(90deg); }
.js-faq-a { margin-top: 19rpx; }
.js-faq-a-text { font-size: 24rpx; color: #6E6E73; line-height: 1.75; }

.js-bottom-pad { height: 60rpx; }

/* ===== 底部 CTA ===== */
.js-cta { background: #FFFFFF; border-top: 1rpx solid #EFEBE4; padding: 27rpx 38rpx calc(46rpx + env(safe-area-inset-bottom)); }
.js-cta-price { display: block; font-size: 23rpx; color: #6E6E73; text-align: center; margin-bottom: 12rpx; }
.js-cta-price-b { color: #C41E3A; font-size: 31rpx; font-weight: 700; }
.js-cta-hint { display: block; font-size: 21rpx; color: #9A9A9A; text-align: center; margin-bottom: 21rpx; }
.js-cta-hint-link { color: #C41E3A; }
.js-cta-btn { height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 20rpx rgba(196,30,58,0.3); }
.js-cta-btn-text { font-size: 31rpx; font-weight: 600; color: #fff; }

/* ===== 三态 ===== */
.state-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
.state-loading-text { font-size: 28rpx; color: #6E6E73; }
.state-error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx; }
.state-error-text { font-size: 28rpx; color: #C41E3A; text-align: center; }
.state-retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.state-retry-btn text { font-size: 28rpx; color: #fff; }
</style>
