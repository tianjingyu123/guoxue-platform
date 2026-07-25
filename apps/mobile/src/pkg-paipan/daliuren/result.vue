<script setup lang="ts">
/**
 * 大六壬·结果页（自 V0 app/daliuren/result/page.tsx 还原）
 * onLoad 解析 payload 后本地调排盘引擎重算（@/pkg-paipan/lib/daliuren-engine），无后端依赖。
 * 结构：课式信息表 → 三传 → 四课 → 天地盘（4×4 外圈 + 中宫课式）→ 上一时/下一时 → 课体格局 → 合规声明。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import ParamError from '@/components/paipan/param-error.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { computeLiuren, SHENJIANG_NAME, type LiurenResult } from '@/pkg-paipan/lib/daliuren-engine'
import { saveDaliurenHistory, type DaliurenParams } from './daliuren-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '大六壬排盘'
// #ifdef MP-WEIXIN
hdrTitle = '六壬文化研究'
// #endif

// ─── 五行配色（干支按五行着色，映射 scoped class）───
const GAN_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}
const ZHI_WX: Record<string, string> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土', 申: '金', 酉: '金', 亥: '水', 子: '水',
}
const WX_CLS: Record<string, string> = { 木: 'wx-mu', 火: 'wx-huo', 土: 'wx-tu', 金: 'wx-jin', 水: 'wx-shui' }
function wxCls(ch: string): string {
  return WX_CLS[GAN_WX[ch] || ZHI_WX[ch] || ''] || ''
}

/** 天将吉凶着色：凶将朱红，贵人高亮 */
const XIONG_JIANG = ['蛇', '勾', '空', '虎', '玄']
function jiangCls(j: string): string {
  if (j === '贵') return 'jiang-gui'
  return XIONG_JIANG.includes(j) ? 'jiang-xiong' : ''
}

// ─── 天地盘十二宫布局（4×4 外圈，地盘固定，中央课式）───
// 传统方位：上南（巳午未申）右西（酉戌）下北（寅丑子亥）左东（辰卯）
const PAN_ROWS: string[][] = [
  ['巳', '午', '未', '申'],
  ['辰', '', '', '酉'],
  ['卯', '', '', '戌'],
  ['寅', '丑', '子', '亥'],
]

const CHUAN_NAMES = ['初传', '中传', '末传']
const KE_NAMES = ['一课', '二课', '三课', '四课']

// ─── 状态 ───
const params = ref<DaliurenParams | null>(null)
const hourOffset = ref(0) // 上一时/下一时偏移（步长一个时辰=2小时）
const r = ref<LiurenResult | null>(null)
const loadError = ref('')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function recompute() {
  const p = params.value
  if (!p) return
  try {
    const d = new Date(p.year, p.month - 1, p.day, p.hour, p.minute)
    d.setHours(d.getHours() + hourOffset.value * 2)
    r.value = computeLiuren(d, {
      jiangMethod: p.jiangMethod,
      guirenMethod: p.guirenMethod,
      guishenType: p.guishenType,
      shehaiType: p.shehaiType,
      birthYear: p.birthYear || undefined,
      gender: p.gender,
    })
  } catch {
    r.value = null
    loadError.value = '排盘计算失败，请重新起课'
  }
}

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少起课参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Partial<DaliurenParams>
    const year = Number(p.year)
    const month = Number(p.month)
    const day = Number(p.day)
    const hour = Number(p.hour)
    const minute = Number(p.minute)
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) throw new Error('起课参数不完整')
    params.value = {
      matter: String(p.matter || ''),
      year, month, day, hour, minute,
      birthYear: Number(p.birthYear) || 0,
      gender: p.gender === '女' ? '女' : '男',
      jiangMethod: p.jiangMethod === 'jiaojie' ? 'jiaojie' : 'zhongqi',
      guirenMethod: p.guirenMethod === 'alt' ? 'alt' : 'standard',
      guishenType: p.guishenType === 'day' || p.guishenType === 'night' ? p.guishenType : 'auto',
      shehaiType: p.shehaiType === 'shenqian' ? 'shenqian' : 'mengzhongji',
    }
    recompute()
    // 记入本地排盘记录（index 起课与深链进入均覆盖）
    if (r.value) {
      const res = r.value
      saveDaliurenHistory(
        params.value,
        `${res.sizhu.day.gan}${res.sizhu.day.zhi}日 ${res.yuejiang.zhi}将${res.sizhu.hour.zhi}时`,
      )
    }
  } catch (e) {
    loadError.value = (e as Error)?.message || '起课参数无效'
  }
})

function prevHour() {
  hourOffset.value -= 1
  recompute()
}
function nextHour() {
  hourOffset.value += 1
  recompute()
}

