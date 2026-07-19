<script setup lang="ts">
/**
 * 金口诀结果页——自 V0 app/jinkoujue/result/page.tsx 还原
 * onLoad 解析 payload 本地重算：课体信息表 / 四位课盘（人元·贵神·将神·地分）/ 白话总断 /
 * 四位神煞 / 课体判定 / 知识库八板块（本课命中联动高亮）。
 * 取舍：V0「AI 深断本课」按钮本批砍掉；V0 底部六爻跳转项目无此页，改为大六壬；保存写本地排盘记录。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { paiJinKouJue, type JkjResult, type DifenMethod } from '@/pkg-paipan/lib/jinkoujue-engine'
import { JKJ_KNOWLEDGE, type KnowledgeEntry } from '@/pkg-paipan/lib/jinkoujue-data'

const HISTORY_KEY = 'rebu:jinkoujue-history'

// 五行配色（全局 --wuxing-* token）
const WX_COLOR: Record<string, string> = {
  木: 'var(--wuxing-wood)',
  火: 'var(--wuxing-fire)',
  土: 'var(--wuxing-earth)',
  金: 'var(--wuxing-metal)',
  水: 'var(--wuxing-water)',
}
function wxColor(wx: string) { return WX_COLOR[wx] || 'var(--text-ink)' }

const ROLE_KEYS = ['人元', '贵神', '将神', '地分'] as const
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'] as const

// ─── 起课输入（payload 解析） ───
interface JkjQuery {
  topic: string
  year: number; month: number; day: number; hour: number; minute: number
  dm: DifenMethod
  dz?: string
  dn?: number
  jm: 'jie' | 'zhong'
  gs: 'A' | 'B'
  gt: 'auto' | 'day' | 'night'
}

const q = ref<JkjQuery | null>(null)
const result = ref<JkjResult | null>(null)
const invalid = ref(false)

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    const query: JkjQuery = {
      topic: String(p.topic ?? ''),
      year: Number(p.year), month: Number(p.month), day: Number(p.day),
      hour: Number(p.hour) || 0, minute: Number(p.minute) || 0,
      dm: (p.dm as DifenMethod) ?? 'manual',
      dz: p.dz === undefined ? undefined : String(p.dz),
      dn: p.dn === undefined ? undefined : Number(p.dn),
      jm: p.jm === 'zhong' ? 'zhong' : 'jie',
      gs: p.gs === 'B' ? 'B' : 'A',
      gt: p.gt === 'day' ? 'day' : p.gt === 'night' ? 'night' : 'auto',
    }
    const d = new Date(query.year, query.month - 1, query.day, query.hour, query.minute)
    if (Number.isNaN(d.getTime()) || !query.year) throw new Error('bad date')
    if (query.dm === 'number' && !(Number.isFinite(query.dn) && (query.dn as number) >= 1)) throw new Error('bad number')
    if (query.dm !== 'number' && !query.dz) throw new Error('bad difen')
    // 随机地分在入口页已落定为 dz；此处一律按已定支/报数重算，保证重开一致
    result.value = paiJinKouJue({
      date: d,
      topic: query.topic || undefined,
      difenMethod: query.dm === 'number' ? 'number' : 'manual',
      difenZhi: query.dz,
      difenNumber: query.dn,
      jiangMethod: query.jm,
      guirenSchool: query.gs,
      guiType: query.gt,
    })
    // 展示口径仍按原起法（自选/报数/随机）
    if (query.dm === 'random') result.value.difen.method = '随机'
    q.value = query
  } catch {
    invalid.value = true
  }
})

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { navigateBack(); return }
  navigateTo('/pkg-paipan/jinkoujue/index')
}

// ─── 本课命中联动键集合 ───
const hitKeys = computed(() => {
  const keys = new Set<string>()
  const r = result.value
  if (!r) return keys
  for (const d of r.dongYao) keys.add(d.name)
  for (const k of r.keTi) keys.add(k.name)
  for (const arr of Object.values(r.shenSha)) for (const s of arr) keys.add(s)
  return keys
})
function isHit(e: KnowledgeEntry) {
  return !!e.matchKey && hitKeys.value.has(e.matchKey)
}
function tabHasHit(tabId: string) {
  const t = JKJ_KNOWLEDGE.find((k) => k.id === tabId)
  return !!t && t.entries.some((e) => isHit(e))
}

const tab = ref(JKJ_KNOWLEDGE[0].id)
const activeTab = computed(() => JKJ_KNOWLEDGE.find((t) => t.id === tab.value) ?? JKJ_KNOWLEDGE[0])

// ─── 保存 / 分享 ───
const saved = ref(false)

function pad(n: number) { return String(n).padStart(2, '0') }

/** 保存排盘记录（本地存储，与入口页弹层共用，上限 50） */
function handleSave() {
  if (saved.value || !result.value || !q.value) return
  try {
    const r = result.value
    const raw = uni.getStorageSync(HISTORY_KEY)
    const records = raw ? (JSON.parse(raw) as unknown[]) : []
    records.unshift({
      id: Date.now(),
      topic: r.topic || '未命名事项',
      dateText: `${q.value.year}年${pad(q.value.month)}月${pad(q.value.day)}日 ${pad(q.value.hour)}:${pad(q.value.minute)}`,
      panText: `月将${r.yuejiang.zhi} · 地分${r.difen.zhi} · 用爻${r.yongRole}`,
      params: { ...q.value },
      createdAt: Date.now(),
    })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(records.slice(0, 50)))
    saved.value = true
    uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

/** 分享：H5 系统分享/复制链接，其余端复制课盘摘要 */
function handleShare() {
  const r = result.value
  if (!r) return
  const summary = `金口诀：${r.pillars.day}日 月将${r.yuejiang.zhi} 地分${r.difen.zhi}，用爻${r.yongRole}${r.keTi.length ? `（${r.keTi.map((k) => k.name).join('、')}）` : ''}`
  // #ifdef H5
  const url = window.location.href
  const nav = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> }
  if (nav.share) {
    nav.share({ title: summary, url }).catch(() => {})
  } else {
    uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
  }
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: summary, success: () => uni.showToast({ title: '课盘已复制', icon: 'none' }) })
  // #endif
}
</script>

