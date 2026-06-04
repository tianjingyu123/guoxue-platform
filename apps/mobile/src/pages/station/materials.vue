<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="header">
      <text
        class="back-btn"
        @click="uni.navigateBack"
      >
        ‹
      </text>
      <text class="header-title">
        推广素材库
      </text>
      <view class="header-spacer" />
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索素材..."
      >
      <text class="search-icon">
        🔍
      </text>
    </view>

    <!-- 分类Tab -->
    <scroll-view
      scroll-x
      class="tabs"
      :show-scrollbar="false"
    >
      <view class="tabs-track">
        <text
          v-for="t in tabOptions"
          :key="t.value"
          class="tab"
          :class="{ 'tab-active': activeTab === t.value }"
          @click="switchTab(t.value)"
        >
          {{ t.icon }} {{ t.label }}
        </text>
      </view>
    </scroll-view>

    <!-- 内容区 -->
    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && filteredMaterials.length === 0"
        empty-icon="📂"
        empty-title="暂无素材"
        skeleton-type="card"
        @retry="fetchData"
      >
        <view class="content-wrap">
          <!-- 海报区 -->
          <view
            v-if="showSection('poster') && posters.length > 0"
            class="section"
          >
            <text class="section-title">
              🖼️ 海报素材 ({{ posters.length }})
            </text>
            <view class="poster-grid">
              <view
                v-for="p in posters"
                :key="p.id"
                class="poster-card"
                @click="selectedPoster = p"
              >
                <image
                  :src="p.thumbnail || p.image"
                  class="poster-img"
                  mode="aspectFill"
                />
                <view class="poster-overlay">
                  <text class="poster-use">
                    使用 {{ p.useCount || 0 }} 次
                  </text>
                </view>
                <view class="poster-info">
                  <text class="poster-name">
                    {{ p.title }}
                  </text>
                  <view class="poster-tags">
                    <text
                      v-for="(tag, ti) in (p.tags || []).slice(0, 2)"
                      :key="ti"
                      class="poster-tag"
                    >
                      {{ tag }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 文案区 -->
          <view
            v-if="showSection('copywriting') && copywritings.length > 0"
            class="section"
          >
            <text class="section-title">
              📝 文案素材 ({{ copywritings.length }})
            </text>
            <view class="copy-list">
              <view
                v-for="c in copywritings"
                :key="c.id"
                class="copy-card"
              >
                <view class="copy-header">
                  <view class="copy-meta">
                    <text class="copy-title">
                      {{ c.title }}
                    </text>
                    <text
                      v-if="c.scene"
                      class="copy-scene"
                    >
                      适用: {{ c.scene }}
                    </text>
                  </view>
                  <text
                    class="copy-btn"
                    :class="{ 'copy-btn-done': copiedId === c.id }"
                    @click="handleCopy(c)"
                  >
                    {{ copiedId === c.id ? '✓ 已复制' : '复制' }}
                  </text>
                </view>
                <text
                  class="copy-content"
                  :class="{ expanded: expandedCopy === c.id }"
                >
                  {{ c.content }}
                </text>
                <text
                  v-if="(c.content || '').split('\n').length > 3"
                  class="copy-expand"
                  @click="toggleExpand(c.id)"
                >
                  {{ expandedCopy === c.id ? '收起' : '展开全文' }}
                </text>
                <view class="copy-footer">
                  <text class="copy-count">
                    已复制 {{ c.copyCount || 0 }} 次
                  </text>
                  <view class="copy-tags">
                    <text
                      v-for="(tag, ti) in (c.tags || [])"
                      :key="ti"
                      class="copy-tag"
                    >
                      {{ tag }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 二维码区 -->
          <view
            v-if="showSection('qrcode') && qrcodes.length > 0"
            class="section"
          >
            <text class="section-title">
              📱 二维码 ({{ qrcodes.length }})
            </text>
            <view class="qrcode-grid">
              <view
                v-for="qr in qrcodes"
                :key="qr.id"
                class="qrcode-card"
                @click="selectedQrcode = qr"
              >
                <image
                  :src="qr.qrcodeUrl || qr.image"
                  class="qrcode-img"
                  mode="aspectFill"
                />
                <text class="qrcode-name">
                  {{ qr.title }}
                </text>
                <text class="qrcode-scan">
                  扫描 {{ qr.scanCount || 0 }} 次
                </text>
              </view>
            </view>
          </view>
        </view>
      </DataState>
    </scroll-view>

    <!-- 海报预览弹窗 -->
    <view
      v-if="selectedPoster"
      class="dialog-overlay"
      @click="selectedPoster = null"
    >
      <view
        class="dialog-preview"
        @click.stop
      >
        <image
          :src="selectedPoster.fullImage || selectedPoster.image"
          class="preview-img"
          mode="widthFix"
        />
        <view class="preview-actions">
          <text
            class="preview-btn"
            @click="handleSavePoster(selectedPoster)"
          >
            💾 保存图片
          </text>
          <text
            class="preview-btn preview-btn-primary"
            @click="handleSharePoster(selectedPoster)"
          >
            📤 分享
          </text>
        </view>
      </view>
    </view>

    <!-- 二维码详情弹窗 -->
    <view
      v-if="selectedQrcode"
      class="dialog-overlay"
      @click="selectedQrcode = null"
    >
      <view
        class="dialog-qrcode"
        @click.stop
      >
        <image
          :src="selectedQrcode.qrcodeUrl || selectedQrcode.image"
          class="qrcode-full"
          mode="aspectFit"
        />
        <text class="qrcode-desc">
          长按二维码保存到相册
        </text>
        <text class="qrcode-stats">
          扫描次数: {{ selectedQrcode.scanCount || 0 }}
        </text>
        <view class="qrcode-actions">
          <text
            class="qrcode-action"
            @click="handleSaveQrcode(selectedQrcode)"
          >
            💾 保存图片
          </text>
          <text
            class="qrcode-action qrcode-action-primary"
            @click="handleCopyLink(selectedQrcode)"
          >
            📋 复制链接
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const data = ref<any>(null)
const activeTab = ref('all')
const searchKeyword = ref('')
const selectedPoster = ref<any>(null)
const selectedQrcode = ref<any>(null)
const expandedCopy = ref<number | null>(null)
const copiedId = ref<number | null>(null)

const tabOptions = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'poster', label: '海报', icon: '🖼️' },
  { value: 'copywriting', label: '文案', icon: '📝' },
  { value: 'qrcode', label: '二维码', icon: '📱' },
]