// ─── 派生展示 ───
const pillars = computed(() => {
  if (!r.value) return []
  const sz = r.value.sizhu
  return [
    { label: '年', g: sz.year.gan, z: sz.year.zhi },
    { label: '月', g: sz.month.gan, z: sz.month.zhi },
    { label: '日', g: sz.day.gan, z: sz.day.zhi },
    { label: '时', g: sz.hour.gan, z: sz.hour.zhi },
  ]
})

/** 四课传统自右向左：四课 三课 二课 一课 */
const sikeCols = computed(() => {
  if (!r.value) return []
  return [3, 2, 1, 0].map((i) => ({ ...r.value!.sike[i], name: KE_NAMES[i] }))
})

const timeText = computed(() => {
  if (!r.value) return ''
  const d = r.value.date
  return `${d.year}年${pad(d.month)}月${pad(d.day)}日 ${pad(d.hour)}时${pad(d.minute)}分（${r.value.lunarText}）`
})

function goInput() {
  navigateTo('/pkg-paipan/daliuren/index')
}

/** 编辑事项：回到入口页（保留表单继续修改） */
function goEdit() {
  const pages = getCurrentPages()
  if (pages.length > 1) navigateBack()
  else goInput()
}

/** 分享：复制盘面文字摘要 */
function onShare() {
  const res = r.value
  if (!res) return
  const summary = [
    `【大六壬排盘】${res.sizhu.day.gan}${res.sizhu.day.zhi}日 ${res.yuejiang.zhi}将${res.sizhu.hour.zhi}时`,
    timeText.value,
    `三传：${res.sanchuan.map((c) => c.zhi).join(' → ')}`,
    `课体：${res.keti.join(' · ')}`,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: summary,
    success: () => uni.showToast({ title: '盘面摘要已复制', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" @share="onShare" />

    <!-- 参数错误态 -->
    <param-error v-if="loadError" :text="loadError" action-text="重新起课" @action="goInput" />

    <!-- 主体 -->
    <scroll-view v-else-if="r" scroll-y class="body">
      <view class="body-inner">
        <!-- ── 课式信息表 ── -->
        <view class="card tbl">
          <view class="tr">
            <view class="td-label"><text class="td-label-text">事项</text></view>
            <view class="td-val td-val-row">
              <text v-if="params && params.matter" class="td-text">{{ params.matter }}</text>
              <text v-else class="td-text td-muted">未填写</text>
              <view class="edit-btn" @tap="goEdit">
                <app-icon name="pencil" :size="24" color="var(--text-soft)" />
              </view>
            </view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">时间</text></view>
            <view class="td-val"><text class="td-text">{{ timeText }}</text></view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">节气</text></view>
            <view class="td-val"><text class="td-text">{{ r.jieqiText }}</text></view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">四柱</text></view>
            <view class="td-val td-val-row td-pillars">
              <view v-for="p in pillars" :key="p.label" class="pillar">
                <text class="pillar-gz" :class="wxCls(p.g)">{{ p.g }}</text>
                <text class="pillar-gz" :class="wxCls(p.z)">{{ p.z }}</text>
                <text class="pillar-label">{{ p.label }}</text>
              </view>
            </view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">月将</text></view>
            <view class="td-val td-center">
              <text class="td-text" :class="wxCls(r.yuejiang.zhi)">{{ r.yuejiang.zhi }}</text>
              <text class="td-sub">{{ SHENJIANG_NAME[r.yuejiang.zhi] || '' }}</text>
            </view>
            <view class="td-label"><text class="td-label-text">空亡</text></view>
            <view class="td-val td-center">
              <text class="td-text" :class="wxCls(r.kongwang[0])">{{ r.kongwang[0] }}</text>
              <text class="td-text" :class="wxCls(r.kongwang[1])">{{ r.kongwang[1] }}</text>
            </view>
          </view>
          <view v-if="r.ming" class="tr">
            <view class="td-label"><text class="td-label-text">年命</text></view>
            <view class="td-val td-center">
              <text class="td-text">{{ r.ming.nianming }}</text>
              <text class="td-sub">{{ params ? params.gender : '男' }}命 {{ r.ming.xuSui }}岁</text>
            </view>
            <view class="td-label"><text class="td-label-text">行年</text></view>
            <view class="td-val td-center">
              <text class="td-text">{{ r.ming.xingnian }}</text>
            </view>
          </view>
          <view class="tr tr-last">
            <view class="td-label"><text class="td-label-text">贵人</text></view>
            <view class="td-val td-center">
              <text class="td-text" :class="wxCls(r.guiren.zhi)">{{ r.guiren.zhi }}</text>
              <text class="td-sub">{{ r.guiren.isDay ? '昼贵' : '夜贵' }} · {{ r.guiren.shun ? '顺布' : '逆布' }}</text>
            </view>
          </view>
        </view>

        <!-- ── 三传 ── -->
        <view class="card sec">
          <text class="sec-title">三传</text>
          <view class="chuan-list">
            <view v-for="(c, i) in r.sanchuan" :key="i" class="chuan-row">
              <text class="chuan-name">{{ CHUAN_NAMES[i] }}</text>
              <text class="chuan-qin">{{ c.qin }}</text>
              <text class="chuan-dun" :class="c.dun ? wxCls(c.dun) : 'td-muted'">{{ c.dun || '○' }}</text>
              <text class="chuan-zhi" :class="c.kong ? 'td-muted' : wxCls(c.zhi)">{{ c.zhi }}</text>
              <text v-if="c.kong" class="kong-mark">空</text>
              <text class="chuan-jiang" :class="jiangCls(c.jiang)">{{ c.jiang }}</text>
            </view>
          </view>
        </view>

        <!-- ── 四课（传统自右向左：四三二一）── -->
        <view class="card sec">
          <text class="sec-title">四课</text>
          <view class="ke-grid">
            <view v-for="k in sikeCols" :key="k.name" class="ke-col">
              <text class="ke-jiang" :class="jiangCls(k.jiang)">{{ k.jiang }}</text>
              <view class="ke-shang-row">
                <text v-if="k.dun" class="ke-dun" :class="wxCls(k.dun)">{{ k.dun }}</text>
                <text class="ke-shang" :class="k.kong ? 'td-muted' : wxCls(k.shang)">{{ k.shang }}</text>
                <text v-if="k.kong" class="kong-mark">空</text>
              </view>
              <text class="ke-xia" :class="wxCls(k.xia)">{{ k.xia }}</text>
              <text class="ke-name">{{ k.name }}</text>
            </view>
          </view>
        </view>

        <!-- ── 天地盘 ── -->
        <view class="card sec">
          <text class="sec-title">天地盘</text>
          <view class="pan">
            <view v-for="(row, ri) in PAN_ROWS" :key="ri" class="pan-row">
              <template v-for="(z, ci) in row" :key="`${ri}-${ci}`">
                <view v-if="z" class="pan-cell">
                  <text
                    class="pan-jiang"
                    :class="r.jiangPan[z] === '贵' ? 'jiang-gui' : jiangCls(r.jiangPan[z])"
                  >{{ r.jiangPan[z] }}</text>
                  <view class="pan-mid">
                    <text v-if="r.dunPan[z]" class="pan-dun" :class="wxCls(r.dunPan[z])">{{ r.dunPan[z] }}</text>
                    <text
                      class="pan-tian"
                      :class="r.kongwang.includes(r.tianPan[z]) ? 'td-muted' : wxCls(r.tianPan[z])"
                    >{{ r.tianPan[z] }}</text>
                    <text v-if="r.kongwang.includes(r.tianPan[z])" class="kong-mark">空</text>
                  </view>
                  <text class="pan-di">{{ z }}</text>
                </view>
                <view v-else class="pan-cell pan-cell-empty" />
              </template>
            </view>
            <!-- 中宫课式（覆盖中央 2×2）-->
            <view class="pan-center">
              <text class="pan-center-day">{{ r.sizhu.day.gan }}{{ r.sizhu.day.zhi }}日</text>
              <text class="pan-center-sub">{{ r.yuejiang.zhi }}将{{ r.sizhu.hour.zhi }}时</text>
            </view>
          </view>
          <text class="pan-note">每宫自上而下：天将 · 遁干天盘支 · 地盘支；灰色为旬空</text>
        </view>

        <!-- ── 上一时 / 下一时 ── -->
        <view class="hour-nav">
          <view class="hour-btn" @tap="prevHour">
            <app-icon name="chevron-left" :size="30" color="var(--text-ink)" compact />
            <text class="hour-btn-text">上一时</text>
          </view>
          <view class="hour-btn" @tap="nextHour">
            <text class="hour-btn-text">下一时</text>
            <app-icon name="chevron-right" :size="30" color="var(--text-ink)" />
          </view>
        </view>

        <!-- ── 课体格局 ── -->
        <view class="card sec">
          <text class="sec-title">课体</text>
          <view class="keti-list">
            <view v-for="k in r.keti" :key="k" class="keti-chip">
              <text class="keti-chip-text">{{ k }}</text>
            </view>
          </view>
          <text class="keti-note">{{ r.quKeNote }}</text>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，占测结果不构成任何预测或建议。"
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

/* 缺参空态样式已抽至 @/components/paipan/param-error.vue */

/* 卡片基座 */
.card {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.sec { padding: 24rpx; }
.sec-title { display: block; font-family: $serif; font-size: 24rpx; color: var(--brand); margin-bottom: 16rpx; }

/* 五行配色 */
.wx-mu { color: #2e7d32; }
.wx-huo { color: #c41e3a; }
.wx-tu { color: #8b6914; }
.wx-jin { color: #b8860b; }
.wx-shui { color: #1565c0; }
/* 天将吉凶 */
.jiang-xiong { color: var(--brand); }
.jiang-gui { color: var(--brand); font-weight: 600; }
.td-muted { color: var(--text-soft); }
.kong-mark { font-size: 18rpx; color: var(--text-soft); }

/* ── 课式信息表 ── */
.tr { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.tr-last { border-bottom: none; }
.td-label {
  width: 112rpx; flex-shrink: 0;
  padding: 12rpx 16rpx;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1rpx solid var(--line);
  display: flex; align-items: center;
}
.td-label-text { font-size: 26rpx; color: var(--brand); }
.td-val {
  flex: 1; min-width: 0;
  padding: 12rpx 16rpx;
  display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap;
  border-right: 1rpx solid var(--line);
  &:last-child { border-right: none; }
}
.td-val-row { flex-wrap: nowrap; }
.td-center { justify-content: center; }
.td-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.5; }
.td-sub { font-size: 22rpx; color: var(--text-soft); }
.edit-btn { padding: 4rpx 8rpx; display: flex; align-items: center; flex-shrink: 0; }
.td-pillars { gap: 24rpx; }
.pillar { display: flex; align-items: baseline; }
.pillar-gz { font-family: $serif; font-size: 26rpx; font-weight: 600; }
.pillar-label { font-size: 22rpx; color: var(--text-soft); margin-left: 4rpx; }

/* ── 三传 ── */
.chuan-list { display: flex; flex-direction: column; gap: 12rpx; }
.chuan-row { display: flex; align-items: center; gap: 24rpx; }
.chuan-name { width: 64rpx; font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
.chuan-qin { width: 64rpx; font-size: 24rpx; color: var(--text-soft); flex-shrink: 0; }
.chuan-dun { width: 40rpx; font-size: 26rpx; flex-shrink: 0; }
.chuan-zhi { font-family: $serif; font-size: 40rpx; font-weight: 700; line-height: 1.2; }
.chuan-jiang { font-size: 26rpx; color: var(--text-ink); }

/* ── 四课 ── */
.ke-grid { display: flex; }
.ke-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 8rpx 0; }
.ke-jiang { font-size: 22rpx; color: var(--text-ink); }
.ke-shang-row { display: flex; align-items: center; gap: 4rpx; }
.ke-dun { font-size: 20rpx; }
.ke-shang { font-family: $serif; font-size: 36rpx; font-weight: 700; line-height: 1.2; }
.ke-xia { font-family: $serif; font-size: 32rpx; line-height: 1.2; }
.ke-name { font-size: 20rpx; color: var(--text-soft); }

/* ── 天地盘 ── */
.pan { position: relative; }
.pan-row { display: flex; }
.pan-cell {
  width: 25%; min-height: 144rpx; box-sizing: border-box;
  border: 1rpx solid var(--line);
  margin: -1rpx 0 0 -1rpx;
  background: var(--card);
  padding: 12rpx 6rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx;
}
.pan-cell-empty { background: rgba(0, 0, 0, 0.02); }
.pan-jiang { font-size: 22rpx; line-height: 1; color: var(--text-ink); }
.pan-mid { display: flex; align-items: center; gap: 4rpx; line-height: 1; }
.pan-dun { font-size: 20rpx; }
.pan-tian { font-family: $serif; font-size: 36rpx; font-weight: 700; line-height: 1.2; }
.pan-di { font-size: 22rpx; color: var(--text-soft); line-height: 1; }
.pan-center {
  position: absolute; left: 25%; top: 25%; width: 50%; height: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx;
  box-sizing: border-box;
  background: var(--bg-paper);
  border: 1rpx solid var(--line);
}
.pan-center-day { font-family: $serif; font-size: 28rpx; color: var(--brand); }
.pan-center-sub { font-size: 22rpx; color: var(--text-soft); }
.pan-note { display: block; margin-top: 16rpx; font-size: 22rpx; color: var(--text-soft); line-height: 1.6; }

/* ── 上一时 / 下一时 ── */
.hour-nav { display: flex; gap: 16rpx; }
.hour-btn {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
  padding: 20rpx 0;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  &:active { background: rgba(0, 0, 0, 0.04); }
}
.hour-btn-text { font-size: 28rpx; color: var(--text-ink); }

/* ── 课体格局 ── */
.keti-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.keti-chip {
  padding: 4rpx 16rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
  background: rgba(196, 30, 58, 0.05);
  border-radius: 8rpx;
}
.keti-chip-text { font-family: $serif; font-size: 26rpx; color: var(--brand); }
.keti-note { display: block; margin-top: 20rpx; font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }
</style>
