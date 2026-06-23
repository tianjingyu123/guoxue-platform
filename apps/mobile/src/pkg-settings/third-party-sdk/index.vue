<template>
  <view class="sdk-page">
    <!-- loading 骨架屏 -->
    <template v-if="loading">
      <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-inner">
          <view class="skeleton skeleton-avatar" />
          <view class="skeleton skeleton-title" />
        </view>
      </view>
      <view class="skeleton-body">
        <view class="skeleton skeleton-search" />
        <view v-for="i in 4" :key="i" class="skeleton skeleton-card" />
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-inner">
          <view class="nav-btn" @tap="goBack">
            <app-icon name="chevron-left" :size="40" color="#2C2C2C" />
          </view>
          <text class="nav-title">第三方SDK列表</text>
          <view class="nav-btn nav-btn-right" @tap="loadSDKList">
            <app-icon name="refresh-cw" :size="32" color="#2C2C2C" />
          </view>
        </view>
      </view>

      <view class="page-body">
        <!-- 说明卡片 -->
        <view class="intro-card">
          <view class="intro-row">
            <app-icon name="shield" :size="40" color="#2563EB" class="intro-icon" />
            <view class="intro-text">
              <text class="intro-title">关于第三方SDK说明</text>
              <text class="intro-desc">为保障App相关功能的正常运行，我们集成了以下第三方SDK。这些SDK可能会收集您的部分信息，我们已对合作方的信息收集行为进行严格审查，确保符合相关法律法规要求。</text>
            </view>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-box">
          <app-icon name="search" :size="32" color="#999999" class="search-icon" />
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索SDK名称或提供方"
            placeholder-class="search-ph"
          />
        </view>

        <!-- 分类筛选 -->
        <scroll-view scroll-x class="cat-scroll">
          <view class="cat-row">
            <view
              v-for="cat in categories"
              :key="cat"
              class="cat-chip"
              :class="{ 'cat-chip-active': selectedCategory === cat }"
              @tap="selectedCategory = cat"
            >
              {{ cat === 'all' ? '全部' : getCategoryLabel(cat) }}
            </view>
          </view>
        </scroll-view>

        <!-- 统计信息 -->
        <text class="stat-text">共 {{ filteredList.length }} 个第三方SDK</text>

        <!-- SDK列表 -->
        <view class="sdk-list">
          <view
            v-for="sdk in filteredList"
            :key="sdk.id"
            class="sdk-card"
          >
            <!-- 头部 -->
            <view class="card-head">
              <view class="card-head-left">
                <view class="cat-icon" :style="{ background: getCategoryColor(sdk.category).bg }">
                  <app-icon :name="getCategoryIcon(sdk.category)" :size="40" :color="getCategoryColor(sdk.category).color" />
                </view>
                <view class="card-name-wrap">
                  <text class="card-name">{{ sdk.name }}</text>
                  <text class="card-provider">{{ sdk.provider }}</text>
                </view>
              </view>
              <text
                class="cat-badge"
                :style="{ background: getCategoryColor(sdk.category).bg, color: getCategoryColor(sdk.category).color }"
              >{{ getCategoryLabel(sdk.category) }}</text>
            </view>

            <!-- 使用目的 -->
            <view class="card-section">
              <text class="card-label">使用目的</text>
              <text class="card-value">{{ sdk.purpose }}</text>
            </view>

            <!-- 收集信息 -->
            <view class="card-section">
              <text class="card-label">收集的信息类型</text>
              <view class="tag-wrap">
                <text
                  v-for="(data, idx) in sdk.collectedData"
                  :key="idx"
                  class="data-tag"
                >{{ data }}</text>
              </view>
            </view>

            <!-- 链接 -->
            <view class="card-links">
              <view class="link-item link-primary">
                <app-icon name="shield" :size="24" color="#C41E3A" />
                <text class="link-text-primary">隐私政策</text>
                <app-icon name="external-link" :size="24" color="#C41E3A" />
              </view>
              <view v-if="sdk.officialWebsite" class="link-item">
                <text class="link-text">官方网站</text>
                <app-icon name="external-link" :size="24" color="#999999" />
              </view>
            </view>
          </view>
        </view>

        <!-- 空态 -->
        <view v-if="filteredList.length === 0" class="empty-state">
          <app-icon name="search" :size="96" color="rgba(153,153,153,0.3)" />
          <text class="empty-text">未找到匹配的SDK</text>
        </view>

        <!-- 底部说明 -->
        <view class="bottom-note">
          <text class="note-text"><text class="note-strong">温馨提示：</text>如您对上述第三方SDK有任何疑问，或希望了解更多信息，请通过以下方式联系我们：</text>
          <text class="note-contact">邮箱：privacy@rebu.com | 电话：400-888-8888</text>
        </view>
      </view>
    </template>
  </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { goBack } from '@/utils/router'

type SDKCategory = 'analytics' | 'payment' | 'social' | 'push' | 'map' | 'ad' | 'login' | 'media' | 'other'

