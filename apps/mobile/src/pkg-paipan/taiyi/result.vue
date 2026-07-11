<script setup lang="ts">
/**
 * 太乙神数·结果页（自 V0 app/taiyi/result/page.tsx 还原）
 * onLoad 解析 payload 后本地调太乙引擎重算（@/pkg-paipan/lib/taiyi-engine），无后端依赖。
 * 结构：课体信息表 → 十六神盘 → 白话总断 → 知识 Tab（格局/数占/太乙秘书/十六神）→ 导流 → 合规声明。
 * 取舍：V0 的 AI 深断区块按批次规范砍掉；导流仅保留奇门遁甲（金口诀页面本批未还原，避免死链）。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import TaiyiBoard from './components/taiyi-board.vue'
import { paiTaiyi, type TaiyiResult } from '@/pkg-paipan/lib/taiyi-engine'
import { navigateTo } from '@/utils/router'
import { saveTaiyiHistory, type TaiyiParams, type TaiyiPanShi, type TaiyiSuanFa } from './taiyi-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
const isMp = ref(false)
// #ifdef MP-WEIXIN
isMp.value = true
// #endif

/* ============ 十六神详解（子起顺时针，V0 原文） ============ */
const GOD16_DETAIL: { zhi: string; god: string; text: string }[] = [
  { zhi: '子神', god: '地主', text: '建子之月阳气初发，万物阴生，故曰地主。主动摇言语事。' },
  { zhi: '丑神', god: '阳德', text: '建丑之月二阳用事，布育万物，故曰阳德。主施恩育物事。' },
  { zhi: '艮神', god: '和德', text: '春冬将交阴阳气合，群物方生，故曰和德。主和集成就事。' },
  { zhi: '寅神', god: '吕申', text: '建寅之月阳育大申，草木甲拆，故曰吕申。主运用主宰事。' },
  { zhi: '卯神', god: '高丛', text: '建卯之月万物皆出，自地丛生，故曰高丛。主发挥事。' },
  { zhi: '辰神', god: '太阳', text: '建辰之月雷出震势，阳气大盛，故曰太阳。主危会兵曳事。' },
  { zhi: '巽神', god: '大炅', text: '春夏将交或暑方主，阳气炎皓，故曰大炅。主申命号令事。' },
  { zhi: '巳神', god: '大神', text: '建巳之月少阴用事，阴阳不测，故曰大神。主毁拆破废事。' },
  { zhi: '午神', god: '大威', text: '建午之月阳附阴生，刑暴始行，故曰大威。主光明威烈事。' },
  { zhi: '未神', god: '天道', text: '建未之月火能生土，土王于未，故曰天道。主阴私事。' },
  { zhi: '坤神', god: '大武', text: '夏秋将交阴气施令，杀伤万物，故曰大武。主刑罚事。' },
  { zhi: '申神', god: '武德', text: '建申之月万物欲死，荠麦将生，故曰武德。主传送迁移事。' },
  { zhi: '酉神', god: '太簇', text: '建酉之月万物皆成，有大品簇，故曰太簇。主更易肃杀事。' },
  { zhi: '戌神', god: '阴主', text: '建戌之月阳气不长，阴气用事，故曰阴主。主危期兵丧事。' },
  { zhi: '乾神', god: '阴德', text: '秋冬将交阴前生阳，大有其情，故曰阴德。主命令事。' },
  { zhi: '亥神', god: '大义', text: '建亥之月万物怀垢，群阳欲尽，故曰大义。主计谋废弃事。' },
]

const TABS = [
  { key: 'geju', label: '格局' },
  { key: 'shuzhan', label: '数占' },
  { key: 'mishu', label: '太乙秘书' },
  { key: 'shen16', label: '十六神' },
] as const
type TabKey = (typeof TABS)[number]['key']

const result = ref<TaiyiResult | null>(null)
const topic = ref('')
const loadError = ref('')
const tab = ref<TabKey>('geju')

const PAN_SHI_SET: TaiyiPanShi[] = ['year', 'month', 'day', 'hour']
const SUAN_FA_SET: TaiyiSuanFa[] = ['tongzong', 'zhijin', 'jinjing']

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Partial<TaiyiParams>
    const year = Number(p.year)
    const month = Number(p.month)
    const day = Number(p.day)
    const hour = Number(p.hour)
    const minute = Number(p.minute)
    const panShi = PAN_SHI_SET.includes(p.panShi as TaiyiPanShi) ? (p.panShi as TaiyiPanShi) : 'hour'
    const suanFa = SUAN_FA_SET.includes(p.suanFa as TaiyiSuanFa) ? (p.suanFa as TaiyiSuanFa) : 'zhijin'
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new Error('排盘参数不完整')
    }
    // 逐字段构造 Date，规避各端字符串解析差异
    const date = new Date(year, month - 1, day, hour, minute)
    if (Number.isNaN(date.getTime())) throw new Error('排盘时间无效')

    const r = paiTaiyi({ date, panShi, suanFa })
    result.value = r
    topic.value = String(p.topic || '').slice(0, 30)
    // 记入本地排盘记录（index 起课与深链进入均覆盖）
    saveTaiyiHistory(
      { topic: topic.value, year, month, day, hour, minute, panShi, suanFa },
      `${r.dunType}${r.juNumber}局`,
    )
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘参数无效，请重新起课'
  }
})

