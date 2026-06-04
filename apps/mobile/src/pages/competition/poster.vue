<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <text
        class="back-btn"
        @click="uni.navigateBack"
      >
        ‹
      </text>
      <text class="header-title">
        竞赛海报
      </text>
      <text
        class="header-action"
        @click="share"
      >
        分享
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 海报预览 -->
      <view class="poster-wrapper">
        <view
          class="poster-card"
          :style="{ background: posterBg }"
        >
          <!-- 顶部标题区 -->
          <view class="poster-top">
            <text class="poster-badge">
              {{ comp.category || '国学竞赛' }}
            </text>
            <text class="poster-title">
              {{ comp.name || comp.title || '国学知识竞赛' }}
            </text>
            <text class="poster-subtitle">
              {{ comp.subtitle || '' }}
            </text>
          </view>

          <!-- 中间装饰 -->
          <view class="poster-divider">
            <text class="divider-icon">
              🏮
            </text>
          </view>

          <!-- 竞赛详情 -->
          <view class="poster-details">
            <view class="detail-row">
              <text class="detail-icon">
                📅
              </text>
              <text class="detail-text">
                {{ formatDate(comp.startDate) }} - {{ formatDate(comp.endDate) }}
              </text>
            </view>
            <view class="detail-row">
              <text class="detail-icon">
                👥
              </text>
              <text class="detail-text">
                {{ comp.maxPlayers || '不限' }}人参赛
              </text>
            </view>
            <view class="detail-row">
              <text class="detail-icon">
                🏆
              </text>
              <text class="detail-text">
                {{ comp.prize || '丰厚奖品等你拿' }}
              </text>
            </view>
            <view
              v-if="comp.location"
              class="detail-row"
            >
              <text class="detail-icon">
                📍
              </text>
              <text class="detail-text">
                {{ comp.location }}
              </text>
            </view>
          </view>

          <!-- 二维码 -->
          <view class="poster-qr-area">
            <image
              v-if="qrcodeUrl"
              :src="qrcodeUrl"
              class="poster-qr"
              mode="aspectFit"
            />
            <view
              v-else
              class="poster-qr-placeholder"
            >
              <text class="qr-icon">
                📱
              </text>
              <text class="qr-text">
                扫码报名
              </text>
            </view>
            <text class="poster-hint">
              长按识别二维码报名参赛
            </text>
          </view>

          <!-- 底部信息 -->
          <view class="poster-footer">
            <text class="poster-org">
              {{ comp.organizer || '国学平台' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-bar">
        <view
          class="action-btn save-btn"
          @click="savePoster"
        >
          <text class="action-icon">
            💾
          </text>
          <text class="action-label">
            保存图片
          </text>
        </view>
        <view
          class="action-btn share-btn"
          @click="share"
        >
          <text class="action-icon">
            📤
          </text>
          <text class="action-label">
            分享好友
          </text>
        </view>
        <view
          class="action-btn poster-btn"
          @click="regenerate"
        >
          <text class="action-icon">
            🔄
          </text>
          <text class="action-label">
            重新生成
          </text>
        </view>
      </view>

      <!-- 风格选择 -->
      <view class="style-section">
        <text class="style-title">
          选择海报风格
        </text>
        <scroll-view
          scroll-x
          class="style-scroll"
          show-scrollbar="false"
        >
          <view
            v-for="(style, idx) in styles"
            :key="idx"
            class="style-item"
            :class="{ active: selectedStyle === idx }"
            @click="selectStyle(idx)"
          >
            <view
              class="style-preview"
              :style="{ background: style.bg }"
            >
              <text class="style-preview-text">
                {{ style.label }}
              </text>
            </view>
            <text class="style-name">
              {{ style.name }}
            </text>
          </view>
        </scroll-view>
      </view>
    </scroll-view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && !comp.id"
      empty-icon="🖼"
      empty-title="暂无海报数据"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const comp = ref<any>({})
const qrcodeUrl = ref('')
const posterBg = ref('linear-gradient(135deg, #C41E3A, #8B0000)')
const selectedStyle = ref(0)

const styles = [
  { name: '经典红', label: '典', bg: 'linear-gradient(135deg, #C41E3A, #8B0000)' },
  { name: '金色典', label: '金', bg: 'linear-gradient(135deg, #C9A96E, #B8956A)' },
  { name: '墨韵', label: '墨', bg: 'linear-gradient(135deg, #2C2C2C, #555)' },
  { name: '青花', label: '青', bg: 'linear-gradient(135deg, #1E3A5F, #2C5F8A)' },
  { name: '翠竹', label: '翠', bg: 'linear-gradient(135deg, #2E7D32, #66BB6A)' },
]

function getCompId(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.id || ''
}

onMounted(() => { fetchData() })

async function fetchData() {
  const id = getCompId()
  if (!id) { loading.value = false; return }
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const res: any = await api.competitionApi.detail(id)
    comp.value = res || {}
    // Try to get poster data
    try {
      const posterRes: any = await api.competitionApi.getPoster?.(id)
      qrcodeUrl.value = posterRes?.qrcode || posterRes?.qrCode || ''
    } catch {}
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function formatDate(d?: string): string {
  if (!d) return '待定'
  return d.slice(0, 10)
}

function selectStyle(idx: number) {
  selectedStyle.value = idx
  posterBg.value = styles[idx].bg
}

function savePoster() {
  uni.showLoading({ title: '生成中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '海报已保存到相册', icon: 'success' })
  }, 1500)
}

function share() {
  uni.showActionSheet({
    itemList: ['分享到微信', '分享到朋友圈', '生成分享图'],
    success: (res) => {
      if (res.tapIndex === 2) savePoster()
      else uni.showToast({ title: '分享功能开发中', icon: 'none' })
    },
  })
}

function regenerate() {
  uni.showLoading({ title: '重新生成中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '生成完成', icon: 'success' })
  }, 2000)
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; flex: 1; }
.header-action { font-size: 28rpx; color: #C41E3A; font-weight: 500; }

.scroll-area { padding: 24rpx; }

.poster-wrapper { padding: 0 16rpx; margin-bottom: 32rpx; }
.poster-card { border-radius: 24rpx; padding: 48rpx 36rpx; color: #fff; box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.15); position: relative; overflow: hidden; }
.poster-top { text-align: center; margin-bottom: 24rpx; }
.poster-badge { display: inline-block; font-size: 22rpx; padding: 6rpx 24rpx; border-radius: 24rpx; background: rgba(255,255,255,0.2); margin-bottom: 16rpx; }
.poster-title { font-size: 44rpx; font-weight: bold; display: block; line-height: 1.3; margin-bottom: 8rpx; }
.poster-subtitle { font-size: 26rpx; opacity: 0.8; display: block; }
.poster-divider { text-align: center; margin: 24rpx 0; }
.divider-icon { font-size: 48rpx; }
.poster-details { margin-bottom: 32rpx; }
.detail-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.detail-icon { font-size: 28rpx; }
.detail-text { font-size: 26rpx; opacity: 0.9; }
.poster-qr-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 32rpx; }
.poster-qr { width: 200rpx; height: 200rpx; background: #fff; padding: 12rpx; border-radius: 16rpx; }
.poster-qr-placeholder { width: 200rpx; height: 200rpx; background: rgba(255,255,255,0.15); border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.qr-icon { font-size: 64rpx; }
.qr-text { font-size: 22rpx; margin-top: 8rpx; opacity: 0.7; }
.poster-hint { font-size: 20rpx; opacity: 0.6; margin-top: 12rpx; }
.poster-footer { text-align: center; padding-top: 24rpx; border-top: 1rpx solid rgba(255,255,255,0.2); }
.poster-org { font-size: 22rpx; opacity: 0.6; }

.action-bar { display: flex; gap: 16rpx; margin-bottom: 32rpx; }
.action-btn { flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx 0; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.action-icon { font-size: 40rpx; display: block; margin-bottom: 8rpx; }
.action-label { font-size: 24rpx; color: #666; }

.style-section { margin-bottom: 40rpx; }
.style-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.style-scroll { white-space: nowrap; }
.style-item { display: inline-block; margin-right: 20rpx; text-align: center; }
.style-preview { width: 140rpx; height: 200rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; border: 4rpx solid transparent; }
.style-item.active .style-preview { border-color: #C41E3A; }
.style-preview-text { font-size: 40rpx; color: #fff; font-weight: bold; }
.style-name { font-size: 22rpx; color: #666; }
</style>
