<script setup lang="ts">
/**
 * 八宅排盘·结果页（自 V0 app/bazhai/result/page.tsx 还原）
 * onLoad 解析 payload 后本地重算（@/pkg-paipan/lib/bazhai-data），无后端依赖。
 * 结构：信息表（客户/宅卦/坐向/命卦/宅命）→ 宅卦盘/命卦盘切换 → 大游年九宫盘
 *       → 四吉四凶总览 → 门主灶布局建议 → 方位详情抽屉 → 合规声明。
 * 取舍：底部工具栏（客服/笔记）与 AI 区块按批次规范砍掉，分享收口到顶栏（复制盘面摘要）；
 *       进入即自动存本地历史（改名原位覆盖）；X5 红线：九宫格不用 aspect-ratio，固定行高。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { MOUNTAINS } from '@/pkg-paipan/lib/xuankong-data'
import {
  type Gua,
  type StarName,
  GUA_INFO,
  STAR_INFO,
  GRID_LAYOUT,
  younianStars,
  sittingGua,
  mingGua,
  isMatch,
  groupName,
} from '@/pkg-paipan/lib/bazhai-data'
import { saveBazhaiHistory, type BazhaiParams } from './bazhai-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '八宅排盘'
// #ifdef MP-WEIXIN
hdrTitle = '八宅文化研究'
// #endif

// ─── 状态 ───
const params = ref<BazhaiParams | null>(null)
const loadError = ref('')
const customer = ref('')
const editingName = ref(false)
const panMode = ref<'zhai' | 'ming'>('zhai')
const selectedGua = ref<Gua | null>(null)

// ─── 排盘（本地重算） ───
const zhai = computed<Gua | null>(() => (params.value ? sittingGua(params.value.sitting) : null))
const ming = computed<Gua | null>(() => {
  const p = params.value
  if (!p || !p.birthYear) return null
  return mingGua(p.birthYear, p.gender)
})
const zhaiStars = computed(() => (zhai.value ? younianStars(zhai.value) : null))
const mingStars = computed(() => (ming.value ? younianStars(ming.value) : null))

const activeStars = computed(() => (panMode.value === 'ming' && mingStars.value ? mingStars.value : zhaiStars.value))
const activeBase = computed<Gua | null>(() => (panMode.value === 'ming' && ming.value ? ming.value : zhai.value))

const shanxiangLabel = computed(() => {
  const p = params.value
  if (!p) return ''
  return `${MOUNTAINS[p.sitting]}山${MOUNTAINS[(p.sitting + 12) % 24]}向`
})
const matched = computed(() => (zhai.value && ming.value ? isMatch(zhai.value, ming.value) : null))

/** 四吉方 / 四凶方（当前盘） */
const jiFangs = computed<Gua[]>(() => {
  const stars = activeStars.value
  if (!stars) return []
  return GRID_LAYOUT.filter((g): g is Gua => g !== null && STAR_INFO[stars[g]].isJi)
})
const xiongFangs = computed<Gua[]>(() => {
  const stars = activeStars.value
  if (!stars) return []
  return GRID_LAYOUT.filter((g): g is Gua => g !== null && !STAR_INFO[stars[g]].isJi)
})

/** 吉星用绿（与玄空山星一致），凶星用朱砂 */
function isJi(star: StarName): boolean {
  return STAR_INFO[star].isJi
}

// ─── 布局建议文案 ───
const doorText = computed(() =>
  jiFangs.value.map((g) => `${GUA_INFO[g].dirShort}（${activeStars.value![g]}）`).join('、'),
)
const bedroomText = computed(() =>
  jiFangs.value
    .filter((g) => {
      const s = activeStars.value![g]
      return s === '生气' || s === '延年' || s === '天医'
    })
    .map((g) => `${GUA_INFO[g].dirShort}（${activeStars.value![g]}）`)
    .join('、'),
)
const stoveText = computed(() => xiongFangs.value.map((g) => GUA_INFO[g].dirShort).join('、'))
const toiletText = computed(() =>
  xiongFangs.value.map((g) => `${GUA_INFO[g].dirShort}（${activeStars.value![g]}）`).join('、'),
)

// ─── 历史（进入即存；改名原位覆盖） ───
function persist() {
  const p = params.value
  if (!p || !zhai.value) return
  saveBazhaiHistory(
    { ...p, customer: customer.value.trim().slice(0, 20) },
    `${zhai.value}宅 ${shanxiangLabel.value}${ming.value ? ` · ${ming.value}命` : ''}`,
  )
}

