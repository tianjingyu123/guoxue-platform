<template>
  <view class="page">
    <!-- 自定义导航栏（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
        <view class="nav-titles">
          <text class="nav-title">{{ navTitle }}</text>
          <text class="nav-en">Rules &amp; Disclosure</text>
        </view>
        <view class="nav-back" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中…</text>
    </view>
    <!-- error -->
    <view v-else-if="errMsg" class="state">
      <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
      <text class="state-txt">{{ errMsg }}</text>
      <view class="retry" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <view class="body">
        <!-- Tab -->
        <view class="tabs">
          <view v-for="t in tabs" :key="t.id" class="tab" :class="{ on: activeTab === t.id }" @tap="activeTab = t.id">
            <text class="tab-txt" :class="{ on: activeTab === t.id }">{{ t.label }}</text>
          </view>
        </view>

        <!-- ===== ① 规则说明 ===== -->
        <block v-if="activeTab === 'rules'">
          <!-- 赛制（真连 rounds·晋级规则） -->
          <view class="rblk">
            <view class="rblk-h"><view class="gd" /><text class="rblk-t">赛制与晋级</text></view>
            <view v-if="funnelRounds.length" class="rlist">
              <view v-for="r in funnelRounds" :key="r.id" class="ritem">
                <text class="ritem-dot" />
                <text class="ritem-txt">
                  <text class="ritem-b">{{ roundTypeLabel[r.type] }}</text>
                  <text>{{ roundDesc(r) }}</text>
                </text>
              </view>
            </view>
            <!-- 无 rounds → 通用赛制说明（静态·平台通用规则） -->
            <view v-else class="rlist">
              <view v-for="(txt, i) in genericStages" :key="i" class="ritem">
                <text class="ritem-dot" />
                <text class="ritem-txt">
                  <text class="ritem-b">{{ txt.b }}</text>
                  <text>{{ txt.t }}</text>
                </text>
              </view>
            </view>
          </view>

          <!-- 判分标准（平台通用·含权重条） -->
          <view class="rblk">
            <view class="rblk-h"><view class="gd" /><text class="rblk-t">判分标准</text></view>
            <view class="rlist">
              <view class="ritem"><text class="ritem-dot" /><text class="ritem-txt"><text class="ritem-b">客观题</text><text>：系统自动判分，即时出分</text></text></view>
              <view class="ritem"><text class="ritem-dot" /><text class="ritem-txt"><text class="ritem-b">主观题</text><text>：评委双评取均，误差过大三评</text></text></view>
              <view class="ritem"><text class="ritem-dot" /><text class="ritem-txt"><text class="ritem-b">直播赛权重</text><text>：</text></text></view>
            </view>
            <view class="weight">
              <view class="w1"><text class="w-txt">评委分 70%</text></view>
              <view class="w2"><text class="w-txt">观众 30%</text></view>
            </view>
          </view>

          <!-- 晋级与名额（通用规则） -->
          <view class="rblk">
            <view class="rblk-h"><view class="gd" /><text class="rblk-t">晋级与名额</text></view>
            <view class="rlist">
              <view class="ritem"><text class="ritem-dot" /><text class="ritem-txt">各级名额、分数线赛前公开，到点自动结算</text></view>
              <view class="ritem"><text class="ritem-dot" /><text class="ritem-txt">同分按用时短者优先，仍同分并列晋级</text></view>
              <view class="ritem"><text class="ritem-dot" /><text class="ritem-txt">晋级名单自动生成并在排行榜公示</text></view>
            </view>
          </view>

          <!-- 赛事自定义规则（真连 rules·去 markdown） -->
          <view v-if="plainRules" class="rblk">
            <view class="rblk-h"><view class="gd" /><text class="rblk-t">本赛事规则</text></view>
            <text class="rules-body">{{ plainRules }}</text>
          </view>

          <!-- 纪律红线（合规·平台通用） -->
          <view class="discipline">
            <text class="disc-t">纪律红线（违规取消资格）</text>
            <view class="disc-list">
              <view class="disc-item"><text class="disc-dot" /><text class="disc-txt">答题切屏超限、使用外挂/代答</text></view>
              <view class="disc-item"><text class="disc-dot" /><text class="disc-txt">直播赛冒名顶替、场外提示</text></view>
              <view class="disc-item"><text class="disc-dot" /><text class="disc-txt">刷票、恶意举报、伪造证书</text></view>
            </view>
          </view>
          <view class="note"><text class="note-txt">违规一经核实取消资格并公示处理结果；申诉在成绩详情发起，48h 内有效，留痕可追溯。</text></view>
        </block>

        <!-- ===== ② 题目与答案公示（后端无端点·诚实降级占位） ===== -->
        <block v-else-if="activeTab === 'questions'">
          <view class="banner"><text class="banner-txt">赛后将公开全部题目、标准答案与解析，供选手对账复盘。这是「高透明」的核心 —— 谁都能验证判分是否公正。</text></view>
          <view class="empty">
            <app-icon name="file-text" :size="46" color="#d8cfc0" />
            <text class="empty-t">赛后题目公示即将开放</text>
            <text class="empty-s">本场题目、标准答案与解析将于赛事结束后统一公开。进行中赛事题目不公开，以防泄题。</text>
          </view>
          <view class="note"><text class="note-txt">题库定期轮换，公示仅针对已结束赛事；进行中赛事题目不公开。</text></view>
        </block>

        <!-- ===== ③ 奖励发放公示（rankings 真连获奖名单·发放状态降级） ===== -->
        <block v-else>
          <!-- 汇总条（金·获奖人数真连；发放进度后端无·不编造） -->
          <view class="summary">
            <text class="sum-t">本场获奖公示</text>
            <text class="sum-v">{{ winners.length }} 人获奖</text>
          </view>

          <view v-if="winners.length" class="payout">
            <view v-for="(w, i) in winners" :key="w.id" class="pay-row" :class="{ 'no-top': i === 0 }">
              <view class="py-rank" :class="{ gold: w.rank <= 3 }"><text class="py-rank-txt" :class="{ gold: w.rank <= 3 }">{{ w.rank }}</text></view>
              <view class="py-body">
                <text class="py-name">{{ (w.user?.nickname || '选手') + ' · ' + promotionLabel[w.status] }}</text>
                <text class="py-sub">{{ prizeLine(w) }}</text>
              </view>
              <!-- 发放状态字段后端无 → 统一降级标注，不编造「已发放/发放中」 -->
              <text class="py-status">以公告为准</text>
            </view>
          </view>
          <!-- 无获奖名单（未结束/无数据） -->
          <view v-else class="empty">
            <app-icon name="award" :size="46" color="#d8cfc0" />
            <text class="empty-t">获奖名单待公布</text>
            <text class="empty-s">赛事结束、成绩结算后，获奖名单与奖励发放将在此公示。</text>
          </view>

          <view class="note"><text class="note-txt">〔高透明〕荣誉类（证书/徽章）自动发放；实物类触发履约工单。奖励挂钩真实赛事名次，非抽奖/博彩。<text class="note-em">奖励发放状态以平台公告为准。</text></text></view>
        </block>

        <view class="safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'
