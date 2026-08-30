<script setup lang="ts">
/**
 * 文章详情页 — V0 circle-article-detail.html 还原（2026-07-10 浅色主题重写）
 * 结构：sticky 顶栏(返回+文章+分享) → 封面 16:9 → 标题/作者行(关注软底按钮) → rich-text 正文(17px/1.9) →
 *       内联推荐卡 → 圈子引流暖底卡(circle-lead·替换原 fixed 底条) →
 *       统一评论区(CommentSection·列表+吸底输入条一站式) → 猜你喜欢(白卡横排)。
 * 底栏：头条式吸底（写评论输入胶囊 + 点赞/评论/收藏/分享四图标经 bar-actions slot 进吸底条右侧·
 *       原正文中部纵向互动栏已删，避免双入口）。
 *       三态 = V0 骨架屏 / 错误卡（评论区三态由 CommentSection 自管）。
 * 降级：角色徽章(后端无作者圈内角色)/引流条营销文案(只写真实 members)/related 作者名与阅读数(后端不返回)不渲染；
 *       tags 后端无话题聚合页 → 纯展示不可点。
 * 评论已切统一组件：走 /comment 数据层(lib/comment-data)，替换原自写评论区 + /interaction/comment 发送；
 * 其余数据逻辑保留：articleApi 加载/互动/recommends/related/sourceCircle，乐观更新+回滚+防重复。
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import CommentSection from '@/components/comment/comment-section.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import { VOICE } from '@/lib/voice'
import {
  articleApi, recommendRoute,
  type ArticleDetail, type ArticleRecommendCard, type ArticleProductCard,
} from '@/lib/article-data'
import { circleDetailApi } from '@/lib/circle-detail-data'
import { setOrderSource } from '@/lib/shop-data'
import { gotoReport } from '@/lib/report-data'

const articleId = ref('')
const loading = ref(true)
const error = ref('')
const article = ref<ArticleDetail | null>(null)

// 带货商品抽屉（抖音式：底部 2/3 屏弹层·单品直达详情/多品列表）
const products = ref<ArticleProductCard[]>([])
const showProducts = ref(false)
// 内联推荐卡排除 PRODUCT（商品统一走带货抽屉·避免与抽屉重复）
const inlineRecs = computed(() => (article.value?.recommends || []).filter(c => c.recommendType !== 'PRODUCT'))
const displayLayout = computed(() => {
  const layout = article.value?.layout || 'AUTO'
  if (layout !== 'AUTO') return layout
  const imageCount = (article.value?.content.match(/<img\b/gi) || []).length
  if (imageCount >= 3) return 'GALLERY'
  return article.value?.tags.includes('专栏') ? 'COLUMN' : 'SINGLE'
})
const readMinutes = computed(() => {
  const plain = (article.value?.content || '').replace(/<[^>]+>/g, '')
  return Math.max(3, Math.ceil(plain.length / 420))
})

// 互动状态
const isFollowed = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const likeActing = ref(false)
const collectActing = ref(false)
const followActing = ref(false)
// 来源圈子会员态：null 表示尚未取得权威状态；封面、主体和按钮统一走同一分流。
const isSourceCircleJoined = ref<boolean | null>(null)
const circleNavigating = ref(false)
const circleCtaText = computed(() => (
  isSourceCircleJoined.value === true ? '进入圈子' : '查看加入'
))

// 评论计数（初值取文章详情·后续由 CommentSection count-change 联动刷新）
const commentCount = ref(0)
const commentSectionRef = ref<{
  focusInput: () => Promise<void> | void
} | null>(null)
// 互动栏「评论」按钮 → 定位评论区并立即聚焦输入框。
// 只滚动在用户已处于文章底部时没有可见反馈，真机会被认为「按钮无反应」。
const scrollAnchor = ref('')

async function load() {
  if (!articleId.value) { error.value = '缺少文章参数'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const a = await articleApi.detail(articleId.value)
    article.value = a
    likeCount.value = a.likes
    collectCount.value = a.collects
    commentCount.value = a.comments
    // 带货商品：先展示（封面+名），再逐件拉商品详情充实价格（失败不阻断主体）
    products.value = a.products
    if (a.products.length) {
      articleApi.enrichProducts(a.products).then((ps) => { products.value = ps }).catch(() => {})
    }
    // 文章详情接口为公开读接口，不含可靠会员态；登录态由鉴权端点权威覆盖，
    // 未登录或查询失败按未加入处理，统一进入购买/加入引导页。
    if (a.sourceCircle?.id) {
      const status = await circleDetailApi.getJoinStatus(a.sourceCircle.id, true)
      isSourceCircleJoined.value = status.joined
    } else {
      isSourceCircleJoined.value = null
    }
    // 我的互动态（失败不阻断主体·评论列表由 CommentSection 自行拉取）
    const chk = await articleApi.checkInteraction(articleId.value).catch(() => ({ liked: false, collected: false }))
    isLiked.value = chk.liked
    isCollected.value = chk.collected
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => { if (q && q.id) articleId.value = String(q.id) })
onMounted(load)

/** 相关文章跳转（修死链：原 /articles/:id 依赖别名 → 统一真路径） */
function openArticle(id: string) { navigateTo('/pkg-circle/articles/detail?id=' + id) }
/**
 * 来源圈子统一分流：
 * - 已加入：直接进入圈子；
 * - 未加入：进入购买/加入引导页，由预览页按付费、审批、免费三种模式继续承接。
 * 三个可点击区域共用此函数，避免封面/文字仍绕过购买引导。
 */
