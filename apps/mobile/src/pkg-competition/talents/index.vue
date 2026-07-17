<template>
  <view class="page">
    <!-- 顶部导航（宣纸白·宋体标题） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title">易学分析师榜</text>
        <view class="nav-btn" @tap="goLevelSys"><app-icon name="info" :size="18" color="#A5883F" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- loading -->
      <view v-if="loading" class="state">
        <view class="spinner" />
        <text class="state-txt">加载中…</text>
      </view>

      <!-- error -->
      <view v-else-if="error" class="state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
        <text class="state-txt">{{ error }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
      </view>

      <template v-else>
        <!-- 榜首说明：段位=战绩换算 -->
        <view class="rule-bar">
          <app-icon name="trophy" :size="13" color="#C9A96E" />
          <text class="rule-txt">跨赛事战绩累计 · 段位依据战绩积分推算（冠100·亚60·季40·晋级10·参与2）</text>
        </view>

        <!-- 空态 -->
        <view v-if="talents.length === 0" class="state">
          <app-icon name="trophy" :size="48" color="#e3d5b0" />
          <text class="state-txt">虚位以待，参赛即可上榜</text>
          <view class="retry-btn" @tap="goHome"><text class="retry-txt">去看看赛事</text></view>
        </view>

        <template v-else>
          <!-- 领奖台 Top3（金） -->
          <view v-if="podium.length" class="podium">
            <!-- 亚军 左 -->
            <view v-if="podium[1]" class="pod p2" @tap="goProfile(podium[1])">
              <view class="pod-avatar">
                <image v-if="podium[1].avatar" :src="podium[1].avatar" mode="aspectFill" lazy-load class="pod-img" />
                <text v-else class="pod-ph">{{ firstChar(podium[1].nickname) }}</text>
                <text class="rank-badge">亚军</text>
              </view>
              <text class="pod-nm">{{ podium[1].nickname }}</text>
              <text class="pod-lv">{{ levelOf(podium[1].talentScore).info.label }}</text>
              <view class="stand s2"><text class="stand-txt">2</text></view>
            </view>
            <!-- 冠军 中 -->
            <view v-if="podium[0]" class="pod p1" @tap="goProfile(podium[0])">
              <view class="pod-avatar">
                <image v-if="podium[0].avatar" :src="podium[0].avatar" mode="aspectFill" lazy-load class="pod-img" />
                <text v-else class="pod-ph">{{ firstChar(podium[0].nickname) }}</text>
                <text class="rank-badge">冠军</text>
              </view>
              <text class="pod-nm">{{ podium[0].nickname }}</text>
              <text class="pod-lv">{{ levelOf(podium[0].talentScore).info.label }}</text>
              <view class="stand s1"><text class="stand-txt">1</text></view>
            </view>
            <!-- 季军 右 -->
            <view v-if="podium[2]" class="pod p3" @tap="goProfile(podium[2])">
              <view class="pod-avatar">
                <image v-if="podium[2].avatar" :src="podium[2].avatar" mode="aspectFill" lazy-load class="pod-img" />
                <text v-else class="pod-ph">{{ firstChar(podium[2].nickname) }}</text>
                <text class="rank-badge">季军</text>
              </view>
              <text class="pod-nm">{{ podium[2].nickname }}</text>
              <text class="pod-lv">{{ levelOf(podium[2].talentScore).info.label }}</text>
              <view class="stand s3"><text class="stand-txt">3</text></view>
            </view>
          </view>

          <!-- 榜单 4+ -->
          <view class="list">
            <view v-for="t in rest" :key="t.userId" class="lrow" @tap="goProfile(t)">
              <text class="rk">{{ t.position }}</text>
              <view class="ra-wrap">
                <image v-if="t.avatar" :src="t.avatar" mode="aspectFill" lazy-load class="ra" />
                <view v-else class="ra ra-ph"><text class="ra-ph-txt">{{ firstChar(t.nickname) }}</text></view>
              </view>
              <view class="rb">
                <view class="rb-name-line">
                  <text class="rb-name">{{ t.nickname }}</text>
                  <text class="lvchip">{{ levelOf(t.talentScore).info.label }}</text>
                  <view v-if="t.isCertified" class="cert-tag">
                    <app-icon name="badge-check" :size="10" color="#A5883F" />
                    <text class="cert-txt">{{ t.verifiedTitle || '认证' }}</text>
                  </view>
                </view>
                <text class="rb-sub">{{ recordText(t) }}</text>
              </view>
              <view class="honor">
                <text class="honor-n">{{ t.talentScore }}</text>
                <text class="honor-s">荣誉值</text>
              </view>
            </view>

            <!-- 加载更多 -->
            <view v-if="talents.length < total" class="more" @tap="loadMore">
              <text class="more-txt">{{ loadingMore ? '加载中…' : '加载更多' }}</text>
            </view>
          </view>

          <!-- 段位=战绩推算 免责小字 -->
          <view class="disclaimer">
            <text class="disclaimer-txt">等级依据战绩积分推算，非后端权威认证；仅认证标为平台核验。授课与接单归线下驿站。</text>
          </view>

          <view class="safe-bottom" />
        </template>
      </template>
    </scroll-view>

    <!-- 我的档案 吸底（登录后展示） -->
    <view v-if="mine" class="selfbar" :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }">
      <text class="self-rk">{{ mine.position ?? '—' }}</text>
      <view class="self-ra-wrap">
        <image v-if="mineAvatar" :src="mineAvatar" mode="aspectFill" lazy-load class="self-ra" />
        <view v-else class="self-ra self-ra-ph"><text class="self-ra-txt">我</text></view>
      </view>
      <view class="self-rb">
        <view class="self-name-line">
          <text class="self-name">我</text>
          <text class="lvchip">{{ myLevel.info.label }}</text>
          <view v-if="mine.isCertified" class="cert-tag">
            <app-icon name="badge-check" :size="10" color="#A5883F" />
            <text class="cert-txt">{{ mine.verifiedTitle || '认证' }}</text>
          </view>
        </view>
        <text class="self-sub">荣誉值 {{ mine.talentScore }}{{ myLevel.toNext > 0 ? ' · 距 ' + myLevel.info.next + ' 升级差 ' + myLevel.toNext : ' · 已达最高段位' }}</text>
      </view>
      <view class="self-cta" @tap="goMyProfile"><text class="self-cta-txt">我的档案 ›</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { getToken } from '@/utils/storage'