function onNameDone() {
  editingName.value = false
  persist()
}

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Partial<BazhaiParams>
    const sitting = Number(p.sitting)
    if (!(sitting >= 0 && sitting <= 23)) throw new Error('坐向参数无效')
    const birthYear = Number(p.birthYear) || 0
    if (birthYear && (birthYear < 1000 || birthYear > 9999)) throw new Error('出生年份无效')
    params.value = {
      customer: String(p.customer || '').slice(0, 20),
      sitting,
      gender: p.gender === 'female' ? 'female' : 'male',
      birthYear,
    }
    customer.value = params.value.customer
    persist()
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘参数无效，请重新排盘'
  }
})

function goInput() {
  navigateTo('/pkg-paipan/bazhai/index')
}

/** 分享：复制盘面文字摘要 */
function onShare() {
  const p = params.value
  if (!p || !zhai.value || !activeStars.value) return
  const stars = zhaiStars.value!
  const fangs = GRID_LAYOUT.filter((g): g is Gua => g !== null)
    .map((g) => `${GUA_INFO[g].dirShort}${stars[g]}`)
    .join(' · ')
  const summary = [
    `【八宅排盘】${customer.value ? `${customer.value} · ` : ''}${zhai.value}宅 ${shanxiangLabel.value}（${groupName(zhai.value)}宅）`,
    ming.value ? `命卦：${ming.value}命（${groupName(ming.value)}命） · ${matched.value ? '宅命相配' : '宅命不配'}` : '命卦：未填',
    `八方游年：${fangs}`,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: summary,
    success: () => uni.showToast({ title: '盘面摘要已复制', icon: 'none' }),
  })
}

