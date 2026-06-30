<template>
  <view class="mj-page">
    <!-- 顶部导航 -->
    <view class="mj-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mj-header-inner">
        <view class="mj-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="mj-title">商家入驻</text>
        <text class="mj-header-link" @tap="go('/merchant/apply')">立即入驻</text>
      </view>
    </view>

    <scroll-view scroll-y class="mj-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- Hero Banner -->
      <view class="mj-hero">
        <view class="mj-hero-deco mj-hero-deco1" />
        <view class="mj-hero-deco mj-hero-deco2" />
        <view class="mj-hero-content">
          <view class="mj-hero-badge">
            <AppIcon name="zap" :size="12" color="#ffffff" />
            <text>限时福利</text>
          </view>
          <text class="mj-hero-title">入驻热卜平台</text>
          <text class="mj-hero-sub">千万国学爱好者等你来，开启你的国学生意</text>
          <view class="mj-hero-btns">
            <view class="mj-hero-btn-primary" @tap="go('/merchant/apply')">
              <text>立即入驻</text>
              <AppIcon name="arrow-right" :size="16" color="#c41e3a" />
            </view>
            <view class="mj-hero-btn-outline">
              <text>咨询客服</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 入驻优势 -->
      <view class="mj-section">
        <text class="mj-sec-title">为什么选择我们</text>
        <view class="mj-adv-grid">
          <view v-for="(item, i) in advantages" :key="i" class="mj-adv-card">
            <AppIcon :name="item.icon" :size="32" color="#c41e3a" />
            <text class="mj-adv-high">{{ item.highlight }}</text>
            <text class="mj-adv-name">{{ item.title }}</text>
            <text class="mj-adv-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 入驻流程 -->
      <view class="mj-section mj-section-gray">
        <text class="mj-sec-title">入驻流程</text>
        <view class="mj-steps">
          <view v-for="(item, i) in steps" :key="i" class="mj-step">
            <view class="mj-step-num">{{ item.step }}</view>
            <text class="mj-step-title">{{ item.title }}</text>
            <text class="mj-step-desc">{{ item.desc }}</text>
            <view v-if="i < steps.length - 1" class="mj-step-arrow">
              <AppIcon name="chevron-right" :size="16" color="#bbb" />
            </view>
          </view>
        </view>
      </view>

      <!-- 商家类型 -->
      <view class="mj-section">
        <text class="mj-sec-title">选择店铺类型</text>
        <view class="mj-types">
          <view
            v-for="type in merchantTypes"
            :key="type.id"
            class="mj-type-card"
            :class="{ 'mj-type-active': selectedType === type.id }"
            @tap="selectedType = type.id"
          >
            <view class="mj-type-head">
              <view class="mj-type-head-left">
                <view class="mj-type-name-row">
                  <text class="mj-type-name">{{ type.title }}</text>
                  <text class="mj-type-badge" :class="'mj-badge-' + type.id">{{ type.badge }}</text>
                </view>
                <text class="mj-type-desc">{{ type.desc }}</text>
              </view>
              <view class="mj-type-radio" :class="{ 'mj-type-radio-on': selectedType === type.id }">
                <AppIcon v-if="selectedType === type.id" name="check-circle-2" :size="16" color="#ffffff" />
              </view>
            </view>
            <view class="mj-type-features">
              <text v-for="(f, fi) in type.features" :key="fi" class="mj-type-feat">{{ f }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 成功案例 -->
      <view class="mj-section mj-section-gray">
        <text class="mj-sec-title">成功商家案例</text>
        <scroll-view scroll-x class="mj-cases">
          <view class="mj-cases-row">
            <view v-for="item in successCases" :key="item.id" class="mj-case-card">
              <view class="mj-case-head">
                <view class="mj-case-avatar">{{ item.avatar }}</view>
                <view>
                  <text class="mj-case-name">{{ item.name }}</text>
                  <text class="mj-case-cat">{{ item.category }}</text>
                </view>
              </view>
              <view class="mj-case-mid">
                <view>
                  <text class="mj-case-label">月销售额</text>
                  <text class="mj-case-sales">{{ item.monthSales }}</text>
                </view>
                <view class="mj-case-rating">
                  <AppIcon name="star" :size="12" color="#f59e0b" :fill="true" />
                  <text class="mj-case-rate">{{ item.rating }}</text>
                </view>
              </view>
              <text class="mj-case-desc">{{ item.desc }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 平台数据 -->
      <view class="mj-section">
        <text class="mj-sec-title">平台实力</text>
        <view class="mj-stats">
          <view class="mj-stat">
            <AppIcon name="bar-chart-3" :size="24" color="#c41e3a" />
            <text class="mj-stat-num">1000万+</text>
            <text class="mj-stat-label">注册用户</text>
          </view>
          <view class="mj-stat">
            <AppIcon name="store" :size="24" color="#c41e3a" />
            <text class="mj-stat-num">5000+</text>
            <text class="mj-stat-label">入驻商家</text>
          </view>
          <view class="mj-stat">
            <AppIcon name="truck" :size="24" color="#c41e3a" />
            <text class="mj-stat-num">100万+</text>
            <text class="mj-stat-label">月订单量</text>
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="mj-section mj-section-gray">
        <text class="mj-sec-title">常见问题</text>
        <view class="mj-faqs">
          <view v-for="(faq, i) in faqs" :key="i" class="mj-faq">
            <view class="mj-faq-q" @tap="expandedFaq = expandedFaq === i ? -1 : i">
              <text class="mj-faq-q-txt">{{ faq.q }}</text>
              <view class="mj-faq-chevron" :class="{ 'mj-faq-chevron-on': expandedFaq === i }">
                <AppIcon name="chevron-right" :size="16" color="#999" />
              </view>
            </view>
            <view v-if="expandedFaq === i" class="mj-faq-a">
              <text class="mj-faq-a-txt">{{ faq.a }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部CTA -->
      <view class="mj-section">
        <view class="mj-cta">
          <AppIcon name="gift" :size="40" color="#c41e3a" />
          <text class="mj-cta-title">新商家专属福利</text>
          <text class="mj-cta-sub">现在入驻享30天流量扶持+首月佣金减半</text>
          <view class="mj-cta-btn" @tap="go('/merchant/apply')">
            <text>立即入驻，领取福利</text>
          </view>
        </view>
      </view>

      <view class="mj-bottom-placeholder" />
    </scroll-view>

    <!-- 底部固定按钮 -->
    <view class="mj-footer">
      <view class="mj-footer-outline">
        <AppIcon name="headphones" :size="16" color="#1a1a1a" />
        <text>咨询客服</text>
      </view>
      <view class="mj-footer-primary" @tap="go('/merchant/apply')">
        <text>立即入驻</text>
        <AppIcon name="arrow-right" :size="16" color="#ffffff" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'

const advantages = [
  { icon: 'users', title: '海量用户', desc: '千万级国学爱好者用户群体', highlight: '1000万+' },
  { icon: 'trending-up', title: '流量扶持', desc: '新店流量扶持，快速起步', highlight: '30天' },
  { icon: 'shield', title: '平台保障', desc: '交易担保，资金安全', highlight: '100%' },
  { icon: 'headphones', title: '专属客服', desc: '一对一运营指导服务', highlight: '7x24h' },
]

const steps = [
  { step: 1, title: '提交申请', desc: '填写店铺信息和资质' },
  { step: 2, title: '资质审核', desc: '1-3个工作日完成审核' },
  { step: 3, title: '签订协议', desc: '在线签署入驻协议' },
  { step: 4, title: '开店成功', desc: '发布商品开始经营' },
]

const merchantTypes = [
  { id: 'individual', title: '个人店铺', desc: '适合个人卖家、手艺人', features: ['无需营业执照', '快速入驻', '佣金8%'], badge: '推荐' },
  { id: 'enterprise', title: '企业店铺', desc: '适合公司、品牌商家', features: ['需营业执照', '品牌认证', '佣金5%'], badge: '专业' },
  { id: 'flagship', title: '旗舰店铺', desc: '适合知名品牌、连锁机构', features: ['品牌授权', '专属扶持', '佣金3%'], badge: '尊享' },
]

const successCases = [
  { id: '1', name: '古韵斋', avatar: '古', category: '文房用品', monthSales: '12.8万', rating: 4.9, desc: '入驻3个月，月销突破10万' },
  { id: '2', name: '国学书苑', avatar: '国', category: '国学书籍', monthSales: '8.5万', rating: 4.8, desc: '专注古籍善本，复购率超60%' },
  { id: '3', name: '易道坊', avatar: '易', category: '命理工具', monthSales: '6.2万', rating: 4.9, desc: '罗盘销量全网TOP3' },
]

const faqs = [
  { q: '入驻需要什么条件？', a: '个人店铺需年满18周岁，企业店铺需提供营业执照。所有商家需保证商品质量和售后服务。' },
  { q: '入驻收费吗？', a: '入驻免费，平台按成交订单收取佣金。个人店铺8%，企业店铺5%，旗舰店3%。' },
  { q: '审核需要多久？', a: '一般1-3个工作日完成审核，资料齐全可当日通过。' },
  { q: '可以卖什么商品？', a: '国学相关的书籍、文创、法器、服饰、课程等均可销售，需符合平台规范。' },
]

const selectedType = ref('individual')
const expandedFaq = ref(-1)
const statusBarHeight = ref(0)

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
.mj-page { min-height: 100vh; background: #ffffff; }

/* 顶部导航 */
.mj-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(0,0,0,0.06); }
.mj-header-inner { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 16px; }
.mj-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; }
.mj-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.mj-header-link { font-size: 14px; color: var(--brand); font-weight: 500; }

.mj-scroll { height: 100vh; box-sizing: border-box; }

/* Hero */
.mj-hero { position: relative; background: linear-gradient(135deg, var(--brand) 0%, var(--brand) 60%, #ad1a33 100%); padding: 32px 16px; overflow: hidden; }
.mj-hero-deco { position: absolute; background: rgba(255,255,255,0.06); border-radius: 50%; }
.mj-hero-deco1 { top: -64px; right: -64px; width: 128px; height: 128px; }
.mj-hero-deco2 { bottom: -48px; left: -48px; width: 96px; height: 96px; }
.mj-hero-content { position: relative; }
.mj-hero-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 4px 10px; margin-bottom: 12px; }
.mj-hero-badge text { font-size: 12px; color: #fff; }
.mj-hero-title { display: block; font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.mj-hero-sub { display: block; font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 16px; line-height: 1.5; }
.mj-hero-btns { display: flex; gap: 12px; }
.mj-hero-btn-primary { display: flex; align-items: center; gap: 4px; background: #fff; border-radius: 8px; padding: 10px 20px; }
.mj-hero-btn-primary text { font-size: 14px; font-weight: 600; color: var(--brand); }
.mj-hero-btn-outline { display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 10px 20px; }
.mj-hero-btn-outline text { font-size: 14px; color: #fff; }

/* Section */
.mj-section { padding: 24px 16px; }
.mj-section-gray { background: rgba(0,0,0,0.02); }
.mj-sec-title { display: block; font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; }

/* 优势 */
.mj-adv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mj-adv-card { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; }
.mj-adv-high { font-size: 20px; font-weight: 700; color: var(--brand); margin-top: 8px; }
.mj-adv-name { font-size: 14px; font-weight: 500; color: #1a1a1a; margin-top: 2px; }
.mj-adv-desc { font-size: 12px; color: #999; margin-top: 4px; line-height: 1.4; }

/* 流程 */
.mj-steps { display: flex; align-items: flex-start; justify-content: space-between; }
.mj-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
.mj-step-num { width: 40px; height: 40px; border-radius: 50%; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.mj-step-title { font-size: 12px; font-weight: 500; color: #1a1a1a; }
.mj-step-desc { font-size: 10px; color: #999; margin-top: 2px; line-height: 1.3; }
.mj-step-arrow { position: absolute; top: 12px; right: -8px; }

/* 类型 */
.mj-types { display: flex; flex-direction: column; gap: 12px; }
.mj-type-card { border: 2px solid transparent; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.mj-type-active { border-color: var(--brand); background: rgba(196,30,58,0.05); }
.mj-type-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.mj-type-name-row { display: flex; align-items: center; gap: 8px; }
.mj-type-name { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.mj-type-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; color: #fff; }
.mj-badge-individual { background: var(--brand); }
.mj-badge-enterprise { background: #3b82f6; }
.mj-badge-flagship { background: #f59e0b; }
.mj-type-desc { display: block; font-size: 14px; color: #999; margin-top: 2px; }
.mj-type-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mj-type-radio-on { border-color: var(--brand); background: var(--brand); }
.mj-type-features { display: flex; flex-wrap: wrap; gap: 8px; }
.mj-type-feat { font-size: 12px; padding: 4px 8px; background: rgba(0,0,0,0.04); border-radius: 4px; color: #666; }

/* 案例 */
.mj-cases { width: 100%; white-space: nowrap; }
.mj-cases-row { display: inline-flex; gap: 12px; }
.mj-case-card { width: 224px; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 16px; white-space: normal; }
.mj-case-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.mj-case-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(196,30,58,0.1); color: var(--brand); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
.mj-case-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.mj-case-cat { display: block; font-size: 12px; color: #999; }
.mj-case-mid { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.mj-case-label { display: block; font-size: 12px; color: #999; }
.mj-case-sales { display: block; font-size: 16px; font-weight: 700; color: var(--brand); }
.mj-case-rating { display: flex; align-items: center; gap: 4px; }
.mj-case-rate { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.mj-case-desc { font-size: 12px; color: #999; line-height: 1.4; }

/* 平台数据 */
.mj-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.mj-stat { text-align: center; padding: 16px; background: rgba(0,0,0,0.03); border-radius: 12px; display: flex; flex-direction: column; align-items: center; }
.mj-stat-num { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 8px; }
.mj-stat-label { font-size: 12px; color: #999; margin-top: 2px; }

/* FAQ */
.mj-faqs { display: flex; flex-direction: column; gap: 8px; }
.mj-faq { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; overflow: hidden; }
.mj-faq-q { display: flex; align-items: center; justify-content: space-between; padding: 16px; }
.mj-faq-q-txt { font-size: 14px; font-weight: 500; color: #1a1a1a; flex: 1; }
.mj-faq-chevron { transition: transform 0.2s; }
.mj-faq-chevron-on { transform: rotate(90deg); }
.mj-faq-a { padding: 0 16px 16px; }
.mj-faq-a-txt { font-size: 14px; color: #999; line-height: 1.5; }

/* CTA */
.mj-cta { padding: 24px; background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(196,30,58,0.1)); border: 1px solid rgba(196,30,58,0.2); border-radius: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.mj-cta-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 12px; }
.mj-cta-sub { font-size: 14px; color: #999; margin: 8px 0 16px; }
.mj-cta-btn { width: 100%; background: var(--brand); border-radius: 10px; padding: 14px; }
.mj-cta-btn text { font-size: 16px; font-weight: 600; color: #fff; }

.mj-bottom-placeholder { height: 88px; }

/* 底部固定 */
.mj-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid rgba(0,0,0,0.06); padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 12px; }
.mj-footer-outline { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; padding: 12px; }
.mj-footer-outline text { font-size: 14px; color: #1a1a1a; }
.mj-footer-primary { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; background: var(--brand); border-radius: 8px; padding: 12px; }
.mj-footer-primary text { font-size: 14px; font-weight: 600; color: #fff; }
</style>
