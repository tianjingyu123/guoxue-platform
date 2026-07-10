<script setup lang="ts">
/**
 * 圈子搜索 — V0 circle-search.html 还原（批⑥ 2026-07-10 重写视图层）
 * 结构：搜索顶栏 → 输入前(最近搜索/热门词/热门圈子推荐) → 结果(圈子单组·关键词高亮·加入按钮进预览页)
 *       → 空结果转创建 CTA → 骨架/错误三态。
 * 数据：GET /circles?keyword=（circleApi.list·仅圈子名称/简介检索）。
 * #37 AI 智能推荐：搜索时并行 POST /circles/search/ai → 返回有内容才渲染推荐组+追问 chips
 *（点击追问=以该词重新搜索）；AI 失败/未配置完全不渲染（保持热门推荐降级）。
 * 降级（后端缺）：① 结果「内容」分组（后端无跨圈内容搜索端点）→ 仅圈子单组；
 * ② 结果行「需审批」标识（list 端点不返回 needApproval）→ 仅显示 免费/年费价格。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, formatMembers, type Circle, type RankingCircle, type AiSearchResult } from '@/lib/circle-data'

// 热门搜索：运营引导词（非冒充统计的假数据）
const HOT_SEARCHES = ['八字命理', '紫微斗数', '风水堪舆', '易经', '六爻', '奇门遁甲', '宝宝起名', '国学']
const HISTORY_KEY = 'circle_search_history'

const keyword = ref('')
const hasSearched = ref(false)
const history = ref<string[]>((uni.getStorageSync(HISTORY_KEY) as string[]) || [])
const results = ref<Circle[]>([])
const searching = ref(false)
const error = ref('')

// 热门圈子推荐（AI 智能推荐降级：真实排行榜接口按成员数取前 5；
// 不用 list() 无关键词分支——其失败回退 mockCircles 会展示假圈子）
const hotCircles = ref<RankingCircle[]>([])

async function loadHot() {
  hotCircles.value = (await circleApi.getRanking('memberCount')).slice(0, 5)
}

function saveHistory(k: string) {
  history.value = [k, ...history.value.filter((h) => h !== k)].slice(0, 10)
  uni.setStorageSync(HISTORY_KEY, history.value)
}

// ── #37 AI 智能推荐（与主搜索并行·失败/无内容不渲染） ──
const aiResult = ref<AiSearchResult | null>(null)
let aiSeq = 0 // 并发防错序：只采纳最后一次搜索的 AI 结果

async function doSearch(kw: string) {
  const k = kw.trim()
  if (!k) return
  keyword.value = k
  hasSearched.value = true
  searching.value = true
  error.value = ''
  saveHistory(k)
  // AI 推荐并行请求，不阻塞主搜索；旧结果先清（避免上个词的推荐串场）
  aiResult.value = null
  const seq = ++aiSeq
  circleApi.aiSearch(k).then((r) => { if (seq === aiSeq) aiResult.value = r })
  try {
    const res = await circleApi.list({ keyword: k })
    results.value = res.data
  } catch {
    results.value = []
    error.value = '搜索失败，请重试'
  } finally {
    searching.value = false
  }
}

function clearHistory() { history.value = []; uni.removeStorageSync(HISTORY_KEY) }
function clearKeyword() { keyword.value = ''; hasSearched.value = false; results.value = []; aiResult.value = null; aiSeq++ }
function openCircle(id: string) { navigateTo(`/pkg-circle/circles/detail?id=${id}`) }
/** 加入按钮 → 圈子预览页（加入漏斗：免费/审批/付费在预览页分流） */
function openPreview(id: string) { navigateTo(`/pkg-circle/circles/preview?id=${id}`) }
/** 空结果 → 创建圈子（透传关键词预填名称） */
function goCreate() { navigateTo(`/pkg-circle/circles/create?name=${encodeURIComponent(keyword.value)}`) }

/** 名称按关键词切分（高亮渲染用） */
function highlightSegments(name: string): { text: string; hit: boolean }[] {
  const k = keyword.value.trim()
  if (!k || !name.includes(k)) return [{ text: name, hit: false }]
  const segs: { text: string; hit: boolean }[] = []
  let rest = name
  while (rest.length) {
    const i = rest.indexOf(k)
    if (i < 0) { segs.push({ text: rest, hit: false }); break }
    if (i > 0) segs.push({ text: rest.slice(0, i), hit: false })
    segs.push({ text: k, hit: true })
    rest = rest.slice(i + k.length)
  }
  return segs
}

/** 结果行价格口径：YEARLY=¥x/年·PAID=¥x·FREE=免费 */
function priceLabel(c: Circle): string {
  if (c.type === 'YEARLY') return `¥${c.price ?? 0}/年`
  if (c.type === 'PAID' || c.isPaid) return `¥${c.price ?? 0}`
  return '免费'
}

