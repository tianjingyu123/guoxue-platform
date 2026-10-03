<template>
  <view class="cs-page">
    <view class="cs-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cs-nav__inner">
        <view class="cs-nav__btn" role="button" aria-label="返回" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#183249" />
        </view>
        <view class="cs-nav__title">
          <text>内容资产</text>
          <text class="cs-nav__sub">用内容沉淀信任，而不只是陈列商品</text>
        </view>
        <view class="cs-nav__btn" role="button" aria-label="刷新数据" @tap="load">
          <AppIcon name="refresh-cw" :size="18" color="#6f7f8b" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cs-scroll" :style="{ top: navH + 'px' }">
      <view v-if="loading" class="cs-state">
        <view class="cs-loader" />
        <text>正在整理内容资产…</text>
      </view>
      <view v-else-if="error" class="cs-state">
        <AppIcon name="alert-circle" :size="38" color="#b9364f" />
        <text class="cs-state__title">暂时无法读取内容数据</text>
        <text class="cs-state__desc">{{ error }}</text>
        <view class="cs-retry" role="button" @tap="load">重新加载</view>
      </view>

      <view v-else-if="stats" class="cs-shell">
        <view class="cs-hero">
          <view class="cs-hero__orb cs-hero__orb--one" />
          <view class="cs-hero__orb cs-hero__orb--two" />
          <text class="cs-eyebrow">CONTENT ASSET MAP</text>
          <text class="cs-hero__title">内容资产图谱</text>
          <text class="cs-hero__desc">商品负责承接需求，文章负责建立理解。两类资产协同，销售才能自然发生。</text>
          <view class="cs-hero__summary">
            <view>
              <text class="cs-hero__number">{{ totalAssets }}</text>
              <text class="cs-hero__label">有效资产</text>
            </view>
            <view>
              <text class="cs-hero__number">{{ stats.totalViews }}</text>
              <text class="cs-hero__label">文章阅读</text>
            </view>
            <view>
              <text class="cs-hero__number">{{ stats.totalLikes }}</text>
              <text class="cs-hero__label">文章点赞</text>
            </view>
          </view>
        </view>

        <view class="cs-section-head">
          <view>
            <text class="cs-section-head__eyebrow">COMMERCE</text>
            <text class="cs-section-head__title">商品承接</text>
          </view>
          <view class="cs-section-head__link" role="link" @tap="go('/merchant/products')">管理商品 ›</view>
        </view>
        <view class="cs-product">
          <view class="cs-product__ring" :style="{ '--rate': productPublishRate + '%' }">
            <view class="cs-product__ring-inner">
              <text>{{ productPublishRate }}%</text>
              <text>上架率</text>
            </view>
          </view>
          <view class="cs-product__body">
            <text class="cs-product__title">{{ productHeadline }}</text>
            <text class="cs-product__desc">{{ productGuidance }}</text>
            <view class="cs-product__stats">
              <view><text>{{ stats.totalProducts }}</text><text>商品总数</text></view>
              <view><text>{{ stats.publishedProducts }}</text><text>正在销售</text></view>
              <view><text>{{ stats.draftProducts }}</text><text>待完善</text></view>
            </view>
          </view>
        </view>

        <view class="cs-section-head">
          <view>
            <text class="cs-section-head__eyebrow">TRUST</text>
            <text class="cs-section-head__title">文章影响力</text>
          </view>
          <view class="cs-section-head__link" role="link" @tap="go('/pages/circles/index')">进入圈子创作 ›</view>
        </view>
        <view class="cs-article">
          <view class="cs-article__lead">
            <view class="cs-article__icon">
              <AppIcon name="file-text" :size="23" color="#fff" />
            </view>
            <view class="cs-article__copy">
              <text>{{ articleHeadline }}</text>
              <text>{{ articleGuidance }}</text>
            </view>
          </view>
          <view class="cs-article__metrics">
            <view>
              <text class="cs-article__value">{{ stats.publishedArticles }}</text>
              <text class="cs-article__label">已发布文章</text>
            </view>
            <view>
              <text class="cs-article__value">{{ averageViews }}</text>
              <text class="cs-article__label">篇均阅读</text>
            </view>
            <view>
              <text class="cs-article__value">{{ engagementRate }}</text>
              <text class="cs-article__label">点赞阅读比</text>
            </view>
          </view>
          <view class="cs-article__note">
            <AppIcon name="info" :size="14" color="#9b7441" />
            <text>文章必须从有发布权限的圈子发布；这里只汇总与你店铺账号绑定、且已审核通过的真实文章数据。</text>
          </view>
        </view>

        <view class="cs-section-head">
          <view>
            <text class="cs-section-head__eyebrow">NEXT BEST ACTION</text>
            <text class="cs-section-head__title">下一步建议</text>
          </view>
        </view>
        <view class="cs-actions">
          <view v-for="(item, index) in actionList" :key="item.title" class="cs-action" role="link" @tap="go(item.path)">
            <text class="cs-action__index">0{{ index + 1 }}</text>
            <view class="cs-action__body">
              <text class="cs-action__title">{{ item.title }}</text>
              <text class="cs-action__desc">{{ item.desc }}</text>
            </view>
            <text class="cs-action__arrow">›</text>
          </view>
        </view>

        <view class="cs-footnote">
          <AppIcon name="shield" :size="13" color="#939b9f" />
          <text>本页只展示真实聚合数据；没有阅读或互动时保持为 0，不伪造曝光与增长。</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { merchantBackendApi, type MerchantContentStats } from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(20)
