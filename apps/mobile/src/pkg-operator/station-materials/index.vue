<template>
  <view class="mat-page">
    <!-- 导航栏 -->
    <view class="mat-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mat-nav-inner">
        <view class="mat-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#374151" />
        </view>
        <text class="mat-nav-title">推广素材库</text>
        <view class="mat-nav-btn" :class="{ spinning: loading }" @tap="onRefresh">
          <app-icon name="refresh-cw" :size="36" color="#4b5563" />
        </view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="mat-state">
      <view class="mat-spinner" /><text class="mat-state-txt">加载中...</text>
    </view>

    <!-- 未开通分站 -->
    <view v-else-if="notOpened" class="mat-state">
      <app-icon name="store" :size="96" color="#d1d5db" />
      <text class="mat-state-txt">你还没有开通分站</text>
      <view class="mat-state-btn" @tap="goJoin"><text class="mat-state-btn-txt">去开通分站</text></view>
    </view>

    <!-- error -->
    <view v-else-if="error" class="mat-state">
      <app-icon name="alert-circle" :size="96" color="#d1d5db" />
      <text class="mat-state-txt">{{ error }}</text>
      <view class="mat-state-btn" @tap="load"><text class="mat-state-btn-txt">重新加载</text></view>
    </view>

    <template v-else>
      <!-- 搜索框 -->
      <view class="mat-search-wrap">
        <view class="mat-search">
          <app-icon name="search" :size="32" color="#9ca3af" />
          <input v-model="searchKeyword" class="mat-search-input" placeholder="搜索素材..." placeholder-class="mat-search-ph" />
        </view>
      </view>

      <!-- 生成专属海报入口 -->
      <view class="mat-poster-entry-wrap">
        <view class="mat-poster-entry" @tap="goPoster">
          <view class="mat-poster-entry-left">
            <view class="mat-poster-entry-icon">
              <app-icon name="image" :size="40" color="#ffffff" />
            </view>
            <view>
              <text class="mat-poster-entry-title">生成专属分站海报</text>
              <text class="mat-poster-entry-sub">自定义风格，含专属二维码</text>
            </view>
          </view>
          <app-icon name="qr-code" :size="32" color="#ffffff" />
        </view>
      </view>

      <!-- 分类Tab -->
      <view class="mat-tabs-wrap">
        <view class="mat-tabs">
          <view
            v-for="t in tabs"
            :key="t.value"
            class="mat-tab"
            :class="{ active: activeTab === t.value }"
            @tap="activeTab = t.value"
          >
            <app-icon v-if="t.icon" :name="t.icon" :size="24" :color="activeTab === t.value ? '#111827' : '#6b7280'" />
            <text class="mat-tab-txt">{{ t.label }}</text>
            <text class="mat-tab-count">{{ t.count }}</text>
          </view>
        </view>
      </view>

      <!-- 内容区 -->
      <view v-if="currentEmpty" class="mat-empty">
        <app-icon name="image" :size="96" color="#d1d5db" />
        <text class="mat-empty-txt">{{ activeTab === 'all' ? '暂无推广素材' : '暂无该类型素材' }}</text>
      </view>
      <view v-else class="mat-body">
        <!-- 海报区 -->
        <view v-if="showPoster" class="mat-section">
          <view class="mat-section-title">
            <app-icon name="image" :size="32" color="#C41E3A" />
            <text class="mat-section-title-txt">海报素材</text>
            <text class="mat-section-count">({{ posters.length }})</text>
          </view>
          <view class="mat-grid">
            <view v-for="p in posters" :key="p.id" class="mat-poster-card">
              <view class="mat-poster-thumb">
                <image lazy-load v-if="p.imageUrl" :src="p.imageUrl" class="mat-poster-img" mode="aspectFill" />
                <view v-else class="mat-poster-ph">
                  <app-icon name="image" :size="64" color="#cbd5e1" />
                </view>
                <view class="mat-poster-use">
                  <text class="mat-poster-use-txt">使用 {{ p.usageCount }} 次</text>
                </view>
              </view>
              <view class="mat-poster-info">
                <text class="mat-poster-card-title">{{ p.title }}</text>
                <view v-if="p.tags.length" class="mat-tags">
                  <text v-for="tag in p.tags.slice(0, 2)" :key="tag" class="mat-tag">{{ tag }}</text>
                </view>
                <view class="mat-use-btn" :class="{ disabled: actingId === p.id }" @tap="useMaterial(p)">
                  <app-icon name="image" :size="24" color="#C41E3A" />
                  <text class="mat-use-btn-txt">使用素材</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 文案区 -->
        <view v-if="showCopy" class="mat-section">
          <view class="mat-section-title">
            <app-icon name="file-text" :size="32" color="#C41E3A" />
            <text class="mat-section-title-txt">文案素材</text>
            <text class="mat-section-count">({{ copys.length }})</text>
          </view>
          <view class="mat-copy-list">
            <view v-for="c in copys" :key="c.id" class="mat-copy-card">
              <view class="mat-copy-head">
                <text class="mat-copy-title">{{ c.title }}</text>
                <view
                  class="mat-copy-btn"
                  :class="{ copied: copiedId === c.id, disabled: actingId === c.id }"
                  @tap="handleCopy(c)"
                >
                  <app-icon :name="copiedId === c.id ? 'check' : 'copy'" :size="24" :color="copiedId === c.id ? '#ffffff' : '#374151'" />
                  <text class="mat-copy-btn-txt" :style="{ color: copiedId === c.id ? '#fff' : '#374151' }">{{ copiedId === c.id ? '已复制' : '复制文案' }}</text>
                </view>
              </view>
              <text class="mat-copy-content" :class="{ clamp: expandedId !== c.id }">{{ c.content }}</text>
              <text
                v-if="c.content.split('\n').length > 3 || c.content.length > 80"
                class="mat-copy-toggle"
                @tap="expandedId = expandedId === c.id ? '' : c.id"
              >
                {{ expandedId === c.id ? '收起' : '展开全文' }}
              </text>
              <view class="mat-copy-foot">
                <text class="mat-copy-count">已使用 {{ c.usageCount }} 次</text>
                <view v-if="c.tags.length" class="mat-tags">
                  <text v-for="tag in c.tags" :key="tag" class="mat-tag mat-tag-red">{{ tag }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 推广码区 -->
        <view v-if="showQr" class="mat-section">
          <view class="mat-section-title">
            <app-icon name="qr-code" :size="32" color="#C41E3A" />
            <text class="mat-section-title-txt">推广码</text>
            <text class="mat-section-count">({{ qrcodes.length }})</text>
          </view>
          <view class="mat-grid">
            <view v-for="q in qrcodes" :key="q.id" class="mat-qr-card">
              <view class="mat-qr-thumb">
                <image lazy-load v-if="q.imageUrl" :src="q.imageUrl" class="mat-qr-img" mode="aspectFit" />
                <app-icon v-else name="qr-code" :size="96" color="#9ca3af" />
              </view>
              <text class="mat-qr-title">{{ q.title }}</text>
              <text class="mat-qr-scan">使用 {{ q.usageCount }} 次</text>
              <view class="mat-use-btn mat-use-btn-block" :class="{ disabled: actingId === q.id }" @tap="useMaterial(q)">
                <app-icon name="qr-code" :size="24" color="#C41E3A" />
                <text class="mat-use-btn-txt">使用素材</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { operatorApi, type PromotionMaterialItem } from '@/lib/operator-data'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)