import {
  competitionApi, roundTypeLabel, promotionLabel, yuan,
  type Competition, type CompetitionRound, type Ranking, type PromotionStatus,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)

const compId = ref('')
const loading = ref(true)
const errMsg = ref('')
const comp = ref<Competition | null>(null)
const rankings = ref<Ranking[]>([])

type TabId = 'rules' | 'questions' | 'rewards'
const activeTab = ref<TabId>('rules')
const tabs = [
  { id: 'rules' as const, label: '规则' },
  { id: 'questions' as const, label: '题目公示' },
  { id: 'rewards' as const, label: '奖励公示' },
]

const navTitle = computed(() =>
  activeTab.value === 'rules' ? '赛制规则'
    : activeTab.value === 'questions' ? '题目公示'
      : '奖励发放公示',
)

// ─── 规则：真连 rounds（剔报名轮）+ 去 markdown 的 rules ───
const funnelRounds = computed<CompetitionRound[]>(() =>
  (comp.value?.rounds ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => r.type !== 'REGISTRATION'),
)
function roundDesc(r: CompetitionRound): string {
  if (r.description) return '：' + r.description
  const cap = r.passCount > 0 ? `，取前 ${r.passCount} 名晋级` : ''
  const dur = r.duration > 0 ? ` · 限时 ${r.duration} 分钟` : ''
  return `：${r.title || roundTypeLabel[r.type]}${dur}${cap}`
}
// rules 去 markdown 符号（真连·plain 渲染）
const plainRules = computed(() =>
  (comp.value?.rules || '').replace(/[#*`>]/g, '').replace(/\n{2,}/g, '\n').trim(),
)
// 无 competitionId / 无 rounds 时的通用赛制说明（静态·平台通用）
const genericStages = [
  { b: '线上海选', t: '：全民答题，系统即时判分，分数×用时排名，择优晋级' },
  { b: '直播晋级', t: '：实时比拼，评委分+观众票加权，择优进决赛' },
  { b: '线下决赛', t: '：现场评审，产出认证易学分析师' },
]

// ─── 奖励公示：rankings 真连获奖名单（PROMOTED 及以上视为获奖） ───
const WIN_STATUS: PromotionStatus[] = ['CHAMPION', 'RUNNER_UP', 'THIRD_PLACE', 'PROMOTED']
const winners = computed<Ranking[]>(() =>
  rankings.value
    .filter((r) => WIN_STATUS.includes(r.status))
    .slice()
    .sort((a, b) => a.rank - b.rank),
)
// 奖励一行：真连 prize（分→元）；无金额时回退证书/徽章
function prizeLine(w: Ranking): string {
  const parts: string[] = []
  if (w.prize > 0) parts.push(`¥${yuan(w.prize)}`)
  parts.push('证书 + 徽章')
  return parts.join(' + ')
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    // 无 competitionId → 通用赛制规则说明（静态），不请求后端
    if (!compId.value) {
      comp.value = null
      rankings.value = []
      return
    }
    const c = await competitionApi.detail(compId.value)
    if (!c) throw new Error('赛事不存在')
    comp.value = c
    // 获奖名单真连（失败不阻断规则展示）
    try {
      const rk = await competitionApi.rankings(compId.value)
      rankings.value = rk.items ?? []
    } catch { rankings.value = [] }
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.competitionId as string) || (q?.id as string) || ''
  try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}
  load()
})
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFF;
$red: #C41E3A;
$red-deep: #A01830;
$gold: #C9A96E;
$gold-deep: #A5883F;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #999;
$line: #EFE4D3;

