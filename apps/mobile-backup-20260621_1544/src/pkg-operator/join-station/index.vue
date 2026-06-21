<template>
  <view class="js-page">
    <app-nav-bar
      title="成为分站站长"
      :border="true"
    />

    <scroll-view
      scroll-y
      class="js-scroll"
    >
      <view
        v-if="loading"
        class="js-loading"
      >
        <view class="js-loading-spinner" />
        <text class="js-loading-text">
          加载中...
        </text>
      </view>
      <view
        v-else-if="error"
        class="js-error"
      >
        <text class="js-error-text">
          {{ error }}
        </text>
        <view
          class="js-retry-btn"
          @tap="loadData"
        >
          <text class="js-retry-txt">
            重试
          </text>
        </view>
      </view>
      <view v-else>
        <!-- Hero -->
        <view class="js-hero">
          <view class="js-hero-deco1" />
          <view class="js-hero-deco2" />
          <view class="js-hero-inner">
            <view class="js-hero-icon">
              <app-icon
                name="award"
                :size="64"
                color="#ffffff"
              />
            </view>
            <view class="js-hero-badge">
              <app-icon
                name="zap"
                :size="22"
                color="#ffffff"
              />
              <text class="js-hero-badge-text">
                限时优惠
              </text>
            </view>
            <text class="js-hero-title">
              成为热卜分站站长
            </text>
            <text class="js-hero-sub">
              建立专属入口，享受平台分佣收益
            </text>
            <view class="js-hero-price">
              <text class="js-hero-price-now">
                ¥{{ pricing.price }}
              </text>
              <text class="js-hero-price-old">
                ¥{{ pricing.originalPrice }}
              </text>
              <text class="js-hero-price-unit">
                /年
              </text>
            </view>
          </view>
        </view>

        <!-- 站长专属权益 -->
        <view class="js-sec">
          <view class="js-card">
            <view class="js-card-title">
              <app-icon
                name="crown"
                :size="28"
                color="#C9A96E"
              />
              <text class="js-card-title-text">
                站长专属权益
              </text>
            </view>
            <view class="js-benefits">
              <view
                v-for="(b, i) in stationBenefits"
                :key="i"
                class="js-benefit"
                :class="{ hl: b.highlight }"
              >
                <view
                  class="js-benefit-icon"
                  :class="{ hl: b.highlight }"
                >
                  <app-icon
                    :name="b.icon"
                    :size="36"
                    :color="b.highlight ? '#16a34a' : '#8a8178'"
                  />
                </view>
                <view class="js-benefit-body">
                  <view class="js-benefit-head">
                    <text class="js-benefit-title">
                      {{ b.title }}
                    </text>
                    <text
                      v-if="b.highlight"
                      class="js-benefit-tag"
                    >
                      核心
                    </text>
                  </view>
                  <text class="js-benefit-desc">
                    {{ b.desc }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 分佣收益说明 -->
        <view class="js-sec">
          <view class="js-card js-commission">
            <view class="js-card-title">
              <app-icon
                name="trending-up"
                :size="28"
                color="#16a34a"
              />
              <text class="js-card-title-text">
                分佣收益说明
              </text>
            </view>
            <view class="js-comm-rows">
              <view class="js-comm-row">
                <text class="js-comm-label">
                  入圈费用分佣
                </text>
                <text class="js-comm-val green">
                  10%-30%
                </text>
              </view>
              <view class="js-comm-row">
                <text class="js-comm-label">
                  用户永久归属
                </text>
                <text class="js-comm-val green">
                  终身绑定
                </text>
              </view>
              <view class="js-comm-row">
                <text class="js-comm-label">
                  结算周期
                </text>
                <text class="js-comm-val dark">
                  每月15日
                </text>
              </view>
            </view>
            <text class="js-comm-note">
              * 用户通过您的分站链接注册后永久归属您，其入圈消费您都将获得分佣
            </text>
          </view>
        </view>

        <!-- 站长收益案例 -->
        <view class="js-sec">
          <view class="js-card">
            <view class="js-card-title">
              <app-icon
                name="sparkles"
                :size="28"
                color="#C9A96E"
              />
              <text class="js-card-title-text">
                站长收益案例
              </text>
            </view>
            <view class="js-cases">
              <view
                v-for="(c, i) in stationEarningCases"
                :key="i"
                class="js-case"
              >
                <view class="js-case-icon">
                  <app-icon
                    name="award"
                    :size="36"
                    color="#16a34a"
                  />
                </view>
                <view class="js-case-body">
                  <text class="js-case-name">
                    {{ c.name }}
                  </text>
                  <text class="js-case-meta">
                    入驻{{ c.days }}天 · {{ c.users }}位用户
                  </text>
                </view>
                <view class="js-case-right">
                  <text class="js-case-earn">
                    ¥{{ c.earnings.toLocaleString() }}
                  </text>
                  <text class="js-case-label">
                    累计收益
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 运营商邀请码 -->
        <view class="js-sec">
          <view class="js-card">
            <text class="js-invite-title">
              运营商邀请码（选填）
            </text>
            <input
              v-model="inviteCode"
              class="js-invite-input"
              placeholder="如有运营商邀请码请填写"
              placeholder-class="js-invite-ph"
            >
            <text class="js-invite-note">
              填写邀请码可加入运营商团队，享受团队支持和培训
            </text>
          </view>
        </view>

        <!-- 常见问题 -->
        <view class="js-sec">
          <view class="js-card">
            <text class="js-card-title-text plain">
              常见问题
            </text>
            <view class="js-faqs">
              <view
                v-for="(f, i) in stationFaqs"
                :key="i"
                class="js-faq"
              >
                <view
                  class="js-faq-q"
                  @tap="toggleFaq(i)"
                >
                  <text class="js-faq-q-text">
                    {{ f.q }}
                  </text>
                  <view
                    class="js-faq-arrow"
                    :class="{ open: expandedFaq === i }"
                  >
                    <app-icon
                      name="chevron-right"
                      :size="26"
                      color="#8a8178"
                    />
                  </view>
                </view>
                <view
                  v-if="expandedFaq === i"
                  class="js-faq-a"
                >
                  <text class="js-faq-a-text">
                    {{ f.a }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="js-bottom-pad" />
    </scroll-view>

    <!-- 底部购买栏 -->
    <view class="js-buybar">
      <view
        class="js-agree"
        @tap="agreed = !agreed"
      >
        <view
          class="js-agree-box"
          :class="{ on: agreed }"
        >
          <app-icon
            v-if="agreed"
            name="check"
            :size="22"
            color="#ffffff"
          />
        </view>
        <text class="js-agree-text">
          我已阅读并同意<text
            class="js-agree-link"
            @tap.stop="openAgreement"
          >
            《分站服务协议》
          </text>
        </text>
      </view>
      <view class="js-buybar-row">
        <view class="js-buybar-price">
          <view class="js-buybar-price-line">
            <text class="js-buybar-price-now">
              ¥{{ pricing.price }}
            </text>
            <text class="js-buybar-price-old">
              ¥{{ pricing.originalPrice }}
            </text>
          </view>
          <view class="js-buybar-valid">
            <app-icon
              name="clock"
              :size="22"
              color="#8a8178"
            />
            <text class="js-buybar-valid-text">
              有效期1年
            </text>
          </view>
        </view>
        <view
          class="js-buybar-btn"
          :class="{ disabled: !agreed }"
          @tap="handleBuy"
        >
          <text class="js-buybar-btn-text">
            立即开通
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi } from '@/lib/operator-data'
import type { OperatorBenefit, StationEarningCase, FaqItem } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')

const pricing = ref({ price: 0, originalPrice: 0 })
const stationBenefits = ref<OperatorBenefit[]>([])
const stationEarningCases = ref<StationEarningCase[]>([])
const stationFaqs = ref<FaqItem[]>([])

const inviteCode = ref('')
const expandedFaq = ref<number | null>(null)
const agreed = ref(false)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await operatorApi.joinStation()
    pricing.value = res.pricing
    stationBenefits.value = res.benefits
    stationEarningCases.value = res.earningCases
    stationFaqs.value = res.faqs
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

function openAgreement() {
  navigateTo('/pkg-operator/agreement-station/index')
}

function handleBuy() {
  if (!agreed.value) {
    uni.showToast({ title: '请先阅读并同意服务协议', icon: 'none' })
    return
  }
  uni.showToast({ title: '开通功能开发中', icon: 'none' })
}
</script>

<style scoped>
.js-page { display: flex; flex-direction: column; height: 100vh; background: #f5f2ec; }
.js-scroll { flex: 1; }

/* Hero */
.js-hero { position: relative; background: #16a34a; padding: 64rpx 32rpx; overflow: hidden; }
.js-hero-deco1 { position: absolute; top: 0; right: 0; width: 280rpx; height: 280rpx; background: rgba(255,255,255,0.05); border-radius: 50%; transform: translate(50%, -50%); }
.js-hero-deco2 { position: absolute; bottom: 0; left: 0; width: 220rpx; height: 220rpx; background: rgba(255,255,255,0.05); border-radius: 50%; transform: translate(-50%, 50%); }
.js-hero-inner { position: relative; display: flex; flex-direction: column; align-items: center; }
.js-hero-icon { width: 140rpx; height: 140rpx; border-radius: 32rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.js-hero-badge { display: inline-flex; align-items: center; gap: 6rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; padding: 6rpx 20rpx; margin-bottom: 20rpx; }
.js-hero-badge-text { font-size: 22rpx; color: #fff; }
.js-hero-title { font-size: 40rpx; font-weight: 700; color: #fff; margin-bottom: 12rpx; }
.js-hero-sub { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-bottom: 28rpx; }
.js-hero-price { display: flex; align-items: baseline; gap: 12rpx; }
.js-hero-price-now { font-size: 64rpx; font-weight: 700; color: #fff; }
.js-hero-price-old { font-size: 32rpx; color: rgba(255,255,255,0.6); text-decoration: line-through; }
.js-hero-price-unit { font-size: 26rpx; color: rgba(255,255,255,0.8); }

/* Card 通用 */
.js-sec { padding: 0 32rpx; margin-top: 32rpx; }
.js-card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.js-card-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 32rpx; }
.js-card-title-text { font-size: 30rpx; font-weight: 500; color: #2a2a2a; }
.js-card-title-text.plain { display: block; margin-bottom: 24rpx; }

/* 权益 */
.js-benefits { display: flex; flex-direction: column; gap: 24rpx; }
.js-benefit { display: flex; align-items: flex-start; gap: 24rpx; padding: 24rpx; border-radius: 20rpx; background: rgba(138,129,120,0.08); }
.js-benefit.hl { background: rgba(22,163,74,0.05); border: 1rpx solid rgba(22,163,74,0.2); }
.js-benefit-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: rgba(138,129,120,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.js-benefit-icon.hl { background: rgba(22,163,74,0.1); }
.js-benefit-body { flex: 1; }
.js-benefit-head { display: flex; align-items: center; gap: 12rpx; }
.js-benefit-title { font-size: 28rpx; font-weight: 500; color: #2a2a2a; }
.js-benefit-tag { font-size: 18rpx; color: #16a34a; background: rgba(22,163,74,0.1); border-radius: 6rpx; padding: 2rpx 10rpx; }
.js-benefit-desc { display: block; font-size: 24rpx; color: #8a8178; margin-top: 6rpx; }

/* 分佣说明 */
.js-commission { background: linear-gradient(90deg, rgba(22,163,74,0.05), rgba(201,169,110,0.05)); border: 1rpx solid rgba(22,163,74,0.2); }
.js-comm-rows { display: flex; flex-direction: column; gap: 16rpx; }
.js-comm-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx; background: #fff; border-radius: 16rpx; }
.js-comm-label { font-size: 26rpx; color: #8a8178; }
.js-comm-val { font-size: 26rpx; font-weight: 700; }
.js-comm-val.green { color: #16a34a; }
.js-comm-val.dark { color: #2a2a2a; }
.js-comm-note { display: block; font-size: 18rpx; color: #8a8178; margin-top: 24rpx; }

/* 收益案例 */
.js-cases { display: flex; flex-direction: column; gap: 24rpx; }
.js-case { display: flex; align-items: center; gap: 24rpx; padding: 16rpx; background: rgba(138,129,120,0.08); border-radius: 16rpx; }
.js-case-icon { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(22,163,74,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.js-case-body { flex: 1; }
.js-case-name { font-size: 28rpx; font-weight: 500; color: #2a2a2a; }
.js-case-meta { display: block; font-size: 18rpx; color: #8a8178; margin-top: 4rpx; }
.js-case-right { text-align: right; }
.js-case-earn { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.js-case-label { display: block; font-size: 18rpx; color: #8a8178; margin-top: 4rpx; }

/* 邀请码 */
.js-invite-title { display: block; font-size: 30rpx; font-weight: 500; color: #2a2a2a; margin-bottom: 24rpx; }
.js-invite-input { height: 80rpx; background: rgba(138,129,120,0.08); border-radius: 16rpx; padding: 0 24rpx; font-size: 26rpx; color: #2a2a2a; }
.js-invite-ph { color: #8a8178; }
.js-invite-note { display: block; font-size: 18rpx; color: #8a8178; margin-top: 16rpx; }

/* FAQ */
.js-faqs { display: flex; flex-direction: column; gap: 16rpx; }
.js-faq { border: 1rpx solid #ece7df; border-radius: 16rpx; overflow: hidden; }
.js-faq-q { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; }
.js-faq-q-text { font-size: 26rpx; font-weight: 500; color: #2a2a2a; }
.js-faq-arrow { transition: transform 0.2s; }
.js-faq-arrow.open { transform: rotate(90deg); }
.js-faq-a { padding: 0 24rpx 24rpx; }
.js-faq-a-text { font-size: 26rpx; color: #8a8178; line-height: 1.5; }

.js-bottom-pad { height: 64rpx; }

/* 底部购买栏 */
.js-buybar { background: #fff; border-top: 1rpx solid #ece7df; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); }
.js-agree { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.js-agree-box { width: 32rpx; height: 32rpx; border-radius: 8rpx; border: 1rpx solid #8a8178; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.js-agree-box.on { background: #16a34a; border-color: #16a34a; }
.js-agree-text { font-size: 22rpx; color: #8a8178; }
.js-agree-link { color: #16a34a; }
.js-buybar-row { display: flex; align-items: center; gap: 24rpx; }
.js-buybar-price { flex: 1; }
.js-buybar-price-line { display: flex; align-items: baseline; gap: 8rpx; }
.js-buybar-price-now { font-size: 44rpx; font-weight: 700; color: #C41E3A; }
.js-buybar-price-old { font-size: 26rpx; color: #8a8178; text-decoration: line-through; }
.js-buybar-valid { display: flex; align-items: center; gap: 6rpx; margin-top: 4rpx; }
.js-buybar-valid-text { font-size: 18rpx; color: #8a8178; }
.js-buybar-btn { flex: 1; height: 96rpx; background: #16a34a; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.js-buybar-btn.disabled { opacity: 0.5; }
.js-buybar-btn-text { font-size: 30rpx; color: #fff; font-weight: 500; }

.js-loading, .js-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.js-loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #EDE7DC; border-top-color: #16a34a; border-radius: 50%; animation: js-spin 0.8s linear infinite; }
@keyframes js-spin { to { transform: rotate(360deg); } }
.js-loading-text { font-size: 26rpx; color: #8a8178; margin-top: 24rpx; }
.js-error-text { font-size: 26rpx; color: #ef4444; margin-bottom: 24rpx; }
.js-retry-btn { padding: 16rpx 48rpx; background: #16a34a; border-radius: 16rpx; }
.js-retry-txt { font-size: 26rpx; color: #fff; }
</style>
