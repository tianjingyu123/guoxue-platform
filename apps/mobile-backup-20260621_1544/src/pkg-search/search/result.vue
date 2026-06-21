<template>
  <view class="result-page">
    <!-- 顶部：搜索栏 + Tab -->
    <view
      class="result-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="search-bar-row">
        <view
          class="back-btn"
          @click="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="44"
            color="var(--text-main)"
          />
        </view>
        <view class="search-input-wrap">
          <app-icon
            name="search"
            :size="32"
            color="var(--text-soft)"
          />
          <input
            v-model="searchValue"
            class="search-input"
            placeholder="搜索课程、圈子、商品..."
            placeholder-class="search-input-ph"
            confirm-type="search"
            @confirm="handleSearch"
          >
          <view
            v-if="searchValue"
            class="clear-btn"
            @click="searchValue = ''"
          >
            <app-icon
              name="x"
              :size="28"
              color="var(--text-soft)"
            />
          </view>
        </view>
        <view
          class="search-action"
          @click="handleSearch"
        >
          <text class="search-action-text">
            搜索
          </text>
        </view>
      </view>

      <!-- Tab 横滚 -->
      <scroll-view
        scroll-x
        class="tabs-scroll"
        :show-scrollbar="false"
      >
        <view class="tabs-row">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-item"
            :class="{ 'tab-item--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <text
              class="tab-label"
              :class="{ 'tab-label--active': activeTab === tab.key }"
            >
              {{ tab.label }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view
      scroll-y
      class="result-body"
    >
      <!-- 加载骨架 -->
      <view
        v-if="loading"
        class="skeleton-wrap"
      >
        <view
          v-for="i in 5"
          :key="i"
          class="skeleton-card"
        >
          <view class="sk-line sk-line--title" />
          <view class="sk-line sk-line--full" />
          <view class="sk-line sk-line--two-third" />
        </view>
      </view>

      <block v-else>
        <!-- AI 智能总结（仅综合Tab）-->
        <view
          v-if="activeTab === 'all'"
          class="ai-summary-pad"
        >
          <view class="ai-summary-card">
            <view
              class="ai-summary-head"
              @click="aiExpanded = !aiExpanded"
            >
              <view class="ai-summary-head-left">
                <view class="ai-summary-icon">
                  <app-icon
                    name="sparkles"
                    :size="28"
                    color="#ffffff"
                  />
                </view>
                <text class="ai-summary-title">
                  AI智能总结
                </text>
              </view>
              <app-icon
                :name="aiExpanded ? 'chevron-up' : 'chevron-down'"
                :size="32"
                color="var(--text-soft)"
              />
            </view>

            <view
              v-if="aiExpanded"
              class="ai-summary-body"
            >
              <text class="ai-summary-text">
                {{ aiSummary.summary }}
              </text>

              <view class="ai-block">
                <text class="ai-block-label">
                  核心要点
                </text>
                <view class="ai-points">
                  <view
                    v-for="(point, i) in aiSummary.keyPoints"
                    :key="i"
                    class="ai-point-chip"
                  >
                    <text class="ai-point-text">
                      {{ point }}
                    </text>
                  </view>
                </view>
              </view>

              <view class="ai-block">
                <text class="ai-block-label">
                  相关问题
                </text>
                <view class="ai-questions">
                  <text
                    v-for="(q, i) in aiSummary.relatedQuestions"
                    :key="i"
                    class="ai-question"
                    @click="goSearch(q)"
                  >
                    {{ q }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="results-pad">
          <!-- 内容结果 -->
          <view
            v-if="(activeTab === 'all' || activeTab === 'content') && results.contents.length"
            class="result-group"
          >
            <view
              v-if="activeTab === 'all'"
              class="group-head"
            >
              <text class="group-title">
                相关内容
              </text>
              <text
                class="group-more"
                @click="activeTab = 'content'"
              >
                查看全部
              </text>
            </view>
            <view
              v-for="item in results.contents"
              :key="item.id"
              class="content-card"
              @click="navigateTo(item.type === 'video' ? `/videos/${item.id}` : `/articles/${item.id}`)"
            >
              <view class="content-main">
                <view class="content-tags">
                  <text
                    v-if="item.type === 'video'"
                    class="type-tag type-tag--video"
                  >
                    视频
                  </text>
                  <text
                    v-if="item.type === 'article'"
                    class="type-tag type-tag--article"
                  >
                    文章
                  </text>
                  <text
                    v-if="item.type === 'post'"
                    class="type-tag type-tag--post"
                  >
                    帖子
                  </text>
                </view>
                <rich-text
                  class="content-title"
                  :nodes="highlight(item.title)"
                />
                <rich-text
                  class="content-summary"
                  :nodes="highlight(item.summary)"
                />
                <view class="content-foot">
                  <text class="content-author">
                    {{ item.author.name }}
                  </text>
                  <view class="content-stats">
                    <view class="stat">
                      <app-icon
                        name="heart"
                        :size="22"
                        color="var(--text-soft)"
                      />
                      <text class="stat-num">
                        {{ item.likes }}
                      </text>
                    </view>
                    <view class="stat">
                      <app-icon
                        name="message-circle"
                        :size="22"
                        color="var(--text-soft)"
                      />
                      <text class="stat-num">
                        {{ item.comments }}
                      </text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 圈子结果 -->
          <view
            v-if="(activeTab === 'all' || activeTab === 'circle') && results.circles.length"
            class="result-group"
          >
            <view
              v-if="activeTab === 'all'"
              class="group-head"
            >
              <text class="group-title">
                相关圈子
              </text>
              <text
                class="group-more"
                @click="activeTab = 'circle'"
              >
                查看全部
              </text>
            </view>
            <view
              v-for="circle in results.circles"
              :key="circle.id"
              class="circle-card"
              @click="navigateTo(`/circles/${circle.id}`)"
            >
              <view class="circle-avatar">
                <app-icon
                  name="users"
                  :size="48"
                  color="#C41E3A"
                />
              </view>
              <view class="circle-info">
                <rich-text
                  class="circle-name"
                  :nodes="highlight(circle.name)"
                />
                <text class="circle-desc">
                  {{ circle.description }}
                </text>
                <view class="circle-stats">
                  <text class="circle-stat">
                    {{ formatNumber(circle.memberCount) }}成员
                  </text>
                  <text class="circle-stat">
                    {{ formatNumber(circle.postCount) }}帖子
                  </text>
                </view>
              </view>
              <view class="join-btn">
                <text class="join-btn-text">
                  加入
                </text>
              </view>
            </view>
          </view>

          <!-- 课程结果 -->
          <view
            v-if="(activeTab === 'all' || activeTab === 'course') && results.courses.length"
            class="result-group"
          >
            <view
              v-if="activeTab === 'all'"
              class="group-head"
            >
              <text class="group-title">
                相关课程
              </text>
              <text
                class="group-more"
                @click="activeTab = 'course'"
              >
                查看全部
              </text>
            </view>
            <view :class="activeTab === 'course' ? 'course-grid' : 'course-list'">
              <view
                v-for="course in results.courses"
                :key="course.id"
                :class="activeTab === 'course' ? 'course-card-grid' : 'course-card-row'"
                @click="navigateTo(`/courses/${course.id}`)"
              >
                <view :class="activeTab === 'course' ? 'course-cover-grid' : 'course-cover-row'">
                  <app-icon
                    name="book-open"
                    :size="56"
                    color="#C41E3A"
                  />
                </view>
                <view :class="activeTab === 'course' ? 'course-meta-grid' : 'course-meta-row'">
                  <rich-text
                    class="course-title"
                    :nodes="highlight(course.title)"
                  />
                  <text class="course-teacher">
                    {{ course.teacher }}
                  </text>
                  <view class="course-sub">
                    <view class="course-rating">
                      <app-icon
                        name="star"
                        :size="22"
                        color="#C9A96E"
                        :fill="true"
                      />
                      <text class="course-rating-num">
                        {{ course.rating }}
                      </text>
                    </view>
                    <text class="course-students">
                      {{ formatNumber(course.studentCount) }}人学习
                    </text>
                  </view>
                  <view class="course-price-row">
                    <text class="course-price">
                      ¥{{ course.price }}
                    </text>
                    <text
                      v-if="course.originalPrice"
                      class="course-original"
                    >
                      ¥{{ course.originalPrice }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 商品结果 -->
          <view
            v-if="(activeTab === 'all' || activeTab === 'product') && results.products.length"
            class="result-group"
          >
            <view
              v-if="activeTab === 'all'"
              class="group-head"
            >
              <text class="group-title">
                相关商品
              </text>
              <text
                class="group-more"
                @click="activeTab = 'product'"
              >
                查看全部
              </text>
            </view>
            <view class="product-grid">
              <view
                v-for="product in results.products"
                :key="product.id"
                class="product-card"
                @click="navigateTo(`/mall/product/${product.id}`)"
              >
                <view class="product-cover">
                  <app-icon
                    name="shopping-bag"
                    :size="72"
                    color="rgba(196,30,58,0.5)"
                  />
                </view>
                <view class="product-meta">
                  <rich-text
                    class="product-name"
                    :nodes="highlight(product.name)"
                  />
                  <view class="product-foot">
                    <view class="product-price-wrap">
                      <text class="product-price">
                        ¥{{ product.price }}
                      </text>
                      <text
                        v-if="product.originalPrice"
                        class="product-original"
                      >
                        ¥{{ product.originalPrice }}
                      </text>
                    </view>
                    <text class="product-sales">
                      {{ product.sales }}人购买
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 用户结果 -->
          <view
            v-if="(activeTab === 'all' || activeTab === 'user') && results.users.length"
            class="result-group"
          >
            <view
              v-if="activeTab === 'all'"
              class="group-head"
            >
              <text class="group-title">
                相关用户
              </text>
              <text
                class="group-more"
                @click="activeTab = 'user'"
              >
                查看全部
              </text>
            </view>
            <view
              v-for="user in results.users"
              :key="user.id"
              class="user-card"
              @click="navigateTo(`/user/${user.id}`)"
            >
              <view class="user-avatar">
                <app-icon
                  name="user"
                  :size="44"
                  color="#C41E3A"
                />
              </view>
              <view class="user-info">
                <rich-text
                  class="user-name"
                  :nodes="highlight(user.name)"
                />
                <text
                  v-if="user.bio"
                  class="user-bio"
                >
                  {{ user.bio }}
                </text>
                <view class="user-stat">
                  <app-icon
                    name="trending-up"
                    :size="22"
                    color="var(--text-soft)"
                  />
                  <text class="user-fans">
                    {{ formatNumber(user.followers) }}粉丝
                  </text>
                </view>
              </view>
              <view
                class="follow-btn"
                :class="{ 'follow-btn--done': user.isFollowed }"
              >
                <text
                  class="follow-btn-text"
                  :class="{ 'follow-btn-text--done': user.isFollowed }"
                >
                  {{ user.isFollowed ? '已关注' : '关注' }}
                </text>
              </view>
            </view>
          </view>

          <!-- 空态 -->
          <view
            v-if="isEmpty"
            class="empty-state"
          >
            <view class="empty-icon">
              <app-icon
                name="search"
                :size="56"
                color="var(--text-soft)"
              />
            </view>
            <text class="empty-title">
              没有找到相关内容
            </text>
            <text class="empty-desc">
              换个关键词，或试试下面的热门搜索
            </text>
            <view class="empty-tags">
              <view
                v-for="kw in emptyHotWords"
                :key="kw"
                class="empty-tag"
                @click="goSearch(kw)"
              >
                <text class="empty-tag-text">
                  {{ kw }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </block>

      <view class="bottom-gap" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'

type TabType = 'all' | 'content' | 'circle' | 'course' | 'product' | 'user'

const tabs: { key: TabType; label: string }[] = [
  { key: 'all', label: '综合' },
  { key: 'content', label: '内容' },
  { key: 'circle', label: '圈子' },
  { key: 'course', label: '课程' },
  { key: 'product', label: '商品' },
  { key: 'user', label: '用户' },
]

// 来源页面 → 默认Tab 映射（从课程页搜索默认落"课程"Tab）
const fromToTab: Record<string, TabType> = {
  course: 'course',
  mall: 'product',
  shop: 'product',
  circle: 'circle',
  classics: 'content',
}

// ===== UI 状态 =====
const statusBarHeight = ref(0)
const keyword = ref('')
const searchValue = ref('')
const activeTab = ref<TabType>('all')
const loading = ref(true)
const aiExpanded = ref(true)

const emptyHotWords = ['八字入门', '紫微斗数', '风水布局', '奇门遁甲', '六爻预测']

// ===== Mock 数据（照抄原型，关键词动态拼接；交接后由 Claude Code 接入接口）=====
// @data-needs: GET /api/search/ai-summary?keyword=xxx
const aiSummary = computed(() => ({
  summary: `关于"${keyword.value}"的搜索结果显示，这是国学领域的重要概念。根据平台内容分析，相关课程和文章主要涵盖基础理论、实践应用和案例分析三个方面。`,
  keyPoints: ['基础理论知识体系完整', '实践案例丰富详实', '多位名师深度讲解'],
  relatedQuestions: ['如何入门学习？', '有哪些经典书籍推荐？', '实际应用场景有哪些？'],
}))

// @data-needs: GET /api/search/results?keyword=xxx&tab=xxx
const results = computed(() => {
  const kw = keyword.value
  return {
    contents: [
      { id: '1', type: 'article' as const, title: `深入解读${kw}的核心要义`, summary: '本文从多个角度深入分析，帮助读者全面理解其内涵与外延...', author: { id: '1', name: '张老师' }, likes: 328, comments: 56 },
      { id: '2', type: 'video' as const, title: `${kw}入门必看教程`, summary: '零基础小白也能快速上手，系统学习核心知识点...', author: { id: '2', name: '李讲师' }, likes: 892, comments: 124 },
      { id: '3', type: 'post' as const, title: `我学习${kw}三年的心得体会`, summary: '分享我的学习历程和一些实用的学习方法...', author: { id: '3', name: '老学员' }, likes: 156, comments: 38 },
    ],
    circles: [
      { id: '1', name: `${kw}研习社`, description: '专注于国学知识的深度探讨与交流', memberCount: 12580, postCount: 3420 },
      { id: '2', name: `${kw}爱好者`, description: '志同道合的朋友一起学习成长', memberCount: 8960, postCount: 2180 },
    ],
    courses: [
      { id: '1', title: `${kw}系统精讲课`, price: 299, originalPrice: 599, teacher: '王教授', studentCount: 5680, rating: 4.9 },
      { id: '2', title: `${kw}实战应用班`, price: 199, originalPrice: 399, teacher: '赵讲师', studentCount: 3240, rating: 4.8 },
      { id: '3', title: `${kw}高级研修课`, price: 499, originalPrice: 999, teacher: '钱大师', studentCount: 1890, rating: 4.9 },
    ],
    products: [
      { id: '1', name: `${kw}经典教材`, price: 68, originalPrice: 98, sales: 2380 },
      { id: '2', name: `${kw}学习工具套装`, price: 128, originalPrice: 198, sales: 1560 },
    ],
    users: [
      { id: '1', name: '国学大师张三', bio: '专注国学研究30年，著有多部畅销书籍', followers: 128000, isFollowed: false },
      { id: '2', name: '李老师讲国学', bio: '每日分享国学智慧，让传统文化走进生活', followers: 86000, isFollowed: true },
    ],
  }
})

const isEmpty = computed(() => {
  const r = results.value
  return !loading.value && !r.contents.length && !r.circles.length && !r.courses.length && !r.products.length && !r.users.length
})

onLoad((opt) => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  const kw = opt && opt.keyword ? decodeURIComponent(opt.keyword) : ''
  const from = opt && opt.from ? opt.from : ''
  keyword.value = kw
  searchValue.value = kw
  activeTab.value = fromToTab[from] || 'all'
  triggerLoading()
})

// 关键词或Tab变化 → 模拟加载
watch([keyword, activeTab], () => triggerLoading())

let loadTimer: ReturnType<typeof setTimeout> | null = null
function triggerLoading() {
  loading.value = true
  if (loadTimer) clearTimeout(loadTimer)
  loadTimer = setTimeout(() => { loading.value = false }, 800)
}

function goBack() {
  navigateBack()
}

function handleSearch() {
  const q = searchValue.value.trim()
  if (q && q !== keyword.value) {
    keyword.value = q
  }
}

function goSearch(q: string) {
  navigateTo(`/search/result?keyword=${encodeURIComponent(q)}`)
}

// 关键词高亮：返回 rich-text nodes（红色高亮命中片段）
function highlight(text: string) {
  const kw = keyword.value
  if (!kw) return [{ name: 'span', attrs: { style: 'color:inherit' }, children: [{ type: 'text', text }] }]
  const parts = text.split(new RegExp(`(${escapeReg(kw)})`, 'gi'))
  return parts
    .filter((p) => p !== '')
    .map((part) => {
      const hit = part.toLowerCase() === kw.toLowerCase()
      return {
        name: 'span',
        attrs: { style: hit ? 'color:#C41E3A;font-weight:500' : 'color:inherit' },
        children: [{ type: 'text', text: part }],
      }
    })
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatNumber(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}
</script>

<style scoped>
.result-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background);
}

/* 顶部 */
.result-header {
  background: var(--surface);
  border-bottom: 2rpx solid var(--line);
}
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}
.back-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: var(--background);
  border-radius: 36rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
}
.search-input-ph {
  color: var(--text-soft);
}
.clear-btn {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-action {
  flex-shrink: 0;
  padding: 0 4rpx;
}
.search-action-text {
  font-size: 28rpx;
  color: #C41E3A;
  font-weight: 500;
  white-space: nowrap;
}

/* Tab 横滚 */
.tabs-scroll {
  white-space: nowrap;
  width: 100%;
}
.tabs-row {
  display: inline-flex;
  padding: 0 8rpx;
}
.tab-item {
  flex-shrink: 0;
  padding: 20rpx 28rpx;
  border-bottom: 4rpx solid transparent;
}
.tab-item--active {
  border-bottom-color: #C41E3A;
}
.tab-label {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-soft);
  white-space: nowrap;
}
.tab-label--active {
  color: #C41E3A;
}

