<script setup lang="ts">
/**
 * 周易起名 · 结果页——自 V0 app/qiming/result/page.tsx 还原
 * onLoad 取 payload 本地重算 generateNames：命主信息 / 四柱表(可收起) / 五行旺衰+喜用 / 候选名列表(五行筛选+收藏)
 * 取舍：①AI 报告按钮（GenerateReportButton/BrandMark）砍掉
 *       ②V0 收藏为页内临时 Set → 本地持久化 rebu:qiming-favorites，「收藏对比」实做成弹层并排四维分
 *       ③生成成功自动写入起名历史（rebu:qiming-history）
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { generateNames, type QimingInput, type QimingOutput } from '@/pkg-paipan2/lib/qiming-engine'
import type { NameCandidate } from '@/pkg-paipan2/lib/qiming-data'
import { saveQimingHistory, loadQimingFavorites, toggleQimingFavorite } from './store'

// R4 合规：小程序端无占卜类目，标题改文化研究表述
let hdrTitle = '周易起名'
// #ifdef MP-WEIXIN
hdrTitle = '起名文化研究'
// #endif

/** 五行配色（全局 --wuxing-* token） */
const WX_COLOR: Record<string, string> = {
  木: 'var(--wuxing-wood)',
  火: 'var(--wuxing-fire)',
  土: 'var(--wuxing-earth)',
  金: 'var(--wuxing-metal)',
  水: 'var(--wuxing-water)',
}
const wxColor = (w: string) => WX_COLOR[w] ?? 'var(--text-ink)'

const DUP_LABEL: Record<string, string> = { low: '罕见', mid: '适中', high: '较多' }

const result = ref<QimingOutput | null>(null)
const errMsg = ref('')
const input = ref<QimingInput | null>(null)
const gender = ref<'男' | '女'>('男')
const surname = ref('')

/** 解析 "YYYY-MM-DD HH:mm" */
function parseBirth(birth: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const m = birth.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})$/)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(m[4]), minute: Number(m[5]) }
}

onLoad((opts: Record<string, string> = {}) => {
  try {
    const p = JSON.parse(decodeURIComponent(opts.payload ?? '')) as Record<string, string>
    const birth = parseBirth(p.birth ?? '')
    if (!p.surname || !birth) {
      errMsg.value = '参数无效，请返回重新填写。'
      return
    }
    surname.value = p.surname
    gender.value = p.gender === '女' ? '女' : '男'
    const qi: QimingInput = {
      surname: p.surname,
      gender: gender.value,
      nameType: p.nameType === 'single' ? 'single' : 'double',
      style: (p.style || 'classic') as QimingInput['style'],
      ...birth,
      city: p.city || undefined,
      fixChar: p.fixChar || undefined,
      fixPosition: p.fixPosition === 'last' ? 'last' : p.fixPosition === 'middle' ? 'middle' : undefined,
      blockChars: p.blockChars || undefined,
    }
    input.value = qi
    result.value = generateNames(qi)
    favNames.value = new Set(loadQimingFavorites().map((x) => x.name))
    saveQimingHistory({
      surname: qi.surname,
      gender: qi.gender,
      nameType: qi.nameType,
      style: qi.style,
      birth: p.birth,
      city: p.city || undefined,
      district: p.district || undefined,
      fixChar: qi.fixChar,
      fixPosition: qi.fixPosition,
      blockChars: qi.blockChars,
    })
  } catch {
    errMsg.value = '参数解析失败，请返回重新填写。'
  }
})

const profile = computed(() => result.value?.profile ?? null)

// ── 四柱表收起 ──
const profileOpen = ref(true)

// ── 五行筛选 ──
const wuxingFilter = ref<string | null>(null)
const filtered = computed<NameCandidate[]>(() => {
  const list = result.value?.candidates ?? []
  if (!wuxingFilter.value) return list
  return list.filter((c) => c.chars.slice(1).some((ch) => ch.wuxing === wuxingFilter.value))
})

function toggleFilter(w: string) {
  wuxingFilter.value = wuxingFilter.value === w ? null : w
}

// ── 收藏（本地持久化） ──
const favNames = ref<Set<string>>(new Set())
const fullNameOf = (c: NameCandidate) => c.chars.map((ch) => ch.char).join('')

