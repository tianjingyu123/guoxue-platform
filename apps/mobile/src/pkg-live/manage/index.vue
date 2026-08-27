<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="sk-page">
    <view class="sk-sec"><view class="sk-block sk-h96" /></view>
    <view class="sk-sec sk-tabs"><view class="sk-line sk-w60" /><view class="sk-line sk-w60" /><view class="sk-line sk-w60" /><view class="sk-line sk-w60" /></view>
    <view class="sk-sec"><view class="sk-block sk-h180" /><view class="sk-block sk-h180" /></view>
  </view>

  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>

  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="chevron-left" :size="44" color="#2C2C2C" />
      </view>
      <text class="nav-title">我的直播</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 汇总条 -->
      <view class="summary">
        <view class="sum-it">
          <text class="sum-n">{{ stat.monthCount }}</text>
          <text class="sum-l">本月场次</text>
        </view>
        <view class="sum-it">
          <text class="sum-n">{{ viewsText }}</text>
          <text class="sum-l">总观看</text>
        </view>
        <view class="sum-it" @tap="goEarnings">
          <text class="sum-n gold">{{ endedCount }}</text>
          <text class="sum-l">已结束 · 收益 ›</text>
        </view>
      </view>

      <!-- Tab -->
      <view class="tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ sel: activeTab === t.key }"
          @tap="activeTab = t.key"
        >{{ t.label }}<text v-if="tabCount(t.key)" class="tab-c">{{ tabCount(t.key) }}</text></view>
      </view>

      <!-- 场次列表 -->
      <view v-if="filtered.length" class="list">
        <view v-for="item in filtered" :key="item.id" class="lcard">
          <view class="lmain">
            <!-- 封面 9:16 -->
            <view class="cover">
              <image v-if="item.cover" class="cover-img" :src="item.cover" mode="aspectFill" />
              <view v-else class="cover-ph"><AppIcon name="video" :size="48" color="#C9B99A" /></view>
            </view>
            <view class="linfo">
              <text class="ltitle">{{ item.title }}</text>
              <view class="ltags">
                <text class="tag">{{ item.orientation === 'landscape' ? 'OBS' : '竖屏' }}</text>
                <text class="tag gold">{{ qualityLabel(item.quality) }}</text>
                <text v-if="item.priceType === 'paid'" class="tag gold">付费 ¥{{ item.price }}</text>
                <text v-if="item.selfOnly" class="tag warn" @tap.stop="showSelfOnlyTip">仅自己可见</text>
                <text v-else-if="item.removed" class="tag danger" @tap.stop="showRemovedTip">已下架</text>
              </view>
              <!-- 状态元信息 -->
              <view class="lmeta">
                <template v-if="item.status === 'live'">
                  <view class="dot" /><text class="meta-red">直播中</text><text class="meta-t"> · {{ formatNum(item.viewers) }} 人观看</text>
                </template>
                <template v-else-if="item.status === 'preview'">
                  <text class="meta-t">待开播 · </text><text class="meta-b">{{ item.scheduledTime || '立即可开' }}</text>
                </template>
                <template v-else>
                  <text class="meta-t">已结束 · 时长 {{ item.duration }} · 观看 {{ formatNum(item.viewers) }}</text>
                  <text v-if="item.status === 'ended' && !item.replayUrl" class="meta-gen"> · 回放生成中…</text>
                </template>
              </view>
            </view>
          </view>

          <!-- 操作栏（按状态） -->
          <view class="lops">
            <template v-if="item.status === 'live'">
              <view class="lbtn pri" @tap="enterConsole(item)">{{ item.orientation === 'portrait' ? '进入直播间' : '进入控制台' }}</view>
            </template>
            <template v-else-if="item.status === 'preview'">
              <view class="lbtn txt" @tap="confirmDelete(item)">删除</view>
              <view class="lbtn" @tap="editRoom(item)">编辑</view>
              <view class="lbtn pri" @tap="startLive(item)">开始直播</view>
            </template>
            <template v-else>
              <view class="lbtn txt" @tap="confirmDelete(item)">删除</view>
              <view v-if="item.replayUrl" class="lbtn" @tap="viewReplay(item)">查看回放</view>
              <view class="lbtn" @tap="viewData(item)">数据复盘</view>
            </template>
          </view>
        </view>
      </view>

      <!-- 空态（按 Tab 文案） -->
      <view v-else class="empty">
        <view class="empty-ic"><AppIcon name="video" :size="88" color="#D8D0C4" /></view>
        <text class="empty-t">{{ emptyText.title }}</text>
        <text class="empty-d">{{ emptyText.desc }}</text>
        <view v-if="activeTab === 'all'" class="empty-cta" @tap="goCreate">立即创建直播</view>
      </view>

      <view class="foot-space" />
    </scroll-view>

    <!-- 悬浮创建 -->
    <view class="fab" @tap="goCreate">
      <AppIcon name="plus" :size="34" color="#fff" />
      <text class="fab-t">创建直播</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi, liveManageTabs, type LiveManageItem } from '@/lib/live-data'