interface ThirdPartySDK {
  id: number
  name: string
  provider: string
  category: SDKCategory
  purpose: string
  collectedData: string[]
  privacyPolicyUrl: string
  officialWebsite?: string
}

const statusBarHeight = ref(0)
const loading = ref(true)
const sdkList = ref<ThirdPartySDK[]>([])
const searchKeyword = ref('')
const selectedCategory = ref<SDKCategory | 'all'>('all')

const categories: (SDKCategory | 'all')[] = ['all', 'login', 'payment', 'social', 'map', 'analytics', 'push', 'media', 'other']

const mockSDKList: ThirdPartySDK[] = [
  { id: 1, name: '微信开放平台SDK', provider: '深圳市腾讯计算机系统有限公司', category: 'login', purpose: '用于微信登录、微信分享功能', collectedData: ['设备标识符', '网络状态', '微信用户ID'], privacyPolicyUrl: 'https://weixin.qq.com/cgi-bin/readtemplate?lang=zh_CN&t=weixin_agreement&s=privacy', officialWebsite: 'https://open.weixin.qq.com' },
  { id: 2, name: '支付宝SDK', provider: '支付宝（杭州）信息技术有限公司', category: 'payment', purpose: '用于支付宝支付功能', collectedData: ['设备标识符', '网络状态', '交易信息'], privacyPolicyUrl: 'https://render.alipay.com/p/c/k2cx0tg8', officialWebsite: 'https://open.alipay.com' },
  { id: 3, name: '微信支付SDK', provider: '财付通支付科技有限公司', category: 'payment', purpose: '用于微信支付功能', collectedData: ['设备标识符', '网络状态', '交易信息'], privacyPolicyUrl: 'https://pay.weixin.qq.com/index.php/public/wechatpay_portal/privacy', officialWebsite: 'https://pay.weixin.qq.com' },
  { id: 4, name: '高德地图SDK', provider: '高德软件有限公司', category: 'map', purpose: '用于地图展示、位置定位、路线规划', collectedData: ['位置信息', '设备标识符', 'WiFi状态'], privacyPolicyUrl: 'https://lbs.amap.com/pages/privacy/', officialWebsite: 'https://lbs.amap.com' },
  { id: 5, name: '友盟统计SDK', provider: '友盟同欣（北京）科技有限公司', category: 'analytics', purpose: '用于应用数据统计分析', collectedData: ['设备标识符', '应用使用数据', '崩溃日志'], privacyPolicyUrl: 'https://www.umeng.com/page/policy', officialWebsite: 'https://www.umeng.com' },
  { id: 6, name: '极光推送SDK', provider: '深圳市和讯华谷信息技术有限公司', category: 'push', purpose: '用于消息推送服务', collectedData: ['设备标识符', '网络状态', '推送消息内容'], privacyPolicyUrl: 'https://www.jiguang.cn/license/privacy', officialWebsite: 'https://www.jiguang.cn' },
  { id: 7, name: '腾讯Bugly SDK', provider: '深圳市腾讯计算机系统有限公司', category: 'analytics', purpose: '用于应用崩溃监控和性能分析', collectedData: ['设备信息', '崩溃日志', '应用状态'], privacyPolicyUrl: 'https://privacy.qq.com/document/preview/fc748b3d96224fdb825ea79e132c1a56', officialWebsite: 'https://bugly.qq.com' },
  { id: 8, name: '阿里云播放器SDK', provider: '阿里云计算有限公司', category: 'media', purpose: '用于视频播放功能', collectedData: ['设备标识符', '网络状态', '播放记录'], privacyPolicyUrl: 'https://terms.alicdn.com/legal-agreement/terms/privacy_policy_full/20220519162334947/20220519162334947.html', officialWebsite: 'https://www.aliyun.com/product/vod' },
  { id: 9, name: 'QQ互联SDK', provider: '深圳市腾讯计算机系统有限公司', category: 'login', purpose: '用于QQ登录、QQ分享功能', collectedData: ['设备标识符', '网络状态', 'QQ用户ID'], privacyPolicyUrl: 'https://wiki.connect.qq.com/qq%e4%ba%92%e8%81%94sdk%e9%9a%90%e7%a7%81%e4%bf%9d%e6%8a%a4%e5%a3%b0%e6%98%8e', officialWebsite: 'https://connect.qq.com' },
  { id: 10, name: '新浪微博SDK', provider: '北京微梦创科网络技术有限公司', category: 'social', purpose: '用于微博登录、微博分享功能', collectedData: ['设备标识符', '网络状态', '微博用户ID'], privacyPolicyUrl: 'https://weibo.com/signup/v5/privacy', officialWebsite: 'https://open.weibo.com' },
]

const categoryIcons: Record<SDKCategory, string> = {
  analytics: 'bar-chart-3',
  payment: 'credit-card',
  social: 'share-2',
  push: 'message-square',
  map: 'map-pin',
  ad: 'play',
  login: 'smartphone',
  media: 'play',
  other: 'shield',
}