onMounted(loadHot)
</script>

<template>
  <view class="cs-page">
    <!-- 搜索顶栏 -->
    <view class="cs-bar">
      <view class="cs-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <view class="cs-input-wrap">
        <app-icon name="search" :size="30" color="#999999" />
        <input
          v-model="keyword" class="cs-input" placeholder="搜索圈子" placeholder-class="cs-ph"
          confirm-type="search" focus @confirm="doSearch(keyword)"
        />
        <view v-if="keyword" class="cs-clear" @tap="clearKeyword"><app-icon name="x" :size="22" color="#6E6E73" /></view>
      </view>
      <text class="cs-cancel" @tap="goBack">取消</text>
    </view>

    <!-- 输入前：历史 + 热门词 + 热门圈子推荐 -->
    <view v-if="!hasSearched">
      <view v-if="history.length" class="cs-pre-label">
        <text>最近搜索</text>
        <view class="cs-pre-clear" @tap="clearHistory"><app-icon name="x" :size="26" color="#999999" /></view>
      </view>
      <view v-if="history.length" class="cs-chips">
        <view v-for="(kw, i) in history" :key="i" class="cs-chip" @tap="doSearch(kw)"><text class="cs-chip-t">{{ kw }}</text></view>
      </view>

      <view class="cs-pre-label mt"><text>大家都在搜</text></view>
      <view class="cs-chips">
        <view v-for="(kw, i) in HOT_SEARCHES" :key="i" class="cs-chip" @tap="doSearch(kw)">
          <text v-if="i < 3" class="cs-chip-rank top">{{ i + 1 }}</text>
          <text v-else-if="i < 5" class="cs-chip-rank">{{ i + 1 }}</text>
          <text class="cs-chip-t dark">{{ kw }}</text>
        </view>
      </view>

      <!-- 热门圈子推荐（AI 推荐降级：真实排行榜数据·无加入方式/价格字段仅显成员数） -->
      <template v-if="hotCircles.length">
        <text class="cs-result-label">热门圈子</text>
        <view class="cs-group">
          <view v-for="c in hotCircles" :key="c.id" class="cs-row" @tap="openCircle(c.id)">
            <view class="cs-row-cover">
              <image v-if="c.cover" :src="c.cover" class="cs-row-cover-img" mode="aspectFill" lazy-load />
              <view v-else class="cs-row-cover-ph"><app-icon name="users" :size="36" color="#C9A96E" /></view>
            </view>
            <view class="cs-row-main">
              <text class="cs-row-name">{{ c.name }}</text>
              <view class="cs-row-meta">
                <text class="cs-row-meta-t">{{ formatMembers(c.memberCount) }} 成员<template v-if="c.category"> · {{ c.category }}</template></text>
              </view>
            </view>
            <view class="cs-join-mini" @tap.stop="openPreview(c.id)"><text class="cs-join-mini-t">加入</text></view>
          </view>
        </view>
      </template>
    </view>

    <!-- 搜索中骨架 -->
    <view v-else-if="searching" class="cs-skeleton">
      <view v-for="i in 4" :key="i" class="cs-sk-row">
        <view class="cs-sk-cover" />
        <view class="cs-sk-main">
          <view class="cs-sk-line w70" />
          <view class="cs-sk-line w45" />
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="cs-empty">
      <view class="cs-empty-icon"><app-icon name="search" :size="52" color="#999999" /></view>
      <text class="cs-empty-t1">{{ error }}</text>
      <view class="cs-empty-cta" @tap="doSearch(keyword)"><text class="cs-empty-cta-t">重试</text></view>
    </view>

    <!-- 空结果 / 结果（含 #37 AI 智能推荐区块·AI 无内容完全不渲染） -->
    <template v-else>
      <!-- #37 AI 智能推荐（V0 ai-card：金描边+呼吸点+推荐组+追问 chips） -->
      <view v-if="aiResult" class="cs-ai-card">
        <view class="cs-ai-head">
          <view class="cs-ai-dot" />
          <text class="cs-ai-name">AI 智能搜索</text>
        </view>
        <text v-if="aiResult.reason" class="cs-ai-summary">{{ aiResult.reason }}</text>
        <view v-if="aiResult.circles?.length" class="cs-ai-recs-group">
          <view v-for="c in aiResult.circles" :key="c.id" class="cs-row ai" @tap="openCircle(c.id)">
            <view class="cs-row-cover">
              <image v-if="c.cover" :src="c.cover" class="cs-row-cover-img" mode="aspectFill" lazy-load />
              <view v-else class="cs-row-cover-ph"><app-icon name="users" :size="36" color="#C9A96E" /></view>
            </view>
            <view class="cs-row-main">
              <text class="cs-row-name">{{ c.name }}</text>
              <view class="cs-row-meta">
                <text class="cs-row-meta-t">{{ formatMembers(c.memberCount || 0) }} 成员<template v-if="c.category"> · {{ c.category }}</template></text>
              </view>
            </view>
            <view class="cs-join-mini" @tap.stop="openPreview(c.id)"><text class="cs-join-mini-t">去看看</text></view>
          </view>
        </view>
        <view v-if="aiResult.followUps?.length" class="cs-ai-recs">
          <view v-for="(f, i) in aiResult.followUps" :key="i" class="cs-ai-rec" @tap="doSearch(f)">
            <app-icon name="search" :size="22" color="#C9A96E" />
            <text class="cs-ai-rec-t">{{ f }}</text>
          </view>
        </view>
        <text class="cs-ai-note">AI 生成内容仅供参考 · 推荐基于你的圈子偏好</text>
      </view>

      <!-- 空结果：转创建 -->
      <view v-if="results.length === 0" class="cs-empty">
        <view class="cs-empty-icon"><app-icon name="search" :size="52" color="#999999" /></view>
        <text class="cs-empty-t1">没有找到「{{ keyword }}」相关的圈子</text>
        <text class="cs-empty-t2">换个关键词试试，或者——{{ '\n' }}成为第一个开这个圈的人</text>
        <view class="cs-empty-cta" @tap="goCreate"><text class="cs-empty-cta-t">创建「{{ keyword }}」圈子</text></view>
      </view>

      <!-- 结果：圈子单组（后端无跨圈内容搜索 → 内容分组降级不做） -->
      <view v-else>
        <text class="cs-result-label">圈子 · {{ results.length }} 个</text>
        <view class="cs-group">
          <view v-for="c in results" :key="c.id" class="cs-row" @tap="openCircle(c.id)">
            <view class="cs-row-cover">
              <image v-if="c.cover" :src="c.cover" class="cs-row-cover-img" mode="aspectFill" lazy-load />
              <view v-else class="cs-row-cover-ph"><app-icon name="users" :size="36" color="#C9A96E" /></view>
            </view>
            <view class="cs-row-main">
              <view class="cs-row-name-line">
                <text
                  v-for="(seg, i) in highlightSegments(c.name)" :key="i"
                  class="cs-row-name" :class="{ hit: seg.hit }"
                >{{ seg.text }}</text>
              </view>
              <view class="cs-row-meta">
                <text class="cs-row-meta-t">{{ formatMembers(c.members) }} 成员 · </text>
                <text class="cs-row-meta-t" :class="{ gold: c.type === 'YEARLY' || c.isPaid }">{{ priceLabel(c) }}</text>
              </view>
            </view>
            <view v-if="c.isJoined" class="cs-joined-mini"><text class="cs-joined-mini-t">已加入</text></view>
            <view v-else class="cs-join-mini" @tap.stop="openPreview(c.id)"><text class="cs-join-mini-t">加入</text></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.cs-page { min-height: 100vh; background: var(--bg-page, #FAF8F5); padding-bottom: 80rpx; }

/* 搜索顶栏 */
.cs-bar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #EDE7DD);
}
.cs-back { display: flex; flex-shrink: 0; }
.cs-input-wrap {
  flex: 1; display: flex; align-items: center; gap: 16rpx;
  height: 72rpx; padding: 0 28rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cs-input { flex: 1; height: 56rpx; line-height: 56rpx; font-size: 28rpx; color: var(--text-primary, #2C2C2C); background: transparent; }
.cs-ph { color: var(--text-tertiary, #999); }
.cs-clear {
  width: 32rpx; height: 32rpx; border-radius: 999rpx; flex-shrink: 0;
  background: var(--separator, #EDE7DD);
  display: flex; align-items: center; justify-content: center;
}
.cs-cancel { font-size: 28rpx; color: var(--text-secondary, #6E6E73); flex-shrink: 0; }

/* 输入前：历史 + 热门 */
.cs-pre-label {
  margin: 36rpx 36rpx 20rpx;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 24rpx; color: var(--text-tertiary, #999);
}
.cs-pre-label.mt { margin-top: 40rpx; }
.cs-pre-clear { display: flex; padding: 4rpx; }
.cs-chips { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 32rpx; }
.cs-chip {
  display: inline-flex; align-items: center; gap: 10rpx; height: 60rpx; padding: 0 26rpx;
  border-radius: 30rpx; background: var(--bg-card, #fff);
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cs-chip-t { font-size: 26rpx; color: var(--text-secondary, #6E6E73); }
.cs-chip-t.dark { color: var(--text-primary, #2C2C2C); }
.cs-chip-rank { font-size: 22rpx; font-weight: 700; color: #C9A96E; }
.cs-chip-rank.top { color: var(--brand, #C41E3A); }

/* #37 AI 智能推荐卡（V0 ai-card：金描边+呼吸点+追问 chips） */
.cs-ai-card {
  margin: 28rpx 32rpx 0; padding: 28rpx 32rpx;
  background: var(--bg-card, #fff);
  border: 2rpx solid rgba(201, 169, 110, 0.55);
  border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cs-ai-head { display: flex; align-items: center; gap: 12rpx; }
.cs-ai-dot {
  width: 16rpx; height: 16rpx; border-radius: 999rpx;
  background: radial-gradient(circle at 35% 35%, #e8dcc4, #c9a96e);
  animation: cs-breathe 2.4s ease-in-out infinite;
}
@keyframes cs-breathe { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.cs-ai-name { font-size: 24rpx; font-weight: 600; color: var(--gold, #c9a96e); }
.cs-ai-summary { display: block; margin-top: 16rpx; font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }
.cs-ai-recs-group { margin-top: 16rpx; }
.cs-row.ai { padding: 20rpx 0; }
.cs-row.ai + .cs-row.ai { border-top: 1rpx solid var(--separator, #ede7dd); }
.cs-ai-recs { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 20rpx; }
.cs-ai-rec {
  display: inline-flex; align-items: center; gap: 8rpx;
  height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--bg-warm, #f8f4ec);
}
.cs-ai-rec:active { opacity: 0.8; }
.cs-ai-rec-t { font-size: 24rpx; color: var(--text-primary, #2c2c2c); }
.cs-ai-note { display: block; margin-top: 18rpx; font-size: 20rpx; color: var(--text-tertiary, #999); }

/* 结果分组 */
.cs-result-label { display: block; margin: 40rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.cs-group {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.cs-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; }
.cs-row + .cs-row { border-top: 1rpx solid var(--separator, #EDE7DD); }
.cs-row-cover { width: 104rpx; height: 104rpx; border-radius: 28rpx; overflow: hidden; flex-shrink: 0; background: var(--bg-warm, #F8F4EC); }
.cs-row-cover-img { width: 100%; height: 100%; }
.cs-row-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.cs-row-main { flex: 1; min-width: 0; }
.cs-row-name-line { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs-row-name { font-size: 29rpx; font-weight: 600; color: var(--text-primary, #2C2C2C); }
.cs-row-name.hit { color: var(--brand, #C41E3A); }
.cs-row-meta { margin-top: 6rpx; display: flex; align-items: baseline; }
.cs-row-meta-t { font-size: 24rpx; color: var(--text-tertiary, #999); }
.cs-row-meta-t.gold { color: #C9A96E; font-weight: 600; }
.cs-join-mini {
  flex-shrink: 0; height: 60rpx; padding: 0 28rpx; border-radius: 30rpx;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex; align-items: center;
}
.cs-join-mini-t { font-size: 26rpx; font-weight: 500; color: var(--brand, #C41E3A); }
.cs-joined-mini {
  flex-shrink: 0; height: 60rpx; padding: 0 28rpx; border-radius: 30rpx;
  border: 1rpx solid var(--separator, #EDE7DD);
  display: flex; align-items: center;
}
.cs-joined-mini-t { font-size: 26rpx; color: var(--text-tertiary, #999); }

/* 骨架 */
.cs-skeleton { margin: 28rpx 32rpx 0; background: var(--bg-card, #fff); border-radius: 36rpx; padding: 8rpx 0; }
.cs-sk-row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; }
.cs-sk-cover { width: 104rpx; height: 104rpx; border-radius: 28rpx; background: var(--bg-warm, #F8F4EC); flex-shrink: 0; animation: cs-pulse 1.4s ease-in-out infinite; }
.cs-sk-main { flex: 1; display: flex; flex-direction: column; gap: 16rpx; }
.cs-sk-line { height: 26rpx; border-radius: 8rpx; background: var(--bg-warm, #F8F4EC); animation: cs-pulse 1.4s ease-in-out infinite; }
.cs-sk-line.w70 { width: 70%; }
.cs-sk-line.w45 { width: 45%; }
@keyframes cs-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

/* 空/错误态 */
.cs-empty { margin: 96rpx 64rpx 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
.cs-empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 999rpx; margin-bottom: 28rpx;
  background: var(--bg-warm, #F8F4EC);
  display: flex; align-items: center; justify-content: center;
}
.cs-empty-t1 { font-size: 30rpx; font-weight: 500; color: var(--text-primary, #2C2C2C); }
.cs-empty-t2 { margin-top: 12rpx; font-size: 26rpx; color: var(--text-tertiary, #999); line-height: 1.7; white-space: pre-line; }
.cs-empty-cta {
  margin-top: 32rpx; height: 76rpx; padding: 0 44rpx; border-radius: 38rpx;
  background: var(--brand, #C41E3A);
  display: inline-flex; align-items: center;
}
.cs-empty-cta-t { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