const navH = ref(64)
uni.getSystemInfo({
  success: (r) => {
    statusBarHeight.value = r.statusBarHeight || 20
    navH.value = (r.statusBarHeight || 20) + 44
  },
})

const stats = ref<MerchantContentStats | null>(null)
const loading = ref(true)
const error = ref('')
const previewMode = import.meta.env.DEV && String(globalThis.location?.search || '').includes('__preview=1')

const previewStats: MerchantContentStats = {
  totalProducts: 18,
  publishedProducts: 12,
  draftProducts: 6,
  publishedArticles: 7,
  totalViews: 4862,
  totalLikes: 326,
}

const totalAssets = computed(() =>
  (stats.value?.publishedProducts || 0) + (stats.value?.publishedArticles || 0),
)
const productPublishRate = computed(() => {
  const total = stats.value?.totalProducts || 0
  return total > 0 ? Math.round(((stats.value?.publishedProducts || 0) / total) * 100) : 0
})
const averageViews = computed(() => {
  const count = stats.value?.publishedArticles || 0
  return count > 0 ? Math.round((stats.value?.totalViews || 0) / count) : 0
})
const engagementRate = computed(() => {
  const views = stats.value?.totalViews || 0
  return views > 0 ? `${(((stats.value?.totalLikes || 0) / views) * 100).toFixed(1)}%` : '0%'
})
const productHeadline = computed(() => {
  if (!stats.value?.totalProducts) return '先建立第一份可承接需求的商品资产'
  if (stats.value.draftProducts > 0) return `${stats.value.draftProducts} 件商品仍可补齐后上架`
  return '商品资产已全部进入可销售状态'
})
const productGuidance = computed(() =>
  stats.value?.draftProducts
    ? '优先完善主图、卖点、库存与售后承诺，避免内容种草后无法顺畅承接成交。'
    : '继续关注库存、履约和评价，让内容推荐后的购买体验保持稳定。',
)
const articleHeadline = computed(() =>
  stats.value?.publishedArticles ? '你的专业内容正在持续沉淀信任' : '还没有形成可复用的专业内容资产',
)
const articleGuidance = computed(() =>
  stats.value?.publishedArticles
    ? `已有 ${stats.value.publishedArticles} 篇审核通过文章，可结合真实场景自然挂载相关商品。`
    : '从用户常见问题出发写第一篇文章，比直接陈列商品更容易建立理解与信任。',
)
const actionList = computed(() => {
  const items: Array<{ title: string; desc: string; path: string }> = []
  if ((stats.value?.draftProducts || 0) > 0) {
    items.push({
      title: `完善 ${stats.value?.draftProducts || 0} 件待上架商品`,
      desc: '补齐主图、卖点、库存和服务承诺，让内容推荐有可靠承接。',
      path: '/merchant/products',
    })
  }
  if (!(stats.value?.publishedArticles || 0)) {
    items.push({
      title: '进入圈子发布第一篇专业文章',
      desc: '围绕真实问题输出有首图、有观点、有解决路径的内容。',
      path: '/pages/circles/index',
    })
  } else {
    items.push({
      title: '复盘文章阅读与互动',
      desc: '围绕高阅读主题继续创作，并在适合的位置自然关联商品。',
      path: '/pages/circles/index',
    })
  }
  items.push({
    title: '查看经营分析',
    desc: '把内容资产与订单、履约、口碑放在同一张经营图里判断。',
    path: '/merchant/analytics',
  })
  return items.slice(0, 3)
})

