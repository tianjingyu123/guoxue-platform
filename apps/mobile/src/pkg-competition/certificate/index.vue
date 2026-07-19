<template>
  <view class="page">
    <!-- 顶部导航（宋体标题·浅底描边分隔） -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="nav-title">荣誉证书</text>
        <view class="nav-btn" @tap="goPoster"><app-icon name="share-2" :size="18" color="#A5883F" /></view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#d8cfc0" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <!-- 空态：无获奖记录 / 未晋级 -->
    <view v-else-if="!canShow" class="state">
      <app-icon name="award" :size="48" color="#d8cfc0" />
      <text class="state-txt">完赛并晋级后可领取荣誉证书</text>
      <view class="retry-btn ghost" @tap="goBack"><text class="retry-txt ghost">返回赛事</text></view>
    </view>

    <!-- 证书 -->
    <scroll-view v-else scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="cert-stage">
        <!-- 红金纸质证书·竖版 3:4 -->
        <view class="cert">
          <!-- 3:4 比例撑高（宽:高 = 3:4 → 高 = 宽 ×133.33%） -->
          <view class="cert-ratio">
            <view class="cert-inner">
              <!-- 四角金描边 -->
              <view class="corner c-tl" />
              <view class="corner c-tr" />
              <view class="corner c-bl" />
              <view class="corner c-br" />

              <!-- 品牌行 -->
              <view class="brand">
                <view class="brand-lg"><text class="brand-lg-txt">{{ sealShort }}</text></view>
                <text class="brand-name">{{ BRAND.name }}</text>
              </view>

              <!-- 标题 -->
              <text class="cert-title">{{ honorTitle }}</text>
              <text class="cert-subtitle">{{ honorTitleEn }}</text>

              <!-- 名次徽章 -->
              <view class="rankmark">
                <text class="rankmark-txt">{{ honorLabel }}</text>
              </view>

              <!-- 正文 -->
              <view class="cert-body">
                <view class="line-cn">
                  <text class="line-txt">{{ isChampionLine ? '兹授予' : '兹证明' }} </text>
                  <text class="name-u">{{ winnerName }}</text>
                  <text class="line-txt"> 先生 / 女士</text>
                </view>
                <view class="line-cn">
                  <text class="line-txt">于 </text>
                  <text class="evt">{{ compTitle }}</text>
                </view>
                <view class="line-cn">
                  <text class="line-txt">{{ bodyPrefix }} </text>
                  <text class="honor-b">{{ honorLabel }}</text>
                  <text class="line-txt">{{ bodySuffix }}</text>
                </view>
                <text v-if="scoreText" class="score-line">综合成绩 {{ scoreText }} 分</text>
              </view>

              <!-- 落款 -->
              <view class="foot">
                <view class="issuer">
                  <text class="issuer-txt">颁发单位：{{ BRAND.name }}</text>
                  <text class="issuer-txt">颁发日期：{{ issueDateCn }}</text>
                </view>
                <!-- 朱红钤印 -->
                <view class="seal">
                  <text class="seal-txt">{{ sealShort }}</text>
                  <text class="seal-txt">专用章</text>
                </view>
              </view>

              <!-- 防伪编号 -->
              <text class="serial">防伪编号 · NO. {{ serialNo }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <view class="act-btn gold" :class="{ disabled: submitting }" @tap="onSaveCert">
          <app-icon name="download" :size="16" color="#A5883F" />
          <text class="act-txt gold">{{ submitting ? '生成中...' : '保存为图片' }}</text>
        </view>
        <view class="act-btn primary" @tap="goPoster">
          <app-icon name="share-2" :size="16" color="#fff" />
          <text class="act-txt">分享荣誉</text>
        </view>
      </view>
      <text class="tip-note">证书由平台颁发，编号唯一可溯。可截图收藏或长按分享荣誉海报。</text>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { BRAND } from '@/lib/brand'
import { getUserInfo } from '@/utils/storage'
import {
  competitionApi, promotionLabel,
  type Competition, type Registration, type Ranking,
} from '@/pkg-competition/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 48)

const compId = ref('')
const rankingId = ref('')
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const comp = ref<Competition | null>(null)
const myRank = ref<Ranking | null>(null)

// 仅在有获奖记录且非「未晋级」时展示证书
const canShow = computed(() => !!myRank.value && myRank.value.status !== 'ELIMINATED')

// 冠军类（冠/亚/季）用「荣誉证书」，晋级用「晋级证书」
const isChampionLine = computed(() => {
  const s = myRank.value?.status
  return s === 'CHAMPION' || s === 'RUNNER_UP' || s === 'THIRD_PLACE'
})
const honorTitle = computed(() => (isChampionLine.value ? '荣誉证书' : '晋级证书'))
const honorTitleEn = computed(() => (isChampionLine.value ? 'CERTIFICATE OF HONOR' : 'CERTIFICATE OF ADVANCEMENT'))
const bodyPrefix = computed(() => (isChampionLine.value ? '荣获' : '成功晋级'))
const bodySuffix = computed(() => (isChampionLine.value ? '，特发此证，以资鼓励。' : '，特发此证。'))

// 获奖者：当前用户昵称（后端无真实姓名，诚实降级）
const winnerName = computed(() => {
  const u = getUserInfo<{ nickname?: string } | null>()
  return u?.nickname || myRank.value?.user?.nickname || '参赛者'
})
const compTitle = computed(() => comp.value?.title || '国学赛事')
const honorLabel = computed(() => (myRank.value ? promotionLabel[myRank.value.status] : ''))
const scoreText = computed(() => {
  const s = myRank.value?.score
  return s != null && s > 0 ? String(s) : ''
})

// 印章两字（品牌简称）
const sealShort = computed(() => BRAND.nameShort || BRAND.name.slice(0, 2))

// 日期：赛事 finishedAt 真值，中文格式；无则回退到今天
const issueDateCn = computed(() => {
  const iso = comp.value?.finishedAt || new Date().toISOString()
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()} 年 ${p(d.getMonth() + 1)} 月 ${p(d.getDate())} 日`
})

// 防伪编号：由 rankingId（真实唯一）派生，前缀含品牌 + 日期，保证唯一可溯
const serialNo = computed(() => {
  const rid = (myRank.value?.id || rankingId.value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const tail = rid.slice(-8).padStart(8, '0')
  const iso = comp.value?.finishedAt || comp.value?.createdAt || new Date().toISOString()
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  const ymd = isNaN(d.getTime()) ? '00000000' : `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  const brandCode = (BRAND.nameEn || 'RC').slice(0, 2).toUpperCase()
  return `${brandCode}-${ymd}-${tail}`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [c, reg, rk] = await Promise.all([
      competitionApi.detail(compId.value).catch(() => null),
      competitionApi.myRegistration(compId.value).catch(() => null),
      competitionApi.rankings(compId.value).catch(() => ({ items: [] as Ranking[] })),
    ])
    comp.value = c
    const items: Ranking[] = (rk as { items: Ranking[] }).items || []
    // 优先按传入 rankingId 命中；否则按我的报名 userId 命中
    let mine: Ranking | undefined
    if (rankingId.value) mine = items.find((r) => r.id === rankingId.value)
    if (!mine) {
      const myUserId = (reg as Registration | null)?.userId
      if (myUserId) mine = items.find((r) => r.userId === myUserId)
    }
    myRank.value = mine || null
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

/**
 * 保存为图片：证书为前端重绘，无内置 canvas 截图链路。
 * H5 端以后端可打印 HTML（base64）在新窗口打开供打印/截图（备选保存版）；
 * 其它端引导用户截屏收藏，诚实降级——不伪造图片落库。
 */
async function onSaveCert() {
  if (submitting.value || !myRank.value) return
  submitting.value = true
  try {
    // #ifdef H5
    const html = await competitionApi.certificateHtml(myRank.value.id)
    if (!html) throw new Error('empty')
    // 用 Blob URL 在新窗口打开后端生成的可打印 HTML（避免 document.write 的 XSS/性能问题）
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = (typeof window !== 'undefined') ? window.open(url, '_blank') : null
    if (w) {
      uni.showToast({ title: '打印版已生成，可保存', icon: 'none' })
    } else {
      URL.revokeObjectURL(url)
      uni.showToast({ title: '请长按证书截图收藏', icon: 'none' })
    }
    // #endif
    // #ifndef H5
    uni.showToast({ title: '请长按或截图收藏此证书', icon: 'none' })
    // #endif
  } catch {
    uni.showToast({ title: '请长按或截图收藏此证书', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goPoster() {
  if (compId.value) navigateTo(`/competition/${compId.value}/poster`)
}
function goBack() { navigateBack() }

onLoad((q) => {
  compId.value = (q?.id as string) || ''
  rankingId.value = (q?.rankingId as string) || ''
  uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0; sysH.value = e.windowHeight || 667 } })
  load()
})
</script>

<style lang="scss" scoped>
/* 设计 token：宣纸白 #FAF8F5 · 卡片白 #FFF · 朱红 #C41E3A · 金 #C9A96E / 深金 #A5883F · 文 #2C2C2C */
.page { min-height: 100vh; background: #FAF8F5; }

/* 顶部导航：浅底宋体标题 + 描边分隔（非同色系底字） */
.nav-bar { background: #FFFFFF; position: sticky; top: 0; z-index: 50; border-bottom: 1rpx solid #ECE7DF; }
.nav-inner { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { color: #2C2C2C; font-size: 16px; font-weight: 700; font-family: "Songti SC", "STSong", serif; letter-spacing: 1px; }
.scroll { width: 100%; }

/* 三态 */
.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9a9186; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #ECE1CC; border-top-color: #C9A96E; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: #C41E3A; border-radius: 8px; }
.retry-btn.ghost { background: #F1E9D8; border: 1rpx solid #E3D5B0; }
.retry-txt { color: #fff; font-size: 14px; }
.retry-txt.ghost { color: #A5883F; }

/* 证书舞台 */
.cert-stage { padding: 20px 16px 0; }

/* 红金纸质证书外框（金色实底衬托，X5 兼容用实色而非同色系） */
.cert {
  width: 100%;
  background: #FFFDF8;
  border: 2px solid #C9A96E;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 10px 30px rgba(150, 120, 60, 0.22);
}

/* 3:4 比例：高 = 宽 × 133.33% */
.cert-ratio {
  position: relative;
  width: 100%;
  padding-top: 133.33%;
}

/* 内层金细线框 */
.cert-inner {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border: 1rpx solid #DCC998;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px 18px;
  text-align: center;
  background: #FFFDF6;
}

/* 四角金描边 */
.corner { position: absolute; width: 20px; height: 20px; }
.c-tl { top: 6px; left: 6px; border-top: 2px solid #C9A96E; border-left: 2px solid #C9A96E; }
.c-tr { top: 6px; right: 6px; border-top: 2px solid #C9A96E; border-right: 2px solid #C9A96E; }
.c-bl { bottom: 6px; left: 6px; border-bottom: 2px solid #C9A96E; border-left: 2px solid #C9A96E; }
.c-br { bottom: 6px; right: 6px; border-bottom: 2px solid #C9A96E; border-right: 2px solid #C9A96E; }

/* 品牌行 */
.brand { display: flex; flex-direction: row; align-items: center; gap: 6px; margin-bottom: 14px; }
.brand-lg {
  width: 22px; height: 22px; border-radius: 6px;
  background: #EFE4C9; border: 1rpx solid #D0B979;
  display: flex; align-items: center; justify-content: center;
}
.brand-lg-txt { font-size: 11px; color: #A5883F; font-weight: 700; }
.brand-name { font-size: 12px; color: #A5883F; letter-spacing: 1px; }

/* 标题（宋体大字·朱红） */
.cert-title {
  font-family: "Songti SC", "STSong", serif;
  font-size: 32px; font-weight: 800; color: #C41E3A;
  letter-spacing: 8px; text-indent: 8px; line-height: 1.2;
}
.cert-subtitle { font-size: 11px; color: #A5883F; letter-spacing: 3px; margin: 4px 0 18px; }

/* 名次徽章（金双线圆章） */
.rankmark {
  width: 78px; height: 78px; border-radius: 50%;
  border: 2px double #C9A96E;
  background: #F6EEDD;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(201, 169, 110, 0.3);
}
.rankmark-txt { font-family: "Songti SC", serif; font-size: 17px; font-weight: 800; color: #A5883F; }

/* 正文 */
.cert-body { display: flex; flex-direction: column; align-items: center; }
.line-cn { display: flex; flex-direction: row; align-items: baseline; justify-content: center; flex-wrap: wrap; line-height: 2.3; }
.line-txt { font-size: 14px; color: #2C2C2C; }
.name-u {
  font-size: 18px; font-weight: 700; color: #C41E3A;
  border-bottom: 1rpx solid #DCC998; padding: 0 12px;
}
.evt { font-size: 14px; font-weight: 700; color: #2C2C2C; }
.honor-b { font-size: 14px; font-weight: 700; color: #A5883F; }
.score-line { font-size: 12px; color: #A5883F; margin-top: 8px; letter-spacing: 1px; }

/* 落款（贴底） */
.foot {
  margin-top: auto;
  width: 100%;
  display: flex; flex-direction: row; align-items: flex-end; justify-content: space-between;
  padding-top: 14px;
}
.issuer { display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
.issuer-txt { font-size: 11px; color: #6E6E73; line-height: 1.8; }

/* 朱红钤印 */
.seal {
  width: 60px; height: 60px; border-radius: 50%;
  border: 2px solid #C41E3A;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  transform: rotate(-12deg); opacity: 0.9;
}
.seal-txt { color: #C41E3A; font-size: 11px; font-weight: 800; line-height: 1.25; }

/* 防伪编号 */
.serial { font-size: 9px; color: #B9A978; letter-spacing: 1px; margin-top: 10px; }

/* 操作 */
.actions { padding: 20px 16px 0; display: flex; flex-direction: row; gap: 12px; }
.act-btn { flex: 1; height: 46px; border-radius: 999px; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; }
.act-btn.gold { background: #F1E9D8; border: 1rpx solid #E3D5B0; }
.act-btn.gold.disabled { opacity: 0.6; }
.act-btn.primary { background: linear-gradient(135deg, #C41E3A, #A01830); }
.act-txt { color: #fff; font-size: 15px; font-weight: 700; }
.act-txt.gold { color: #A5883F; }

.tip-note { display: block; text-align: center; font-size: 11px; color: #a89f92; padding: 14px 24px 0; line-height: 1.7; }
.safe-bottom { height: 40px; }
</style>