// ─── 方位详情 ───
const guaDetail = computed(() => {
  const g = selectedGua.value
  if (!g || !activeStars.value) return null
  const star = activeStars.value[g]
  return { gua: g, star, info: STAR_INFO[star], dir: GUA_INFO[g] }
})
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      :subtitle="zhai ? `${zhai}宅 ${shanxiangLabel}${ming ? ` · ${ming}命` : ''}` : ''"
      back-href="/pkg-paipan/bazhai/index"
      @share="onShare"
    />

    <!-- 参数错误态 -->
    <view v-if="loadError" class="status">
      <app-icon name="info" :size="64" color="#d1d5db" />
      <text class="status-text">{{ loadError }}</text>
      <view class="status-btn" @tap="goInput"><text class="status-btn-text">返回排盘</text></view>
    </view>

    <!-- 主体 -->
    <scroll-view v-else-if="params && zhai && activeStars && activeBase" scroll-y class="body">
      <view class="body-inner">
        <!-- 信息表 -->
        <paper-card padding="none">
          <view class="tr tr-bd">
            <view class="th"><text class="th-text">客户名称</text></view>
            <view class="td td-center">
              <input
                v-if="editingName"
                v-model="customer"
                class="name-input"
                type="text"
                :maxlength="20"
                focus
                confirm-type="done"
                @blur="onNameDone"
                @confirm="onNameDone"
              >
              <template v-else>
                <text class="td-text">{{ customer || '未填写' }}</text>
                <view class="name-edit" @tap="editingName = true">
                  <app-icon name="pencil" :size="26" color="var(--text-soft)" />
                </view>
              </template>
            </view>
          </view>
          <view class="grid4 tr-bd">
            <view class="grid4-h"><text class="grid4-h-text">宅卦</text></view>
            <view class="grid4-h"><text class="grid4-h-text">坐向</text></view>
            <view class="grid4-h"><text class="grid4-h-text">命卦</text></view>
            <view class="grid4-h grid4-last"><text class="grid4-h-text">宅命</text></view>
          </view>
          <view class="grid4">
            <view class="grid4-c">
              <text class="grid4-c-text">{{ zhai }}宅</text>
              <text class="grid4-c-sub">{{ groupName(zhai) }}宅</text>
            </view>
            <view class="grid4-c">
              <text class="grid4-c-text">{{ shanxiangLabel }}</text>
              <text class="grid4-c-sub">坐{{ GUA_INFO[zhai].dirShort }}</text>
            </view>
            <view class="grid4-c">
              <template v-if="ming">
                <text class="grid4-c-text">{{ ming }}命</text>
                <text class="grid4-c-sub">{{ groupName(ming) }}命 · {{ params.gender === 'male' ? '男' : '女' }}</text>
              </template>
              <text v-else class="grid4-c-text grid4-c-off">未填</text>
            </view>
            <view class="grid4-c grid4-last">
              <text v-if="matched === null" class="grid4-c-text grid4-c-off">—</text>
              <view v-else class="badge" :class="matched ? 'badge-ji' : 'badge-xiong'">
                <text class="badge-text" :class="matched ? 'badge-ji-t' : 'badge-xiong-t'">{{ matched ? '相配' : '不配' }}</text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 盘面切换 -->
        <view class="mode-row">
          <view class="mode-pill" :class="{ 'mode-pill-on': panMode === 'zhai' }" @tap="panMode = 'zhai'">
            <text class="mode-pill-text" :class="{ 'mode-pill-text-on': panMode === 'zhai' }">宅卦盘</text>
          </view>
          <view
            class="mode-pill"
            :class="{ 'mode-pill-on': panMode === 'ming', 'mode-pill-off': !ming }"
            @tap="ming && (panMode = 'ming')"
          >
            <text class="mode-pill-text" :class="{ 'mode-pill-text-on': panMode === 'ming' }">命卦盘</text>
          </view>
        </view>
        <text class="mode-caption">
          {{ panMode === 'zhai' ? `以${zhai}宅起大游年 · 看住宅八方吉凶` : `以${ming}命起大游年 · 看个人本命吉方` }}
        </text>

        <!-- 大游年九宫盘（X5：固定行高） -->
        <view class="yn-grid">
          <template v-for="(gua, i) in GRID_LAYOUT" :key="i">
            <!-- 中宫 -->
            <view v-if="gua === null" class="yn-cell yn-center">
              <text class="yn-center-gua">{{ activeBase }}</text>
              <text class="yn-center-sub">{{ panMode === 'zhai' ? '宅卦' : '命卦' }}</text>
              <text class="yn-center-sub">{{ groupName(activeBase) }}</text>
            </view>
            <!-- 八方 -->
            <view v-else class="yn-cell" @tap="selectedGua = gua">
              <view v-if="panMode === 'zhai' && gua === zhai" class="yn-sit">
                <text class="yn-sit-text">坐</text>
              </view>
              <text class="yn-dir">{{ GUA_INFO[gua].dirShort }} · {{ gua }}</text>
              <text class="yn-star" :class="isJi(activeStars[gua]) ? 'c-ji' : 'c-xiong'">{{ activeStars[gua] }}</text>
              <view class="badge" :class="isJi(activeStars[gua]) ? 'badge-ji' : 'badge-xiong'">
                <text class="badge-text" :class="isJi(activeStars[gua]) ? 'badge-ji-t' : 'badge-xiong-t'">
                  {{ STAR_INFO[activeStars[gua]].luck }}
                </text>
              </view>
            </view>
          </template>
        </view>
        <text class="hint">点击方位查看星曜详解与布局宜忌</text>

        <!-- 四吉四凶总览 -->
        <view class="jx-row">
          <view class="jx-card jx-card-ji">
            <text class="jx-title c-ji">四吉方</text>
            <view v-for="g in jiFangs" :key="g" class="jx-line">
              <text class="jx-fang">{{ GUA_INFO[g].dirShort }}（{{ g }}）</text>
              <text class="jx-star c-ji">{{ activeStars[g] }}</text>
            </view>
          </view>
          <view class="jx-card jx-card-xiong">
            <text class="jx-title c-xiong">四凶方</text>
            <view v-for="g in xiongFangs" :key="g" class="jx-line">
              <text class="jx-fang">{{ GUA_INFO[g].dirShort }}（{{ g }}）</text>
              <text class="jx-star c-xiong">{{ activeStars[g] }}</text>
            </view>
          </view>
        </view>

        <!-- 门主灶布局建议 -->
        <paper-card padding="md">
          <text class="sug-h">门主灶布局建议</text>
          <view class="sug-list">
            <view class="sug-item">
              <text class="sug-lab">大门：</text>
              <text class="sug-text">宜开在{{ doorText }}等吉方，纳吉气入宅。</text>
            </view>
            <view class="sug-item">
              <text class="sug-lab">主卧：</text>
              <text class="sug-text">首选{{ bedroomText }}，安床利健康感情。</text>
            </view>
            <view class="sug-item">
              <text class="sug-lab">厨灶：</text>
              <text class="sug-text">宜压凶向吉——灶体坐{{ stoveText }}等凶方，灶口朝向吉方，以火镇凶纳吉。</text>
            </view>
            <view class="sug-item">
              <text class="sug-lab">厕所：</text>
              <text class="sug-text">宜设于{{ toiletText }}等凶方镇压凶气，忌占吉方。</text>
            </view>
          </view>
          <view v-if="matched === false && ming" class="mismatch">
            <text class="mismatch-lab">宅命不配提示：</text>
            <text class="mismatch-text">
              {{ groupName(ming) }}命居{{ groupName(zhai) }}宅，宅命气场有别。可切换「命卦盘」以个人吉方为主布置卧室床位、办公位，扬长避短。
            </text>
          </view>
        </paper-card>

        <text class="note">断语仅供参考，实际布局请结合峦头形势与具体户型综合而定。</text>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="八宅游年所示为传统堪舆学说的方位推演，属传统文化研究范畴，内容仅供参考，切勿迷信。"
        />
      </view>
    </scroll-view>

    <!-- 方位详情抽屉 -->
    <view v-if="guaDetail" class="mask" @tap="selectedGua = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">
            {{ guaDetail.dir.dir }}（{{ guaDetail.gua }}宫） ·
            <text class="sheet-title-star" :class="guaDetail.info.isJi ? 'c-ji' : 'c-xiong'">{{ guaDetail.star }}</text>
          </text>
          <view class="sheet-close" @tap="selectedGua = null">
            <app-icon name="x" :size="36" color="var(--text-soft)" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view class="sheet-inner">
            <view class="tag-row">
              <view class="badge" :class="guaDetail.info.isJi ? 'badge-ji' : 'badge-xiong'">
                <text class="badge-text" :class="guaDetail.info.isJi ? 'badge-ji-t' : 'badge-xiong-t'">{{ guaDetail.info.luck }}</text>
              </view>
              <view class="tag"><text class="tag-text">{{ guaDetail.info.xing }}</text></view>
              <view class="tag"><text class="tag-text">五行属{{ guaDetail.info.wuxing }}</text></view>
              <view class="tag"><text class="tag-text">方位五行属{{ guaDetail.dir.wuxing }}</text></view>
            </view>
            <view class="det-block">
              <text class="det-h">星曜释义</text>
              <text class="det-text">{{ guaDetail.info.desc }}</text>
            </view>
            <view class="det-block">
              <text class="det-h">主要影响</text>
              <text class="det-text">{{ guaDetail.info.effect }}</text>
            </view>
            <view class="det-card det-card-ji">
              <text class="det-h c-ji">宜</text>
              <text class="det-text">{{ guaDetail.info.yi }}</text>
            </view>
            <view class="det-card det-card-xiong">
              <text class="det-h c-xiong">忌</text>
              <text class="det-text">{{ guaDetail.info.ji }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;
$green: #2f9d6a;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 20rpx; }

/* 通用吉凶配色 */
.c-ji { color: $green; }
.c-xiong { color: var(--brand); }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 80rpx 40rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); }
.status-btn { padding: 20rpx 56rpx; background: var(--brand); border-radius: 20rpx; }
.status-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 信息表 */
.tr { display: flex; align-items: stretch; }
.tr-bd { border-bottom: 1rpx solid var(--line); }
.th {
  flex-shrink: 0;
  width: 160rpx;
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: rgba(0, 0, 0, 0.025);
}
.th-text { font-size: 26rpx; font-weight: 500; color: #b45309; }
.td { flex: 1; display: flex; align-items: center; padding: 20rpx 24rpx; min-width: 0; gap: 8rpx; }
.td-center { justify-content: center; }
.td-text { font-size: 26rpx; line-height: 1.5; color: var(--text-ink); }
.name-input {
  width: 320rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-ink);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(196, 30, 58, 0.4);
  background: rgba(0, 0, 0, 0.03);
}
.name-edit { padding: 8rpx; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); }
.grid4-h { padding: 16rpx 8rpx; background: rgba(0, 0, 0, 0.025); border-right: 1rpx solid var(--line); display: flex; align-items: center; justify-content: center; }
.grid4-h-text { font-size: 26rpx; font-weight: 500; color: #b45309; }
.grid4-c {
  padding: 20rpx 8rpx;
  border-right: 1rpx solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}
.grid4-c-text { font-size: 26rpx; color: var(--text-ink); text-align: center; }
.grid4-c-sub { font-size: 20rpx; color: var(--text-soft); text-align: center; }
.grid4-c-off { color: var(--text-soft); }
.grid4-last { border-right: none; }

/* 吉凶徽章 */
.badge { padding: 4rpx 14rpx; border-radius: 999rpx; }
.badge-text { font-size: 20rpx; font-weight: 600; }
.badge-ji { background: rgba(47, 157, 106, 0.1); }
.badge-ji-t { color: $green; }
.badge-xiong { background: rgba(196, 30, 58, 0.1); }
.badge-xiong-t { color: var(--brand); }

/* 盘面切换 */
.mode-row { margin-top: 8rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.mode-pill { padding: 12rpx 32rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.05); }
.mode-pill-on { background: var(--brand); }
.mode-pill-off { opacity: 0.4; }
.mode-pill-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.mode-pill-text-on { color: #fff; }
.mode-caption { text-align: center; font-size: 22rpx; color: var(--text-soft); }

/* 大游年九宫盘（X5：固定行高） */
.yn-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 216rpx);
  gap: 2rpx;
  background: var(--line);
  border-radius: 24rpx;
  overflow: hidden;
  border: 1rpx solid var(--line);
}
.yn-cell {
  position: relative;
  background: var(--card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  overflow: hidden;
}
.yn-cell:active { background: rgba(0, 0, 0, 0.03); }
.yn-sit {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(196, 30, 58, 0.1);
}
.yn-sit-text { font-size: 20rpx; font-weight: 500; color: var(--brand); }
.yn-dir { font-size: 22rpx; color: var(--text-soft); }
.yn-star { font-family: $serif; font-size: 38rpx; font-weight: 700; }
.yn-center-gua { font-family: $serif; font-size: 48rpx; font-weight: 700; color: var(--text-ink); }
.yn-center-sub { font-size: 22rpx; color: var(--text-soft); }
.hint { text-align: center; font-size: 22rpx; color: var(--text-soft); }

/* 四吉四凶总览 */
.jx-row { margin-top: 8rpx; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.jx-card {
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.jx-card-ji { border: 2rpx solid rgba(47, 157, 106, 0.3); background: rgba(47, 157, 106, 0.05); }
.jx-card-xiong { border: 2rpx solid rgba(196, 30, 58, 0.3); background: rgba(196, 30, 58, 0.05); }
.jx-title { font-size: 26rpx; font-weight: 700; }
.jx-line { display: flex; align-items: center; justify-content: space-between; }
.jx-fang { font-size: 26rpx; color: var(--text-ink); }
.jx-star { font-size: 26rpx; font-weight: 500; }

/* 门主灶布局建议 */
.sug-h { display: block; font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); margin-bottom: 20rpx; }
.sug-list { display: flex; flex-direction: column; gap: 20rpx; }
.sug-item { font-size: 26rpx; line-height: 1.7; }
.sug-lab { font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.sug-text { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }
.mismatch {
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.05);
  border: 2rpx solid rgba(196, 30, 58, 0.2);
  font-size: 26rpx;
  line-height: 1.7;
}
.mismatch-lab { font-size: 26rpx; font-weight: 600; color: var(--brand); }
.mismatch-text { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }
.note { text-align: center; font-size: 22rpx; line-height: 1.6; color: #b45309; padding: 0 32rpx; }

/* 方位详情抽屉 */
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.sheet-title-star { font-size: 30rpx; font-weight: 700; }
.sheet-close { padding: 8rpx; flex-shrink: 0; }
.sheet-body { max-height: 65vh; }
.sheet-inner { padding: 28rpx 32rpx 56rpx; display: flex; flex-direction: column; gap: 28rpx; }
.tag-row { display: flex; flex-wrap: wrap; align-items: center; gap: 16rpx; }
.tag { padding: 8rpx 20rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.05); }
.tag-text { font-size: 22rpx; color: var(--text-soft); }
.det-block { display: flex; flex-direction: column; gap: 8rpx; }
.det-h { font-size: 26rpx; font-weight: 600; color: var(--text-ink); }
.det-text { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }
.det-card { border-radius: 16rpx; padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 8rpx; }
.det-card-ji { background: rgba(47, 157, 106, 0.05); border: 2rpx solid rgba(47, 157, 106, 0.2); }
.det-card-xiong { background: rgba(196, 30, 58, 0.05); border: 2rpx solid rgba(196, 30, 58, 0.2); }
</style>
