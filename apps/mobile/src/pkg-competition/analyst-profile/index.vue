<template>
  <view class="page">
    <!-- 自定义导航（宣纸白·居中宋体标题） -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title">我的分析师档案</text>
        <view class="nav-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state">
        <view class="spinner" />
        <text class="state-txt">加载中…</text>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
        <text class="state-txt">{{ error }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
      </view>

      <!-- 未登录空态 -->
      <view v-else-if="!loggedIn" class="state">
        <app-icon name="user" :size="52" color="#C9A96E" />
        <text class="state-txt">登录后查看你的分析师档案</text>
        <text class="state-sub">段位、晋级进度、战绩史与认证徽章</text>
        <view class="retry-btn" @tap="goLogin"><text class="retry-txt">去登录</text></view>
      </view>

      <!-- 无战绩空态（登录但从未参赛） -->
      <view v-else-if="!profile || profile.totalCompetitions === 0" class="state">
        <app-icon name="trophy" :size="52" color="#C9A96E" />
        <text class="state-txt">你还没有参赛战绩</text>
        <text class="state-sub">参加易学知识竞技，赢取荣誉值提升分析师段位</text>
        <view class="retry-btn" @tap="goHome"><text class="retry-txt">去看看赛事</text></view>
      </view>

      <template v-else>
        <view class="body">
          <!-- 档案头卡 -->
          <view class="profile-hd">
            <view class="ph-top" />
            <view class="ph-avatar">
              <text class="ph-avatar-txt">{{ nameInitial }}</text>
            </view>
            <text class="ph-name">{{ displayName }}</text>
            <view class="ph-level">
              <app-icon name="award" :size="13" color="#A5883F" />
              <text class="ph-level-txt">{{ level.info.label }} · Lv.{{ levelIndex + 1 }}</text>
              <view v-if="profile.isCertified" class="cert-mark"><text class="cert-mark-txt">已认证</text></view>
            </view>
            <view class="ph-score">
              <view class="ph-score-item"><text class="ph-score-n">{{ profile.talentScore }}</text><text class="ph-score-l">荣誉值</text></view>
              <view class="ph-score-item"><text class="ph-score-n">{{ profile.totalCompetitions }}</text><text class="ph-score-l">完赛场次</text></view>
              <view class="ph-score-item"><text class="ph-score-n">{{ profile.totalWins }}</text><text class="ph-score-l">获奖次数</text></view>
            </view>
          </view>

          <!-- 晋级进度 -->
          <view class="sec">
            <view class="sec-hd"><text class="sec-title">晋级进度</text></view>
            <view class="prog-card">
              <view class="prog-lb">
                <text class="prog-cur">{{ level.info.label }} Lv.{{ levelIndex + 1 }}{{ isTop ? ' · 最高段位' : '' }}</text>
                <text class="prog-next">{{ isTop ? '已封顶' : nextLevelLabel + ' · 差 ' + level.toNext }}</text>
              </view>
              <view class="bar"><view class="bar-fill" :style="{ width: level.progress + '%' }" /></view>
              <!-- 段位里程碑 -->
              <view class="prog-ms">
                <view v-for="(lv, i) in ANALYST_LEVELS" :key="lv.key" class="ms" :class="{ done: i <= levelIndex }">
                  <view class="ms-dot" />
                  <text class="ms-txt">{{ lv.label.replace('分析师', '') }}</text>
                </view>
              </view>
              <text class="prog-tip">{{ progTip }}</text>
              <text class="prog-note">※ 等级依据战绩积分推算（冠100/亚60/季40/晋级10/参与2），由战绩自动晋级不可自封。</text>
            </view>
          </view>

          <!-- 参赛引导 CTA（未封顶时展示） -->
          <view v-if="!isTop" class="btn btn-primary" @tap="goHome"><text class="btn-txt">去参赛提升段位</text></view>

          <!-- 认证徽章墙 -->
          <view class="sec">
            <view class="sec-hd">
              <text class="sec-title">认证徽章墙</text>
              <text class="sec-more">已获 {{ unlockedBadgeCount }} / {{ BADGE_DEFS.length }}</text>
            </view>
            <view class="badge-wall">
              <view v-for="bd in badgeWall" :key="bd.key" class="bw-item">
                <view class="bw-medal" :class="{ locked: !bd.unlocked }">
                  <app-icon v-if="!bd.unlocked" name="lock" :size="14" color="#c8c0b0" />
                  <text v-else class="bw-medal-txt">{{ bd.short }}</text>
                </view>
                <text class="bw-name">{{ bd.name }}</text>
              </view>
            </view>
          </view>

          <!-- 赛事战绩时间线 -->
          <view class="sec">
            <view class="sec-hd"><text class="sec-title">赛事战绩</text></view>
            <view class="card">
              <view v-for="(b, i) in profile.badges" :key="b.competitionId + '-' + i" class="rec">
                <view class="rec-medal" :class="{ champ: b.status === 'CHAMPION' }">
                  <text class="rec-medal-txt">{{ medalLabel(b.status) }}</text>
                </view>
                <view class="rec-body">
                  <view class="rec-title-line">
                    <text class="rec-title">{{ b.title }}</text>
                  </view>
                  <text class="rec-sub">{{ recSub(b) }}</text>
                </view>
              </view>
              <view v-if="profile.badges.length === 0" class="rec-empty"><text class="rec-empty-txt">暂无战绩记录</text></view>
            </view>
          </view>

          <!-- 挂牌接单 -->
          <view class="sec">
            <view class="sec-hd"><text class="sec-title">挂牌接单</text></view>
            <!-- 已认证 且 资深级 → 已解锁入口 -->
            <template v-if="canMount">
              <view class="mount">
                <view class="mount-hd">
                  <text class="mount-title">线下驿站达人咨询挂牌</text>
                  <view class="switch"><view class="switch-knob" /></view>
                </view>
                <text class="mount-desc">你的资深分析师认证已具备挂牌资格。用户可在驿站预约你的咨询，交易与履约在驿站板块完成。</text>
              </view>
              <view class="btn btn-gold" @tap="goMount"><text class="btn-txt">前往驿站管理咨询挂牌</text></view>
            </template>
            <!-- 未解锁 → 引导 -->
            <view v-else class="locked-box">
              <view class="locked-hd"><app-icon name="lock" :size="14" color="#8a7d68" /><text class="locked-title">资深分析师专属</text></view>
              <text class="locked-sub">升至「资深分析师 Lv.5」并通过平台认证后，可挂牌承接线下驿站达人咨询。持续参赛提升段位以解锁。</text>
              <view v-if="profile.talentScore > 0 && !profile.isCertified" class="locked-link" @tap="goCertify"><text class="locked-link-txt">申请讲师认证 ›</text></view>
            </view>
            <text class="note">挂牌接单属线下驿站达人咨询体系，本页仅做段位认证与解锁入口，接单排期/定价/履约/结算均在驿站板块完成。</text>
          </view>

          <view class="safe-bottom" />
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  competitionApi, analystLevel, ANALYST_LEVELS, promotionLabel, fmtDate,
  type MyTalentProfile, type TalentMedal,
} from '@/pkg-competition/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const loading = ref(true)
const error = ref('')
const loggedIn = ref(false)
const profile = ref<MyTalentProfile | null>(null)

