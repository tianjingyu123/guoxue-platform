<template>
  <view class="promote-page">
    <!-- 导航栏 -->
    <view
      class="promote-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="promote-nav-inner">
        <view
          class="promote-nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#374151"
          />
        </view>
        <text class="promote-nav-title">
          推广中心
        </text>
        <view
          class="promote-nav-btn"
          @tap="goMaterials"
        >
          <app-icon
            name="image"
            :size="40"
            color="#374151"
          />
        </view>
      </view>
    </view>

    <!-- 推广模式切换 -->
    <view class="promote-tabs-wrap">
      <view class="promote-tabs">
        <view
          class="promote-tab"
          :class="{ active: activeTab === 'permanent' }"
          @tap="activeTab = 'permanent'"
        >
          <text class="promote-tab-txt">
            永久推广
          </text>
        </view>
        <view
          class="promote-tab"
          :class="{ active: activeTab === 'temporary' }"
          @tap="activeTab = 'temporary'"
        >
          <text class="promote-tab-txt">
            临时推荐
          </text>
        </view>
      </view>
    </view>

    <!-- 永久推广 -->
    <view
      v-if="activeTab === 'permanent'"
      class="promote-body"
    >
      <view class="promote-info-card promote-info-purple">
        <view class="promote-info-icon promote-icon-purple">
          <app-icon
            name="link-2"
            :size="40"
            color="#8B5CF6"
          />
        </view>
        <view class="promote-info-text">
          <text class="promote-info-title">
            专属推广链接
          </text>
          <view class="promote-info-desc">
            <text class="promote-info-desc-txt">
              用户通过此链接注册后将
            </text><text class="promote-hl-purple">
              永久锁定
            </text><text class="promote-info-desc-txt">
              在您的分站名下，后续所有消费您都将获得推广佣金。
            </text>
          </view>
        </view>
      </view>

      <view class="promote-field">
        <text class="promote-label">
          推广链接
        </text>
        <view class="promote-input-row">
          <view class="promote-input">
            <text class="promote-input-txt">
              {{ stationInfo.promoteUrl }}
            </text>
          </view>
          <view
            class="promote-copy-btn promote-bg-purple"
            @tap="handleCopy(stationInfo.promoteUrl, 'link')"
          >
            <app-icon
              :name="copied === 'link' ? 'check' : 'copy'"
              :size="32"
              color="#ffffff"
            />
          </view>
        </view>
      </view>

      <view class="promote-qr-card">
        <view class="promote-qr">
          <view class="promote-qr-inner">
            <app-icon
              name="qr-code"
              :size="160"
              color="#9ca3af"
            />
          </view>
        </view>
        <text class="promote-qr-txt">
          扫码进入「{{ stationInfo.name }}」
        </text>
        <view class="promote-qr-actions">
          <view
            class="promote-btn promote-btn-outline"
            @tap="handleCopy(stationInfo.promoteUrl, 'qr')"
          >
            <text class="promote-btn-txt">
              {{ copied === 'qr' ? '已复制链接' : '复制链接' }}
            </text>
          </view>
          <view
            class="promote-btn promote-bg-purple"
            @tap="goPoster"
          >
            <app-icon
              name="share-2"
              :size="32"
              color="#ffffff"
            />
            <text
              class="promote-btn-txt"
              style="color:#fff"
            >
              生成海报
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 临时推荐 -->
    <view
      v-if="activeTab === 'temporary'"
      class="promote-body"
    >
      <view class="promote-info-card promote-info-amber">
        <view class="promote-info-icon promote-icon-amber">
          <app-icon
            name="clock"
            :size="40"
            color="#d97706"
          />
        </view>
        <view class="promote-info-text">
          <text class="promote-info-title">
            临时推荐链接
          </text>
          <view class="promote-info-desc">
            <text class="promote-info-desc-txt">
              分享指定内容，用户点击后
            </text><text class="promote-hl-amber">
              24小时内
            </text><text class="promote-info-desc-txt">
              购买，佣金归您。不影响用户已有的永久锁定关系。
            </text>
          </view>
        </view>
      </view>

      <view class="promote-field">
        <text class="promote-label">
          选择推荐内容
        </text>
        <view class="promote-content-list">
          <view
            v-for="c in recommendableContent"
            :key="c.id"
            class="promote-content-item"
            :class="{ active: selectedContentId === c.id }"
            @tap="selectContent(c.id)"
          >
            <text class="promote-content-type">
              {{ c.type }}
            </text>
            <view class="promote-content-info">
              <text class="promote-content-title">
                {{ c.title }}
              </text>
              <view class="promote-content-meta">
                <text class="promote-content-meta-txt">
                  售价 ¥{{ c.price }} · 佣金
                </text><text class="promote-content-commission">
                  ¥{{ c.commission }}
                </text>
              </view>
            </view>
            <app-icon
              v-if="selectedContentId === c.id"
              name="check"
              :size="32"
              color="#f59e0b"
            />
          </view>
        </view>
      </view>

      <block v-if="selectedContent">
        <view
          v-if="!tempLinkGenerated"
          class="promote-gen-btn promote-bg-amber"
          @tap="tempLinkGenerated = true"
        >
          <app-icon
            name="sparkles"
            :size="32"
            color="#ffffff"
          />
          <text class="promote-gen-txt">
            生成临时推荐链接
          </text>
        </view>
        <view
          v-else
          class="promote-temp-card"
        >
          <view class="promote-temp-tip">
            <app-icon
              name="clock"
              :size="28"
              color="#d97706"
            />
            <text class="promote-temp-tip-txt">
              有效期 24 小时，过期自动失效
            </text>
          </view>
          <view class="promote-input-row">
            <view class="promote-input promote-input-gray">
              <text class="promote-input-txt promote-input-sm">
                {{ tempLink }}
              </text>
            </view>
            <view
              class="promote-copy-btn promote-bg-amber"
              @tap="handleCopy(tempLink, 'temp')"
            >
              <app-icon
                :name="copied === 'temp' ? 'check' : 'copy'"
                :size="32"
                color="#ffffff"
              />
            </view>
          </view>
        </view>
      </block>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { operatorApi } from '@/lib/operator-data'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const stationInfo = ref({
  id: '',
  name: '',
  promoteUrl: 'https://recob.app/s/',
})