/* 主体 */
.result-body {
  flex: 1;
  overflow: hidden;
}

/* 骨架 */
.skeleton-wrap {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.skeleton-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
}
.sk-line {
  height: 28rpx;
  background: var(--line);
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}
.sk-line--title { width: 75%; height: 32rpx; }
.sk-line--full { width: 100%; }
.sk-line--two-third { width: 66%; margin-bottom: 0; }

/* AI 总结 */
.ai-summary-pad {
  padding: 32rpx;
}
.ai-summary-card {
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.05), rgba(201, 169, 110, 0.1));
  border-radius: 32rpx;
  overflow: hidden;
}
.ai-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
}
.ai-summary-head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ai-summary-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #C41E3A, #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-summary-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-main);
}
.ai-summary-body {
  padding: 0 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ai-summary-text {
  font-size: 28rpx;
  color: var(--text-soft);
  line-height: 1.6;
}
.ai-block {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ai-block-label {
  font-size: 24rpx;
  color: var(--text-soft);
}
.ai-points {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.ai-point-chip {
  padding: 8rpx 24rpx;
  background: var(--surface);
  border-radius: 32rpx;
}
.ai-point-text {
  font-size: 24rpx;
  color: var(--text-soft);
}
.ai-questions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.ai-question {
  font-size: 28rpx;
  color: #C41E3A;
}

/* 结果区 */
.results-pad {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.result-group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.group-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-main);
}
.group-more {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 内容卡片 */
.content-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
}
.content-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.type-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.type-tag--video { background: rgba(196, 30, 58, 0.1); color: #C41E3A; }
.type-tag--article { background: #dbeafe; color: #2563eb; }
.type-tag--post { background: #dcfce7; color: #16a34a; }
.content-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.content-summary {
  font-size: 24rpx;
  color: var(--text-soft);
  line-height: 1.5;
  margin-top: 8rpx;
  display: block;
}
.content-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.content-author {
  font-size: 24rpx;
  color: var(--text-soft);
}
.content-stats {
  display: flex;
  gap: 24rpx;
}
.stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.stat-num {
  font-size: 24rpx;
  color: var(--text-soft);
}

/* 圈子卡片 */
.circle-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.circle-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.circle-info {
  flex: 1;
  min-width: 0;
}
.circle-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.circle-desc {
  font-size: 24rpx;
  color: var(--text-soft);
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.circle-stats {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
}
.circle-stat {
  font-size: 24rpx;
  color: var(--text-soft);
}
.join-btn {
  padding: 12rpx 32rpx;
  background: #C41E3A;
  border-radius: 32rpx;
  flex-shrink: 0;
}
.join-btn-text {
  font-size: 24rpx;
  color: #ffffff;
}

/* 课程列表/网格 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.course-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.course-card-row {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  gap: 24rpx;
}
.course-card-grid {
  background: var(--surface);
  border-radius: 32rpx;
  overflow: hidden;
}
.course-cover-row {
  width: 192rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.course-cover-grid {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
}
.course-meta-row {
  flex: 1;
  min-width: 0;
}
.course-meta-grid {
  padding: 24rpx;
}
.course-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.course-teacher {
  font-size: 24rpx;
  color: var(--text-soft);
  margin-top: 8rpx;
}
.course-sub {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.course-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.course-rating-num {
  font-size: 24rpx;
  color: #C9A96E;
}
.course-students {
  font-size: 24rpx;
  color: var(--text-soft);
}
.course-price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}
.course-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #C41E3A;
}
.course-original {
  font-size: 24rpx;
  color: var(--text-soft);
  text-decoration: line-through;
}

/* 商品网格 */
.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.product-card {
  background: var(--surface);
  border-radius: 32rpx;
  overflow: hidden;
}
.product-cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.1), rgba(201, 169, 110, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-meta {
  padding: 24rpx;
}
.product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.product-price-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.product-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}
.product-original {
  font-size: 22rpx;
  color: var(--text-soft);
  text-decoration: line-through;
}
.product-sales {
  font-size: 22rpx;
  color: var(--text-soft);
}

/* 用户卡片 */
.user-card {
  background: var(--surface);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  display: block;
}
.user-bio {
  font-size: 24rpx;
  color: var(--text-soft);
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.user-stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.user-fans {
  font-size: 24rpx;
  color: var(--text-soft);
}
.follow-btn {
  padding: 12rpx 32rpx;
  background: #C41E3A;
  border-radius: 32rpx;
  flex-shrink: 0;
}
.follow-btn--done {
  background: var(--background);
}
.follow-btn-text {
  font-size: 24rpx;
  color: #ffffff;
}
.follow-btn-text--done {
  color: var(--text-soft);
}

/* 空态 */
.empty-state {
  padding: 96rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-main);
}
.empty-desc {
  font-size: 26rpx;
  color: var(--text-soft);
  margin-top: 8rpx;
}
.empty-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16rpx;
  margin-top: 48rpx;
}
.empty-tag {
  padding: 12rpx 24rpx;
  background: var(--background);
  border-radius: 32rpx;
}
.empty-tag-text {
  font-size: 26rpx;
  color: var(--text-main);
  white-space: nowrap;
}

.bottom-gap {
  height: 120rpx;
}
</style>