// ─── 等级推算（前端·非后端权威字段） ───
const level = computed(() => analystLevel(profile.value?.talentScore ?? 0))
const levelIndex = computed(() => ANALYST_LEVELS.findIndex((l) => l.key === level.value.info.key))
const isTop = computed(() => levelIndex.value >= ANALYST_LEVELS.length - 1)
const nextLevelLabel = computed(() => {
  const next = ANALYST_LEVELS[levelIndex.value + 1]
  return next ? next.label.replace('分析师', '') + ' Lv.' + (levelIndex.value + 2) : ''
})
const progTip = computed(() => {
  if (isTop.value) return '已达最高段位。持续参赛可保持榜单排名与荣誉值领先，卫冕当届冠军。'
  return `再获荣誉值 ${level.value.toNext} 即可升「${nextLevelLabel.value.split(' ')[0]}分析师」。`
})

// ─── 展示名/头像首字 ───
const displayName = computed(() => profile.value?.verifiedTitle || '我')
const nameInitial = computed(() => (displayName.value || '我').slice(0, 1))

// ─── 认证徽章墙（8 种成就·按真实战绩推算解锁） ───
const BADGE_DEFS: { key: string; name: string; short: string; test: (p: MyTalentProfile) => boolean }[] = [
  { key: 'first', name: '初登场', short: '首赛', test: (p) => p.totalCompetitions >= 1 },
  { key: 'bronze', name: '铜奖', short: '季军', test: (p) => p.badges.some((b) => b.status === 'THIRD_PLACE') },
  { key: 'live', name: '晋级直播', short: '直播', test: (p) => p.badges.some((b) => b.status === 'PROMOTED') },
  { key: 'final', name: '进决赛', short: '决赛', test: (p) => p.badges.some((b) => b.status === 'RUNNER_UP' || b.status === 'CHAMPION' || b.status === 'THIRD_PLACE') },
  { key: 'champ', name: '冠军', short: '冠军', test: (p) => p.totalWins >= 1 },
  { key: 'streak', name: '连胜', short: '连胜', test: (p) => p.totalWins >= 2 },
  { key: 'senior', name: '资深', short: '资深', test: (p) => p.talentScore >= 800 },
  { key: 'certified', name: '认证师', short: '认证', test: (p) => p.isCertified },
]
const badgeWall = computed(() =>
  BADGE_DEFS.map((bd) => ({ ...bd, unlocked: profile.value ? bd.test(profile.value) : false })),
)
const unlockedBadgeCount = computed(() => badgeWall.value.filter((b) => b.unlocked).length)