function go(path: string) {
  navigateTo(path)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = previewMode ? previewStats : await merchantBackendApi.getContentStats()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.cs-page{min-height:100vh;background:linear-gradient(180deg,#f4f7f8 0,#f7f5f0 38%,#f5f3ef 100%);color:#1e3445}
.cs-nav{position:fixed;z-index:100;top:0;left:0;right:0;background:rgba(250,251,251,.96);border-bottom:1px solid rgba(23,50,72,.08);backdrop-filter:blur(14px)}
.cs-nav__inner{height:44px;display:flex;align-items:center;padding:0 8px}
.cs-nav__btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:14px}
.cs-nav__title{flex:1;display:flex;flex-direction:column;align-items:center;font-size:17px;font-weight:750;letter-spacing:.02em}
.cs-nav__sub{font-size:9px;font-weight:500;color:#8c98a1;margin-top:2px}
.cs-scroll{position:fixed;left:0;right:0;bottom:0}
.cs-shell{width:min(100%,920px);margin:0 auto;padding:14px 14px calc(34px + env(safe-area-inset-bottom));box-sizing:border-box}
.cs-hero{position:relative;overflow:hidden;padding:24px;border-radius:25px;color:#fff;background:linear-gradient(135deg,#173049 0%,#1d6675 60%,#9b7e48 145%);box-shadow:0 16px 36px rgba(20,50,69,.18)}
.cs-hero__orb{position:absolute;border:1px solid rgba(255,255,255,.12);border-radius:50%}
.cs-hero__orb--one{width:180px;height:180px;right:-50px;top:-76px;box-shadow:0 0 0 32px rgba(255,255,255,.035)}
.cs-hero__orb--two{width:85px;height:85px;right:42px;bottom:-58px;box-shadow:0 0 0 24px rgba(255,255,255,.03)}
.cs-eyebrow,.cs-section-head__eyebrow{display:block;font-size:9px;font-weight:800;letter-spacing:.17em;color:#e5c778}
.cs-hero__title{display:block;position:relative;font-family:STSong,"Songti SC",serif;font-size:28px;font-weight:800;margin-top:7px}
.cs-hero__desc{display:block;position:relative;max-width:310px;font-size:12px;line-height:1.7;color:rgba(255,255,255,.73);margin-top:8px}
.cs-hero__summary{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.13)}
.cs-hero__summary view{display:flex;flex-direction:column}
.cs-hero__number{font-family:Georgia,"Times New Roman",serif;font-size:22px;font-weight:700;color:#f1d58e}
.cs-hero__label{font-size:9px;color:rgba(255,255,255,.62);margin-top:5px}
.cs-section-head{display:flex;align-items:flex-end;justify-content:space-between;margin:22px 3px 10px}
.cs-section-head__title{display:block;font-family:STSong,"Songti SC",serif;font-size:19px;font-weight:800;margin-top:3px}
.cs-section-head__link{padding:8px 0;font-size:10px;color:#9a7437}
.cs-product{display:flex;align-items:center;gap:18px;padding:19px;background:#fff;border:1px solid rgba(23,50,72,.07);border-radius:21px;box-shadow:0 8px 25px rgba(26,54,72,.05)}
.cs-product__ring{--rate:0%;width:96px;height:96px;flex:0 0 96px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:conic-gradient(#d3ad54 var(--rate),#e9eff1 0)}
.cs-product__ring-inner{width:77px;height:77px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;background:#fff}
.cs-product__ring-inner text:first-child{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#183d53}
.cs-product__ring-inner text:last-child{font-size:9px;color:#88959d;margin-top:3px}
.cs-product__body{flex:1;min-width:0}
.cs-product__title{display:block;font-size:14px;font-weight:750;line-height:1.45;color:#203c50}
.cs-product__desc{display:block;font-size:10px;line-height:1.65;color:#87949d;margin-top:6px}
.cs-product__stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:13px}
.cs-product__stats view{display:flex;flex-direction:column}
.cs-product__stats text:first-child{font-family:Georgia,serif;font-size:17px;font-weight:700;color:#a47731}
.cs-product__stats text:last-child{font-size:8px;color:#9aa3a8;margin-top:2px}
.cs-article{overflow:hidden;background:#fff;border:1px solid rgba(23,50,72,.07);border-radius:21px;box-shadow:0 8px 25px rgba(26,54,72,.05)}
.cs-article__lead{display:flex;gap:13px;padding:18px;background:linear-gradient(135deg,#eef7f5,#f9f4e7)}
.cs-article__icon{width:42px;height:42px;display:flex;align-items:center;justify-content:center;flex:0 0 42px;border-radius:14px;background:linear-gradient(145deg,#1c7880,#2a536a);box-shadow:0 8px 18px rgba(30,103,113,.18)}
.cs-article__copy{display:flex;flex-direction:column;min-width:0}
.cs-article__copy text:first-child{font-size:14px;font-weight:750;color:#214455}
.cs-article__copy text:last-child{font-size:10px;line-height:1.6;color:#788b91;margin-top:5px}
.cs-article__metrics{display:grid;grid-template-columns:repeat(3,1fr);padding:18px 12px}
.cs-article__metrics view{display:flex;flex-direction:column;align-items:center;border-right:1px solid #edf0f0}
.cs-article__metrics view:last-child{border-right:0}
.cs-article__value{font-family:Georgia,serif;font-size:20px;font-weight:700;color:#183b50}
.cs-article__label{font-size:9px;color:#8c989f;margin-top:4px}
.cs-article__note{display:flex;align-items:flex-start;gap:6px;margin:0 14px 14px;padding:10px;border-radius:11px;background:#fbf7eb;font-size:9px;line-height:1.55;color:#7d6c50}
.cs-actions{padding:0 17px;background:#fff;border:1px solid rgba(23,50,72,.07);border-radius:20px;box-shadow:0 8px 25px rgba(26,54,72,.05)}
.cs-action{display:flex;align-items:center;gap:12px;padding:15px 0;border-bottom:1px solid #edf0f1}
.cs-action:last-child{border-bottom:0}
.cs-action__index{font-family:Georgia,serif;font-size:10px;color:#bd9349}
.cs-action__body{flex:1;min-width:0;display:flex;flex-direction:column}
.cs-action__title{font-size:13px;font-weight:700;color:#274153}
.cs-action__desc{font-size:9px;line-height:1.55;color:#8d989f;margin-top:3px}
.cs-action__arrow{font-size:24px;color:#bcc3c7}
.cs-footnote{display:flex;align-items:flex-start;justify-content:center;gap:6px;padding:18px 8px 0;font-size:9px;line-height:1.55;color:#92999d}
.cs-state{height:65vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;color:#89959d;font-size:13px}
.cs-loader{width:28px;height:28px;border:2px solid #dae3e7;border-top-color:#1d6875;border-radius:50%;animation:cs-spin .8s linear infinite}
.cs-state__title{font-size:15px;font-weight:700;color:#294457}
.cs-state__desc{max-width:280px;text-align:center;font-size:11px;line-height:1.6}
.cs-retry{padding:10px 22px;border-radius:12px;color:#fff;background:#1b5d70}
@media (min-width:700px){
  .cs-shell{padding:22px}
  .cs-hero{padding:30px}
  .cs-product,.cs-article,.cs-actions{max-width:680px;margin-left:auto;margin-right:auto}
}
@media (prefers-reduced-motion:reduce){
  .cs-loader{animation:none}
}
@keyframes cs-spin{to{transform:rotate(360deg)}}
</style>