.page { display: flex; flex-direction: column; height: 100vh; background: $paper; overflow: hidden; }

/* ─── 自定义导航栏 ─── */
.nav { flex: 0 0 auto; background: linear-gradient(135deg, $red, $red-deep); position: relative; }
.nav::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent, $gold, transparent); }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px 16px; }
.nav-back { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; flex: 0 0 34px; }
.nav-titles { flex: 1; display: flex; flex-direction: column; align-items: center; }
.nav-title { font-family: "Songti SC", "STSong", serif; font-size: 20px; font-weight: 800; color: #fff; letter-spacing: 1px; }
.nav-en { font-size: 9px; letter-spacing: 3px; color: rgba(255,255,255,0.6); text-transform: uppercase; margin-top: 2px; }

/* ─── 三态 ─── */
.state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 0 40px; }
.state-txt { color: $t3; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #f0e0e2; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry { margin-top: 4px; padding: 8px 24px; background: $red; border-radius: 999px; }
.retry-txt { color: #fff; font-size: 14px; }

.scroll { flex: 1; height: 0; min-height: 0; width: 100%; }
.body { padding: 16px 20px; }

/* ─── Tab ─── */
.tabs { display: flex; gap: 7px; margin-bottom: 16px; background: #F0ECE4; border-radius: 999px; padding: 4px; }
.tab { flex: 1; text-align: center; padding: 9px 0; border-radius: 999px; }
.tab.on { background: linear-gradient(135deg, $red, $red-deep); box-shadow: 0 3px 10px rgba(196,30,58,0.25); }
.tab-txt { font-size: 12px; font-weight: 600; color: #8A8073; }
.tab-txt.on { color: #fff; }

/* ─── 规则块 ─── */
.rblk { background: $card; border: 1px solid $line; border-radius: 18px; padding: 16px; margin-bottom: 12px; box-shadow: 0 3px 12px rgba(160,120,60,0.05); }
.rblk-h { display: flex; align-items: center; gap: 7px; margin-bottom: 11px; }
.gd { width: 4px; height: 14px; background: linear-gradient(#d4b876, $gold-deep); border-radius: 2px; }
.rblk-t { font-size: 14px; font-weight: 700; color: $t1; }
.rlist { display: flex; flex-direction: column; gap: 2px; }
.ritem { display: flex; align-items: flex-start; gap: 9px; padding: 3px 0; }
.ritem-dot { width: 5px; height: 5px; border-radius: 50%; background: $gold; flex: 0 0 5px; margin-top: 8px; }
.ritem-txt { flex: 1; font-size: 12px; color: #5A5A5F; line-height: 1.85; }
.ritem-b { color: $t1; font-weight: 700; }

/* 权重条 */
.weight { display: flex; height: 34px; border-radius: 9px; overflow: hidden; margin-top: 10px; }
.w1 { flex: 0 0 70%; background: linear-gradient(135deg, $red, $red-deep); display: flex; align-items: center; justify-content: center; }
.w2 { flex: 0 0 30%; background: linear-gradient(135deg, #d4b876, $gold-deep); display: flex; align-items: center; justify-content: center; }
.w-txt { font-size: 11px; color: #fff; font-weight: 700; }

/* 本赛事规则（真连去 markdown） */
.rules-body { display: block; font-size: 12.5px; color: $t2; line-height: 1.85; white-space: pre-wrap; }

/* 纪律红线 */
.discipline { background: #FDF2F3; border: 1px solid #F0C8CE; border-radius: 18px; padding: 16px; }
.disc-t { display: block; font-size: 14px; font-weight: 700; color: $red; margin-bottom: 10px; }
.disc-list { display: flex; flex-direction: column; gap: 2px; }
.disc-item { display: flex; align-items: flex-start; gap: 9px; padding: 2px 0; }
.disc-dot { width: 5px; height: 5px; border-radius: 50%; background: $red; flex: 0 0 5px; margin-top: 8px; }
.disc-txt { flex: 1; font-size: 12px; color: #A03040; line-height: 1.85; }

.note { margin-top: 12px; background: #FAF6EF; border-radius: 10px; padding: 10px 12px; }
.note-txt { font-size: 11px; color: #A59B8C; line-height: 1.7; }
.note-em { color: $gold-deep; font-weight: 700; }

/* ─── 题目公示 ─── */
.banner { background: #FAF3E6; border: 1px solid #ECDCBB; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
.banner-txt { font-size: 11.5px; color: #8A6D2F; line-height: 1.75; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 46px 24px; background: $card; border: 1px solid $line; border-radius: 18px; box-shadow: 0 3px 12px rgba(160,120,60,0.05); }
.empty-t { font-size: 14px; font-weight: 700; color: $t2; }
.empty-s { font-size: 12px; color: $t3; line-height: 1.7; text-align: center; }

/* ─── 奖励公示 ─── */
.summary { background: linear-gradient(135deg, #2C2416, #4A3C22); border-radius: 16px; padding: 15px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; box-shadow: 0 6px 18px rgba(60,45,20,0.25); }
.sum-t { font-size: 12px; color: #D4C9A8; }
.sum-v { font-size: 18px; font-weight: 800; color: #E8D199; }
.payout { background: $card; border: 1px solid $line; border-radius: 16px; overflow: hidden; box-shadow: 0 3px 12px rgba(160,120,60,0.05); }
.pay-row { display: flex; align-items: center; gap: 11px; padding: 13px 15px; border-top: 1px dashed #F0E8DA; }
.pay-row.no-top { border-top: none; }
.py-rank { width: 32px; height: 32px; border-radius: 50%; background: #F5ECD6; display: flex; align-items: center; justify-content: center; flex: 0 0 32px; }
.py-rank.gold { background: linear-gradient(135deg, #d4b876, $gold-deep); box-shadow: 0 3px 8px rgba(165,136,63,0.3); }
.py-rank-txt { font-size: 14px; font-weight: 800; color: $gold-deep; }
.py-rank-txt.gold { color: #fff; }
.py-body { flex: 1; min-width: 0; }
.py-name { display: block; font-size: 13.5px; font-weight: 700; color: $t1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.py-sub { display: block; font-size: 11px; color: #A59B8C; margin-top: 2px; line-height: 1.5; }
.py-status { flex: 0 0 auto; font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 999px; background: #F5ECD6; color: $gold-deep; }

.safe { height: 30px; }
</style>