async function openCircle() {
  const circleId = article.value?.sourceCircle?.id
  if (!circleId || circleNavigating.value) return
  circleNavigating.value = true
  try {
    // 用户可能在页面停留期间从别处完成入圈；点击前再次确认，避免陈旧状态跳错页面。
    const status = await circleDetailApi.getJoinStatus(circleId, true)
    isSourceCircleJoined.value = status.joined
    navigateTo(status.joined
      ? `/pkg-circle/circles/detail?id=${circleId}`
      : `/pkg-circle/circles/preview?id=${circleId}`)
  } finally {
    circleNavigating.value = false
  }
}
/** 分享 → 海报页（替换原 toastComingSoon 死按钮） */
function openShare() { if (article.value) navigateTo('/pkg-circle/common/share-poster?type=article&targetId=' + article.value.id) }
/** 内容举报走审核举报池，与交易投诉工单分开。 */
function reportArticle() {
  if (!article.value) return
  gotoReport('ARTICLE', article.value.id, article.value.title, article.value.author.name)
}
function openRecommend(c: ArticleRecommendCard) {
  // 佣-V2-P3：文章推荐商品 → 记录 ARTICLE 内容来源（经商品详情中转无法 URL 逐层透传，
  // 由数据层会话暂存·绑定该商品·下单时随 createOrder 落库纯记录）
  if (c.recommendType === 'PRODUCT' && c.targetId) setOrderSource('ARTICLE', articleId.value, c.targetId)
  const r = recommendRoute(c)
  if (r) navigateTo(r); else toastComingSoon()
}
const REC_LABEL: Record<ArticleRecommendCard['recommendType'], string> = {
  CIRCLE: '相关圈子', COURSE: '相关课程', PRODUCT: '相关商品', PAIPAN: '智能排盘', BOT: 'AI 智能体',
}
const REC_ICON: Record<ArticleRecommendCard['recommendType'], string> = {
  CIRCLE: 'users', COURSE: 'book-open', PRODUCT: 'shopping-bag', PAIPAN: 'compass', BOT: 'bot',
}
function recLabel(t: ArticleRecommendCard['recommendType']) { return REC_LABEL[t] || '相关推荐' }
function recIcon(t: ArticleRecommendCard['recommendType']) { return REC_ICON[t] || 'link' }

// ─── 带货商品（抖音式抽屉）───
/** 带货商品 → 商品详情（记录 ARTICLE 来源供分佣归因·同 openRecommend 的 PRODUCT 逻辑） */
function openProduct(p: ArticleProductCard) {
  if (!p.id) return
  setOrderSource('ARTICLE', articleId.value, p.id)
  showProducts.value = false
  navigateTo('/shop/' + p.id)
}
/** 带货入口点击：单品直达详情·多品打开抽屉 */
function onPromoTap() {
  if (products.value.length === 1) openProduct(products.value[0])
  else showProducts.value = true
}

