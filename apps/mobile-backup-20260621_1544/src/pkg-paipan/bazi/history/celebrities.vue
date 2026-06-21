<script setup lang="ts">
/**
 * 八字历史 · 案例库（从原型 app/paipan/bazi/history/celebrities/page.tsx 1:1 高保真迁移）
 * 已接入后端 API：GET /paipan/cases
 */
import { ref, computed, onMounted, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { apiGet } from '@/utils/request'

const wuxingColors: Record<string, string> = {
  甲: 'wx-wood', 乙: 'wx-wood', 丙: 'wx-fire', 丁: 'wx-fire',
  戊: 'wx-earth', 己: 'wx-earth', 庚: 'wx-metal', 辛: 'wx-metal',
  壬: 'wx-water', 癸: 'wx-water',
  子: 'wx-water', 丑: 'wx-earth', 寅: 'wx-wood', 卯: 'wx-wood',
  辰: 'wx-earth', 巳: 'wx-fire', 午: 'wx-fire', 未: 'wx-earth',
  申: 'wx-metal', 酉: 'wx-metal', 戌: 'wx-earth', 亥: 'wx-water',
}

const primaryCategories = ['名人案例', '大众案例']
const secondaryCategories: Record<string, string[]> = {
  名人案例: ['君主', '商界', '文艺', '体育', '历史', '军事', '僧道'],
  大众案例: ['财运', '事业', '婚姻', '健康', '学业', '灾厄', '长寿'],
}

interface Caze {
  id: string; name: string; gender: string; description: string; subtitle: string
  primaryCat: string; secondaryCat: string; bazi: string[]; letter: string; zodiac: string
}

const caseData = ref<Caze[]>([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const activePrimary = ref('名人案例')
const activeSecondary = ref('君主')
const isVip = ref(false)
const total = ref(0)

async function fetchCases() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams()
    params.set('primaryCat', activePrimary.value)
    params.set('secondaryCat', activeSecondary.value)
    if (searchQuery.value) params.set('keyword', searchQuery.value)
    params.set('pageSize', '100')
    const res = await apiGet<{ records: Caze[]; total: number }>(`/paipan/cases?${params.toString()}`)
    caseData.value = (res.records || []).map((c: any) => ({
      ...c,
      gender: c.gender === 'female' ? 'female' : 'male',
    }))
    total.value = res.total || 0
  } catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}

onMounted(fetchCases)
watch([activePrimary, activeSecondary, searchQuery], () => {
  // debounce search
  if ((searchQuery.value && searchQuery.value.length > 0 && searchQuery.value.length < 2)) return
  fetchCases()
})

function handlePrimaryChange(primary: string) {
  activePrimary.value = primary
  activeSecondary.value = secondaryCategories[primary][0]
}

const filteredCases = computed(() => caseData.value)

const groupedByLetter = computed(() => {
  const acc: Record<string, Caze[]> = {}
  for (const item of filteredCases.value) {
    if (!acc[item.letter]) acc[item.letter] = []
    acc[item.letter].push(item)
  }
  return acc
})
const availableLetters = computed(() => Object.keys(groupedByLetter.value).sort())

const DEFAULT_MOCK_BAZI = ['甲','丙','戊','庚','子','寅','辰','午']
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-bar">
        <view
          class="hdr-back"
          @tap="navigateBack()"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#666666"
          />
        </view>
        <view class="seg">
          <view
            class="seg-item"
            @tap="navigateTo('/paipan/bazi/history')"
          >
            <text class="seg-text">
              用户列表
            </text>
          </view>
          <view class="seg-item seg-on">
            <text class="seg-text seg-text-on">
              案例库
            </text><text class="vip-badge">
              VIP
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-wrap">
      <view class="search-box">
        <app-icon
          name="search"
          :size="30"
          color="#999999"
        />
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="请输入搜索的内容"
          placeholder-class="search-ph"
        >
      </view>
      <view class="filter-btn">
        <text class="filter-text">
          筛选
        </text>
      </view>
    </view>

    <!-- 一级分类 -->
    <view class="primary-wrap">
      <view class="primary">
        <view
          v-for="c in primaryCategories"
          :key="c"
          class="primary-item"
          :class="{ 'primary-on': activePrimary === c }"
          @tap="handlePrimaryChange(c)"
        >
          <text
            class="primary-text"
            :class="{ 'primary-text-on': activePrimary === c }"
          >
            {{ c }}
          </text>
        </view>
      </view>
    </view>

    <!-- 二级分类 -->
    <scroll-view
      scroll-x
      class="secondary-wrap"
    >
      <view class="secondary">
        <view
          v-for="c in secondaryCategories[activePrimary]"
          :key="c"
          class="sec-chip"
          :class="{ 'sec-chip-on': activeSecondary === c }"
          @tap="activeSecondary = c"
        >
          <text
            class="sec-text"
            :class="{ 'sec-text-on': activeSecondary === c }"
          >
            {{ c }}
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- loading -->
    <view
      v-if="loading"
      class="loading-wrap"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>

    <!-- error -->
    <view
      v-else-if="error"
      class="error-wrap"
    >
      <text class="error-text">
        {{ error }}
      </text>
      <view
        class="retry-btn"
        @tap="fetchCases"
      >
        <text class="retry-text">
          重试
        </text>
      </view>
    </view>

    <!-- empty -->
    <view
      v-else-if="total === 0"
      class="empty-wrap"
    >
      <text class="empty-text">
        暂无案例数据
      </text>
    </view>

    <!-- 案例列表 -->
    <scroll-view
      v-else
      scroll-y
      class="list"
    >
      <view
        v-for="letter in availableLetters"
        :key="letter"
      >
        <view class="letter-head">
          <text class="letter-text">
            {{ letter }}
          </text>
        </view>
        <view
          v-for="(item, index) in groupedByLetter[letter]"
          :key="item.id"
          class="row"
          :class="{ 'row-locked': !isVip && index > 0 }"
        >
          <view class="info">
            <view class="info-top">
              <text
                class="info-name"
                :class="{ 'blur-2': !isVip && index > 0 }"
              >
                {{ item.name }}
              </text>
              <text class="info-gender">
                {{ item.gender === 'male' ? '男' : '女' }}
              </text>
            </view>
            <text
              class="info-desc"
              :class="{ 'blur-2': !isVip && index > 0 }"
            >
              {{ item.description }} {{ item.subtitle }}
            </text>
          </view>
          <view
            class="pillars"
            :class="{ 'blur-3': !isVip && index > 0 }"
          >
            <view class="pillar-row">
              <text
                v-for="(ch, i) in (item.bazi || DEFAULT_MOCK_BAZI).slice(0, 4)"
                :key="'a' + i"
                class="gz"
                :class="wuxingColors[ch]"
              >
                {{ ch }}
              </text>
            </view>
            <view class="pillar-row">
              <text
                v-for="(ch, i) in (item.bazi || DEFAULT_MOCK_BAZI).slice(4, 8)"
                :key="'b' + i"
                class="gz"
                :class="wuxingColors[ch]"
              >
                {{ ch }}
              </text>
            </view>
          </view>
          <view
            class="zodiac"
            :class="{ 'blur-2': !isVip && index > 0 }"
          >
            <text class="zodiac-text">
              {{ item.zodiac }}
            </text>
          </view>
        </view>
      </view>

      <!-- 字母快速导航 -->
      <view class="letter-nav">
        <text
          v-for="letter in availableLetters"
          :key="'nav' + letter"
          class="nav-letter"
        >
          {{ letter }}
        </text>
      </view>
    </scroll-view>

    <!-- VIP解锁提示 -->
    <view
      v-if="!isVip"
      class="vip-bar"
    >
      <view class="vip-btn">
        <app-icon
          name="lock"
          :size="30"
          color="#ffffff"
        />
        <text class="vip-btn-text">
          开通钻石会员解锁
        </text>
      </view>
      <text class="vip-desc">
        案例库收录了500+八字案例，包含名人案例（君主、商界、文艺、体育等）和大众案例（财运、事业、婚姻、健康等），让您通过真实案例学习验证八字命理。案例数据持续更新中......
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
/* 顶栏 */
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: center; padding: 16rpx 24rpx; position: relative; }
.hdr-back { position: absolute; left: 24rpx; padding: 6rpx; }
.seg { display: flex; background: var(--secondary); border-radius: 999rpx; padding: 4rpx; }
.seg-item { padding: 10rpx 32rpx; border-radius: 999rpx; position: relative; }
.seg-on { background: var(--card); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
.seg-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.seg-text-on { color: var(--text-ink); }
.vip-badge { position: absolute; top: -8rpx; right: -8rpx; font-size: 16rpx; font-weight: 500; color: var(--gold); background: rgba(201,169,110,0.18); border-radius: 6rpx; padding: 0 6rpx; line-height: 1.6; }
/* 搜索栏 */
.search-wrap { background: var(--card); padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); display: flex; align-items: center; gap: 20rpx; }
.search-box { flex: 1; display: flex; align-items: center; gap: 12rpx; padding: 14rpx 24rpx; background: var(--secondary); border-radius: 14rpx; }
.search-input { flex: 1; font-size: 26rpx; color: var(--text-ink); }
.search-ph { color: var(--text-soft); }
.filter-btn { padding: 14rpx 32rpx; background: var(--secondary); border-radius: 14rpx; }
.filter-text { font-size: 26rpx; color: var(--text-soft); }
/* 一级分类 */
.primary-wrap { background: var(--card); border-bottom: 2rpx solid var(--border); }
.primary { display: flex; gap: 48rpx; padding: 16rpx 24rpx; }
.primary-item { padding-bottom: 12rpx; border-bottom: 4rpx solid transparent; }
.primary-on { border-bottom-color: var(--brand); }
.primary-text { font-size: 26rpx; font-weight: 600; color: var(--text-soft); }
.primary-text-on { color: var(--brand); }
/* 二级分类 */
.secondary-wrap { background: var(--bg-paper); border-bottom: 2rpx solid var(--border); white-space: nowrap; }
.secondary { display: flex; gap: 24rpx; padding: 16rpx 24rpx; }
.sec-chip { padding: 8rpx 24rpx; border-radius: 999rpx; background: var(--card); flex-shrink: 0; }
.sec-chip-on { background: rgba(201,169,110,0.18); }
.sec-text { font-size: 26rpx; color: var(--text-soft); }
.sec-text-on { color: var(--gold); font-weight: 500; }

