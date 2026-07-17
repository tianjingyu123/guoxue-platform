<script setup lang="ts">
/**
 * P1 课程首页（发现课程）— 合并原 home + market + courses-list 三入口页
 * 视觉：V0 阶段二视觉稿 p1-home.html / p1-home-states.html（单列大卡流）
 * 真连：
 *   - courseApi.getHome()          → 推荐轮播 banners + 秒杀横条 flashSale（含现价/原价）
 *   - coursesListApi.getCategoryTabs → 分类 Tab（真实有课程的一级品类）
 *   - coursesListApi.list()（useList）→ 主列表单列大卡，分类/排序全下沉后端·上拉分页
 * 数据一律走已有方法，不造假。评分列表接口恒 0（详情页另取）→ 按 V0「≥4.5 才显示」规则恒隐藏，不臆造。
 */
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import CourseCard from '@/components/cards/course-card.vue'
import SectionHeader from '@/components/courses/section-header.vue'
import { navigateTo } from '@/utils/router'
import { courseApi } from '@/lib/course-data'
import { coursesListApi, courseSortOptions } from '@/lib/courses-list-data'
import { useList } from '@/composables/useList'
import { formatPrice } from '@/utils/format'
import { formatCount } from '@/lib/card-utils'
import type { CourseCardData } from '@/lib/card-utils'

// 自定义导航状态栏高度
const statusBarHeight = ref(0)

// —— 头部区块（一次性加载，与主列表分页解耦；失败静默，三态由主列表承载）——
// 推荐轮播（运营推荐位，有数据才显示）
const banners = ref<any[]>([])
// 秒杀横条课程（含现价/原价/折扣）
const flashSaleCourses = ref<any[]>([])
// 分专栏数据（精选/排行/新课·getHome 一次返回，横向陈列做层次）
const featured = ref<any[]>([])
const ranking = ref<any[]>([])
const newCourses = ref<any[]>([])
// 分类 Tab（真实有课程的一级品类，含「全部」）
const categoryTabs = ref<{ id: string; name: string }[]>([])

// 分类名 → 图标/色（国学质感线条）。未知分类兜底 graduation-cap
const CATEGORY_ICON: Record<string, { icon: string; color: string }> = {
  八字命理: { icon: 'scroll-text', color: '#C0392B' },
  紫微斗数: { icon: 'star', color: '#8E44AD' },
  风水堪舆: { icon: 'compass', color: '#16A085' },
  风水: { icon: 'compass', color: '#16A085' },
  易经: { icon: 'book-marked', color: '#2980B9' },
  周易: { icon: 'book-marked', color: '#2980B9' },
  中医养生: { icon: 'stethoscope', color: '#27AE60' },
  养生: { icon: 'leaf', color: '#7F8C8D' },
  书法: { icon: 'pen-tool', color: '#D35400' },
  奇门遁甲: { icon: 'mountain', color: '#2C3E50' },
  国学: { icon: 'landmark', color: '#B7791F' },
  命理: { icon: 'scroll-text', color: '#C0392B' },
}
// 先精确匹配，再按关键词子串匹配（真实分类名如「易学风水和命理」含「风水」→罗盘），兜底 graduation-cap
const CATEGORY_KEYWORD: { kw: string; icon: string; color: string }[] = [
  { kw: '风水', icon: 'compass', color: '#16A085' },
  { kw: '八字', icon: 'scroll-text', color: '#C0392B' },
  { kw: '紫微', icon: 'star', color: '#8E44AD' },
  { kw: '奇门', icon: 'mountain', color: '#2C3E50' },
  { kw: '易经', icon: 'book-marked', color: '#2980B9' },
  { kw: '周易', icon: 'book-marked', color: '#2980B9' },
  { kw: '命理', icon: 'scroll-text', color: '#C0392B' },
  { kw: '中医', icon: 'stethoscope', color: '#27AE60' },
  { kw: '养生', icon: 'leaf', color: '#7F8C8D' },
  { kw: '书法', icon: 'pen-tool', color: '#D35400' },
  { kw: '绘画', icon: 'pen-tool', color: '#D35400' },
  { kw: '国学', icon: 'landmark', color: '#B7791F' },
  { kw: '经典', icon: 'book-open', color: '#B7791F' },
]
function catIcon(name: string) {
  if (CATEGORY_ICON[name]) return CATEGORY_ICON[name]
  const hit = CATEGORY_KEYWORD.find((k) => name.includes(k.kw))
  return hit ? { icon: hit.icon, color: hit.color } : { icon: 'graduation-cap', color: '#C41E3A' }
}
// 图标分类导航：取真实有课程的一级品类（去「全部」），最多 10 个成 2 行
const iconCategories = computed(() => categoryTabs.value.filter((t) => t.id !== 'all').slice(0, 10))

