<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi } from '@/lib/operator-data'
import type { PlanCompareRow, OperatorBenefit, EarningCase, FaqItem } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')

const pricing = ref({ price: 0, originalPrice: 0, quotaValue: 0, quotaUnitPrice: 0, quotaCount: 0 })
const planComparison = ref<PlanCompareRow[]>([])
const operatorBenefits = ref<OperatorBenefit[]>([])
const operatorEarningCases = ref<EarningCase[]>([])
const operatorFaqs = ref<FaqItem[]>([])

const expandedFaq = ref<number | null>(null)
const agreed = ref(false)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await operatorApi.joinOperator()
    pricing.value = res.pricing
    planComparison.value = res.planComparison
    operatorBenefits.value = res.benefits
    operatorEarningCases.value = res.earningCases
    operatorFaqs.value = res.faqs
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

function toggleFaq(i: number) {
  expandedFaq.value = expandedFaq.value === i ? null : i
}

function onSubmit() {
  if (!agreed.value) return
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}
</script>

<template>
  <view class="page">
    <app-nav-bar
      title="成为运营商"
      back-icon="arrow-left"
      :title-size="34"
    />

    <scroll-view
      scroll-y
      class="scroll"
    >
      <view
        v-if="loading"
        class="loading-wrap"
      >
        <view class="loading-spinner" />
        <text class="loading-text">
          加载中...
        </text>
      </view>
      <view
        v-else-if="error"
        class="error-wrap"
      >
        <text class="error-text">
          {{ error }}
        </text>
        <view
          class="retry-btn"
          @tap="loadData"
        >
          <text class="retry-txt">
            重试
          </text>
        </view>
      </view>
      <view v-else>
        <!-- Hero Banner -->
        <view class="hero">
          <view class="hero-deco hero-deco-tr" />
          <view class="hero-deco hero-deco-bl" />
          <view class="hero-inner">
            <view class="hero-icon">
              <AppIcon
                name="building-2"
                :size="104"
                color="#fff"
              />
            </view>
            <view class="hero-badge">
              <AppIcon
                name="zap"
                :size="40"
                color="#fff"
              />
              <text class="hero-badge-text">
                限时特惠
              </text>
            </view>
            <text class="hero-title">
              成为热卜运营商
            </text>
            <text class="hero-sub">
              获得6个分站名额，建立您的推广团队
            </text>
            <view class="hero-price">
              <text class="hero-price-now">
                ¥{{ pricing.price }}
              </text>
              <text class="hero-price-old">
                ¥{{ pricing.originalPrice }}
              </text>
            </view>
            <view class="hero-gift">
              <AppIcon
                name="gift"
                :size="44"
                color="#fff"
              />
              <text class="hero-gift-text">
                赠送6个分站名额（价值¥{{ pricing.quotaValue }}）
              </text>
            </view>
          </view>
        </view>

        <!-- 名额说明 -->
        <view class="px">
          <view class="card quota-card">
            <view class="card-title">
              <AppIcon
                name="layers"
                :size="56"
                color="#7c3aed"
              />
              <text class="card-title-text">
                6个分站名额使用说明
              </text>
            </view>
            <view class="quota-grid">
              <view class="quota-item">
                <view class="quota-ic quota-ic-op">
                  <AppIcon
                    name="award"
                    :size="64"
                    color="#7c3aed"
                  />
                </view>
                <text class="quota-num quota-num-op">
                  1个
                </text>
                <text class="quota-desc">
                  自用建站
                </text>
              </view>
              <view class="quota-item">
                <view class="quota-ic quota-ic-gold">
                  <AppIcon
                    name="gift"
                    :size="64"
                    color="#C9A96E"
                  />
                </view>
                <text class="quota-num quota-num-gold">
                  5个
                </text>
                <text class="quota-desc">
                  可售卖 ¥999/个
                </text>
              </view>
            </view>
            <text class="quota-tip">
              售卖5个名额即可回本 ¥4,995，后续收益都是纯利润
            </text>
          </view>
        </view>

        <!-- 权益列表 -->
        <view class="px">
          <view class="card">
            <view class="card-title">
              <AppIcon
                name="crown"
                :size="56"
                color="#C9A96E"
              />
              <text class="card-title-text">
                运营商专属权益
              </text>
            </view>
            <view class="benefit-list">
              <view
                v-for="(item, i) in operatorBenefits"
                :key="i"
                class="benefit-item"
                :class="{ hl: item.highlight }"
              >
                <view
                  class="benefit-ic"
                  :class="{ hl: item.highlight }"
                >
                  <AppIcon
                    :name="item.icon"
                    :size="56"
                    :color="item.highlight ? '#7c3aed' : '#8a8178'"
                  />
                </view>
                <view class="benefit-body">
                  <view class="benefit-head">
                    <text class="benefit-title">
                      {{ item.title }}
                    </text>
                    <text
                      v-if="item.highlight"
                      class="benefit-tag"
                    >
                      核心
                    </text>
                  </view>
                  <text class="benefit-desc">
                    {{ item.desc }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 权益对比表 -->
        <view class="px">
          <view class="card">
            <text class="card-h">
              站长 vs 运营商
            </text>
            <view class="cmp">
              <view class="cmp-row cmp-head">
                <text class="cmp-c cmp-c1">
                  权益
                </text>
                <text class="cmp-c cmp-c2 cmp-station">
                  站长
                </text>
                <text class="cmp-c cmp-c3 cmp-operator">
                  运营商
                </text>
              </view>
              <view
                v-for="(item, i) in planComparison"
                :key="i"
                class="cmp-row"
              >
                <text class="cmp-c cmp-c1">
                  {{ item.feature }}
                </text>
                <view class="cmp-c cmp-c2">
                  <template v-if="typeof item.station === 'boolean'">
                    <AppIcon
                      v-if="item.station"
                      name="check"
                      :size="56"
                      color="#16a34a"
                    />
                    <text
                      v-else
                      class="cmp-dash"
                    >
                      -
                    </text>
                  </template>
                  <text
                    v-else
                    class="cmp-val-station"
                  >
                    {{ item.station }}
                  </text>
                </view>
                <view class="cmp-c cmp-c3">
                  <template v-if="typeof item.operator === 'boolean'">
                    <AppIcon
                      v-if="item.operator"
                      name="check"
                      :size="56"
                      color="#7c3aed"
                    />
                    <text
                      v-else
                      class="cmp-dash"
                    >
                      -
                    </text>
                  </template>
                  <text
                    v-else
                    class="cmp-val-operator"
                  >
                    {{ item.operator }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 收益案例 -->
        <view class="px">
          <view class="card">
            <view class="card-title">
              <AppIcon
                name="sparkles"
                :size="56"
                color="#C9A96E"
              />
              <text class="card-title-text">
                运营商收益案例
              </text>
            </view>
            <view class="case-list">
              <view
                v-for="(item, i) in operatorEarningCases"
                :key="i"
                class="case-item"
              >
                <view class="case-ic">
                  <AppIcon
                    name="building-2"
                    :size="56"
                    color="#7c3aed"
                  />
                </view>
                <view class="case-body">
                  <text class="case-name">
                    {{ item.name }}
                  </text>
                  <text class="case-meta">
                    入驻{{ item.days }}天 · 团队{{ item.teamSize }}人 · 已售{{ item.soldQuota }}个名额
                  </text>
                </view>
                <view class="case-right">
                  <text class="case-earn">
                    ¥{{ fmt(item.earnings) }}
                  </text>
                  <text class="case-earn-label">
                    累计收益
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 常见问题 -->
        <view class="px">
          <view class="card">
            <text class="card-h">
              常见问题
            </text>
            <view class="faq-list">
              <view
                v-for="(faq, i) in operatorFaqs"
                :key="i"
                class="faq-item"
              >
                <view
                  class="faq-q"
                  @tap="toggleFaq(i)"
                >
                  <text class="faq-q-text">
                    {{ faq.q }}
                  </text>
                  <view
                    class="faq-arrow"
                    :class="{ open: expandedFaq === i }"
                  >
                    <AppIcon
                      name="chevron-right"
                      :size="52"
                      color="#8a8178"
                    />
                  </view>
                </view>
                <view
                  v-if="expandedFaq === i"
                  class="faq-a"
                >
                  <text class="faq-a-text">
                    {{ faq.a }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="bottom-gap" />
    </scroll-view>

    <!-- 底部购买栏 -->
    <view class="buybar">
      <view class="buybar-agree">
        <view
          class="agree-box"
          :class="{ on: agreed }"
          @tap="agreed = !agreed"
        >
          <AppIcon
            v-if="agreed"
            name="check"
            :size="44"
            color="#fff"
          />
        </view>
        <text class="agree-text">
          我已阅读并同意
          <text
            class="agree-link"
            @tap="navigateTo('/pkg-operator/agreement-operator/index')"
          >
            《运营商服务协议》
          </text>
        </text>
      </view>
      <view class="buybar-row">
        <view class="buybar-price">
          <view class="buybar-price-line">
            <text class="buybar-price-now">
              ¥{{ pricing.price }}
            </text>
            <text class="buybar-price-old">
              ¥{{ pricing.originalPrice }}
            </text>
          </view>
          <view class="buybar-price-gift">
            <AppIcon
              name="gift"
              :size="40"
              color="#7c3aed"
            />
            <text class="buybar-gift-text">
              含6个分站名额
            </text>
          </view>
        </view>
        <view
          class="buybar-btn"
          :class="{ disabled: !agreed }"
          @tap="onSubmit"
        >
          <text class="buybar-btn-text">
            立即开通
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.scroll { flex: 1; }
.px { padding: 0 32rpx; margin-top: 32rpx; }
.bottom-gap { height: 220rpx; }

/* Hero */
.hero { position: relative; background: #7c3aed; padding: 64rpx 32rpx; overflow: hidden; }
.hero-deco { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.05); }
.hero-deco-tr { width: 320rpx; height: 320rpx; top: -160rpx; right: -160rpx; }
.hero-deco-bl { width: 256rpx; height: 256rpx; bottom: -128rpx; left: -128rpx; }
.hero-inner { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 160rpx; height: 160rpx; border-radius: 32rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.hero-badge { display: inline-flex; align-items: center; gap: 8rpx; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 999rpx; margin-bottom: 24rpx; }
.hero-badge-text { font-size: 24rpx; color: #fff; }
.hero-title { font-size: 48rpx; font-weight: 700; color: #fff; margin-bottom: 16rpx; }
.hero-sub { font-size: 28rpx; color: rgba(255,255,255,0.8); margin-bottom: 32rpx; }
.hero-price { display: flex; align-items: baseline; gap: 16rpx; }
.hero-price-now { font-size: 72rpx; font-weight: 700; color: #fff; line-height: 1; }
.hero-price-old { font-size: 32rpx; color: rgba(255,255,255,0.6); text-decoration: line-through; }
.hero-gift { display: inline-flex; align-items: center; gap: 8rpx; margin-top: 24rpx; padding: 10rpx 24rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; }
.hero-gift-text { font-size: 26rpx; color: #fff; }

/* Card 通用 */
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.card-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 28rpx; }
.card-title-text { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.card-h { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 28rpx; }

/* 名额说明 */
.quota-card { background: linear-gradient(90deg, rgba(124,58,237,0.05), rgba(201,169,110,0.05)); border: 1rpx solid rgba(124,58,237,0.2); }
.quota-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.quota-item { background: #fff; border-radius: 20rpx; padding: 24rpx; display: flex; flex-direction: column; align-items: center; }
.quota-ic { width: 96rpx; height: 96rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.quota-ic-op { background: rgba(124,58,237,0.1); }
.quota-ic-gold { background: rgba(201,169,110,0.1); }
.quota-num { font-size: 40rpx; font-weight: 700; }
.quota-num-op { color: #7c3aed; }
.quota-num-gold { color: #C9A96E; }
.quota-desc { font-size: 22rpx; color: #8a8178; margin-top: 4rpx; }
.quota-tip { display: block; font-size: 22rpx; color: #8a8178; margin-top: 24rpx; text-align: center; }

/* 权益列表 */
.benefit-list { display: flex; flex-direction: column; gap: 20rpx; }
.benefit-item { display: flex; align-items: flex-start; gap: 20rpx; padding: 24rpx; border-radius: 20rpx; background: rgba(44,44,44,0.03); }
.benefit-item.hl { background: rgba(124,58,237,0.05); border: 1rpx solid rgba(124,58,237,0.2); }
.benefit-ic { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: #F2ECE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.benefit-ic.hl { background: rgba(124,58,237,0.1); }
.benefit-body { flex: 1; min-width: 0; }
.benefit-head { display: flex; align-items: center; gap: 12rpx; }
.benefit-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.benefit-tag { font-size: 18rpx; color: #7c3aed; background: rgba(124,58,237,0.1); padding: 2rpx 10rpx; border-radius: 8rpx; }
.benefit-desc { display: block; font-size: 24rpx; color: #8a8178; margin-top: 6rpx; }

/* 对比表 */
.cmp { border: 1rpx solid #EDE7DC; border-radius: 16rpx; overflow: hidden; }
.cmp-row { display: flex; border-top: 1rpx solid #EDE7DC; }
.cmp-row.cmp-head { border-top: none; background: rgba(44,44,44,0.04); }
.cmp-c { padding: 16rpx; font-size: 24rpx; display: flex; align-items: center; }
.cmp-c1 { flex: 1.2; border-right: 1rpx solid #EDE7DC; color: #2C2C2C; }
.cmp-c2 { flex: 1; border-right: 1rpx solid #EDE7DC; justify-content: center; }
.cmp-c3 { flex: 1; justify-content: center; }
.cmp-head .cmp-c { font-weight: 500; }
.cmp-station { color: #16a34a; }
.cmp-operator { color: #7c3aed; }
.cmp-val-station { color: #16a34a; }
.cmp-val-operator { color: #7c3aed; font-weight: 500; }
.cmp-dash { color: #8a8178; }

/* 收益案例 */
.case-list { display: flex; flex-direction: column; gap: 20rpx; }
.case-item { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: rgba(44,44,44,0.03); border-radius: 16rpx; }
.case-ic { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.case-body { flex: 1; min-width: 0; }
.case-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.case-meta { display: block; font-size: 20rpx; color: #8a8178; margin-top: 4rpx; }
.case-right { text-align: right; flex-shrink: 0; }
.case-earn { display: block; font-size: 30rpx; font-weight: 700; color: #C41E3A; }
.case-earn-label { display: block; font-size: 20rpx; color: #8a8178; }

/* FAQ */
.faq-list { display: flex; flex-direction: column; gap: 16rpx; }
.faq-item { border: 1rpx solid #EDE7DC; border-radius: 16rpx; overflow: hidden; }
.faq-q { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; }
.faq-q-text { font-size: 28rpx; font-weight: 500; color: #2C2C2C; flex: 1; }
.faq-arrow { transition: transform 0.2s; }
.faq-arrow.open { transform: rotate(90deg); }
.faq-a { padding: 0 24rpx 24rpx; }
.faq-a-text { font-size: 26rpx; color: #8a8178; line-height: 1.6; }

/* 底部购买栏 */
.buybar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1rpx solid #EDE7DC; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); }
.buybar-agree { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.agree-box { width: 32rpx; height: 32rpx; border-radius: 8rpx; border: 1rpx solid #8a8178; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.agree-box.on { background: #7c3aed; border-color: #7c3aed; }
.agree-text { font-size: 22rpx; color: #8a8178; }
.agree-link { color: #7c3aed; }
.buybar-row { display: flex; align-items: center; gap: 24rpx; }
.buybar-price { flex: 1; }
.buybar-price-line { display: flex; align-items: baseline; gap: 8rpx; }
.buybar-price-now { font-size: 44rpx; font-weight: 700; color: #C41E3A; }
.buybar-price-old { font-size: 26rpx; color: #8a8178; text-decoration: line-through; }
.buybar-price-gift { display: flex; align-items: center; gap: 6rpx; margin-top: 4rpx; }
.buybar-gift-text { font-size: 20rpx; color: #7c3aed; font-weight: 500; }
.buybar-btn { flex: 1; height: 96rpx; background: #7c3aed; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.buybar-btn.disabled { opacity: 0.5; }
.buybar-btn-text { font-size: 30rpx; color: #fff; font-weight: 500; }

/* Loading / Error */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #EDE7DC; border-top-color: #7c3aed; border-radius: 50%; animation: jo-spin 0.8s linear infinite; }
@keyframes jo-spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #8a8178; margin-top: 24rpx; }
.error-text { font-size: 26rpx; color: #ef4444; margin-bottom: 24rpx; }
.retry-btn { padding: 16rpx 48rpx; background: #7c3aed; border-radius: 16rpx; }
.retry-txt { font-size: 26rpx; color: #fff; }
</style>