// ─── 挂牌解锁条件：资深级 + 平台认证 ───
const canMount = computed(() => !!profile.value?.isCertified && isTop.value)

// ─── 战绩条目 ───
function medalLabel(status: string): string {
  if (status === 'PARTICIPANT') return '完赛'
  return (promotionLabel as Record<string, string>)[status] || status
}
function recSub(b: TalentMedal): string {
  const parts: string[] = []
  if (b.rank != null) parts.push('名次 ' + b.rank)
  if (typeof b.score === 'number' && b.score > 0) parts.push('+' + b.score + ' 荣誉值')
  const d = fmtDate(b.finishedAt)
  if (d) parts.push(d)
  return parts.join(' · ') || '已完赛'
}

async function load() {
  loading.value = true
  error.value = ''
  loggedIn.value = !!getToken()
  if (!loggedIn.value) { loading.value = false; return }
  try {
    profile.value = await competitionApi.myTalent()
  } catch (e) {
    const msg = (e as Error)?.message
    error.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function goBack() { navigateBack() }
function goHome() { navigateTo('/competition/home') }
function goLogin() { navigateTo('/login') }
function goCertify() { navigateTo('/pkg-creator/teacher-certification/index') }
// 🔻降级：达人咨询挂牌后端未实现，点击提示即将开放，不造假跳转
function goMount() { uni.showToast({ title: '分析师挂牌接单即将开放', icon: 'none' }) }

onMounted(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
/* iOS flex 三段式 */
.page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.nav-bar { background: #FAF8F5; border-bottom: 1px solid #ECE7DF; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 16px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.scroll { flex: 1; height: 0; min-height: 0; }

/* 三态 */
.state { padding: 70px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { font-size: 14px; color: #6E6E73; }
.state-sub { font-size: 12px; color: #999; text-align: center; line-height: 1.6; }
.spinner { width: 30px; height: 30px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 9px 24px; background: #C41E3A; border-radius: 999px; }
.retry-txt { color: #fff; font-size: 14px; }

.body { padding: 16px 20px 40px; }
.sec { margin-top: 16px; }
.sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sec-title { font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }
.sec-more { font-size: 12px; color: #999; }

/* 档案头卡 */
.profile-hd { background: #fff; border: 1px solid #ECE7DF; border-radius: 18px; padding: 0 16px 18px; text-align: center; overflow: hidden; }
.ph-top { height: 60px; margin: 0 -16px; background: linear-gradient(135deg, #C41E3A, #8f1526); }
.ph-avatar { width: 74px; height: 74px; border-radius: 50%; margin: -38px auto 0; background: linear-gradient(135deg, #E8DCC4, #D8C9A8); border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; }
.ph-avatar-txt { font-size: 26px; font-weight: 800; color: #A5883F; font-family: 'Songti SC', serif; }
.ph-name { display: block; font-size: 18px; font-weight: 800; color: #2C2C2C; margin-top: 10px; font-family: 'Songti SC', serif; }
.ph-level { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; background: #F1E9D8; border: 1px solid #E3D5B0; border-radius: 999px; padding: 5px 14px; }
.ph-level-txt { font-size: 13px; font-weight: 700; color: #A5883F; }
.cert-mark { background: linear-gradient(135deg, #D8C28A, #C9A96E); border-radius: 5px; padding: 1px 7px; }
.cert-mark-txt { font-size: 10px; color: #fff; font-weight: 600; }
.ph-score { display: flex; justify-content: center; gap: 30px; margin-top: 16px; padding-top: 14px; border-top: 1px dashed #eee; }
.ph-score-item { display: flex; flex-direction: column; align-items: center; }
.ph-score-n { font-size: 21px; font-weight: 800; color: #A5883F; font-family: 'Songti SC', serif; }
.ph-score-l { font-size: 11px; color: #999; margin-top: 2px; }

/* 晋级进度 */
.prog-card { background: #fff; border: 1px solid #ECE7DF; border-radius: 16px; padding: 16px; }
.prog-lb { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.prog-cur { font-size: 12px; font-weight: 700; color: #A5883F; }
.prog-next { font-size: 12px; color: #999; }
.bar { height: 10px; background: #F0ECE4; border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #D8C28A, #C9A96E); border-radius: 999px; }
.prog-ms { display: flex; gap: 6px; margin-top: 12px; }
.ms { flex: 1; display: flex; flex-direction: column; align-items: center; }
.ms-dot { width: 14px; height: 14px; border-radius: 50%; background: #E0D9CC; margin-bottom: 4px; }
.ms.done .ms-dot { background: linear-gradient(135deg, #D8C28A, #C9A96E); }
.ms-txt { font-size: 10px; color: #999; }
.ms.done .ms-txt { color: #A5883F; font-weight: 700; }
.prog-tip { display: block; font-size: 11px; color: #6E6E73; margin-top: 10px; line-height: 1.6; }
.prog-note { display: block; font-size: 10px; color: #b0a89c; margin-top: 6px; line-height: 1.5; }

/* 按钮 */
.btn { margin-top: 14px; padding: 13px; border-radius: 999px; text-align: center; }
.btn-txt { font-size: 15px; font-weight: 700; color: #fff; }
.btn-primary { background: linear-gradient(135deg, #C41E3A, #a01830); }
.btn-gold { background: linear-gradient(135deg, #C9A96E, #b8975a); }

/* 认证徽章墙 */
.badge-wall { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.bw-item { background: #fff; border: 1px solid #ECE7DF; border-radius: 12px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; }
.bw-medal { width: 40px; height: 40px; border-radius: 50%; margin-bottom: 6px; background: linear-gradient(135deg, #F1E9D8, #E3D5B0); border: 1px solid #D8C9A8; display: flex; align-items: center; justify-content: center; }
.bw-medal.locked { background: #F0ECE4; border-color: #E0D9CC; }
.bw-medal-txt { font-size: 11px; font-weight: 800; color: #A5883F; }
.bw-name { font-size: 10px; color: #6E6E73; }

/* 战绩时间线 */
.card { background: #fff; border: 1px solid #ECE7DF; border-radius: 16px; padding: 4px 14px; }
.rec { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #eee; }
.rec:last-child { border-bottom: none; }
.rec-medal { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; background: linear-gradient(135deg, #F1E9D8, #E3D5B0); display: flex; align-items: center; justify-content: center; }
.rec-medal.champ { background: linear-gradient(135deg, #D8C28A, #C9A96E); }
.rec-medal-txt { font-size: 11px; font-weight: 800; color: #A5883F; }
.rec-medal.champ .rec-medal-txt { color: #fff; }
.rec-body { flex: 1; min-width: 0; }
.rec-title-line { display: flex; align-items: center; gap: 6px; }
.rec-title { font-size: 13px; font-weight: 700; color: #2C2C2C; }
.rec-sub { display: block; font-size: 11px; color: #999; margin-top: 2px; }
.rec-empty { padding: 20px 0; text-align: center; }
.rec-empty-txt { font-size: 12px; color: #b0a89c; }

/* 挂牌 */
.mount { background: linear-gradient(135deg, #FBF3E2, #fff); border: 1px solid #ECDCBB; border-radius: 16px; padding: 16px; }
.mount-hd { display: flex; align-items: center; justify-content: space-between; }
.mount-title { font-size: 14px; font-weight: 700; color: #A5883F; font-family: 'Songti SC', serif; }
.switch { width: 46px; height: 26px; border-radius: 999px; background: linear-gradient(135deg, #D8C28A, #C9A96E); position: relative; }
.switch-knob { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.mount-desc { display: block; font-size: 12px; color: #6E6E73; margin-top: 8px; line-height: 1.6; }
.locked-box { background: #F6F2EA; border: 1px dashed #D8CDB8; border-radius: 14px; padding: 16px; text-align: center; }
.locked-hd { display: flex; align-items: center; justify-content: center; gap: 5px; }
.locked-title { font-size: 13px; font-weight: 700; color: #8a7d68; }
.locked-sub { display: block; font-size: 11px; color: #999; margin-top: 5px; line-height: 1.6; }
.locked-link { display: inline-block; margin-top: 10px; padding: 6px 16px; background: #fff; border: 1px solid #e6b3b8; border-radius: 999px; }
.locked-link-txt { font-size: 12px; color: #C41E3A; font-weight: 600; }
.note { display: block; font-size: 11px; color: #999; margin-top: 10px; line-height: 1.6; }

.safe-bottom { height: 30px; }
</style>