// 三态 UI
const loading = ref(true)
const error = ref('')

const tabs = liveManageTabs
const activeTab = ref('all')
const stat = ref<{ monthCount: number; totalViews: number; endedCount: number }>({ monthCount: 0, totalViews: 0, endedCount: 0 })
const list = ref<LiveManageItem[]>([])

const viewsText = computed(() => {
  const v = stat.value.totalViews
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(v)
})
const endedCount = computed(() => stat.value.endedCount)

const filtered = computed(() =>
  activeTab.value === 'all' ? list.value : list.value.filter((i) => i.status === activeTab.value),
)
function tabCount(key: string): number {
  return key === 'all' ? list.value.length : list.value.filter((i) => i.status === key).length
}
function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString()
}
function qualityLabel(q: string): string {
  return q === 'hd' ? '高清 720P' : q === 'uhd' ? '超清 1080P' : '标清'
}

// 空态文案按 Tab
const emptyText = computed(() => {
  switch (activeTab.value) {
    case 'preview': return { title: '还没有预约中的直播', desc: '提前预约能让粉丝蹲守你的开播' }
    case 'live': return { title: '当前没有进行中的直播', desc: '去创建一场，与你的圈子实时互动' }
    case 'ended': return { title: '还没有已结束的直播', desc: '播过的每一场，都会在这里留下足迹' }
    default: return { title: '你的第一场直播，就差一个开始', desc: '开播即推送给你的圈子成员，讲课、聊天、带货都可以' }
  }
})

// ── 数据加载 ──（onShow 每次回到本页刷新，开播/删除后列表即时更新）
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getManageList()
    list.value = res.list
    // monthCount 取真实聚合（stats[0].value）；总观看用列表 viewers 聚合（stats[1] 是格式化串）
    stat.value = {
      monthCount: Number(res.stats[0]?.value ?? 0),
      totalViews: res.list.reduce((s, i) => s + i.viewers, 0),
      endedCount: res.list.filter((i) => i.status === 'ended').length,
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
onShow(() => { fetchData() })

// ── 操作 ──
function goCreate() { navigateTo('/pkg-live/create/index') }
function goEarnings() { navigateTo('/pkg-live/earnings/index') }
function portraitRoomUrl(id: string | number) {
  // #ifdef APP-PLUS
  return `/pkg-live/host/index?id=${id}`
  // #endif
  // #ifndef APP-PLUS
  return `/pkg-live/console/index?id=${id}`
  // #endif
}
function enterConsole(item: LiveManageItem) {
  navigateTo(item.orientation === 'landscape'
    ? `/pkg-live/console/index?id=${item.id}&source=obs`
    : portraitRoomUrl(item.id))
}
function editRoom(item: LiveManageItem) { navigateTo(`/pkg-live/create/index?id=${item.id}`) }
function viewData(item: LiveManageItem) { navigateTo(`/pkg-live/analytics/index?id=${item.id}`) }
function viewReplay(item: LiveManageItem) { navigateTo(`/pkg-live/watch/index?id=${item.id}`) }

// 开始直播（房主本人放开·317041e0）→ 成功进控制台
const starting = ref(false)
function startLive(item: LiveManageItem) {
  if (starting.value) return
  if (item.orientation === 'landscape') {
    navigateTo(`/pkg-live/obs/index?id=${item.id}`)
    return
  }
  // #ifndef APP-PLUS
  uni.showToast({ title: '手机视频开播需要使用热卜 App', icon: 'none' })
  return undefined
  // #endif
  uni.showModal({
    title: '开始直播', content: `确定现在开播「${item.title}」吗？`, confirmText: '开播',
    success: async (res) => {
      if (!res.confirm) return
      starting.value = true
      uni.showLoading({ title: '开播中…' })
      try {
        await liveApi.startLive(String(item.id))
        uni.hideLoading()
        navigateTo(portraitRoomUrl(item.id))
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: (e as Error)?.message || '开播失败，请重试', icon: 'none' })
      } finally {
        starting.value = false
      }
    },
  })
}