const materials = ref<PromotionMaterialItem[]>([])
const actingId = ref('') // 写操作防重（同一时刻仅一条素材可触发记录）
const copiedId = ref('') // 复制成功反馈
const expandedId = ref('') // 文案展开

const activeTab = ref<'all' | 'poster' | 'copy' | 'qrcode'>('all')
const searchKeyword = ref('')
const kw = computed(() => searchKeyword.value.trim())

function matchKw(m: PromotionMaterialItem): boolean {
  if (!kw.value) return true
  return m.title.includes(kw.value) || m.content.includes(kw.value) || m.tags.some((t) => t.includes(kw.value))
}

const searched = computed(() => materials.value.filter(matchKw))
const posters = computed(() => searched.value.filter((m) => m.type === 'poster'))
const copys = computed(() => searched.value.filter((m) => m.type === 'copy'))
const qrcodes = computed(() => searched.value.filter((m) => m.type === 'qrcode'))

const tabs = computed(() => [
  { value: 'all' as const, label: '全部', icon: '', count: searched.value.length },
  { value: 'poster' as const, label: '海报', icon: 'image', count: posters.value.length },
  { value: 'copy' as const, label: '文案', icon: 'file-text', count: copys.value.length },
  { value: 'qrcode' as const, label: '推广码', icon: 'qr-code', count: qrcodes.value.length },
])

const showPoster = computed(() => (activeTab.value === 'all' || activeTab.value === 'poster') && posters.value.length > 0)
const showCopy = computed(() => (activeTab.value === 'all' || activeTab.value === 'copy') && copys.value.length > 0)
const showQr = computed(() => (activeTab.value === 'all' || activeTab.value === 'qrcode') && qrcodes.value.length > 0)
const currentEmpty = computed(() => !showPoster.value && !showCopy.value && !showQr.value)

async function load() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    materials.value = await operatorApi.getMyStationMaterials()
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('开通分站') || msg.includes('没有开通') || msg.includes('NOT_FOUND')) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