<template>
  <view class="page">
    <tool-header title="金口诀排盘" subtitle="大六壬金口诀 · 神将贵人" @back="onBack" />

    <!-- 参数缺失/损坏：错误态 -->
    <view v-if="invalid" class="err">
      <text class="err-text">排盘参数缺失或已失效</text>
      <view class="err-btn" @tap="navigateTo('/pkg-paipan/jinkoujue/index')">
        <text class="err-btn-text">重新起课</text>
      </view>
    </view>

    <scroll-view v-else-if="result" scroll-y class="body">
      <view class="body-inner">
        <!-- ── 课体信息表 ── -->
        <view class="card info-table">
          <view class="tr">
            <text class="th">事项</text>
            <view class="td"><text class="td-text">{{ result.topic || '—' }}</text></view>
          </view>
          <view class="tr">
            <text class="th">日期</text>
            <view class="td">
              <text class="td-text">{{ result.dateLabel }}<text class="td-sub">（{{ result.lunarLabel }}）</text></text>
            </view>
          </view>
          <view class="tr">
            <text class="th">节气</text>
            <view class="td"><text class="td-text td-sm">{{ result.jieqiRange }}</text></view>
          </view>
          <view class="tr">
            <text class="th">四柱</text>
            <view class="td-pillars">
              <view
                v-for="(gz, i) in [result.pillars.year, result.pillars.month, result.pillars.day, result.pillars.time]"
                :key="PILLAR_LABELS[i]"
                class="pillar-cell"
                :class="{ 'pillar-cell-line': i < 3 }"
              >
                <text class="pillar-label">{{ PILLAR_LABELS[i] }}</text>
                <text class="pillar-gz">{{ gz[0] }}{{ '\n' }}{{ gz[1] }}</text>
              </view>
            </view>
          </view>
          <view class="tr">
            <text class="th">月将</text>
            <view class="td">
              <text class="td-text">
                {{ result.yuejiang.zhi }}<text class="td-sub"> {{ result.yuejiang.name }}（{{ result.yuejiang.method }}）</text>
                <text class="td-strong">　地分</text>　{{ result.difen.zhi }}<text class="td-sub">（{{ result.difen.method }}）</text>
              </text>
            </view>
          </view>
          <view class="tr tr-last">
            <text class="th">日空</text>
            <view class="td">
              <text class="td-text">
                {{ result.xunKong.join('') }}
                <template v-if="result.siDaKong">
                  <text class="td-bad">　四大空亡</text>　{{ result.siDaKong }}
                </template>
              </text>
            </view>
          </view>
        </view>

        <!-- ── 四位课盘（核心视觉） ── -->
        <view class="pan-card">
          <view
            v-for="(p, i) in result.positions"
            :key="p.role"
            class="pan-row"
            :class="{ 'pan-row-last': i === 3 }"
          >
            <text class="pan-role">{{ p.role }}</text>
            <text class="pan-char">{{ p.gan && p.gan !== p.char ? p.gan : '' }}{{ p.char }}</text>
            <text v-if="p.starName" class="pan-star">({{ p.starName }})</text>
            <text class="pan-wx" :style="{ color: wxColor(p.wuxing) }">{{ p.wuxing }}{{ p.yinyang }}</text>
            <text class="pan-ws">{{ p.wangShuai }}</text>
            <view class="pan-badges">
              <view v-if="p.isYong" class="badge badge-yong"><text class="badge-yong-text">用</text></view>
              <view v-if="p.isXunKong" class="badge badge-kong"><text class="badge-kong-text">旬空</text></view>
              <view v-if="p.isSiDaKong" class="badge badge-kong"><text class="badge-kong-text">四空</text></view>
            </view>
          </view>
          <!-- 动爻标记 -->
          <view v-if="result.dongYao.length > 0" class="dong-chips">
            <view v-for="d in result.dongYao" :key="d.name + d.positions" class="dong-chip">
              <text class="dong-chip-name">{{ d.name }}</text>
              <text class="dong-chip-pos">({{ d.positions }})</text>
            </view>
          </view>
        </view>

        <!-- ── 白话总断 ── -->
        <view class="card pad-card">
          <text class="card-title">白话总断</text>
          <view class="summary-list">
            <text v-for="s in result.summary" :key="s" class="summary-line">{{ s }}</text>
          </view>
        </view>

        <!-- ── 四位神煞 ── -->
        <view class="card pad-card">
          <view
            v-for="(role, i) in ROLE_KEYS"
            :key="role"
            class="shensha-row"
            :class="{ 'shensha-row-last': i === 3 }"
          >
            <text class="shensha-text">
              <text class="shensha-role">{{ role }}神煞：</text>{{ result.shenSha[role]?.length ? result.shenSha[role].join('、') : '' }}
            </text>
          </view>
        </view>

        <!-- ── 课体判定 ── -->
        <view v-if="result.keTi.length > 0" class="card pad-card">
          <text class="card-title">本课课体</text>
          <view class="keti-list">
            <view v-for="k in result.keTi" :key="k.name" class="keti-item">
              <text
                class="keti-name"
                :class="k.luck === 'auspicious' ? 'keti-good' : k.luck === 'inauspicious' ? 'keti-bad' : ''"
              >{{ k.name }}</text>
              <text class="keti-desc">{{ k.desc }}</text>
            </view>
          </view>
        </view>

        <!-- ── 知识库（本课命中联动） ── -->
        <view class="card pad-card">
          <view class="kb-tabs">
            <view
              v-for="t in JKJ_KNOWLEDGE"
              :key="t.id"
              class="kb-tab"
              :class="{ 'kb-tab-on': tab === t.id }"
              @tap="tab = t.id"
            >
              <text class="kb-tab-text" :class="{ 'kb-tab-text-on': tab === t.id }">{{ t.name }}</text>
              <view v-if="tabHasHit(t.id)" class="kb-tab-dot" />
            </view>
          </view>

          <text class="kb-title">{{ activeTab.name }}</text>
          <view class="kb-entries">
            <view
              v-for="e in activeTab.entries"
              :key="e.title"
              class="kb-entry"
              :class="{ 'kb-entry-hit': isHit(e) }"
            >
              <view class="kb-entry-hdr">
                <text class="kb-entry-title">{{ e.title }}</text>
                <view v-if="isHit(e)" class="kb-hit-badge"><text class="kb-hit-badge-text">本课命中</text></view>
              </view>
              <view v-if="e.verse" class="kb-verse">
                <text v-for="line in e.verse" :key="line" class="kb-verse-line">{{ line }}</text>
              </view>
              <text class="kb-entry-text">{{ e.text }}</text>
            </view>
          </view>
        </view>

        <!-- 交叉跳转 -->
        <view class="cross-links">
          <view class="cross-btn" @tap="navigateTo('/pkg-paipan/qimen/index')">
            <text class="cross-btn-text">奇门遁甲分析</text>
          </view>
          <view class="cross-btn" @tap="navigateTo('/pkg-paipan/daliuren/index')">
            <text class="cross-btn-text">大六壬排盘分析</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="金口诀为传统术数文化内容，断语仅供文化研究与参考，不构成医疗、投资、法律等任何决策建议。"
        />
      </view>
    </scroll-view>

    <!-- 底部工具栏 -->
    <view v-if="result && !invalid" class="toolbar">
      <view class="toolbar-inner">
        <view class="tool-btn" @tap="handleShare">
          <app-icon name="share-2" :size="38" color="var(--text-soft)" />
          <text class="tool-btn-text">分享</text>
        </view>
        <view class="tool-btn" @tap="navigateTo('/pkg-paipan/jinkoujue/index')">
          <app-icon name="refresh-cw" :size="38" color="var(--text-soft)" />
          <text class="tool-btn-text">重新起课</text>
        </view>
        <view class="tool-btn" @tap="handleSave">
          <app-icon name="save" :size="38" :color="saved ? 'var(--brand)' : 'var(--text-soft)'" />
          <text class="tool-btn-text" :class="{ 'tool-btn-text-on': saved }">{{ saved ? '已保存' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 200rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 错误态 */
.err { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; padding: 120rpx 48rpx; }
.err-text { font-size: 28rpx; color: var(--text-soft); }
.err-btn { padding: 20rpx 64rpx; background: var(--brand); border-radius: 999rpx; }
.err-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 通用卡片 */
.card {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 32rpx;
  overflow: hidden;
}
.pad-card { padding: 32rpx; }
.card-title {
  display: block;
  font-size: 32rpx; font-weight: 700; color: var(--gold);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}

/* ── 课体信息表 ── */
.tr { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.tr-last { border-bottom: none; }
.th {
  width: 128rpx; flex-shrink: 0;
  padding: 20rpx 16rpx;
  border-right: 1rpx solid var(--line);
  background: rgba(0, 0, 0, 0.025);
  font-size: 24rpx; font-weight: 700; color: var(--gold);
  display: flex; align-items: center;
}
.td { flex: 1; padding: 20rpx 24rpx; min-width: 0; display: flex; align-items: center; }
.td-text { font-size: 28rpx; color: var(--text-ink); line-height: 1.6; }
.td-sm { font-size: 24rpx; }
.td-sub { font-size: 24rpx; color: var(--text-soft); }
.td-strong { font-weight: 700; }
.td-bad { font-weight: 700; color: #dc2626; }

/* 四柱四列 */
.td-pillars { flex: 1; display: flex; }
.pillar-cell {
  flex: 1;
  padding: 16rpx 8rpx;
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
}
.pillar-cell-line { border-right: 1rpx solid var(--line); }
.pillar-label { font-size: 20rpx; color: var(--gold); }
.pillar-gz {
  font-size: 32rpx; font-weight: 700; color: var(--text-ink);
  text-align: center; line-height: 1.3; white-space: pre-line;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}

/* ── 四位课盘 ── */
.pan-card {
  background: rgba(45, 138, 78, 0.05);
  border: 1rpx solid rgba(45, 138, 78, 0.28);
  border-radius: 32rpx;
  padding: 16rpx 32rpx 24rpx;
}
.pan-row {
  display: flex; align-items: center; gap: 16rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid rgba(45, 138, 78, 0.15);
}
.pan-row-last { border-bottom: none; }
.pan-role { width: 96rpx; flex-shrink: 0; font-size: 28rpx; font-weight: 700; color: var(--brand); }
.pan-char {
  font-size: 40rpx; font-weight: 700; color: var(--text-ink);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.pan-star { font-size: 24rpx; color: var(--text-soft); }
.pan-wx { font-size: 28rpx; font-weight: 700; }
.pan-ws { font-size: 24rpx; color: var(--text-soft); }
.pan-badges { margin-left: auto; display: flex; align-items: center; gap: 12rpx; }
.badge { border-radius: 8rpx; padding: 4rpx 12rpx; }
.badge-yong { background: #dc2626; }
.badge-yong-text { font-size: 20rpx; font-weight: 700; color: #fff; }
.badge-kong { background: rgba(0, 0, 0, 0.06); }
.badge-kong-text { font-size: 20rpx; font-weight: 700; color: var(--text-soft); }

/* 动爻 chips */
.dong-chips { margin-top: 20rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.dong-chip {
  display: flex; align-items: baseline; gap: 6rpx;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
}
.dong-chip-name { font-size: 24rpx; font-weight: 700; color: #dc2626; }
.dong-chip-pos { font-size: 22rpx; color: var(--text-soft); }

/* ── 白话总断 ── */
.summary-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.summary-line { font-size: 28rpx; color: var(--text-ink); line-height: 1.7; }

/* ── 神煞 ── */
.shensha-row { padding: 16rpx 0; border-bottom: 1rpx solid var(--line); }
.shensha-row-last { border-bottom: none; }
.shensha-text { font-size: 28rpx; color: var(--text-ink); line-height: 1.6; }
.shensha-role { font-weight: 700; }

/* ── 课体判定 ── */
.keti-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 16rpx; }
.keti-item {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex; flex-direction: column; gap: 6rpx;
}
.keti-name { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.keti-good { color: #16a34a; }
.keti-bad { color: #dc2626; }
.keti-desc { font-size: 24rpx; color: var(--text-soft); line-height: 1.6; }

/* ── 知识库 ── */
.kb-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.kb-tab {
  position: relative;
  border: 1rpx solid rgba(196, 30, 58, 0.4);
  background: var(--card);
  border-radius: 16rpx;
  padding: 16rpx 4rpx;
  display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.85; }
}
.kb-tab-on { border-color: var(--brand); background: var(--brand); }
.kb-tab-text { font-size: 24rpx; font-weight: 700; color: var(--brand); }
.kb-tab-text-on { color: #fff; }
.kb-tab-dot {
  position: absolute; top: -8rpx; right: -8rpx;
  width: 20rpx; height: 20rpx; border-radius: 50%;
  background: #dc2626;
}
.kb-title {
  display: block; margin-top: 32rpx;
  font-size: 32rpx; font-weight: 700; color: var(--gold);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.kb-entries { margin-top: 16rpx; display: flex; flex-direction: column; gap: 28rpx; }
.kb-entry {
  background: rgba(0, 0, 0, 0.025);
  border-radius: 16rpx;
  padding: 24rpx;
}
.kb-entry-hit {
  background: rgba(220, 38, 38, 0.05);
  border: 1rpx solid rgba(220, 38, 38, 0.4);
}
.kb-entry-hdr { display: flex; align-items: center; gap: 16rpx; }
.kb-entry-title { font-size: 28rpx; font-weight: 700; color: #dc2626; }
.kb-hit-badge { background: #dc2626; border-radius: 8rpx; padding: 4rpx 12rpx; }
.kb-hit-badge-text { font-size: 20rpx; font-weight: 700; color: #fff; }
.kb-verse { margin-top: 12rpx; display: flex; flex-direction: column; gap: 4rpx; }
.kb-verse-line {
  font-size: 28rpx; color: var(--text-ink); line-height: 1.7;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.kb-entry-text { display: block; margin-top: 12rpx; font-size: 24rpx; color: var(--text-soft); line-height: 1.7; }

/* 交叉跳转 */
.cross-links { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.cross-btn {
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  padding: 24rpx 0;
  &:active { transform: scale(0.99); }
}
.cross-btn-text { display: block; text-align: center; font-size: 28rpx; font-weight: 700; color: #fff; }

/* 底部工具栏 */
.toolbar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  background: var(--card);
  border-top: 1rpx solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
}
.toolbar-inner { display: grid; grid-template-columns: repeat(3, 1fr); padding: 12rpx 0; }
.tool-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  padding: 8rpx 0;
  &:active { opacity: 0.7; }
}
.tool-btn-text { font-size: 22rpx; color: var(--text-soft); }
.tool-btn-text-on { color: var(--brand); }
</style>