// 删除直播间（真删除·DELETE /live/rooms/:id·二次确认）
const deleting = ref(false)
function confirmDelete(item: LiveManageItem) {
  if (deleting.value) return
  uni.showModal({
    title: '删除直播', content: `确定删除「${item.title}」吗？删除后不可恢复。`, confirmText: '删除', confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      deleting.value = true
      try {
        await liveApi.deleteRoom(String(item.id))
        list.value = list.value.filter((i) => i.id !== item.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      } finally {
        deleting.value = false
      }
    },
  })
}

// 审核无感化说明
function showSelfOnlyTip() {
  uni.showModal({ title: '仅自己可见', content: '该直播间经系统复核暂时调整为仅自己可见，不影响您查看和管理。如有疑问请联系客服申诉。', showCancel: false, confirmText: '知道了' })
}
function showRemovedTip() {
  uni.showModal({ title: '已下架', content: '该直播间因涉及违规内容已被下架，具体原因可在消息中心查看。如有疑问请联系客服申诉。', showCancel: false, confirmText: '知道了' })
}
</script>

<style scoped>
/* 骨架屏 */
.sk-page { min-height: 100vh; background: #FAF8F5; padding-top: 96rpx; }
.sk-sec { padding: 24rpx 32rpx 0; }
.sk-tabs { display: flex; gap: 32rpx; }
.sk-line { height: 28rpx; border-radius: 8rpx; background: #EFEAE1; }
.sk-w60 { width: 96rpx; }
.sk-block { border-radius: 24rpx; background: linear-gradient(90deg, #EFEAE1 25%, #F7F4EE 50%, #EFEAE1 75%); background-size: 200% 100%; animation: sk 1.4s infinite; margin-bottom: 20rpx; }
@keyframes sk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.sk-h96 { height: 96rpx; }
.sk-h180 { height: 180rpx; }

/* 错误状态 */
.error-state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FAF8F5; padding: 48rpx; }
.error-text { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.retry-btn { padding: 20rpx 64rpx; background: #C41E3A; color: #fff; border-radius: 24rpx; font-size: 28rpx; }

/* 页面 */
.page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
.nav { flex-shrink: 0; background: #FAF8F5; height: calc(96rpx + var(--status-bar-height)); padding: var(--status-bar-height) 32rpx 0; display: flex; align-items: center; justify-content: space-between; }
.nav-btn { margin-left: -20rpx; width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-placeholder { width: 88rpx; }
.scroll { flex: 1; }

/* 汇总条 */
.summary { margin: 24rpx 32rpx 0; background: #fff; border: 1rpx solid #F0EBE2; border-radius: 28rpx; display: flex; padding: 24rpx 0; }
.sum-it { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; border-right: 1rpx solid #F5F1EA; }
.sum-it:last-child { border-right: none; }
.sum-n { font-size: 36rpx; font-weight: 700; color: #2C2C2C; font-family: "SF Mono", Menlo, Consolas, monospace; }
.sum-n.gold { color: #C9A96E; }
.sum-l { font-size: 22rpx; color: #999; }

/* Tab（下划线式） */
.tabs { display: flex; margin: 24rpx 0 0; padding: 0 16rpx; border-bottom: 1rpx solid #F0EBE2; }
.tab { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; position: relative; }
.tab.sel { color: #C41E3A; font-weight: 600; }
.tab.sel::after { content: ''; position: absolute; bottom: 0; left: 50%; margin-left: -28rpx; width: 56rpx; height: 6rpx; background: #C41E3A; border-radius: 6rpx; }
.tab-c { font-size: 22rpx; color: #B8B2A8; margin-left: 6rpx; }

/* 场次卡 */
.list { padding: 24rpx 32rpx 0; display: flex; flex-direction: column; gap: 20rpx; }
.lcard { background: #fff; border: 1rpx solid #F0EBE2; border-radius: 28rpx; padding: 24rpx; }
.lmain { display: flex; gap: 20rpx; }
.cover { width: 128rpx; height: 172rpx; border-radius: 16rpx; overflow: hidden; background: #F0EBE2; flex-shrink: 0; }
.cover-img { width: 100%; height: 100%; }
.cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.linfo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ltitle { font-size: 28rpx; font-weight: 600; color: #2C2C2C; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ltags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.tag { font-size: 20rpx; line-height: 1; padding: 6rpx 12rpx; border: 1rpx solid #E8E2D8; color: #999; background: #FAF8F5; border-radius: 8rpx; }
.tag.gold { border-color: #EDDFC6; color: #C9A96E; background: #FBF6EC; }
.tag.warn { border-color: #E0E0E0; color: #8C8C8C; background: #F2F2F2; }
.tag.danger { border-color: #F3D6D3; color: #C4443A; background: #FDF0EF; }
.lmeta { margin-top: auto; padding-top: 12rpx; font-size: 22rpx; color: #999; display: flex; align-items: center; flex-wrap: wrap; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #C41E3A; margin-right: 8rpx; animation: breath 1.6s ease-in-out infinite; }
@keyframes breath { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.meta-red { color: #C41E3A; font-weight: 600; }
.meta-t { color: #999; }
.meta-b { color: #2C2C2C; font-weight: 600; }
.meta-gen { color: #B8B2A8; }

/* 操作栏 */
.lops { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #F5F1EA; }
.lbtn { height: 60rpx; padding: 0 28rpx; border: 1rpx solid #DDD5C8; border-radius: 999rpx; font-size: 24rpx; color: #6E6E73; background: #fff; display: flex; align-items: center; }
.lbtn.pri { background: #C41E3A; color: #fff; border-color: #C41E3A; font-weight: 600; }
.lbtn.txt { border: none; color: #999; padding: 0 12rpx; background: transparent; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 112rpx 48rpx 64rpx; }
.empty-ic { width: 160rpx; height: 160rpx; border-radius: 50%; background: #F0EBE2; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.empty-t { font-size: 30rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 12rpx; }
.empty-d { font-size: 24rpx; color: #999; text-align: center; line-height: 1.7; margin-bottom: 32rpx; }
.empty-cta { height: 88rpx; padding: 0 56rpx; border-radius: 999rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 600; display: flex; align-items: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,.25); }

.foot-space { height: 180rpx; }

/* 悬浮创建 */
.fab { position: fixed; right: 32rpx; bottom: calc(48rpx + env(safe-area-inset-bottom)); height: 92rpx; padding: 0 36rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; gap: 10rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,.35); z-index: 30; }
.fab-t { font-size: 28rpx; font-weight: 600; color: #fff; }
</style>