// 轮播
const currentBanner = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null

// 🔴 秒杀倒计时已移除（诚实原则）：原倒计时派生自「当日 23:59:59」并非真实活动截止时间，
//    且到 0 后恒显 00:00:00 仍可购买=假倒计时。flashSale 本身派生自划线价（无活动配置真源），
//    故只保留「限时优惠」标语义。待后端有真实活动截止字段（activity endTime）后再恢复倒计时组件。

// 排序底部弹层
const showSortSheet = ref(false)
const activeSort = ref('recommend')
const activeSortName = computed(() => courseSortOptions.find((s) => s.id === activeSort.value)?.name ?? '综合排序')

// 分类
const activeCategory = ref('all')

// —— 主列表：分类 + 排序 下沉后端，切条件重载第一页 ——
const { list: courses, loading, error, loadStatus, refresh, loadMore } = useList<
  CourseCardData & { category: string; free: boolean },
  { category: string; sort: string }
>({
  fetcher: ({ page, pageSize, category, sort }) =>
    coursesListApi.list({ page, pageSize, category, sort }),
  getParams: () => ({ category: activeCategory.value, sort: activeSort.value }),
})

function startBannerTimer() {
  if (banners.value.length > 1) {
    bannerTimer = setInterval(() => {
      currentBanner.value = (currentBanner.value + 1) % banners.value.length
    }, 4000)
  }
}

// 头部：推荐轮播 + 秒杀 + 分类 tab（并行，失败不阻塞主列表）
async function loadHeader() {
  try {
    const [home, tabs] = await Promise.all([
      courseApi.getHome(),
      coursesListApi.getCategoryTabs(),
    ])
    banners.value = home.banners ?? []
    flashSaleCourses.value = home.flashSale ?? []
    featured.value = home.featured ?? []
    ranking.value = home.ranking ?? []
    newCourses.value = home.newCourses ?? []
    categoryTabs.value = tabs
    startBannerTimer()
  } catch {
    /* 头部失败静默；分类 tab 兜底仅「全部」 */
    if (!categoryTabs.value.length) categoryTabs.value = [{ id: 'all', name: '全部' }]
  }
}

onLoad((opts?: Record<string, string>) => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
  if (opts?.category) activeCategory.value = opts.category
  if (opts?.sort) activeSort.value = opts.sort
  loadHeader()
  refresh()
})
onReachBottom(() => loadMore())

// 下拉刷新：重拉课程首页头部与列表
onPullDownRefresh(async () => {
  try {
    await Promise.all([loadHeader(), refresh()])
  } finally {
    uni.stopPullDownRefresh()
  }
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
})

function retry() { loadHeader(); refresh() }

function selectCategory(id: string) {
  if (activeCategory.value === id) return
  activeCategory.value = id
  refresh()
}
function selectSort(id: string) {
  activeSort.value = id
  showSortSheet.value = false
  refresh()
}
function backToAll() {
  activeCategory.value = 'all'
  refresh()
}

function openCourse(id: string) { navigateTo(`/course/${id}`) }
function openSearch() { navigateTo('/search') }
// 「我的学习」→ P4 我的学习（全局）
function openMyLearning() { navigateTo('/courses/my-learning') }
</script>

