<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @click="goBack"><app-icon name="arrow-left" :size="20" color="#fff" /></view>
        <text class="nav-title">荣誉证书</text>
        <view class="nav-btn" @click="goPoster"><app-icon name="share-2" :size="18" color="#fff" /></view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <view class="spinner" /><text class="state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="state">
      <app-icon name="alert-circle" :size="44" color="#d1d5db" />
      <text class="state-txt">{{ error }}</text>
      <view class="retry-btn" @click="load"><text class="retry-txt">重新加载</text></view>
    </view>

    <!-- 空态：无获奖记录 / 未晋级 -->
    <view v-else-if="!canShow" class="state">
      <app-icon name="award" :size="48" color="#d1d5db" />
      <text class="state-txt">完赛并获奖后可领取证书</text>
      <view class="retry-btn ghost" @click="goBack"><text class="retry-txt ghost">返回赛事</text></view>
    </view>

    <!-- 证书 -->
    <scroll-view v-else scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="cert-wrap">
        <view class="cert">
          <view class="cert-inner">
            <!-- 抬头 -->
            <view class="cert-header">
              <text class="cert-title">获 奖 证 书</text>
              <text class="cert-sub">热卜国学传统文化平台</text>
            </view>
            <!-- 正文 -->
            <view class="cert-body">
              <text class="cert-line info">兹证明</text>
              <text class="cert-name">{{ winnerName }}</text>
              <text class="cert-line info">在「{{ compTitle }}」赛事中</text>
              <text class="cert-line info">荣获 <text class="cert-honor">{{ honorLabel }}</text></text>
              <text class="cert-line tip">特颁此证，以资鼓励</text>
            </view>
            <!-- 落款 -->
            <view class="cert-footer">
              <text class="cert-foot-txt">颁发日期：{{ issueDate }}</text>
              <text class="cert-foot-txt">证书编号：{{ certNo }}</text>
            </view>
            <!-- 红章 -->
            <view class="cert-stamp"><text class="cert-stamp-txt">热卜国学</text></view>
          </view>
        </view>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <view class="act-btn primary" :class="{ disabled: submitting }" @click="onSaveCert">
          <app-icon name="download" :size="16" color="#fff" />
          <text class="act-txt">{{ submitting ? '生成中...' : '保存证书图片' }}</text>
        </view>
        <view class="act-btn ghost" @click="goPoster">
          <app-icon name="share-2" :size="16" color="#8B0000" />
          <text class="act-txt ghost">生成分享海报</text>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  competitionApi, promotionLabel, fmtDate,
  type Competition, type Registration, type Ranking,
} from '@/lib/competition-data'

const statusBarHeight = ref(0)
const sysH = ref(667)
const scrollHeight = computed(() => sysH.value - statusBarHeight.value - 44)

const compId = ref('')
const rankingId = ref('')
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const comp = ref<Competition | null>(null)
const myRank = ref<Ranking | null>(null)

// 仅在有获奖记录且非「未晋级」时展示证书
const canShow = computed(() => !!myRank.value && myRank.value.status !== 'ELIMINATED')

const winnerName = computed(() => myRank.value?.user?.nickname || '参赛者')
const compTitle = computed(() => comp.value?.title || '国学赛事')
const honorLabel = computed(() => (myRank.value ? promotionLabel[myRank.value.status] : ''))
const issueDate = computed(() => fmtDate(new Date().toISOString()))
const certNo = computed(() => (myRank.value ? myRank.value.id.slice(0, 8).toUpperCase() : ''))

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
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

/**
 * 保存证书：本项目证书由后端生成可打印 HTML（base64）。
 * H5 端以新窗口展示供打印/截图；其它端调用成功后 toast 引导至「我的-证书」。
 * 无 canvas 截图链路，诚实降级——不伪造图片落库。
 */
async function onSaveCert() {
  if (submitting.value || !myRank.value) return
  submitting.value = true
  try {
    const html = await competitionApi.certificateHtml(myRank.value.id)
    if (!html) throw new Error('empty')
    // #ifdef H5
    // 用 Blob URL 在新窗口打开后端生成的可打印 HTML（避免 document.write 的 XSS/性能问题）
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = (typeof window !== 'undefined') ? window.open(url, '_blank') : null
    if (w) {
      uni.showToast({ title: '证书已生成，可打印保存', icon: 'none' })
    } else {
      URL.revokeObjectURL(url)
      uni.showToast({ title: '证书已生成，可在「我的-证书」查看', icon: 'none' })
    }
    // #endif
    // #ifndef H5
    uni.showToast({ title: '证书已生成，可在「我的-证书」查看', icon: 'none' })
    // #endif
  } catch {
    uni.showToast({ title: '证书生成失败，请稍后重试', icon: 'none' })
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
.page { min-height: 100vh; background: #f5f0e8; }
.nav-bar { background: #8B0000; position: sticky; top: 0; z-index: 50; }
.nav-inner { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { color: #fff; font-size: 16px; font-weight: 500; }
.scroll { width: 100%; }

.state { padding: 100px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-txt { color: #9ca3af; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e8d8c0; border-top-color: #8B0000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 24px; background: #8B0000; border-radius: 8px; }
.retry-btn.ghost { background: transparent; border: 1rpx solid #C9A96E; }
.retry-txt { color: #fff; font-size: 14px; }
.retry-txt.ghost { color: #8B0000; }

/* 证书 */
.cert-wrap { padding: 20px 16px 0; }
.cert {
  background: linear-gradient(135deg, #fdf6ed 0%, #fef9f3 100%);
  border: 6px double #8B0000;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 6rpx 24rpx rgba(139,0,0,0.12);
}
.cert-inner { position: relative; border: 2px solid #C9A96E; padding: 36px 24px 44px; }
.cert-header { text-align: center; margin-bottom: 24px; }
.cert-title { display: block; font-size: 26px; color: #8B0000; letter-spacing: 8px; font-weight: 700; }
.cert-sub { display: block; font-size: 13px; color: #8a6d4a; margin-top: 10px; letter-spacing: 1px; }
.cert-body { text-align: center; margin: 28px 0 12px; }
.cert-line { display: block; font-size: 16px; color: #333; line-height: 2.4; }
.cert-line.tip { margin-top: 16px; color: #6b5640; }
.cert-name { display: block; font-size: 26px; color: #8B0000; font-weight: 700; line-height: 2.2; letter-spacing: 2px; }
.cert-honor { color: #8B0000; font-weight: 700; }
.cert-footer { display: flex; justify-content: space-between; margin-top: 32px; }
.cert-foot-txt { font-size: 11px; color: #8a6d4a; }
.cert-stamp {
  position: absolute; right: 28px; bottom: 56px;
  width: 78px; height: 78px; border: 3px solid var(--brand); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transform: rotate(-15deg); opacity: 0.78;
}
.cert-stamp-txt { color: var(--brand); font-size: 14px; font-weight: 700; letter-spacing: 1px; }

/* 操作 */
.actions { padding: 24px 16px 0; display: flex; flex-direction: column; gap: 12px; }
.act-btn { height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.act-btn.primary { background: linear-gradient(135deg, #8B0000, #a01830); }
.act-btn.primary.disabled { opacity: 0.6; }
.act-btn.ghost { background: #fdf6ed; border: 1rpx solid #C9A96E; }
.act-txt { color: #fff; font-size: 15px; font-weight: 600; }
.act-txt.ghost { color: #8B0000; }
.safe-bottom { height: 40px; }
</style>