function goInput() {
  navigateTo('/pkg-paipan/taiyi/index')
}

function goQimen() {
  navigateTo('/pkg-paipan/qimen/index')
}

/** 积数名目：时/日/月/年太乙分别以积时/积日/积月/积年定局 */
function jiShuLabel(r: TaiyiResult): string {
  const map: Record<string, string> = { 时太乙: '时', 日太乙: '日', 月太乙: '月', 年太乙: '年' }
  return `积${map[r.panShiLabel] ?? '年'}数`
}

/** 千分位分隔（不用 toLocaleString，规避端差异） */
function formatNum(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function gejuColor(type: 'ji' | 'xiong' | 'ping'): string {
  // 与全站四化配色一致：吉=禄绿，凶=朱砂，平=墨色
  return type === 'ji' ? 'gj-ji' : type === 'xiong' ? 'gj-xiong' : 'gj-ping'
}

/** 分享：复制课式文字摘要 */
function onShare() {
  const r = result.value
  if (!r) return
  const summary = [
    `【太乙神数】${r.panShiLabel}·${r.suanFaLabel}${topic.value ? ` · ${topic.value}` : ''}`,
    `${r.dateLabel}（${r.lunarLabel}）`,
    `${r.dunType}第${r.juNumber}局 · 太乙在${r.taiyiPalace}宫 · 值使${r.zhiShi}`,
    `主算${r.zhuSuan} · 客算${r.keSuan} · 定算${r.dingSuan}`,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: summary,
    success: () => uni.showToast({ title: '课式摘要已复制', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <tool-header
      :title="isMp ? '太乙文化研究' : result ? `太乙盘 · ${result.panShiLabel}` : '太乙盘'"
      :subtitle="result ? `【${result.panShiLabel}】【${result.suanFaLabel}】${topic ? ` · ${topic}` : ''}` : ''"
      back-href="/pkg-paipan/taiyi/index"
      @share="onShare"
    />

    <!-- 参数错误态 -->
    <view v-if="loadError" class="status">
      <app-icon name="info" :size="64" color="#d1d5db" />
      <text class="status-text">{{ loadError }}</text>
      <view class="status-btn" @tap="goInput"><text class="status-btn-text">返回起课</text></view>
    </view>

    <!-- 主体 -->
    <scroll-view v-else-if="result" scroll-y class="body">
      <view class="body-inner">
        <!-- 课体信息表 -->
        <paper-card padding="none">
          <view class="tr tr-bd">
            <view class="th"><text class="th-text">日期</text></view>
            <view class="td"><text class="td-text">{{ result.dateLabel }}（{{ result.lunarLabel }}）</text></view>
          </view>
          <view class="tr tr-bd">
            <view class="th"><text class="th-text">节气</text></view>
            <view class="td"><text class="td-text td-xs">{{ result.jieQiLabel }}</text></view>
          </view>
          <view class="tr tr-bd">
            <view class="th"><text class="th-text">四柱</text></view>
            <view class="td pillars">
              <text class="pillar">{{ result.pillars.year }}</text>
              <text class="pillar">{{ result.pillars.month }}</text>
              <text class="pillar">{{ result.pillars.day }}</text>
              <text class="pillar">{{ result.pillars.time }}</text>
            </view>
          </view>
          <view class="tr tr-bd">
            <view class="th"><text class="th-text">空亡</text></view>
            <view class="td">
              <text class="td-text td-xs td-soft">{{ result.kongWang.year }} · {{ result.kongWang.month }} · {{ result.kongWang.day }} · {{ result.kongWang.time }}</text>
            </view>
          </view>
          <view class="tr">
            <view class="th"><text class="th-text">值使</text></view>
            <view class="td zhishi">
              <text class="zs-door">{{ result.zhiShi }}</text>
              <text class="zs-item">{{ result.dunType }}{{ result.juNumber }}局</text>
              <text class="zs-item">主算 {{ result.zhuSuan }}</text>
              <text class="zs-item">客算 {{ result.keSuan }}</text>
              <text class="zs-item">定算 {{ result.dingSuan }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 太乙十六神盘 -->
        <paper-card padding="sm">
          <taiyi-board :r="result" />
          <text class="jishu">{{ jiShuLabel(result) }}：{{ formatNum(result.jiShi) }}</text>
        </paper-card>

        <!-- 白话总断 -->
        <view class="baihua">
          <text class="baihua-title">白话总断</text>
          <text class="baihua-text">{{ result.baiHua }}</text>
        </view>

        <!-- 知识 Tab -->
        <paper-card padding="sm">
          <view class="tabs">
            <view
              v-for="t in TABS"
              :key="t.key"
              class="tab"
              :class="{ 'tab-on': tab === t.key }"
              @tap="tab = t.key"
            >
              <text class="tab-text" :class="{ 'tab-text-on': tab === t.key }">{{ t.label }}</text>
            </view>
          </view>

          <!-- 格局 -->
          <view v-if="tab === 'geju'" class="tab-body">
            <view v-for="g in result.geJu" :key="g.title" class="gj-item">
              <text class="gj-title" :class="gejuColor(g.type)">{{ g.title }}：</text>
              <text class="gj-text">{{ g.text }}</text>
            </view>
          </view>

          <!-- 数占 -->
          <view v-else-if="tab === 'shuzhan'" class="tab-body">
            <view v-for="(s, i) in result.shuZhan" :key="s.title" class="sz-item">
              <text class="sz-title">{{ i + 1 }}.{{ s.title }}：</text>
              <text class="sz-text">{{ s.text }}</text>
            </view>
          </view>

          <!-- 太乙秘书 -->
          <view v-else-if="tab === 'mishu'" class="tab-body">
            <text class="mishu-text">{{ result.juYao }}</text>
          </view>

          <!-- 十六神 -->
          <view v-else class="tab-body">
            <view v-for="g in GOD16_DETAIL" :key="g.zhi" class="gd-item">
              <text class="gd-zhi">{{ g.zhi }}：</text>
              <text class="gd-text">曰{{ g.god }}，{{ g.text }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 导流：奇门遁甲 / 金口诀（金口诀页与本页同批交付，补回 V0 原有导流） -->
        <view class="crosslink" @tap="goQimen">
          <view class="cl-left">
            <app-icon name="compass" :size="36" color="var(--brand)" />
            <text class="cl-text">奇门遁甲分析</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#9ca3af" />
        </view>
        <view class="crosslink" @tap="navigateTo('/pkg-paipan/jinkoujue/index')">
          <view class="cl-left">
            <app-icon name="sparkles" :size="36" color="var(--brand)" />
            <text class="cl-text">金口诀排课</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#9ca3af" />
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="太乙神数所示为古代式占体系的格局推演，属传统文化研究范畴，内容仅供参考，切勿迷信。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 80rpx 40rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); }
.status-btn { padding: 20rpx 56rpx; background: var(--brand); border-radius: 20rpx; }
.status-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 课体信息表 */
.tr { display: flex; align-items: stretch; }
.tr-bd { border-bottom: 1rpx solid var(--line); }
.th {
  flex-shrink: 0;
  width: 128rpx;
  display: flex;
  align-items: center;
  padding: 18rpx 24rpx;
  background: rgba(0, 0, 0, 0.025);
}
.th-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.td { flex: 1; display: flex; align-items: center; padding: 18rpx 24rpx; min-width: 0; }
.td-text { font-size: 26rpx; line-height: 1.5; color: var(--text-ink); }
.td-xs { font-size: 22rpx; }
.td-soft { color: var(--text-soft); }
.pillars { gap: 32rpx; }
.pillar { font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.zhishi { flex-wrap: wrap; gap: 8rpx 28rpx; }
.zs-door { font-size: 24rpx; font-weight: 700; color: var(--brand); }
.zs-item { font-size: 24rpx; color: var(--text-ink); }

/* 积数 */
.jishu { display: block; margin-top: 12rpx; text-align: center; font-size: 22rpx; color: var(--text-soft); }

/* 白话总断 */
.baihua {
  border: 2rpx solid rgba(196, 30, 58, 0.3);
  background: rgba(196, 30, 58, 0.04);
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.baihua-title { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.baihua-text { font-size: 26rpx; line-height: 1.75; color: var(--text-ink); }

/* 知识 Tab */
.tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.tab {
  padding: 16rpx 4rpx;
  border-radius: 14rpx;
  border: 2rpx solid var(--line);
  background: var(--bg-paper);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-on { border-color: var(--brand); background: var(--brand); }
.tab-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft); }
.tab-text-on { color: #fff; }
.tab-body { margin-top: 28rpx; display: flex; flex-direction: column; gap: 22rpx; }

/* 格局 */
.gj-item { font-size: 26rpx; line-height: 1.7; }
.gj-title { font-size: 26rpx; font-weight: 700; }
.gj-ji { color: #2e8b57; }
.gj-xiong { color: var(--brand); }
.gj-ping { color: var(--text-ink); }
.gj-text { font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }

/* 数占 */
.sz-item { font-size: 26rpx; line-height: 1.7; }
.sz-title { font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.sz-text { font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }

/* 太乙秘书 */
.mishu-text { font-family: $serif; font-size: 26rpx; line-height: 2; color: var(--text-ink); }

/* 十六神 */
.gd-item { font-size: 26rpx; line-height: 1.7; }
.gd-zhi { font-family: $serif; font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.gd-text { font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }

/* 导流 */
.crosslink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.crosslink:active { background: rgba(0, 0, 0, 0.02); }
.cl-left { display: flex; align-items: center; gap: 16rpx; }
.cl-text { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
</style>