<template>
  <view class="page">
    <!-- ══ 区块1 顶部导航（左标题·右搜索+我的学习）══ -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <text class="nav-title serif">课程</text>
      <view class="nav-icons">
        <view class="nav-btn" hover-class="btn-press" @tap="openSearch">
          <app-icon name="search" :size="38" color="#2C2C2C" />
        </view>
        <view class="nav-btn" hover-class="btn-press" @tap="openMyLearning">
          <app-icon name="book-open" :size="38" color="#2C2C2C" />
        </view>
      </view>
    </view>

    <!-- ══ 区块2 分类 Tab 横滑（朱红下划线选中态）══ -->
    <scroll-view class="tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="t in categoryTabs" :key="t.id"
          class="tab" :class="{ active: activeCategory === t.id }"
          hover-class="tab-press"
          @tap="selectCategory(t.id)"
        >
          <text class="tab-txt" :class="{ active: activeCategory === t.id }">{{ t.name }}</text>
          <view v-if="activeCategory === t.id" class="tab-line" />
        </view>
      </view>
    </scroll-view>

    <!-- ══ Error 态 ══ -->
    <view v-if="error" class="state-wrap">
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="btn-press" @tap="retry"><text class="retry-text">重试</text></view>
    </view>

    <!-- ══ Loading 骨架屏 ══ -->
    <view v-else-if="loading" class="body-pad">
      <view class="sk sk-banner" />
      <view v-for="n in 2" :key="n" class="sk-card">
        <view class="sk sk-cover" />
        <view class="sk-card-body">
          <view class="sk sk-line" style="width:86%" />
          <view class="sk sk-line" style="width:55%" />
          <view class="sk sk-line sk-line-sm" style="width:40%" />
        </view>
      </view>
    </view>

    <!-- ══ Content ══ -->
    <view v-else class="body-pad">
      <!-- ══ 图标分类导航（国学质感线条·点击筛选主列表）══ -->
      <view v-if="iconCategories.length" class="cat-grid">
        <view
          v-for="t in iconCategories" :key="t.id"
          class="cat-item" hover-class="btn-press"
          @tap="selectCategory(t.id)"
        >
          <view class="cat-ico" :style="{ background: catIcon(t.name).color + '1a' }">
            <app-icon :name="catIcon(t.name).icon" :size="42" :color="catIcon(t.name).color" />
          </view>
          <text class="cat-label">{{ t.name }}</text>
        </view>
      </view>

      <!-- 分专栏（默认「全部」态才陈列，进入具体分类时聚焦列表）-->
      <template v-if="activeCategory === 'all'">
      <!-- ══ 区块3 推荐位轮播（可选·有运营数据才显示）══ -->
      <view v-if="banners.length" class="banner">
        <view
          v-for="(b, i) in banners" :key="b.id"
          class="banner-slide" :class="{ on: i === currentBanner }"
          @tap="b.link && navigateTo(b.link)"
        >
          <view class="ratio-169">
            <smart-cover class="banner-img" :src="b.image" :title="b.title" type="course" deco :deco-size="96" />
          </view>
          <view class="banner-overlay">
            <text class="banner-title serif">{{ b.title }}</text>
          </view>
        </view>
        <view v-if="banners.length > 1" class="banner-dots">
          <view v-for="(_, i) in banners" :key="i" class="dot" :class="{ on: i === currentBanner }" />
        </view>
      </view>

      <!-- ══ 区块4 限时秒杀横条（有秒杀活动才显示）══ -->
      <view v-if="flashSaleCourses.length" class="seckill">
        <!-- 倒计时已删（原派生自当日 23:59:59 非真实活动截止·到 0 恒显 00:00:00=假倒计时）；
             只留「限时优惠」标+划线价锚点诚实表达折扣语义，接真活动截止配置后恢复倒计时 -->
        <view class="seckill-head">
          <text class="seckill-tag">限时优惠</text>
          <text class="seckill-sub">精选好课 · 折后价立省</text>
        </view>
        <scroll-view class="seckill-cards" scroll-x :show-scrollbar="false">
          <view class="seckill-cards-inner">
            <view
              v-for="c in flashSaleCourses" :key="c.id"
              class="sk-item" hover-class="card-press" @tap="openCourse(c.id)"
            >
              <view class="sk-item-cover">
                <smart-cover class="sk-item-img" :src="c.cover" :title="c.title" type="course" deco />
              </view>
              <view class="sk-item-body">
                <text class="sk-item-name">{{ c.title }}</text>
                <view class="sk-item-price">
                  <text class="sk-now">¥{{ formatPrice(c.price) }}</text>
                  <text v-if="c.originalPrice > c.price" class="sk-old">¥{{ formatPrice(c.originalPrice) }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ══ 精选好课（横滑大卡·编辑严选）══ -->
      <view v-if="featured.length" class="sec">
        <section-header icon="award" title="精选好课" subtitle="编辑严选" icon-color="#C0392B" />
        <scroll-view class="rail-row" scroll-x :show-scrollbar="false">
          <view class="rail-inner">
            <course-card v-for="c in featured" :key="c.id" :data="c" variant="rail" />
          </view>
        </scroll-view>
      </view>

      <!-- ══ 热门排行（榜单·学员都在学）══ -->
      <view v-if="ranking.length" class="sec">
        <section-header icon="flame" title="热门排行" subtitle="学员都在学" icon-color="#E74C3C" />
        <view class="rank-list">
          <course-card
            v-for="(c, i) in ranking" :key="c.id"
            :data="c" variant="rank" :rank="i + 1"
          />
        </view>
      </view>

      <!-- ══ 新上架（横滑·抢先学习）══ -->
      <view v-if="newCourses.length" class="sec">
        <section-header icon="sparkles" title="新上架" subtitle="抢先学习" icon-color="#2980B9" />
        <scroll-view class="rail-row" scroll-x :show-scrollbar="false">
          <view class="rail-inner">
            <course-card v-for="c in newCourses" :key="c.id" :data="c" variant="rail" />
          </view>
        </scroll-view>
      </view>
      </template>

      <!-- ══ 区块6 全部课程（分类筛选 + 排序 + 单列大卡）══ -->
      <view class="sort-row">
        <text class="sort-label serif">{{ activeCategory === 'all' ? '全部课程' : categoryTabs.find(t => t.id === activeCategory)?.name || '课程' }}</text>
        <view class="sort-btn" hover-class="btn-press" @tap="showSortSheet = true">
          <text class="sort-btn-txt">{{ activeSortName }}</text>
          <app-icon name="chevron-down" :size="24" color="#6E6E73" />
        </view>
      </view>

      <!-- ══ 区块5 课程列表（主体·单列大卡流）══ -->
      <!-- 空态：当前分类暂无课程（导航/Tab 保留，仅列表区变空态）-->
      <view v-if="courses.length === 0" class="empty">
        <view class="empty-art">
          <app-icon name="book-open" :size="56" color="#C9A96E" />
        </view>
        <text class="empty-title serif">该分类暂无课程</text>
        <text class="empty-desc">讲师正在筹备中，先去别的分类逛逛吧</text>
        <view v-if="activeCategory !== 'all'" class="empty-btn" hover-class="btn-press" @tap="backToAll">
          <text class="empty-btn-txt">看看全部课程</text>
        </view>
      </view>

      <template v-else>
        <view
          v-for="c in courses" :key="c.id"
          class="card" hover-class="card-press" @tap="openCourse(String(c.id))"
        >
          <view class="card-cover">
            <smart-cover class="card-cover-img" :src="c.cover" :title="c.title" type="course" deco :deco-size="56" />
            <text class="type-tag">课程</text>
          </view>
          <view class="card-body">
            <text class="card-title serif">{{ c.title }}</text>
            <!-- 讲师行 -->
            <view v-if="c.teacher" class="teacher-row">
              <view class="avatar">
                <smart-avatar :src="c.teacherAvatar" :name="c.teacher" class="avatar-img" />
              </view>
              <text class="teacher-name">{{ c.teacher }}</text>
            </view>
            <!-- 底行：学习人数 / 评分（≥4.5 才显示） · 价格三形态 -->
            <view class="bottom-row">
              <view class="meta">
                <text v-if="c.students" class="meta-txt">{{ formatCount(c.students) }} 人在学</text>
                <view v-if="(c.rating ?? 0) >= 4.5" class="rating">
                  <app-icon name="star" :size="24" color="#C9A96E" />
                  <text class="rating-num">{{ c.rating }}</text>
                </view>
              </view>
              <view class="price">
                <text v-if="c.free" class="price-free">免费</text>
                <template v-else>
                  <text class="price-now">¥{{ formatPrice(c.price) }}</text>
                  <text v-if="c.originalPrice && c.originalPrice > (c.price ?? 0)" class="price-old">¥{{ formatPrice(c.originalPrice) }}</text>
                </template>
              </view>
            </view>
          </view>
        </view>
        <app-load-more :status="loadStatus" />
      </template>
    </view>

    <!-- ══ 排序底部弹层 ══ -->
    <view v-if="showSortSheet" class="sheet-mask" @tap="showSortSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hd">
          <text class="sheet-title">排序方式</text>
          <view class="sheet-close" @tap="showSortSheet = false">
            <app-icon name="chevron-down" :size="32" color="#999999" />
          </view>
        </view>
        <view
          v-for="opt in courseSortOptions" :key="opt.id"
          class="sheet-opt" :class="{ on: activeSort === opt.id }"
          hover-class="tab-press"
          @tap="selectSort(opt.id)"
        >
          <text class="sheet-opt-txt" :class="{ on: activeSort === opt.id }">{{ opt.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ── 视觉 token（V0 委托书第七节）── */
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 40rpx;
}
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }
.btn-press { opacity: 0.6; }
.card-press { transform: scale(0.98); }
.tab-press { opacity: 0.7; }

/* ── 区块1 顶部导航 ── */
.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 40rpx 20rpx;
  background: #FAF8F5;
}
.nav-title { font-size: 48rpx; font-weight: 700; letter-spacing: 2rpx; color: #2C2C2C; }
.nav-icons { display: flex; align-items: center; gap: 28rpx; }
.nav-btn {
  position: relative;
  width: 72rpx; height: 72rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}

/* ── 区块2 分类 Tab ── */
.tabs { white-space: nowrap; background: #FAF8F5; }
.tabs-inner { display: inline-flex; gap: 44rpx; padding: 8rpx 40rpx 0; }
.tab { position: relative; flex-shrink: 0; padding-bottom: 20rpx; display: flex; flex-direction: column; align-items: center; }
.tab-txt { font-size: 30rpx; color: #6E6E73; }
.tab-txt.active { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.tab-line { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 40rpx; height: 6rpx; border-radius: 4rpx; background: #C41E3A; }

/* ── 内容主体间距 ── */
.body-pad { padding: 24rpx 40rpx 32rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 图标分类导航（2 行网格·宣纸质感）── */
.cat-grid {
  display: flex; flex-wrap: wrap;
  background: #FFFFFF; border-radius: 28rpx;
  padding: 28rpx 8rpx 12rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}
.cat-item {
  width: 20%; display: flex; flex-direction: column; align-items: center;
  gap: 14rpx; margin-bottom: 20rpx;
}
.cat-ico {
  width: 88rpx; height: 88rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
}
.cat-label { font-size: 24rpx; color: #2C2C2C; }

/* ── 分专栏（section）── */
.sec { display: flex; flex-direction: column; gap: 20rpx; }
.rail-row { white-space: nowrap; }
.rail-inner { display: inline-flex; gap: 20rpx; padding-bottom: 4rpx; }
.rank-list { display: flex; flex-direction: column; background: #FFFFFF; border-radius: 28rpx; padding: 8rpx 24rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }

/* ── 区块3 推荐位轮播 16:9 ── */
.banner { position: relative; border-radius: 36rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.ratio-169 { position: relative; width: 100%; padding-top: 56.25%; }
.banner-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.5s; pointer-events: none; }
.banner-slide.on { position: relative; opacity: 1; pointer-events: auto; }
.banner-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.banner-overlay {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 64rpx 32rpx 28rpx;
  background: linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0));
  display: flex; align-items: flex-end;
}
.banner-title { color: #fff; font-size: 34rpx; font-weight: 700; line-height: 1.4; }
.banner-dots { position: absolute; right: 28rpx; top: 24rpx; display: flex; gap: 10rpx; }
.dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.dot.on { width: 28rpx; border-radius: 6rpx; background: #fff; }

/* ── 区块4 限时秒杀横条（金色浅底·深字，X5 安全）── */
.seckill { background: rgba(201,169,110,0.14); border-radius: 36rpx; padding: 28rpx 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.seckill-head { display: flex; align-items: center; gap: 20rpx; }
.seckill-tag { flex-shrink: 0; background: #C41E3A; color: #fff; font-size: 22rpx; font-weight: 700; padding: 6rpx 16rpx; border-radius: 12rpx; letter-spacing: 2rpx; }
.seckill-sub { font-size: 26rpx; color: #6E6E73; }
.seckill-more { margin-left: auto; display: flex; align-items: center; }
.seckill-more-txt { font-size: 26rpx; color: #999999; }
.seckill-cards { white-space: nowrap; }
.seckill-cards-inner { display: inline-flex; gap: 20rpx; padding-bottom: 4rpx; }
.sk-item { flex-shrink: 0; width: 320rpx; background: #FFFFFF; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); } /* 16:9 横卡宽 320rpx（封面高 180rpx） */
.sk-item-cover { position: relative; width: 100%; padding-top: 56.25%; } /* 课程卡容器 16:9（规范§五修订）·padding 法 */
.sk-item-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.sk-item-body { padding: 16rpx 20rpx 20rpx; }
.sk-item-name { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sk-item-price { margin-top: 8rpx; display: flex; align-items: baseline; gap: 10rpx; }
.sk-now { color: #C41E3A; font-size: 30rpx; font-weight: 700; }
.sk-old { color: #999999; font-size: 22rpx; text-decoration: line-through; }

/* ── 区块6 排序切换 ── */
.sort-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx; }
.sort-label { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.sort-btn { display: flex; align-items: center; gap: 8rpx; background: #FFFFFF; padding: 12rpx 24rpx; border-radius: 999rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.sort-btn-txt { font-size: 26rpx; color: #6E6E73; }

/* ── 区块5 课程大卡（全宽 16:9 顶图卡：670×377rpx·规范§五修订=容器跟随课程素材自然形态不裁切）── */
.card { background: #FFFFFF; border-radius: 28rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.card-cover { position: relative; width: 100%; padding-top: 56.25%; overflow: hidden; background: #F0EBE2; } /* 16:9 课程卡容器·X5 禁 aspect-ratio 用 padding 法 */
.card-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.type-tag { position: absolute; top: 16rpx; left: 16rpx; background: rgba(0,0,0,0.55); color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 10rpx; z-index: 3; }
.card-body { padding: 20rpx 24rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.card-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.teacher-row { display: flex; align-items: center; gap: 14rpx; }
.avatar { width: 40rpx; height: 40rpx; border-radius: 999rpx; overflow: hidden; background: #F0EBE2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-ph { font-size: 22rpx; color: #6E6E73; }
.teacher-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.bottom-row { margin-top: auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8rpx; }
.meta { display: flex; align-items: center; gap: 20rpx; }
.meta-txt { font-size: 26rpx; color: #999999; }
.rating { display: flex; align-items: center; gap: 6rpx; }
.rating-num { font-size: 26rpx; font-weight: 600; color: #C9A96E; }
.price { display: flex; align-items: baseline; gap: 12rpx; }
.price-now { color: #C41E3A; font-size: 34rpx; font-weight: 700; }
.price-old { color: #999999; font-size: 26rpx; text-decoration: line-through; }
.price-free { color: #34A853; font-size: 34rpx; font-weight: 700; }

/* ── 空态 ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 24rpx; padding: 128rpx 60rpx; text-align: center; }
.empty-art { width: 200rpx; height: 200rpx; border-radius: 50%; background: #F8F4EC; display: flex; align-items: center; justify-content: center; }
.empty-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.empty-desc { font-size: 26rpx; color: #999999; line-height: 1.5; }
.empty-btn { margin-top: 8rpx; height: 84rpx; padding: 0 48rpx; border-radius: 999rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; }
.empty-btn-txt { font-size: 28rpx; font-weight: 600; color: #C41E3A; }

/* ── 错误态 ── */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.state-text { font-size: 28rpx; color: #6E6E73; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* ── 骨架屏（#F0EBE2 微光 1.4s）── */
.sk { position: relative; overflow: hidden; background: #F0EBE2; border-radius: 12rpx; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
.sk-banner { width: 100%; padding-top: 56.25%; border-radius: 36rpx; }
.sk-card { background: #FFFFFF; border-radius: 28rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.sk-cover { width: 100%; padding-top: 56.25%; border-radius: 0; } /* 与全宽 16:9 顶图卡封面同比例 */
.sk-card-body { padding: 20rpx 24rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-line { height: 32rpx; }
.sk-line-sm { height: 26rpx; }

/* ── 排序底部弹层 ── */
.sheet-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; justify-content: flex-end; }
.sheet { background: #FFFFFF; border-radius: 36rpx 36rpx 0 0; padding: 32rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); }
.sheet-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.sheet-close { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.sheet-opt { padding: 26rpx 8rpx; border-bottom: 2rpx solid #EDE7DD; }
.sheet-opt:last-child { border-bottom: none; }
.sheet-opt-txt { font-size: 30rpx; color: #2C2C2C; }
.sheet-opt-txt.on { color: #C41E3A; font-weight: 600; }
</style>