const allMaterials = computed(() => data.value?.materials || [])
const posters = computed(() => allMaterials.value.filter((m: any) => m.type === 'poster'))
const copywritings = computed(() => allMaterials.value.filter((m: any) => m.type === 'copywriting'))
const qrcodes = computed(() => allMaterials.value.filter((m: any) => m.type === 'qrcode'))

const filteredMaterials = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return allMaterials.value
  return allMaterials.value.filter((m: any) => {
    if (m.type === 'poster') return (m.title || '').toLowerCase().includes(kw) || (m.tags || []).some((t: string) => t.toLowerCase().includes(kw))
    if (m.type === 'copywriting') return (m.title || '').toLowerCase().includes(kw) || (m.content || '').toLowerCase().includes(kw)
    if (m.type === 'qrcode') return (m.title || '').toLowerCase().includes(kw)
    return true
  })
})

function showSection(type: string): boolean {
  if (activeTab.value === 'all') return true
  return activeTab.value === type
}

function getStationCode(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.code || page?.options?.stationCode || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const params: any = {}
    if (activeTab.value !== 'all') params.type = activeTab.value
    const res: any = await api.stationApi.getMaterials?.(params) || {}
    data.value = res?.data || res || {}
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(val: string) {
  activeTab.value = val
  fetchData()
}

async function handleCopy(item: any) {
  try {
    await uni.setClipboardData({ data: item.content })
    copiedId.value = item.id
    uni.showToast({ title: '已复制' })
    setTimeout(() => { copiedId.value = null }, 2000)
    try {
      const api = require('../../api')
      await api.stationApi.useMaterial?.(item.id, 'copywriting', 'copy')
    } catch {}
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}

function toggleExpand(id: number) {
  expandedCopy.value = expandedCopy.value === id ? null : id
}

function handleSavePoster(poster: any) {
  uni.showToast({ title: '开始下载...', icon: 'none' })
  try {
    const api = require('../../api')
    api.stationApi.useMaterial?.(poster.id, 'poster', 'download')
  } catch {}
  // In UniApp, we save to album
  uni.downloadFile({
    url: poster.fullImage || poster.image,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => { uni.showToast({ title: '保存成功' }) },
        fail: () => { uni.showToast({ title: '保存失败', icon: 'none' }) },
      })
    },
  })
}

function handleSharePoster(poster: any) {
  uni.showActionSheet({
    itemList: ['分享给好友', '保存图片'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: '分享功能开发中', icon: 'none' })
      } else {
        handleSavePoster(poster)
      }
    },
  })
}

function handleSaveQrcode(qr: any) {
  uni.downloadFile({
    url: qr.qrcodeUrl || qr.image,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => { uni.showToast({ title: '保存成功' }) },
        fail: () => { uni.showToast({ title: '保存失败', icon: 'none' }) },
      })
    },
  })
  try {
    const api = require('../../api')
    api.stationApi.useMaterial?.(qr.id, 'qrcode', 'save')
  } catch {}
}