// 海报/推广码：记录使用 + 诚实降级（后端无 OSS，不伪造图片下载）
async function useMaterial(m: PromotionMaterialItem) {
  if (actingId.value) return
  actingId.value = m.id
  try {
    await operatorApi.useStationMaterial(m.id)
    m.usageCount = (m.usageCount || 0) + 1
    uni.showToast({ title: '素材已记录使用，图片下载即将开放', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    actingId.value = ''
  }
}

// 文案：复制全文 + 记录使用
async function handleCopy(c: PromotionMaterialItem) {
  if (actingId.value) return
  actingId.value = c.id
  try {
    await new Promise<void>((resolve, reject) => {
      uni.setClipboardData({ data: c.content, success: () => resolve(), fail: () => reject(new Error('复制失败')) })
    })
    copiedId.value = c.id
    setTimeout(() => {
      if (copiedId.value === c.id) copiedId.value = ''
    }, 2000)
    uni.showToast({ title: '已复制', icon: 'none' })
    try {
      await operatorApi.useStationMaterial(c.id)
      c.usageCount = (c.usageCount || 0) + 1
    } catch (e) {
      // 复制已成功，记录失败不打断用户
    }
  } catch (e: any) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  } finally {
    actingId.value = ''
  }
}

function onRefresh() {
  if (loading.value) return
  load()
}
function goBack() {
  navigateBack()
}
function goJoin() {
  navigateTo('/pkg-operator/join-station/index')
}
function goPoster() {
  navigateTo('/pkg-operator/station-poster/index')
}

onMounted(load)
</script>

<style lang="scss" scoped>
.mat-page {
  min-height: 100vh;
  background: #faf8f5;
}
.mat-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1rpx solid #f3f4f6;
}
.mat-nav-inner {
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}
.mat-nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mat-nav-btn.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.mat-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
}

/* 三态 */
.mat-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 32rpx;
  gap: 24rpx;
}
.mat-state-txt {
  font-size: 28rpx;
  color: #6b7280;
}
.mat-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #f0d0d4;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.mat-state-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.mat-state-btn-txt {
  color: #fff;
  font-size: 28rpx;
}

.mat-search-wrap {
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f3f4f6;
}
.mat-search {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  background: #f9fafb;
  border-radius: 16rpx;
  padding: 0 24rpx;
}
.mat-search-input {
  flex: 1;
  font-size: 28rpx;
  color: #374151;
}
.mat-search-ph {
  color: #9ca3af;
}

.mat-poster-entry-wrap {
  padding: 24rpx 32rpx 0;
}
.mat-poster-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(to right, var(--brand), #a01830);
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
}
.mat-poster-entry-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.mat-poster-entry-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mat-poster-entry-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  display: block;
}
.mat-poster-entry-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

.mat-tabs-wrap {
  padding: 24rpx 32rpx;
  background: #fff;
}
.mat-tabs {
  display: flex;
  background: rgba(243, 244, 246, 0.8);
  border-radius: 16rpx;
  padding: 6rpx;
}
.mat-tab {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border-radius: 12rpx;
}
.mat-tab.active {
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.mat-tab-txt {
  font-size: 28rpx;
  color: #6b7280;
}
.mat-tab.active .mat-tab-txt {
  color: #111827;
  font-weight: 500;
}
.mat-tab-count {
  font-size: 22rpx;
  color: #9ca3af;
}

.mat-empty {
  padding: 120rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.mat-empty-txt {
  font-size: 28rpx;
  color: #9ca3af;
}
.mat-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}
.mat-section-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.mat-section-title-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #111827;
}
.mat-section-count {
  font-size: 22rpx;
  color: #9ca3af;
}
.mat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}
.mat-poster-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.mat-poster-thumb {
  position: relative;
  aspect-ratio: 3 / 4;
  background: #f1f5f9;
}
.mat-poster-img {
  width: 100%;
  height: 100%;
  display: block;
}
.mat-poster-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mat-poster-use {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  padding: 16rpx;
}
.mat-poster-use-txt {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}
.mat-poster-info {
  padding: 16rpx;
}
.mat-poster-card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.mat-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
  flex-wrap: wrap;
}
.mat-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 6rpx;
}
.mat-tag-red {
  background: rgba(196, 30, 58, 0.05);
  color: var(--brand);
}

.mat-use-btn {
  margin-top: 16rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #fef2f4;
  border-radius: 12rpx;
}
.mat-use-btn-block {
  margin-top: 24rpx;
}
.mat-use-btn.disabled {
  opacity: 0.5;
}
.mat-use-btn-txt {
  font-size: 24rpx;
  color: var(--brand);
  font-weight: 500;
}

.mat-copy-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.mat-copy-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.mat-copy-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.mat-copy-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #111827;
  flex: 1;
  min-width: 0;
}
.mat-copy-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 24rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.mat-copy-btn.copied {
  background: #22c55e;
  border-color: #22c55e;
}
.mat-copy-btn.disabled {
  opacity: 0.5;
}
.mat-copy-btn-txt {
  font-size: 24rpx;
}
.mat-copy-content {
  font-size: 28rpx;
  color: #4b5563;
  line-height: 1.6;
  white-space: pre-wrap;
}
.mat-copy-content.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mat-copy-toggle {
  font-size: 24rpx;
  color: var(--brand);
  margin-top: 16rpx;
  display: inline-block;
}
.mat-copy-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f3f4f6;
}
.mat-copy-count {
  font-size: 22rpx;
  color: #9ca3af;
}

.mat-qr-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.mat-qr-thumb {
  width: 192rpx;
  height: 192rpx;
  margin: 0 auto 24rpx;
  background: #f3f4f6;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.mat-qr-img {
  width: 100%;
  height: 100%;
}
.mat-qr-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.mat-qr-scan {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 8rpx;
  display: block;
}
</style>
