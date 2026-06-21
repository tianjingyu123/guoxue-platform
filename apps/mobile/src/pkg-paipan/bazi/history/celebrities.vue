<script setup lang="ts">
/**
 * 八字历史 · 案例库（从原型 app/paipan/bazi/history/celebrities/page.tsx 1:1 高保真迁移）
 * 结构：顶栏(返回/用户列表·案例库Tab) + 搜索栏+筛选 + 一级分类 + 二级分类 + 字母分组案例列表(VIP锁定模糊) + 字母快速导航 + 底部VIP解锁
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'

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
  id: number; name: string; gender: 'male' | 'female'; desc: string; subtitle: string
  primary: string; secondary: string; bazi: string[]; letter: string; zodiac: string
}

const caseData: Caze[] = [
  { id: 1, name: '崇祯', gender: 'male', desc: '明朝', subtitle: '末位皇帝', primary: '名人案例', secondary: '君主', bazi: ['辛', '庚', '乙', '己', '亥', '寅', '未', '卯'], letter: 'C', zodiac: '猪' },
  { id: 2, name: '曹操', gender: 'male', desc: '东汉末年', subtitle: '魏武帝', primary: '名人案例', secondary: '君主', bazi: ['乙', '丁', '庚', '甲', '丑', '亥', '戌', '申'], letter: 'C', zodiac: '牛' },
  { id: 3, name: '忽必烈', gender: 'male', desc: '元朝', subtitle: '开国皇帝', primary: '名人案例', secondary: '君主', bazi: ['乙', '乙', '乙', '乙', '亥', '酉', '酉', '酉'], letter: 'H', zodiac: '猪' },
  { id: 4, name: '康熙', gender: 'male', desc: '清朝', subtitle: '圣祖皇帝', primary: '名人案例', secondary: '君主', bazi: ['甲', '丙', '戊', '庚', '午', '寅', '申', '子'], letter: 'K', zodiac: '马' },
  { id: 5, name: '李白', gender: 'male', desc: '唐朝', subtitle: '诗仙', primary: '名人案例', secondary: '文艺', bazi: ['辛', '庚', '甲', '壬', '丑', '寅', '子', '申'], letter: 'L', zodiac: '牛' },
  { id: 6, name: '武则天', gender: 'female', desc: '唐朝', subtitle: '唯一女皇帝', primary: '名人案例', secondary: '君主', bazi: ['甲', '丙', '甲', '甲', '申', '寅', '午', '戌'], letter: 'W', zodiac: '猴' },
  { id: 7, name: '朱元璋', gender: 'male', desc: '明朝', subtitle: '开国皇帝', primary: '名人案例', secondary: '君主', bazi: ['戊', '壬', '丁', '丁', '辰', '戌', '丑', '未'], letter: 'Z', zodiac: '龙' },
  { id: 8, name: '马云', gender: 'male', desc: '当代', subtitle: '阿里巴巴创始人', primary: '名人案例', secondary: '商界', bazi: ['甲', '丙', '甲', '壬', '辰', '寅', '子', '申'], letter: 'M', zodiac: '龙' },
  { id: 101, name: '案例A01', gender: 'male', desc: '白手起家', subtitle: '从打工到身家过亿', primary: '大众案例', secondary: '财运', bazi: ['甲', '丙', '戊', '庚', '子', '寅', '辰', '午'], letter: 'A', zodiac: '鼠' },
  { id: 102, name: '案例B02', gender: 'female', desc: '职场晋升', subtitle: '30岁成为上市公司高管', primary: '大众案例', secondary: '事业', bazi: ['乙', '丁', '己', '辛', '丑', '卯', '巳', '未'], letter: 'B', zodiac: '牛' },
  { id: 103, name: '案例C03', gender: 'female', desc: '幸福婚姻', subtitle: '晚婚却遇良人', primary: '大众案例', secondary: '婚姻', bazi: ['丙', '戊', '庚', '壬', '寅', '辰', '午', '申'], letter: 'C', zodiac: '虎' },
  { id: 104, name: '案例D04', gender: 'male', desc: '健康长寿', subtitle: '90岁依然健步如飞', primary: '大众案例', secondary: '长寿', bazi: ['丁', '己', '辛', '癸', '卯', '巳', '未', '酉'], letter: 'D', zodiac: '兔' },
  { id: 105, name: '案例E05', gender: 'male', desc: '学业有成', subtitle: '寒门出贵子考入清华', primary: '大众案例', secondary: '学业', bazi: ['戊', '庚', '壬', '甲', '辰', '午', '申', '戌'], letter: 'E', zodiac: '龙' },
]

const searchQuery = ref('')
const activePrimary = ref('名人案例')
const activeSecondary = ref('君主')
const isVip = ref(false)

function handlePrimaryChange(primary: string) {
  activePrimary.value = primary
  activeSecondary.value = secondaryCategories[primary][0]
}

const filteredCases = computed(() =>
  caseData.filter((c) => {
    const matchPrimary = c.primary === activePrimary.value
    const matchSecondary = c.secondary === activeSecondary.value
    const q = searchQuery.value
    const matchSearch = q === '' || c.name.includes(q) || c.desc.includes(q)
    return matchPrimary && matchSecondary && matchSearch
  }),
)

const groupedByLetter = computed(() => {
  const acc: Record<string, Caze[]> = {}
  for (const item of filteredCases.value) {
    if (!acc[item.letter]) acc[item.letter] = []
    acc[item.letter].push(item)
  }
  return acc
})
const availableLetters = computed(() => Object.keys(groupedByLetter.value).sort())
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

    <!-- 案例列表 -->
    <scroll-view
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
              {{ item.desc }} {{ item.subtitle }}
            </text>
          </view>
          <view
            class="pillars"
            :class="{ 'blur-3': !isVip && index > 0 }"
          >
            <view class="pillar-row">
              <text
                v-for="(ch, i) in item.bazi.slice(0, 4)"
                :key="'a' + i"
                class="gz"
                :class="wuxingColors[ch]"
              >
                {{ ch }}
              </text>
            </view>
            <view class="pillar-row">
              <text
                v-for="(ch, i) in item.bazi.slice(4, 8)"
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
</style>