import {
  competitionApi, promotionLabel, analystLevel,
  type TalentItem, type MyTalentProfile,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 46)

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const talents = ref<TalentItem[]>([])
const total = ref(0)
const page = ref(1)
const PAGE_SIZE = 50
const mine = ref<MyTalentProfile | null>(null)

// 领奖台 = 前三名；榜单 = 第 4 名起
const podium = computed(() => talents.value.slice(0, 3))
const rest = computed(() => talents.value.slice(3))

// 我的等级（前端按 talentScore 推算·非后端权威）
const myLevel = computed(() => analystLevel(mine.value?.talentScore || 0))
// 我的头像：档案不含 avatar 字段，回退榜单命中项（脱敏后一致 userId）
const mineAvatar = computed(() => {
  if (!mine.value) return ''
  const hit = talents.value.find((t) => t.userId === mine.value!.userId)
  return hit?.avatar || ''
})

/** talentScore → 等级信息（复用数据层推算，展示 label） */
function levelOf(score: number) { return analystLevel(score) }

/** 无头像时取昵称首字（宋体占位） */
function firstChar(nickname: string): string { return (nickname || '?').slice(0, 1) }

/** 战绩摘要：优先夺冠，其次最好名次，兜底完赛场数 */
function recordText(t: TalentItem): string {
  const parts: string[] = ['累计战绩']
  if (t.totalWins > 0) parts.push(`冠军×${t.totalWins}`)
  else if (t.bestRank) parts.push(`最好第 ${t.bestRank} 名`)
  parts.push(`完赛 ${t.totalCompetitions} 场`)
  return parts.join(' · ')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    page.value = 1
    const res = await competitionApi.talents({ page: 1, pageSize: PAGE_SIZE })
    talents.value = res.items
    total.value = res.total
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || talents.value.length >= total.value) return
  loadingMore.value = true
  try {
    const res = await competitionApi.talents({ page: page.value + 1, pageSize: PAGE_SIZE })
    page.value += 1
    talents.value = [...talents.value, ...res.items]
    total.value = res.total
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** 我的档案（未登录静默跳过，不打扰公开浏览） */
async function loadMine() {
  if (!getToken()) return
  try {
    mine.value = await competitionApi.myTalent()
  } catch {
    mine.value = null
  }
}

function goProfile(t: TalentItem) { navigateTo(`/pkg-competition/analyst-profile/index?userId=${t.userId}`) }
function goMyProfile() { navigateTo('/pkg-competition/analyst-profile/index') }
function goLevelSys() {
  const lines = [
    '资深分析师 Lv.5 · 多次夺冠/进决赛，带认证标',
    '高级分析师 Lv.4 · 稳定获奖晋级',
    '中级分析师 Lv.3 · 赛事获奖或多场晋级',
    '初级分析师 Lv.2 · 累计积分达标·稳定完赛',
    '见习分析师 Lv.1 · 已完成首场赛事',
  ]
  uni.showModal({ title: '分析师段位说明', content: lines.join('\n') + '\n\n段位由战绩积分推算，非自封、可核验，带认证标。', showCancel: false, confirmText: '知道了' })
}
function goHome() { navigateTo('/competition/home') }
function goBack() { navigateBack() }

onMounted(() => {
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
  loadMine()
})
// promotionLabel 保留导出引用（战绩枚举文案，避免未来扩展遗漏）
void promotionLabel
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 顶部导航 */
.nav { background: #FAF8F5; position: sticky; top: 0; z-index: 50; border-bottom: 1px solid #ECE7DF; }
.nav-inner { height: 46px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', 'STSong', serif; letter-spacing: 1px; }

.scroll { width: 100%; }

/* 三态 */
.state { padding: 72px 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #999; font-size: 14px; text-align: center; }
.spinner { width: 30px; height: 30px; border: 3px solid #EDE6D8; border-top-color: #C9A96E; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; border: 1px solid #C9A96E; border-radius: 999px; }
.retry-txt { color: #A5883F; font-size: 14px; }

/* 规则栏 */
.rule-bar { display: flex; align-items: center; gap: 6px; margin: 12px 20px 4px; padding: 8px 12px; background: #FBF3E2; border: 1px solid #ECDCBB; border-radius: 12px; }
.rule-txt { color: #A5883F; font-size: 11px; line-height: 1.5; flex: 1; }

/* 领奖台 */
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 12px; padding: 16px 16px 8px; background: linear-gradient(180deg, #FBF3E2, #FAF8F5); }
.pod { display: flex; flex-direction: column; align-items: center; }
.pod-avatar { position: relative; border-radius: 50%; overflow: visible; background: linear-gradient(135deg, #E8DCC4, #D8C9A8); display: flex; align-items: center; justify-content: center; border: 2px solid #E3D5B0; margin-bottom: 10px; }
.p1 .pod-avatar { width: 74px; height: 74px; border: 3px solid #C9A96E; box-shadow: 0 0 0 4px #F1E9D8; }
.p2 .pod-avatar, .p3 .pod-avatar { width: 56px; height: 56px; }
.pod-img { width: 100%; height: 100%; border-radius: 50%; }
.pod-ph { color: #A5883F; font-size: 22px; font-weight: 700; font-family: 'Songti SC', serif; }
.p2 .pod-ph, .p3 .pod-ph { font-size: 18px; }
.rank-badge { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #D8C28A, #C9A96E); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.pod-nm { font-size: 12px; font-weight: 700; color: #2C2C2C; margin-bottom: 3px; max-width: 84px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pod-lv { font-size: 10px; color: #A5883F; background: #FAF3E6; border: 1px solid #ECDCBB; border-radius: 6px; padding: 1px 6px; }
.stand { border-radius: 8px 8px 0 0; margin-top: 8px; background: linear-gradient(180deg, #F1E9D8, #E3D5B0); border: 1px solid #E3D5B0; border-bottom: none; display: flex; align-items: flex-start; justify-content: center; padding-top: 6px; }
.stand-txt { font-family: 'Songti SC', serif; font-size: 13px; color: #A5883F; font-weight: 800; }
.s1 { width: 84px; height: 52px; }
.s2 { width: 70px; height: 38px; }
.s3 { width: 70px; height: 28px; }

/* 榜单 */
.list { padding: 8px 20px 0; display: flex; flex-direction: column; gap: 8px; }
.lrow { display: flex; align-items: center; gap: 11px; background: #FFF; border: 1px solid #ECE7DF; border-radius: 14px; padding: 10px 12px; }
.rk { width: 22px; text-align: center; font-family: 'Songti SC', serif; font-size: 15px; font-weight: 800; color: #A5883F; flex-shrink: 0; }
.ra-wrap { flex-shrink: 0; }
.ra { width: 40px; height: 40px; border-radius: 50%; }
.ra-ph { background: linear-gradient(135deg, #E8DCC4, #D8C9A8); display: flex; align-items: center; justify-content: center; }
.ra-ph-txt { color: #A5883F; font-size: 15px; font-weight: 700; font-family: 'Songti SC', serif; }
.rb { flex: 1; min-width: 0; }
.rb-name-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rb-name { font-size: 14px; font-weight: 700; color: #2C2C2C; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lvchip { font-size: 10px; color: #A5883F; background: #FAF3E6; border: 1px solid #ECDCBB; border-radius: 6px; padding: 1px 6px; flex-shrink: 0; }
.cert-tag { display: flex; align-items: center; gap: 2px; background: #F1E9D8; border: 1px solid #E3D5B0; border-radius: 6px; padding: 1px 5px; flex-shrink: 0; }
.cert-txt { font-size: 10px; color: #A5883F; font-weight: 600; }
.rb-sub { display: block; font-size: 11px; color: #999; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.honor { text-align: right; flex-shrink: 0; }
.honor-n { display: block; font-family: 'Songti SC', serif; font-size: 15px; font-weight: 800; color: #A5883F; }
.honor-s { display: block; color: #bbb; font-size: 10px; }

.more { padding: 14px 0; text-align: center; }
.more-txt { color: #A5883F; font-size: 13px; }

/* 免责小字 */
.disclaimer { padding: 10px 20px 4px; }
.disclaimer-txt { font-size: 11px; color: #999; line-height: 1.6; }

.safe-bottom { height: 88px; }

/* 我的档案 吸底 */
.selfbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; background: #FFF; border-top: 2px solid #E3D5B0; padding: 10px 16px; display: flex; align-items: center; gap: 11px; box-shadow: 0 -4px 16px rgba(60,40,20,0.08); }
.self-rk { width: 26px; text-align: center; font-family: 'Songti SC', serif; font-size: 15px; font-weight: 800; color: #A5883F; flex-shrink: 0; }
.self-ra-wrap { flex-shrink: 0; }
.self-ra { width: 36px; height: 36px; border-radius: 50%; }
.self-ra-ph { background: linear-gradient(135deg, #E8DCC4, #D8C9A8); display: flex; align-items: center; justify-content: center; }
.self-ra-txt { color: #A5883F; font-size: 14px; font-weight: 700; font-family: 'Songti SC', serif; }
.self-rb { flex: 1; min-width: 0; }
.self-name-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.self-name { font-size: 14px; font-weight: 700; color: #2C2C2C; }
.self-sub { display: block; font-size: 11px; color: #999; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.self-cta { background: #F1E9D8; border: 1px solid #E3D5B0; border-radius: 999px; padding: 6px 14px; flex-shrink: 0; }
.self-cta-txt { font-size: 12px; color: #A5883F; font-weight: 600; }
</style>