function onToggleFavorite(c: NameCandidate) {
  const name = fullNameOf(c)
  const on = toggleQimingFavorite({ name, gender: gender.value, score: c.score, subScores: c.subScores })
  const next = new Set(favNames.value)
  if (on) next.add(name)
  else next.delete(name)
  favNames.value = next
}

/** 当前结果中已收藏的候选 */
const favoritedCands = computed(() => (result.value?.candidates ?? []).filter((c) => favNames.value.has(fullNameOf(c))))

// ── 收藏对比弹层 ──
const compareOpen = ref(false)
const SUB_LABELS: { key: 'yin' | 'xing' | 'yi' | 'li'; label: string }[] = [
  { key: 'yin', label: '音律' },
  { key: 'xing', label: '字形' },
  { key: 'yi', label: '字义' },
  { key: 'li', label: '数理' },
]

function goDetail(c: NameCandidate) {
  navigateTo(`/pkg-paipan2/qiming/detail?name=${encodeURIComponent(fullNameOf(c))}&gender=${gender.value}`)
}

function retry() {
  const pages = getCurrentPages()
  if (pages.length > 1) { navigateBack(); return }
  navigateTo('/pkg-paipan2/qiming/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" share :share-title="hdrTitle" />

    <!-- 错误态 -->
    <view v-if="!result || !profile" class="error-wrap">
      <text class="error-text">{{ errMsg || '推演中…' }}</text>
      <view v-if="errMsg" class="error-btn" @tap="retry">
        <text class="error-btn-text">返回重填</text>
      </view>
    </view>

    <scroll-view v-else scroll-y class="body">
      <view class="inner" :class="{ 'inner-pad': favoritedCands.length > 0 }">
        <!-- 命主信息卡 -->
        <paper-card padding="sm">
          <view class="prof">
            <view class="prof-box"><text class="prof-surname">{{ surname }}</text></view>
            <view class="prof-info">
              <text class="prof-line">性别：{{ profile.gender }}　生肖：{{ profile.shengxiao }}　星座：{{ profile.xingzuo }}</text>
              <text class="prof-line prof-line-soft">生辰：{{ profile.birthText }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 生辰信息（四柱表，可收起） -->
        <paper-card padding="sm">
          <view class="fold-hd" @tap="profileOpen = !profileOpen">
            <text class="card-title">生辰信息</text>
            <app-icon :name="profileOpen ? 'chevron-up' : 'chevron-down'" :size="28" color="var(--text-soft)" />
          </view>
          <view v-if="profileOpen">
            <view class="pillar-table">
              <!-- 表头 -->
              <view class="pt-row pt-row-head">
                <view class="pt-cell pt-cell-label"><text class="pt-head-text">四柱</text></view>
                <view v-for="pl in profile.pillars" :key="pl.label" class="pt-cell">
                  <text class="pt-head-text pt-head-strong">{{ pl.label }}</text>
                </view>
              </view>
              <!-- 十神 -->
              <view class="pt-row">
                <view class="pt-cell pt-cell-label"><text class="pt-soft">十神</text></view>
                <view v-for="pl in profile.pillars" :key="pl.label" class="pt-cell">
                  <text class="pt-text">{{ pl.shishen }}</text>
                </view>
              </view>
              <!-- 乾造/坤造 -->
              <view class="pt-row">
                <view class="pt-cell pt-cell-label"><text class="pt-soft">{{ profile.gender === '男' ? '乾造' : '坤造' }}</text></view>
                <view v-for="pl in profile.pillars" :key="pl.label" class="pt-cell pt-cell-gz">
                  <text class="pt-gz" :style="{ color: wxColor(pl.ganWuxing) }">{{ pl.gan }}</text>
                  <text class="pt-gz" :style="{ color: wxColor(pl.zhiWuxing) }">{{ pl.zhi }}</text>
                </view>
              </view>
              <!-- 藏干 -->
              <view class="pt-row">
                <view class="pt-cell pt-cell-label"><text class="pt-soft">藏干</text></view>
                <view v-for="pl in profile.pillars" :key="pl.label" class="pt-cell">
                  <text class="pt-soft">{{ pl.canggan }}</text>
                </view>
              </view>
              <!-- 纳音 -->
              <view class="pt-row">
                <view class="pt-cell pt-cell-label"><text class="pt-soft">纳音</text></view>
                <view v-for="pl in profile.pillars" :key="pl.label" class="pt-cell">
                  <text class="pt-soft">{{ pl.nayin }}</text>
                </view>
              </view>
            </view>
            <text class="ts-note">真太阳时：{{ profile.trueSolarText }}</text>
          </view>
        </paper-card>

        <!-- 五行旺衰 + 喜用 -->
        <paper-card padding="sm">
          <text class="card-title">五行旺衰</text>
          <view class="wx-bars">
            <view v-for="w in profile.wuxingRatio" :key="w.name" class="wx-bar-row">
              <text class="wx-bar-name" :style="{ color: wxColor(w.name) }">{{ w.name }}</text>
              <view class="wx-bar-track">
                <view class="wx-bar-fill" :style="{ width: w.pct + '%', background: wxColor(w.name) }" />
              </view>
              <text class="wx-bar-pct">{{ w.pct }}%</text>
            </view>
          </view>
          <view class="xiyong">
            <text class="xiyong-text">
              {{ profile.xiyongNote }}本命推荐喜用：<text
                v-for="x in profile.xiyong"
                :key="x"
                class="xiyong-wx"
                :style="{ color: wxColor(x) }"
              >{{ x }}</text>。
            </text>
            <text class="xiyong-quote">《{{ profile.xiyongSource.source }}》：「{{ profile.xiyongSource.quote }}」</text>
          </view>
        </paper-card>

        <!-- 推荐好名 + 筛选 -->
        <view class="list-hd">
          <text class="list-hd-title">推荐好名 <text class="list-hd-count">({{ filtered.length }}个)</text></text>
          <view class="filter-chips">
            <view
              v-for="w in profile.xiyong"
              :key="w"
              class="chip"
              :class="{ 'chip-on': wuxingFilter === w }"
              @tap="toggleFilter(w)"
            >
              <text class="chip-text" :class="{ 'chip-text-on': wuxingFilter === w }">{{ w }}</text>
            </view>
          </view>
        </view>

        <!-- 名字列表 -->
        <view class="cand-list">
          <view v-for="c in filtered" :key="c.id" class="cand">
            <view class="cand-top">
              <view class="cand-chars">
                <view v-for="(ch, i) in c.chars" :key="i" class="cand-char">
                  <text class="cand-py">{{ ch.pinyin }}</text>
                  <text class="cand-zi">{{ ch.char }}</text>
                  <text class="cand-wx" :style="{ color: wxColor(ch.wuxing) }">{{ ch.wuxing }}</text>
                </view>
              </view>
              <view class="cand-right">
                <view class="cand-score">
                  <text class="cand-score-label">综合得分</text>
                  <text class="cand-score-num">{{ c.score }}<text class="cand-score-unit">分</text></text>
                </view>
                <view class="cand-star" @tap.stop="onToggleFavorite(c)">
                  <app-icon
                    name="star"
                    :size="36"
                    :color="favNames.has(fullNameOf(c)) ? '#f59e0b' : 'var(--text-soft)'"
                  />
                </view>
              </view>
            </view>
            <text class="cand-brief">{{ c.brief }}</text>
            <text v-if="c.poem" class="cand-poem">《{{ c.poem.source }}》：「{{ c.poem.quote }}」</text>
            <view class="cand-ft">
              <view class="dup" :class="`dup-${c.duplicate}`">
                <text class="dup-text" :class="`dup-text-${c.duplicate}`">重名{{ DUP_LABEL[c.duplicate] }}</text>
              </view>
              <text class="cand-detail" @tap="goDetail(c)">查看详批 →</text>
            </view>
          </view>
          <view v-if="filtered.length === 0" class="empty">
            <text class="empty-text">该五行下暂无候选，试试其他筛选</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="以上候选名依传统姓名学规则生成，仅供传统文化研习参考，不构成任何预测或承诺。"
        />
      </view>
    </scroll-view>

    <!-- 收藏对比栏 -->
    <view v-if="result && favoritedCands.length > 0" class="fav-bar">
      <text class="fav-bar-text">已收藏 <text class="fav-bar-num">{{ favoritedCands.length }}</text> 个名字</text>
      <view class="fav-bar-btn" @tap="compareOpen = true">
        <app-icon name="star" :size="26" color="#ffffff" />
        <text class="fav-bar-btn-text">收藏对比</text>
      </view>
    </view>

    <!-- 收藏对比弹层 -->
    <view v-if="compareOpen" class="mask" @tap="compareOpen = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="compareOpen = false">关闭</text>
          <text class="sheet-title">收藏对比</text>
          <text class="sheet-side" />
        </view>
        <scroll-view scroll-y class="cmp-list">
          <view v-for="c in favoritedCands" :key="c.id" class="cmp-item" @tap="goDetail(c)">
            <view class="cmp-main">
              <text class="cmp-name">{{ fullNameOf(c) }}</text>
              <view class="cmp-subs">
                <text v-for="s in SUB_LABELS" :key="s.key" class="cmp-sub">{{ s.label }} {{ c.subScores[s.key] }}</text>
              </view>
            </view>
            <view class="cmp-right">
              <text class="cmp-score">{{ c.score }}分</text>
              <view class="cmp-unstar" @tap.stop="onToggleFavorite(c)">
                <app-icon name="star" :size="32" color="#f59e0b" />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 24rpx; }
.inner-pad { padding-bottom: 180rpx; }

/* ── 错误态 ── */
.error-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; padding: 0 48rpx; }
.error-text { font-size: 28rpx; line-height: 1.7; color: var(--text-soft); text-align: center; }
.error-btn { padding: 20rpx 40rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.28); }
.error-btn:active { opacity: 0.8; }
.error-btn-text { font-size: 28rpx; font-weight: 700; color: #fff; }

.card-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

/* ── 命主信息卡 ── */
.prof { display: flex; align-items: center; gap: 24rpx; }
.prof-box {
  width: 112rpx; height: 112rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 4rpx solid rgba(196, 30, 58, 0.3); border-radius: 12rpx;
  background: rgba(196, 30, 58, 0.04);
}
.prof-surname { font-family: Georgia, 'Songti SC', serif; font-size: 56rpx; font-weight: 700; color: var(--brand); }
.prof-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.prof-line { font-size: 24rpx; line-height: 1.6; color: var(--text-ink); }
.prof-line-soft { color: var(--text-soft); }

/* ── 四柱表 ── */
.fold-hd { display: flex; align-items: center; justify-content: space-between; }
.pillar-table { margin-top: 16rpx; border: 1rpx solid var(--line); border-radius: 8rpx; overflow: hidden; }
.pt-row { display: flex; border-bottom: 1rpx solid var(--line); }
.pt-row:last-child { border-bottom: none; }
.pt-row-head { background: rgba(0, 0, 0, 0.03); }
.pt-cell {
  flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center;
  padding: 10rpx 4rpx; border-right: 1rpx solid var(--line); text-align: center;
}
.pt-cell:last-child { border-right: none; }
.pt-cell-label { flex: 0.9; }
.pt-cell-gz { flex-direction: column; gap: 2rpx; }
.pt-head-text { font-size: 22rpx; font-weight: 500; color: var(--text-soft); }
.pt-head-strong { color: var(--text-ink); }
.pt-text { font-size: 22rpx; color: var(--text-ink); }
.pt-soft { font-size: 22rpx; color: var(--text-soft); }
.pt-gz { font-family: Georgia, 'Songti SC', serif; font-size: 30rpx; font-weight: 700; }
.ts-note { display: block; margin-top: 12rpx; font-size: 20rpx; color: var(--text-soft); }

/* ── 五行旺衰 ── */
.wx-bars { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.wx-bar-row { display: flex; align-items: center; gap: 16rpx; }
.wx-bar-name { width: 32rpx; font-size: 24rpx; font-weight: 700; }
.wx-bar-track { flex: 1; height: 16rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.05); overflow: hidden; }
.wx-bar-fill { height: 100%; border-radius: 999rpx; }
.wx-bar-pct { width: 96rpx; text-align: right; font-size: 20rpx; color: var(--text-soft); }
.xiyong {
  margin-top: 16rpx; border: 1rpx solid rgba(245, 158, 11, 0.3);
  background: rgba(255, 251, 235, 0.5); border-radius: 12rpx; padding: 16rpx 20rpx;
}
.xiyong-text { font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }
.xiyong-wx { font-weight: 700; }
.xiyong-quote { display: block; margin-top: 8rpx; font-family: Georgia, 'Songti SC', serif; font-size: 20rpx; color: var(--text-soft); }

/* ── 列表头/筛选 ── */
.list-hd { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.list-hd-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.list-hd-count { color: var(--brand); }
.filter-chips { display: flex; align-items: center; gap: 12rpx; }
.chip { border: 1rpx solid var(--line); background: var(--card); border-radius: 999rpx; padding: 4rpx 20rpx; }
.chip-on { border-color: var(--brand); background: var(--brand); }
.chip-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft); }
.chip-text-on { color: #fff; }

/* ── 候选卡 ── */
.cand-list { display: flex; flex-direction: column; gap: 20rpx; }
.cand { background: var(--card); border: 1rpx solid var(--line); border-radius: 16rpx; padding: 24rpx; }
.cand-top { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.cand-chars { display: flex; align-items: flex-end; gap: 20rpx; }
.cand-char { display: flex; flex-direction: column; align-items: center; }
.cand-py { font-size: 20rpx; color: var(--text-soft); }
.cand-zi { font-family: Georgia, 'Songti SC', serif; font-size: 48rpx; font-weight: 700; line-height: 1.25; color: var(--text-ink); }
.cand-wx { font-size: 20rpx; font-weight: 700; }
.cand-right { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.cand-score { display: flex; flex-direction: column; align-items: flex-end; }
.cand-score-label { font-size: 22rpx; color: var(--text-soft); }
.cand-score-num { font-family: Georgia, 'Songti SC', serif; font-size: 48rpx; font-weight: 700; line-height: 1.1; color: var(--brand); }
.cand-score-unit { font-family: initial; font-size: 22rpx; font-weight: 400; color: var(--text-soft); margin-left: 2rpx; }
.cand-star { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.cand-star:active { background: rgba(0, 0, 0, 0.05); }
.cand-brief { display: block; margin-top: 16rpx; font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }
.cand-poem { display: block; margin-top: 8rpx; font-family: Georgia, 'Songti SC', serif; font-size: 22rpx; color: var(--text-soft); }
.cand-ft {
  margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx dashed var(--line);
  display: flex; align-items: center; justify-content: space-between;
}
.dup { border-radius: 999rpx; border: 1rpx solid var(--line); padding: 2rpx 16rpx; }
.dup-low { background: rgba(21, 128, 61, 0.06); border-color: rgba(21, 128, 61, 0.3); }
.dup-mid { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.3); }
.dup-high { background: rgba(0, 0, 0, 0.04); }
.dup-text { font-size: 20rpx; font-weight: 500; }
.dup-text-low { color: #15803d; }
.dup-text-mid { color: #b45309; }
.dup-text-high { color: var(--text-soft); }
.cand-detail { font-size: 24rpx; font-weight: 500; color: var(--brand); padding: 8rpx 0; }
.empty { padding: 60rpx 0; }
.empty-text { display: block; text-align: center; font-size: 26rpx; color: var(--text-soft); }

/* ── 收藏对比栏 ── */
.fav-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 90;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: var(--card); border-top: 1rpx solid var(--line);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.fav-bar-text { font-size: 24rpx; color: var(--text-soft); }
.fav-bar-num { font-weight: 700; color: var(--brand); }
.fav-bar-btn {
  display: flex; align-items: center; gap: 10rpx;
  background: var(--brand); border-radius: 999rpx; padding: 16rpx 32rpx;
  box-shadow: 0 6rpx 16rpx rgba(196, 30, 58, 0.3);
}
.fav-bar-btn:active { opacity: 0.85; }
.fav-bar-btn-text { font-size: 24rpx; font-weight: 700; color: #fff; }

/* ── 对比弹层 ── */
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); z-index: 100;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: var(--card); border-radius: 32rpx 32rpx 0 0;
  overflow: hidden; padding-bottom: env(safe-area-inset-bottom);
  max-height: 70vh; display: flex; flex-direction: column;
}
.sheet-hdr { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-bottom: 1rpx solid var(--line); }
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-side { width: 52rpx; }
.cmp-list { max-height: 56vh; }
.cmp-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 26rpx 32rpx; border-bottom: 1rpx solid var(--line);
}
.cmp-item:active { background: rgba(0, 0, 0, 0.03); }
.cmp-main { display: flex; flex-direction: column; gap: 10rpx; min-width: 0; flex: 1; }
.cmp-name { font-family: Georgia, 'Songti SC', serif; font-size: 34rpx; font-weight: 700; letter-spacing: 0.1em; color: var(--text-ink); }
.cmp-subs { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.cmp-sub { font-size: 22rpx; color: var(--text-soft); }
.cmp-right { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.cmp-score { font-family: Georgia, 'Songti SC', serif; font-size: 30rpx; font-weight: 700; color: var(--brand); }
.cmp-unstar { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.cmp-unstar:active { background: rgba(0, 0, 0, 0.05); }
</style>