/* loading/error/empty */
.loading-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-text { font-size: 28rpx; color: var(--text-soft); }
.error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 26rpx; color: #fff; }
.empty-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.empty-text { font-size: 28rpx; color: var(--text-soft); }

/* 列表 */
.list { flex: 1; }
.letter-head { padding: 8rpx 24rpx; background: var(--secondary); }
.letter-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: var(--card); border-bottom: 2rpx solid var(--border); }
.row-locked { opacity: 0.4; }
.info { flex: 1; min-width: 0; }
.info-top { display: flex; align-items: center; gap: 12rpx; }
.info-name { font-size: 34rpx; font-weight: 700; color: var(--text-ink); }
.info-gender { font-size: 22rpx; color: #9ca3af; }
.info-desc { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; }
.blur-2 { filter: blur(2rpx); }
.blur-3 { filter: blur(3rpx); }
.pillars { display: flex; flex-direction: column; gap: 4rpx; align-items: flex-end; }
.pillar-row { display: flex; gap: 4rpx; }
.gz { font-size: 28rpx; font-weight: 500; }
.zodiac { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: #1a1a1a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.zodiac-text { color: #fbbf24; font-size: 22rpx; font-weight: 500; }
/* 字母快速导航 */
.letter-nav { position: fixed; right: 4rpx; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; }
.nav-letter { font-size: 20rpx; color: var(--text-soft); padding: 2rpx 8rpx; }
/* VIP解锁 */
.vip-bar { background: var(--card); border-top: 2rpx solid var(--border); padding: 24rpx; }
.vip-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; width: 100%; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(to right, var(--gold), rgba(201,169,110,0.8)); box-shadow: 0 8rpx 20rpx rgba(201,169,110,0.3); }
.vip-btn-text { font-size: 28rpx; font-weight: 500; color: #fff; }
.vip-desc { display: block; margin-top: 20rpx; font-size: 22rpx; color: var(--text-soft); text-align: center; line-height: 1.6; }

.wx-wood { color: #22c55e; }
.wx-fire { color: #ef4444; }
.wx-earth { color: #f59e0b; }
.wx-metal { color: #f5f5f5; }
.wx-water { color: #3b82f6; }
</style>