const categoryLabels: Record<SDKCategory, string> = {
  analytics: '数据统计',
  payment: '支付服务',
  social: '社交分享',
  push: '消息推送',
  map: '地图服务',
  ad: '广告服务',
  login: '账号登录',
  media: '媒体播放',
  other: '其他服务',
}

const categoryColors: Record<SDKCategory, { color: string; bg: string }> = {
  analytics: { color: '#2563EB', bg: '#EFF6FF' },
  payment: { color: '#16A34A', bg: '#F0FDF4' },
  social: { color: '#9333EA', bg: '#FAF5FF' },
  push: { color: '#EA580C', bg: '#FFF7ED' },
  map: { color: '#0891B2', bg: '#ECFEFF' },
  ad: { color: '#DC2626', bg: '#FEF2F2' },
  login: { color: '#4F46E5', bg: '#EEF2FF' },
  media: { color: '#DB2777', bg: '#FDF2F8' },
  other: { color: '#4B5563', bg: '#F9FAFB' },
}

function getCategoryIcon(c: SDKCategory) {
  return categoryIcons[c]
}
function getCategoryLabel(c: SDKCategory) {
  return categoryLabels[c]
}
function getCategoryColor(c: SDKCategory) {
  return categoryColors[c]
}

const filteredList = computed(() => {
  return sdkList.value.filter((sdk) => {
    const matchCategory = selectedCategory.value === 'all' || sdk.category === selectedCategory.value
    const kw = searchKeyword.value.toLowerCase()
    const matchKeyword = !kw || sdk.name.toLowerCase().includes(kw) || sdk.provider.toLowerCase().includes(kw)
    return matchCategory && matchKeyword
  })
})

function loadSDKList() {
  loading.value = true
  setTimeout(() => {
    sdkList.value = mockSDKList
    loading.value = false
  }, 500)
}

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
})

loadSDKList()
</script>

<style scoped lang="scss">
.sdk-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 48rpx;
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.nav-inner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nav-btn-right {
  margin-left: auto;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.page-body {
  padding: 32rpx;
}

/* 说明卡 */
.intro-card {
  background: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}
.intro-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.intro-icon {
  margin-top: 4rpx;
  flex-shrink: 0;
}
.intro-text {
  flex: 1;
}
.intro-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1e40af;
  margin-bottom: 8rpx;
}
.intro-desc {
  font-size: 28rpx;
  line-height: 1.5;
  color: #1d4ed8;
}

/* 搜索框 */
.search-box {
  position: relative;
  margin-bottom: 32rpx;
}
.search-icon {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 80rpx;
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 16rpx;
  padding: 0 24rpx 0 80rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.search-ph {
  color: #999999;
}

/* 分类筛选 */
.cat-scroll {
  margin: 0 -32rpx 32rpx;
  white-space: nowrap;
}
.cat-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 32rpx 16rpx;
}
.cat-chip {
  flex-shrink: 0;
  white-space: nowrap;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  background: #f5f1eb;
  color: #999999;
}
.cat-chip-active {
  background: #c41e3a;
  color: #ffffff;
}

/* 统计 */
.stat-text {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}

/* SDK列表 */
.sdk-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.sdk-card {
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 16rpx;
  padding: 32rpx;
}
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.card-head-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.cat-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-name-wrap {
  display: flex;
  flex-direction: column;
}
.card-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.card-provider {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}
.cat-badge {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.card-section {
  margin-bottom: 24rpx;
}
.card-label {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 8rpx;
}
.card-value {
  font-size: 28rpx;
  color: #2c2c2c;
}
.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.data-tag {
  padding: 4rpx 16rpx;
  background: #f5f1eb;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #999999;
}
.card-links {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #e8e0d5;
}
.link-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.link-text-primary {
  font-size: 22rpx;
  color: #c41e3a;
}
.link-text {
  font-size: 22rpx;
  color: #999999;
}

/* 空态 */
.empty-state {
  text-align: center;
  padding: 96rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-top: 24rpx;
}

/* 底部说明 */
.bottom-note {
  margin-top: 48rpx;
  padding: 32rpx;
  background: rgba(245, 241, 235, 0.5);
  border-radius: 16rpx;
}
.note-text {
  font-size: 22rpx;
  line-height: 1.6;
  color: #999999;
}
.note-strong {
  font-weight: 700;
  color: #999999;
}
.note-contact {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 16rpx;
}

/* 骨架屏 */
.skeleton {
  background: #e8e0d5;
  border-radius: 8rpx;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
}
.skeleton-title {
  height: 40rpx;
  width: 256rpx;
}
.skeleton-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.skeleton-search {
  height: 80rpx;
  width: 100%;
  border-radius: 16rpx;
}
.skeleton-card {
  height: 320rpx;
  width: 100%;
  border-radius: 16rpx;
}
</style>