async function handleCopyLink(qr: any) {
  try {
    await uni.setClipboardData({ data: qr.targetUrl || qr.url || '' })
    uni.showToast({ title: '链接已复制' })
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; flex: 1; }
.header-spacer { width: 44rpx; }

.search-bar { position: relative; padding: 16rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.search-input { width: 100%; height: 64rpx; background: #F5F0E8; border: none; border-radius: 32rpx; padding: 0 32rpx 0 64rpx; font-size: 24rpx; box-sizing: border-box; }
.search-icon { position: absolute; left: 44rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; }

.tabs { background: #fff; padding: 0 24rpx 16rpx; }
.tabs-track { display: flex; gap: 16rpx; }
.tab { padding: 12rpx 28rpx; border-radius: 24rpx; font-size: 24rpx; color: #666; background: #F5F0E8; white-space: nowrap; }
.tab-active { background: #C41E3A; color: #fff; font-weight: 500; }

.scroll-area { padding: 24rpx; }
.content-wrap { }

.section { margin-bottom: 32rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }

.poster-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.poster-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.poster-img { width: 100%; aspect-ratio: 3/4; }
.poster-overlay { position: relative; margin-top: -48rpx; padding: 16rpx; background: linear-gradient(transparent, rgba(0,0,0,0.5)); }
.poster-use { font-size: 20rpx; color: rgba(255,255,255,0.8); }
.poster-info { padding: 12rpx; }
.poster-name { font-size: 24rpx; color: #2C2C2C; display: block; }
.poster-tags { display: flex; gap: 4rpx; margin-top: 4rpx; }
.poster-tag { font-size: 18rpx; color: #999; background: #F5F0E8; padding: 2rpx 12rpx; border-radius: 8rpx; }

.copy-list { display: flex; flex-direction: column; gap: 16rpx; }
.copy-card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.copy-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12rpx; }
.copy-meta { flex: 1; }
.copy-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.copy-scene { font-size: 20rpx; color: #ccc; margin-top: 4rpx; display: block; }
.copy-btn { padding: 8rpx 24rpx; border-radius: 20rpx; font-size: 22rpx; border: 1rpx solid #E8E0D5; color: #666; flex-shrink: 0; }
.copy-btn-done { background: #52C41A; color: #fff; border-color: #52C41A; }
.copy-content { font-size: 24rpx; color: #666; line-height: 1.6; display: block; max-height: 120rpx; overflow: hidden; transition: max-height 0.3s; }
.copy-content.expanded { max-height: none; }
.copy-expand { font-size: 22rpx; color: #C41E3A; margin-top: 8rpx; display: inline-block; }
.copy-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F5F0E8; }
.copy-count { font-size: 20rpx; color: #ccc; }
.copy-tags { display: flex; gap: 4rpx; }
.copy-tag { font-size: 18rpx; color: #C41E3A; background: rgba(196,30,58,0.05); padding: 2rpx 12rpx; border-radius: 8rpx; }

.qrcode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.qrcode-card { background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.qrcode-img { width: 160rpx; height: 160rpx; margin: 0 auto 12rpx; }
.qrcode-name { font-size: 24rpx; color: #2C2C2C; display: block; }
.qrcode-scan { font-size: 20rpx; color: #ccc; margin-top: 4rpx; display: block; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40rpx; }
.dialog-preview { width: 100%; max-height: 80vh; display: flex; flex-direction: column; }
.preview-img { width: 100%; border-radius: 16rpx; }
.preview-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.preview-btn { flex: 1; padding: 24rpx; text-align: center; background: #fff; border-radius: 16rpx; font-size: 26rpx; color: #2C2C2C; }
.preview-btn-primary { background: #C41E3A; color: #fff; }

.dialog-qrcode { background: #fff; border-radius: 24rpx; padding: 48rpx; width: 560rpx; text-align: center; }
.qrcode-full { width: 320rpx; height: 320rpx; margin: 0 auto 20rpx; }
.qrcode-desc { font-size: 24rpx; color: #666; display: block; margin-bottom: 8rpx; }
.qrcode-stats { font-size: 22rpx; color: #ccc; display: block; margin-bottom: 24rpx; }
.qrcode-actions { display: flex; gap: 16rpx; }
.qrcode-action { flex: 1; padding: 20rpx; border-radius: 12rpx; font-size: 24rpx; background: #F5F0E8; color: #666; }
.qrcode-action-primary { background: #C41E3A; color: #fff; }
</style>