const recommendableContent = ref<any[]>([])

onMounted(async () => {
  try {
    const [panel, content] = await Promise.allSettled([
      operatorApi.stationMasterPanel(),
      operatorApi.recommendableContent(),
    ])
    if (panel.status === 'fulfilled' && panel.value?.info) {
      stationInfo.value.name = panel.value.info.name || ''
    }
    if (content.status === 'fulfilled') {
      recommendableContent.value = Array.isArray(content.value) ? content.value : []
    }
  } catch (e) {}
})

const activeTab = ref<'permanent' | 'temporary'>('permanent')
const copied = ref<string | null>(null)
const selectedContentId = ref<string | null>(null)
const tempLinkGenerated = ref(false)

const selectedContent = computed(() => recommendableContent.value.find((c) => c.id === selectedContentId.value) || null)
const tempLink = computed(() =>
  selectedContent.value ? `${stationInfo.value.promoteUrl}/t/${selectedContent.value.id}?ref=qingyun&exp=24h` : '',
)

function selectContent(id: string) {
  selectedContentId.value = id
  tempLinkGenerated.value = false
}

function handleCopy(text: string, key: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = key
      setTimeout(() => { copied.value = null }, 2000)
    },
  })
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
function goMaterials() {
  uni.navigateTo({ url: '/pkg-operator/station-materials/index', fail: () => uni.showToast({ title: '素材库', icon: 'none' }) })
}
function goPoster() {
  uni.navigateTo({ url: '/pkg-operator/station-poster/index' })
}
</script>

<style lang="scss" scoped>
.promote-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 80rpx;
}
.promote-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1rpx solid #f3f4f6;
}
.promote-nav-inner {
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}
.promote-nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.promote-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
}

.promote-tabs-wrap {
  padding: 24rpx 32rpx;
  background: #fff;
}
.promote-tabs {
  display: flex;
  background: rgba(243, 244, 246, 0.8);
  border-radius: 16rpx;
  padding: 6rpx;
}
.promote-tab {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}
.promote-tab.active {
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.promote-tab-txt {
  font-size: 28rpx;
  color: #6b7280;
}
.promote-tab.active .promote-tab-txt {
  color: #111827;
  font-weight: 500;
}

.promote-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.promote-info-card {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid;
}
.promote-info-purple {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.2);
}
.promote-info-amber {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(251, 191, 36, 0.4);
}
.promote-info-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.promote-icon-purple {
  background: rgba(139, 92, 246, 0.15);
}
.promote-icon-amber {
  background: rgba(251, 191, 36, 0.25);
}
.promote-info-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #111827;
  display: block;
}
.promote-info-desc {
  margin-top: 4rpx;
  line-height: 1.6;
}
.promote-info-desc-txt {
  font-size: 24rpx;
  color: #6b7280;
}
.promote-hl-purple {
  font-size: 24rpx;
  color: #8B5CF6;
  font-weight: 500;
}
.promote-hl-amber {
  font-size: 24rpx;
  color: #d97706;
  font-weight: 500;
}

.promote-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #111827;
  margin-bottom: 16rpx;
  display: block;
}
.promote-input-row {
  display: flex;
  gap: 16rpx;
}
.promote-input {
  flex: 1;
  height: 80rpx;
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.promote-input-gray {
  background: #f9fafb;
}
.promote-input-txt {
  font-size: 26rpx;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.promote-input-sm {
  font-size: 22rpx;
}
.promote-copy-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.promote-bg-purple {
  background: #8B5CF6;
}
.promote-bg-amber {
  background: #f59e0b;
}

.promote-qr-card {
  background: #fff;
  border: 1rpx solid #f0ece5;
  border-radius: 24rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.promote-qr {
  width: 352rpx;
  height: 352rpx;
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
}
.promote-qr-inner {
  width: 100%;
  height: 100%;
  background: #f1ede7;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.promote-qr-txt {
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 24rpx;
}
.promote-qr-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
  width: 100%;
}
.promote-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.promote-btn-outline {
  border: 1rpx solid #d8d2c8;
  background: #fff;
}
.promote-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}

.promote-content-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.promote-content-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 4rpx solid transparent;
  box-sizing: border-box;
}
.promote-content-item.active {
  border-color: #fbbf24;
}
.promote-content-type {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #f3f4f6;
  color: #6b7280;
  flex-shrink: 0;
}
.promote-content-info {
  flex: 1;
  min-width: 0;
}
.promote-content-title {
  font-size: 28rpx;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.promote-content-meta {
  margin-top: 4rpx;
}
.promote-content-meta-txt {
  font-size: 24rpx;
  color: #9ca3af;
}
.promote-content-commission {
  font-size: 24rpx;
  color: #d97706;
}

.promote-gen-btn {
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.promote-gen-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.promote-temp-card {
  background: #fff;
  border: 1rpx solid #f0ece5;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.promote-temp-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.promote-temp-tip-txt {
  font-size: 24rpx;
  color: #d97706;
}
</style>