// ─── 互动（乐观更新 + 失败回滚 + 防重复）───
async function toggleLike() {
  if (likeActing.value || !article.value) return
  likeActing.value = true
  const pl = isLiked.value, pc = likeCount.value
  isLiked.value = !pl
  likeCount.value = pc + (isLiked.value ? 1 : -1)
  try { await articleApi.toggleLike(articleId.value) }
  catch { isLiked.value = pl; likeCount.value = pc; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { likeActing.value = false }
}
async function toggleCollect() {
  if (collectActing.value || !article.value) return
  collectActing.value = true
  const pc = isCollected.value, pn = collectCount.value
  isCollected.value = !pc
  collectCount.value = pn + (isCollected.value ? 1 : -1)
  try { await articleApi.toggleCollect(articleId.value) }
  catch { isCollected.value = pc; collectCount.value = pn; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { collectActing.value = false }
}
async function toggleFollow() {
  if (followActing.value || !article.value) return
  const authorId = article.value.author.id
  if (!authorId) return
  followActing.value = true
  const prev = isFollowed.value
  isFollowed.value = !prev
  try { await articleApi.toggleFollow(authorId) }
  catch { isFollowed.value = prev; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { followActing.value = false }
}
/** 底栏「评论」图标：锚定评论区后聚焦真输入框，确保每次点击都有可见反馈。 */
async function focusComment() {
  scrollAnchor.value = ''
  await nextTick()
  scrollAnchor.value = 'adCommentsAnchor'
  await nextTick()
  await commentSectionRef.value?.focusInput()
}
</script>

<template>
  <view class="ad" :class="`ad--${displayLayout.toLowerCase()}`">
    <!-- 顶栏：sticky 毛玻璃（返回 + 文章 + 分享） -->
    <view class="ad-topbar">
      <view class="ad-top-btn ad-top-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="ad-top-title">{{ article?.tags?.[0] || '文章' }}</text>
      <view class="ad-top-actions">
        <view class="ad-top-btn" aria-label="分享文章" @tap="openShare"><app-icon name="share-2" :size="36" color="#6E6E73" /></view>
        <view class="ad-top-btn" aria-label="举报文章" @tap="reportArticle"><app-icon name="flag" :size="34" color="#6E6E73" /></view>
      </view>
    </view>

    <!-- 加载态：V0 骨架屏（封面块 + 标题两行 + 作者行 + 四行正文 shimmer） -->
    <view v-if="loading && !article" class="ad-skel">
      <view class="ad-sk ad-sk-cover" />
      <view class="ad-sk-wrap">
        <view class="ad-sk ad-sk-title" />
        <view class="ad-sk ad-sk-title2" />
        <view class="ad-sk-author">
          <view class="ad-sk ad-sk-avatar" />
          <view class="ad-sk ad-sk-name" />
        </view>
        <view class="ad-sk ad-sk-line w95" style="margin-top: 44rpx" />
        <view class="ad-sk ad-sk-line w88" />
        <view class="ad-sk ad-sk-line w95" />
        <view class="ad-sk ad-sk-line w70" />
      </view>
    </view>

    <!-- 错误态：V0 错误卡（重新加载 + 返回上一页） -->
    <view v-else-if="error && !article" class="ad-error">
      <view class="ad-error-icon"><app-icon name="alert-circle" :size="52" color="#999999" /></view>
      <text class="ad-error-title">内容加载失败</text>
      <text class="ad-error-desc">网络似乎不太顺畅，稍等片刻再试试；{{ '\n' }}若内容已被作者删除，将无法查看。</text>
      <view class="ad-error-retry" @tap="load"><text class="ad-error-retry-t">重新加载</text></view>
      <text class="ad-error-back" @tap="goBack">返回上一页</text>
    </view>

    <scroll-view v-else-if="article" scroll-y scroll-with-animation :scroll-into-view="scrollAnchor" class="ad-body">
      <!-- 封面：16:9 整宽（用 smart-cover：封面URL失效时优雅降级为生成封面，不再留空框） -->
      <view v-if="article.cover && displayLayout === 'FEATURE'" class="ad-cover ad-cover--feature">
        <smart-cover :src="article.cover" :title="article.title" type="default" />
        <view class="ad-cover-shade" />
        <text class="ad-cover-mark">REBUGX · EDITORIAL</text>
      </view>

      <!-- 标题 + 作者元信息 -->
      <view class="ad-head">
        <view class="ad-rubric">
          <text>{{ displayLayout === 'FEATURE' ? '本期策划' : displayLayout === 'GALLERY' ? '图像志' : displayLayout === 'COLUMN' ? '国学专栏' : '今日阅读' }}</text>
          <view class="ad-rubric-line" />
          <text>{{ readMinutes }} 分钟读完</text>
        </view>
        <text class="ad-title">{{ article.title }}</text>
        <text v-if="article.excerpt" class="ad-deck">{{ article.excerpt }}</text>

        <!-- tags：后端无话题聚合页 → 纯展示不可点（修死链 /topic/:tag） -->
        <view v-if="article.tags.length" class="ad-tags">
          <view v-for="tag in article.tags" :key="tag" class="ad-tag"><text class="ad-tag-t">#{{ tag }}</text></view>
        </view>

        <view class="ad-meta">
          <image lazy-load class="ad-avatar" :src="article.author.avatar" mode="aspectFill" @tap="navigateTo('/pkg-circle/user/profile?id=' + article.author.id)" />
          <view class="ad-meta-main" @tap="navigateTo('/pkg-circle/user/profile?id=' + article.author.id)">
            <!-- 角色徽章：后端无作者圈内角色字段 → 降级不做 -->
            <text class="ad-meta-name">{{ article.author.name }}</text>
            <text class="ad-meta-sub">{{ article.views }} 阅读{{ article.publishedAt ? ' · ' + article.publishedAt : '' }}</text>
          </view>
          <!-- 关注：brand-soft 底 brand 字；已关注 = 灰 -->
          <view class="ad-follow" :class="{ on: isFollowed }" @tap="toggleFollow">
            <text class="ad-follow-t" :class="{ on: isFollowed }">{{ isFollowed ? '已关注' : '关注' }}</text>
          </view>
        </view>
      </view>

      <view v-if="article.cover && displayLayout !== 'FEATURE'" class="ad-cover ad-cover--inline">
        <smart-cover :src="article.cover" :title="article.title" type="default" />
        <text v-if="displayLayout === 'GALLERY'" class="ad-cover-caption">首图 · 本文图片均由作者提供</text>
      </view>

      <!-- 正文：后端富文本 HTML·17px/1.9 → 34rpx/1.9 -->
      <view class="ad-article">
        <rich-text class="ad-rich" :nodes="article.content"></rich-text>
      </view>

      <!-- 内联推荐卡（后端 recommends；商品类走下方带货入口条·此处只出圈子/课程/排盘/智能体） -->
      <view v-if="inlineRecs.length" class="ad-recs">
        <view v-for="c in inlineRecs" :key="c.id" class="ad-rec-card" @tap="openRecommend(c)">
          <image v-if="c.cover" lazy-load class="ad-rec-cover" :src="c.cover" mode="aspectFill" />
          <view class="ad-rec-main">
            <view class="ad-rec-tag">
              <app-icon :name="recIcon(c.recommendType)" :size="24" color="#C41E3A" />
              <text class="ad-rec-tag-t">{{ recLabel(c.recommendType) }}</text>
            </view>
            <text class="ad-rec-title">{{ c.title || recLabel(c.recommendType) }}</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#999999" />
        </view>
      </view>

      <!-- 带货入口条（抖音式·文中好物·配图=首件封面·单品直达详情/多品开抽屉） -->
      <view v-if="products.length" class="ad-promo" @tap="onPromoTap">
        <view class="ad-promo-img"><smart-cover :src="products[0].cover" :title="products[0].name" type="product" /></view>
        <view class="ad-promo-main">
          <view class="ad-promo-tag"><app-icon name="shopping-bag" :size="24" color="#C41E3A" /><text class="ad-promo-tag-t">文中好物</text></view>
          <text class="ad-promo-name">{{ products[0].name }}</text>
          <text v-if="products[0].price > 0" class="ad-promo-price">¥{{ products[0].price }}<text v-if="products.length > 1" class="ad-promo-more"> 等 {{ products.length }} 件</text></text>
          <text v-else class="ad-promo-sub">{{ products.length > 1 ? `共 ${products.length} 件好物` : '查看商品详情' }}</text>
        </view>
        <view class="ad-promo-btn"><text class="ad-promo-btn-t">{{ products.length > 1 ? '看全部' : '去看看' }}</text></view>
      </view>

      <!-- 正文中部互动栏已删：四动作统一收进底部吸底栏（头条式·避免双入口臃肿） -->

      <!-- 圈子引流条：V0 circle-lead 暖底圆角卡（读完自然引导·替换原 fixed 底条）
           副行只写真实字段 members，不编造营销文案 -->
      <view v-if="article.sourceCircle" class="ad-lead">
        <image v-if="article.sourceCircle.cover" lazy-load class="ad-lead-cover" :src="article.sourceCircle.cover" mode="aspectFill" @tap="openCircle" />
        <view class="ad-lead-main" @tap="openCircle">
          <text class="ad-lead-label">本文来自圈子</text>
          <text class="ad-lead-name">{{ article.sourceCircle.name }}</text>
          <text class="ad-lead-sub">{{ article.sourceCircle.members }} 位成员</text>
        </view>
        <view class="ad-lead-btn" @tap="openCircle">
          <text class="ad-lead-btn-t">{{ circleNavigating ? '正在前往…' : circleCtaText }}</text>
        </view>
      </view>

      <!-- 统一评论区：CommentSection 一站式（列表三态/楼中楼/点赞/分页 + 吸底输入条）
           count-change 联动底栏计数与标题角标；空态/骨架/错误由组件自管
           no-pad：底部让位由页面 .ad-bottom-pad 承担，去掉组件垫片（消评论区与猜你喜欢间空白）
           bar-actions：头条式底栏右侧四动作（点赞/评论/收藏/分享） -->
      <view id="adCommentsAnchor" class="ad-comments-block">
        <text class="ad-comments-head">评论{{ commentCount ? ' ' + commentCount : '' }}</text>
        <comment-section
          ref="commentSectionRef"
          target-type="ARTICLE"
          :target-id="articleId"
          :author-id="article.author.id"
          :no-pad="true"
          @count-change="(n: number) => { commentCount = n }"
        >
          <template #bar-actions>
            <view class="ad-bar-act" @tap="toggleLike">
              <app-icon name="heart" :size="40" :color="isLiked ? '#e63e31' : '#999999'" :fill="isLiked" />
              <text class="ad-bar-num" :class="{ liked: isLiked }">{{ likeCount || '点赞' }}</text>
            </view>
            <view class="ad-bar-act" @tap="focusComment">
              <app-icon name="message-circle" :size="40" color="#999999" />
              <text class="ad-bar-num">{{ commentCount || '评论' }}</text>
            </view>
            <view class="ad-bar-act" @tap="toggleCollect">
              <app-icon name="star" :size="40" :color="isCollected ? '#c9a96e' : '#999999'" :fill="isCollected" />
              <text class="ad-bar-num" :class="{ collected: isCollected }">{{ collectCount || '收藏' }}</text>
            </view>
            <view class="ad-bar-act" @tap="openShare">
              <app-icon name="share-2" :size="40" color="#999999" />
              <text class="ad-bar-num">分享</text>
            </view>
          </template>
        </comment-section>
      </view>

      <!-- 猜你喜欢：V0 related-card 白卡横排（副行仅 likes 真实字段·作者名/阅读数后端不返回 → 不显示） -->
      <template v-if="article.related.length">
        <text class="ad-related-head">猜你喜欢</text>
        <view v-for="a in article.related" :key="a.id" class="ad-related-card" @tap="openArticle(a.id)">
          <image v-if="a.cover" lazy-load class="ad-related-cover" :src="a.cover" mode="aspectFill" />
          <view class="ad-related-main">
            <text class="ad-related-title">{{ a.title }}</text>
            <text class="ad-related-sub">{{ a.likes }} 赞</text>
          </view>
        </view>
      </template>
      <!-- 卷尾（品牌签名·墨线由全局 .scroll-end 画，文案统一走 voice.ts） -->
      <view class="scroll-end"><text>{{ VOICE.END }}</text></view>
      <view class="ad-bottom-pad" />
    </scroll-view>

    <!-- 底部输入条：由 CommentSection 自带吸底输入条承担（原自写固定评论栏已删·避免双输入条） -->

    <!-- 带货商品抽屉（抖音式·底部 2/3 屏弹层·多品列表） -->
    <view v-if="showProducts" class="ad-sheet-mask" @tap="showProducts = false">
      <view class="ad-sheet" @tap.stop>
        <view class="ad-sheet-head">
          <text class="ad-sheet-title">文中好物 · {{ products.length }} 件</text>
          <view @tap="showProducts = false"><app-icon name="x" :size="36" color="#999999" /></view>
        </view>
        <scroll-view scroll-y class="ad-sheet-body">
          <view v-for="p in products" :key="p.id" class="ad-prod" @tap="openProduct(p)">
            <view class="ad-prod-img"><smart-cover :src="p.cover" :title="p.name" type="product" /></view>
            <view class="ad-prod-info">
              <text class="ad-prod-name">{{ p.name }}</text>
              <view class="ad-prod-foot">
                <view v-if="p.price > 0" class="ad-prod-price-row">
                  <text class="ad-prod-price">¥{{ p.price }}</text>
                  <text v-if="p.originalPrice > p.price" class="ad-prod-origin">¥{{ p.originalPrice }}</text>
                </view>
                <text v-else class="ad-prod-sub">查看详情</text>
                <view class="ad-prod-buy"><text class="ad-prod-buy-t">去购买</text></view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ad {
  display: flex;
  flex-direction: column;
  height: 100vh;
  --article-ink: #20282d;
  --article-accent: #b5263f;
  --article-paper: #fbfaf7;
  background: var(--article-paper);
}
.ad--gallery { --article-accent: #176f78; --article-paper: #f7faf9; }
.ad--column { --article-accent: #8b6534; --article-paper: #fbf8f1; }
.ad--feature { --article-accent: #b5263f; --article-paper: #f8f6f1; }

/* 顶栏：sticky 毛玻璃 */
.ad-topbar {
  display: flex; align-items: center; gap: 20rpx; flex-shrink: 0;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
  position: relative; z-index: 20;
}
.ad-top-btn { padding: 8rpx; }
.ad-top-actions { display: flex; align-items: center; gap: 8rpx; }
/* 返回按钮触控热区≥88rpx：容器扩大+负margin保持视觉位置（仅返回，分享不动） */
.ad-top-back { width: 88rpx; height: 88rpx; padding: 0; margin: -14rpx; display: flex; align-items: center; justify-content: center; }
.ad-top-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* 骨架屏（V0 ①：封面块 + 标题两行 + 作者行 + 四行正文） */
.ad-skel { flex: 1; }
.ad-sk { background: #f1ede6; border-radius: 16rpx; animation: ad-shimmer 1.6s ease infinite; }
@keyframes ad-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
.ad-sk-cover { width: 100%; aspect-ratio: 16 / 9; border-radius: 0; }
.ad-sk-wrap { padding: 36rpx 44rpx 16rpx; }
.ad-sk-title { height: 48rpx; width: 92%; }
.ad-sk-title2 { height: 48rpx; width: 60%; margin-top: 16rpx; }
.ad-sk-author { display: flex; align-items: center; gap: 20rpx; margin-top: 32rpx; }
.ad-sk-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0; }
.ad-sk-name { height: 26rpx; width: 180rpx; }
.ad-sk-line { height: 30rpx; margin-top: 24rpx; }
.ad-sk-line.w95 { width: 95%; }
.ad-sk-line.w88 { width: 88%; }
.ad-sk-line.w70 { width: 70%; }

/* 错误卡（V0 ②） */
.ad-error {
  margin: 24rpx 32rpx; padding: 88rpx 48rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.ad-error-icon {
  width: 112rpx; height: 112rpx; border-radius: 999rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.ad-error-title { margin-top: 32rpx; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ad-error-desc { margin-top: 12rpx; font-size: 26rpx; color: var(--text-tertiary, #999); line-height: 1.6; }
.ad-error-retry { margin-top: 36rpx; height: 76rpx; padding: 0 56rpx; border-radius: 38rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.ad-error-retry-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.ad-error-back { margin-top: 24rpx; font-size: 26rpx; color: var(--text-secondary, #6e6e73); text-decoration: underline; }

.ad-body { flex: 1; overflow: hidden; }

/* 封面：16:9 整宽 */
.ad-cover { position: relative; width: 100%; display: block; background: var(--bg-warm, #f8f4ec); overflow: hidden; }
.ad-cover--feature { aspect-ratio: 16 / 10; }
.ad-cover--inline {
  width: calc(100% - 88rpx);
  margin: 36rpx 44rpx 0;
  aspect-ratio: 16 / 9;
  border-radius: 22rpx;
  box-shadow: 0 16rpx 38rpx rgba(34, 39, 42, 0.1);
}
.ad--column .ad-cover--inline {
  aspect-ratio: 4 / 3;
  border-radius: 4rpx;
  box-shadow: 12rpx 12rpx 0 rgba(139, 101, 52, 0.12);
}
.ad-cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 25, 30, 0) 52%, rgba(17, 25, 30, 0.74) 100%);
}
.ad-cover-mark {
  position: absolute;
  left: 32rpx;
  bottom: 24rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 18rpx;
  letter-spacing: 3rpx;
}
.ad-cover-caption {
  position: absolute;
  right: 16rpx;
  bottom: 14rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(18, 27, 32, 0.62);
  color: #fff;
  font-size: 18rpx;
}

/* 标题与元信息 */
.ad-head { padding: 40rpx 44rpx 0; }
.ad-rubric {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 18rpx;
  color: var(--article-accent);
  font-size: 21rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}
.ad-rubric-line {
  width: 42rpx;
  height: 2rpx;
  background: currentColor;
  opacity: 0.55;
}
.ad-title {
  display: block;
  font-family: var(--font-serif, "Songti SC", "STSong", serif);
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.42;
  letter-spacing: 1rpx;
  color: var(--article-ink);
}
.ad-deck {
  display: block;
  margin-top: 22rpx;
  padding-left: 22rpx;
  border-left: 4rpx solid var(--article-accent);
  color: #625f59;
  font-size: 28rpx;
  line-height: 1.75;
}
.ad--feature .ad-head {
  position: relative;
  margin: -14rpx 20rpx 0;
  padding: 42rpx 32rpx 0;
  border-radius: 24rpx 24rpx 0 0;
  background: var(--article-paper);
}
.ad--gallery .ad-title { font-size: 44rpx; }
.ad--column .ad-head { padding-left: 58rpx; border-left: 8rpx solid rgba(139, 101, 52, 0.3); }
.ad-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.ad-tag { padding: 4rpx 18rpx; background: rgba(139, 101, 52, 0.09); border-radius: 999rpx; }
.ad-tag-t { font-size: 22rpx; color: var(--text-tertiary, #999); }
.ad-meta { display: flex; align-items: center; gap: 20rpx; margin-top: 28rpx; }
.ad-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0; background: var(--bg-warm, #f8f4ec); }
.ad-meta-main { flex: 1; min-width: 0; }
.ad-meta-name { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ad-meta-sub { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.ad-follow { flex-shrink: 0; height: 60rpx; padding: 0 28rpx; border-radius: 30rpx; background: rgba(196, 30, 58, 0.08); display: flex; align-items: center; }
.ad-follow.on { background: var(--bg-warm, #f8f4ec); }
.ad-follow-t { font-size: 26rpx; font-weight: 500; color: var(--brand, #c41e3a); }
.ad-follow-t.on { color: var(--text-tertiary, #999); }

/* 正文：17px/1.9 → 34rpx/1.9 */
.ad-article {
  margin-top: 40rpx;
  padding: 42rpx 44rpx 0;
  border-top: 1rpx solid rgba(101, 91, 77, 0.13);
}
.ad-rich {
  font-size: 34rpx; line-height: 1.9; letter-spacing: 0.4rpx;
  color: #2b2c2c; word-break: break-word;
}
.ad--column .ad-rich { font-family: var(--font-serif, "Songti SC", "STSong", serif); line-height: 2; }

/* 内联推荐卡：白卡语言 */
.ad-recs { padding: 32rpx 32rpx 0; display: flex; flex-direction: column; gap: 20rpx; }
.ad-rec-card {
  display: flex; align-items: center; gap: 24rpx; padding: 26rpx 28rpx;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ad-rec-cover { width: 120rpx; height: 120rpx; border-radius: 16rpx; flex-shrink: 0; background: var(--bg-warm, #f8f4ec); }
.ad-rec-main { flex: 1; min-width: 0; }
.ad-rec-tag { display: flex; align-items: center; gap: 8rpx; }
.ad-rec-tag-t { font-size: 20rpx; font-weight: 500; color: var(--brand, #c41e3a); }
.ad-rec-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); line-height: 1.4; margin-top: 8rpx; }

/* 头条式底栏四动作（渲染进 CommentSection 吸底输入条右侧 slot·scoped 对 slot 内容生效）
   图标 40rpx·计数 20rpx 在下·每个热区 88rpx 见方 */
.ad-bar-act {
  width: 88rpx; min-height: 88rpx; margin: -14rpx 0; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx;
}
.ad-bar-num { font-size: 20rpx; line-height: 1.2; color: var(--text-secondary, #6e6e73); }
.ad-bar-num.liked { color: #e63e31; }
.ad-bar-num.collected { color: var(--gold, #c9a96e); }

/* 圈子引流条：暖底圆角卡（正文流内） */
.ad-lead {
  margin: 44rpx 32rpx 0; padding: 30rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 36rpx;
}
.ad-lead-cover { width: 92rpx; height: 92rpx; border-radius: 16rpx; flex-shrink: 0; background: var(--bg-card, #fff); }
.ad-lead-main { flex: 1; min-width: 0; }
.ad-lead-label { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); }
.ad-lead-name { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 4rpx; }
.ad-lead-sub { display: block; font-size: 24rpx; color: var(--text-secondary, #6e6e73); margin-top: 4rpx; }
.ad-lead-btn { flex-shrink: 0; height: 64rpx; padding: 0 30rpx; border-radius: 32rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.ad-lead-btn-t { font-size: 26rpx; font-weight: 500; color: #fff; }

/* 统一评论区：外层只管页面级留白与标题（列表/空态/输入条样式由 CommentSection 自管） */
.ad-comments-block { padding: 0 40rpx; }
.ad-comments-head { display: block; padding: 48rpx 4rpx 8rpx; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* 猜你喜欢：白卡横排 */
.ad-related-head { display: block; padding: 52rpx 44rpx 20rpx; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ad-related-card {
  margin: 0 32rpx 20rpx; padding: 26rpx 28rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ad-related-cover { width: 152rpx; height: 114rpx; border-radius: 16rpx; flex-shrink: 0; background: var(--bg-warm, #f8f4ec); }
.ad-related-main { flex: 1; min-width: 0; }
.ad-related-title {
  font-size: 28rpx; font-weight: 500; line-height: 1.5; color: var(--text-primary, #2c2c2c);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ad-related-sub { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 8rpx; }

/* 底垫：给 CommentSection 的 fixed 吸底输入条让位（评论区后还有「猜你喜欢」等内容） */
.ad-bottom-pad { height: calc(160rpx + env(safe-area-inset-bottom)); }

/* 带货入口条：暖底卡·配图 + 好物名/价格 + 去看看按钮 */
.ad-promo {
  margin: 32rpx 32rpx 0; padding: 24rpx 28rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: linear-gradient(135deg, rgba(196,30,58,0.06), rgba(201,169,110,0.08));
  border: 1rpx solid rgba(196,30,58,0.12); border-radius: 28rpx;
}
.ad-promo-img { width: 120rpx; height: 120rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: var(--bg-warm, #f8f4ec); }
.ad-promo-main { flex: 1; min-width: 0; }
.ad-promo-tag { display: flex; align-items: center; gap: 8rpx; }
.ad-promo-tag-t { font-size: 20rpx; font-weight: 600; color: var(--brand, #c41e3a); }
.ad-promo-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); line-height: 1.4; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-promo-price { display: block; font-size: 30rpx; font-weight: 700; color: var(--brand, #c41e3a); margin-top: 6rpx; }
.ad-promo-more { font-size: 22rpx; font-weight: 400; color: var(--text-tertiary, #999); }
.ad-promo-sub { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 6rpx; }
.ad-promo-btn { flex-shrink: 0; height: 64rpx; padding: 0 30rpx; border-radius: 32rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.ad-promo-btn-t { font-size: 26rpx; font-weight: 500; color: #fff; }

/* 带货抽屉：底部 2/3 屏弹层 */
.ad-sheet-mask { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.5); }
.ad-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--bg-card, #fff); border-radius: 32rpx 32rpx 0 0; max-height: 66vh; display: flex; flex-direction: column; animation: ad-slide-up 0.28s ease-out; }
@keyframes ad-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.ad-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-bottom: 1rpx solid var(--separator, #ede7dd); }
.ad-sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ad-sheet-body { padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); max-height: 56vh; }
.ad-prod { display: flex; gap: 20rpx; padding: 20rpx; background: var(--bg-warm, #f8f4ec); border-radius: 20rpx; margin-bottom: 18rpx; }
.ad-prod-img { width: 150rpx; height: 150rpx; border-radius: 14rpx; overflow: hidden; flex-shrink: 0; background: var(--bg-card, #fff); }
.ad-prod-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ad-prod-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ad-prod-foot { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; }
.ad-prod-price-row { display: flex; align-items: baseline; gap: 12rpx; }
.ad-prod-price { font-size: 32rpx; font-weight: 700; color: var(--brand, #c41e3a); }
.ad-prod-origin { font-size: 22rpx; color: var(--text-tertiary, #999); text-decoration: line-through; }
.ad-prod-sub { font-size: 24rpx; color: var(--text-tertiary, #999); }
.ad-prod-buy { flex-shrink: 0; height: 60rpx; padding: 0 30rpx; border-radius: 30rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.ad-prod-buy-t { font-size: 26rpx; font-weight: 500; color: #fff; }
</style>
