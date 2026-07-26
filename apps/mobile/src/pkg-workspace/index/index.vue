<script setup lang="ts">
/**
 * 从业者工作台 · 应用外壳（对应 V0 workspace-app.tsx）
 *
 * 按老师执业动线组织 5 块主界面：工作台 / 排盘 / 报告 / 客户 / 我的。
 * 排盘是日频最高的执业锚点，居主导航；案例库、账本、品牌落款并入「我的」。
 * 咨询现场（consult-session）非空时全屏覆盖主区 —— 老师面客时专注模式。
 *
 * 入口对所有登录用户开放，功能分级（董事长 2026-07-14 拍板）：
 * 免费可用排盘/客户/账本/案例 + 3 份报告草稿；会员（¥98/月）解锁不限份数 +
 * 只读链接交付客户 + 品牌落款。分级闸门在后端，前端只做提示与引导。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import WorkbenchHome from '../components/workbench-home.vue'
import PaipanCenter from '../components/paipan-center.vue'
import ReportStudio from '../components/report-studio.vue'
import ClientManager from '../components/client-manager.vue'
import PractitionerMe from '../components/practitioner-me.vue'
import ConsultSession from '../components/consult-session.vue'
import { wsApi, type Appointment } from '../lib/workspace-api'
// 种子桥在主包：写种子的是 pkg-paipan 的结果页，读的是这里，两个分包看不见彼此
import { takeReportSeed } from '@/lib/paipan/report-seed'

const NAV = [
  { key: 'home', label: '工作台', icon: 'layout-grid' },
  { key: 'paipan', label: '排盘', icon: 'compass' },
  { key: 'reports', label: '报告', icon: 'scroll-text' },
  { key: 'clients', label: '客户', icon: 'users' },
  { key: 'me', label: '我的', icon: 'settings' },
]

const HEADER: Record<string, { title: string; subtitle: string }> = {
  home: { title: '从业者工作台', subtitle: '每日执业 · 一站起点' },
  paipan: { title: '排盘中心', subtitle: '起盘 · 断局 · 直通报告' },
  reports: { title: '报告工坊', subtitle: 'AI 初稿 · 亲手定稿 · 品质交付' },
  clients: { title: '客户管理', subtitle: '档案 · 喜忌 · 回访' },
  me: { title: '我的', subtitle: '会员 · 案例 · 设置' },
}

const tab = ref('home')
/** 咨询现场：非空时覆盖主区 */
const session = ref<Appointment | null>(null)
/** 从排盘结果页带入的报告种子（挂载时一次性消费） */
const seedId = ref<string | null>(null)
const statusBarHeight = ref(0)
const proTip = ref('')

const header = computed(() =>
  session.value
    ? { title: '咨询现场', subtitle: `${session.value.clientName} · ${session.value.service}` }
    : HEADER[tab.value],
)

onMounted(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight ?? 0
  } catch {
    statusBarHeight.value = 0
  }
})

/**
 * 每次进入都查一次种子：老师可能在排盘结果页点了「生成报告」再跳回来。
 * onShow 而非 onMounted —— 页面被 keep-alive 时 onMounted 不会重跑。
 */
onShow(async () => {
  const seed = takeReportSeed()
  if (!seed) return
  try {
    const rec = await wsApi.createReport({
      toolKey: seed.toolKey,
      type: seed.reportType,
      typeLabel: seed.typeLabel,
      title: `${seed.clientName} · ${seed.typeLabel}`,
      clientName: seed.clientName,
      clientBirth: seed.clientBirth,
      paipan: seed.paipan,
      chapters: seed.chapters,
    })
    seedId.value = rec.id
    tab.value = 'reports'
  } catch (e: any) {
    // 配额用尽是最常见的失败（免费版 3 份），把后端的话原样透出，别自己编
    proTip.value = e?.message || '报告创建失败'
    uni.showModal({
      title: '无法新建报告',
      content: proTip.value,
      confirmText: '去开通',
      cancelText: '知道了',
      success: (r) => {
        if (r.confirm) uni.navigateTo({ url: '/pkg-workspace/pro/index' })
      },
    })
    tab.value = 'reports'
  }
})

function goNotices() {
  uni.navigateTo({ url: '/pkg-notices/index/index' })
}

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="ws">
    <!-- 头部 -->
    <view class="ws-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ws-header-bar">
        <view class="ws-back" @tap="session ? (session = null) : back()">
          <AppIcon name="chevron-left" :size="44" color="#3A2A1E" />
        </view>
        <view class="ws-title-box">
          <text class="ws-title">{{ header.title }}</text>
          <text class="ws-subtitle">{{ header.subtitle }}</text>
        </view>
        <view class="ws-bell" @tap="goNotices">
          <AppIcon name="bell" :size="40" color="#3A2A1E" />
          <view class="ws-dot" />
        </view>
      </view>
    </view>

    <!-- 主区 -->
    <scroll-view class="ws-main" scroll-y :show-scrollbar="false">
      <ConsultSession
        v-if="session"
        :appointment="session"
        @exit="session = null"
        @generate-report="session = null; tab = 'reports'"
      />
      <template v-else>
        <WorkbenchHome
          v-if="tab === 'home'"
          @navigate="(t: string) => (tab = t)"
          @start-consult="(a: Appointment) => (session = a)"
        />
        <PaipanCenter v-else-if="tab === 'paipan'" @generate-report="tab = 'reports'" />
        <ReportStudio v-else-if="tab === 'reports'" :initial-id="seedId" @consumed="seedId = null" />
        <ClientManager v-else-if="tab === 'clients'" />
        <PractitionerMe v-else-if="tab === 'me'" />
      </template>
    </scroll-view>

    <!-- 底部导航 -->
    <view v-if="!session" class="ws-nav">
      <view
        v-for="n in NAV"
        :key="n.key"
        class="ws-nav-item"
        :class="{ 'ws-nav-item--on': tab === n.key }"
        @tap="tab = n.key"
      >
        <AppIcon :name="n.icon" :size="44" :color="tab === n.key ? '#C41E3A' : '#9A8C7E'" />
        <text class="ws-nav-label">{{ n.label }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.ws {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #F7F3EC;
}

.ws-header {
  background: #FDFAF4;
  border-bottom: 1rpx solid rgba(196, 30, 58, 0.12);
}

.ws-header-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 108rpx;
  padding: 0 28rpx;
}

.ws-back,
.ws-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
}

.ws-dot {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #C41E3A;
}

.ws-title-box {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ws-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #3A2A1E;
  line-height: 1.2;
}

.ws-subtitle {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

.ws-main {
  flex: 1;
  min-height: 0;
}

.ws-nav {
  display: flex;
  align-items: center;
  background: #FDFAF4;
  border-top: 1rpx solid rgba(58, 42, 30, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4rpx 20rpx rgba(58, 42, 30, 0.05);
}

.ws-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-height: 112rpx;
  padding: 8rpx 0 6rpx;
  box-sizing: border-box;
}

.ws-nav-label {
  font-size: 22rpx;
  color: #9A8C7E;
}

.ws-nav-item--on .ws-nav-label {
  color: #C41E3A;
  font-weight: 600;
}
</style>
