<template>
  <view class="mat-page">
    <!-- 导航栏 -->
    <view
      class="mat-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="mat-nav-inner">
        <view
          class="mat-nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#374151"
          />
        </view>
        <text class="mat-nav-title">
          推广素材库
        </text>
        <view class="mat-nav-btn" />
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="mat-search-wrap">
      <view class="mat-search">
        <app-icon
          name="search"
          :size="32"
          color="#9ca3af"
        />
        <input
          v-model="searchKeyword"
          class="mat-search-input"
          placeholder="搜索素材..."
          placeholder-class="mat-search-ph"
        >
      </view>
    </view>

    <!-- 生成专属海报入口 -->
    <view class="mat-poster-entry-wrap">
      <view
        class="mat-poster-entry"
        @tap="goPoster"
      >
        <view class="mat-poster-entry-left">
          <view class="mat-poster-entry-icon">
            <app-icon
              name="image"
              :size="40"
              color="#ffffff"
            />
          </view>
          <view>
            <text class="mat-poster-entry-title">
              生成专属分站海报
            </text>
            <text class="mat-poster-entry-sub">
              自定义风格，含专属二维码
            </text>
          </view>
        </view>
        <app-icon
          name="share-2"
          :size="32"
          color="#ffffff"
        />
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
          <app-icon
            v-if="t.icon"
            :name="t.icon"
            :size="24"
            :color="activeTab === t.value ? '#111827' : '#6b7280'"
          />
          <text class="mat-tab-txt">
            {{ t.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <view
      v-if="filteredEmpty"
      class="mat-empty"
    >
      <text class="mat-empty-txt">
        暂无素材
      </text>
    </view>
    <view
      v-else
      class="mat-body"
    >
      <!-- 海报区 -->
      <view
        v-if="(activeTab === 'all' || activeTab === 'poster') && posters.length"
        class="mat-section"
      >
        <view class="mat-section-title">
          <app-icon
            name="image"
            :size="32"
            color="#C41E3A"
          />
          <text class="mat-section-title-txt">
            海报素材
          </text>
          <text class="mat-section-count">
            ({{ posters.length }})
          </text>
        </view>
        <view class="mat-grid">
          <view
            v-for="p in posters"
            :key="p.id"
            class="mat-poster-card"
            @tap="selectedPoster = p"
          >
            <view class="mat-poster-thumb">
              <view class="mat-poster-ph">
                <app-icon
                  name="image"
                  :size="64"
                  color="#cbd5e1"
                />
              </view>
              <view class="mat-poster-use">
                <text class="mat-poster-use-txt">
                  使用 {{ p.useCount }} 次
                </text>
              </view>
            </view>
            <view class="mat-poster-info">
              <text class="mat-poster-card-title">
                {{ p.title }}
              </text>
              <view class="mat-tags">
                <text
                  v-for="tag in p.tags.slice(0, 2)"
                  :key="tag"
                  class="mat-tag"
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
        v-if="(activeTab === 'all' || activeTab === 'copywriting') && copywritings.length"
        class="mat-section"
      >
        <view class="mat-section-title">
          <app-icon
            name="file-text"
            :size="32"
            color="#C41E3A"
          />
          <text class="mat-section-title-txt">
            文案素材
          </text>
          <text class="mat-section-count">
            ({{ copywritings.length }})
          </text>
        </view>
        <view class="mat-copy-list">
          <view
            v-for="c in copywritings"
            :key="c.id"
            class="mat-copy-card"
          >
            <view class="mat-copy-head">
              <view>
                <text class="mat-copy-title">
                  {{ c.title }}
                </text>
                <text class="mat-copy-scene">
                  适用: {{ c.scene }}
                </text>
              </view>
              <view
                class="mat-copy-btn"
                :class="{ copied: copiedId === c.id }"
                @tap="handleCopy(c)"
              >
                <app-icon
                  :name="copiedId === c.id ? 'check' : 'copy'"
                  :size="24"
                  :color="copiedId === c.id ? '#ffffff' : '#374151'"
                />
                <text
                  class="mat-copy-btn-txt"
                  :style="{ color: copiedId === c.id ? '#fff' : '#374151' }"
                >
                  {{ copiedId === c.id ? '已复制' : '复制' }}
                </text>
              </view>
            </view>
            <text
              class="mat-copy-content"
              :class="{ clamp: expandedCopy !== c.id }"
            >
              {{ c.content }}
            </text>
            <text
              v-if="c.content.split('\n').length > 3"
              class="mat-copy-toggle"
              @tap="expandedCopy = expandedCopy === c.id ? null : c.id"
            >
              {{ expandedCopy === c.id ? '收起' : '展开全文' }}
            </text>
            <view class="mat-copy-foot">
              <text class="mat-copy-count">
                已被复制 {{ c.copyCount }} 次
              </text>
              <view class="mat-tags">
                <text
                  v-for="tag in c.tags"
                  :key="tag"
                  class="mat-tag mat-tag-red"
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
        v-if="(activeTab === 'all' || activeTab === 'qrcode') && qrcodes.length"
        class="mat-section"
      >
        <view class="mat-section-title">
          <app-icon
            name="qr-code"
            :size="32"
            color="#C41E3A"
          />
          <text class="mat-section-title-txt">
            二维码
          </text>
          <text class="mat-section-count">
            ({{ qrcodes.length }})
          </text>
        </view>
        <view class="mat-grid">
          <view
            v-for="q in qrcodes"
            :key="q.id"
            class="mat-qr-card"
            @tap="selectedQrcode = q"
          >
            <view class="mat-qr-thumb">
              <app-icon
                name="qr-code"
                :size="96"
                color="#9ca3af"
              />
            </view>
            <text class="mat-qr-title">
              {{ q.title }}
            </text>
            <text class="mat-qr-scan">
              扫描 {{ q.scanCount }} 次
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 海报预览弹层 -->
    <view
      v-if="selectedPoster"
      class="mat-dialog-mask"
      @tap="selectedPoster = null"
    >
      <view
        class="mat-dialog"
        @tap.stop
      >
        <view class="mat-dialog-img">
          <app-icon
            name="image"
            :size="200"
            color="#6b7280"
          />
        </view>
        <view class="mat-dialog-foot">
          <text class="mat-dialog-title">
            {{ selectedPoster.title }}
          </text>
          <view class="mat-dialog-actions">
            <view
              class="mat-dialog-btn mat-dialog-btn-white"
              @tap="savePoster"
            >
              <app-icon
                name="download"
                :size="32"
                color="#111827"
              />
              <text class="mat-dialog-btn-txt">
                保存图片
              </text>
            </view>
            <view
              class="mat-dialog-btn mat-dialog-btn-red"
              @tap="sharePoster"
            >
              <app-icon
                name="share-2"
                :size="32"
                color="#ffffff"
              />
              <text
                class="mat-dialog-btn-txt"
                style="color:#fff"
              >
                分享
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 二维码详情底部弹层 -->
    <view
      v-if="selectedQrcode"
      class="mat-sheet-mask"
      @tap="selectedQrcode = null"
    >
      <view
        class="mat-sheet"
        @tap.stop
      >
        <text class="mat-sheet-title">
          {{ selectedQrcode.title }}
        </text>
        <view class="mat-sheet-qr">
          <app-icon
            name="qr-code"
            :size="160"
            color="#374151"
          />
        </view>
        <text class="mat-sheet-tip">
          长按二维码保存到相册
        </text>
        <text class="mat-sheet-scan">
          扫描次数: {{ selectedQrcode.scanCount }}
        </text>
        <view class="mat-sheet-actions">
          <view
            class="mat-dialog-btn mat-sheet-btn-outline"
            @tap="saveQrcode"
          >
            <app-icon
              name="download"
              :size="32"
              color="#374151"
            />
            <text class="mat-dialog-btn-txt">
              保存图片
            </text>
          </view>
          <view
            class="mat-dialog-btn mat-dialog-btn-red"
            @tap="copyQrLink"
          >
            <app-icon
              name="copy"
              :size="32"
              color="#ffffff"
            />
            <text
              class="mat-dialog-btn-txt"
              style="color:#fff"
            >
              复制链接
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

interface Poster { id: number; title: string; useCount: number; tags: string[] }
interface Copy { id: number; title: string; content: string; copyCount: number; tags: string[]; scene: string }
interface Qr { id: number; title: string; targetUrl: string; scanCount: number }

const mockPosters: Poster[] = [
  { id: 1, title: '八字命理课程推广海报', useCount: 328, tags: ['八字', '课程', '推广'] },
  { id: 2, title: '风水大师直播预告', useCount: 256, tags: ['风水', '直播', '预告'] },
  { id: 3, title: '新人注册福利海报', useCount: 892, tags: ['新人', '福利', '注册'] },
  { id: 4, title: '周易入门课程限时优惠', useCount: 445, tags: ['周易', '优惠', '课程'] },
]
const mockCopywritings: Copy[] = [
  { id: 101, title: '八字课程推广文案', content: '🔮 想知道自己的命运密码吗？\n\n八字命理大师亲授，带你解读人生运势！\n\n✅ 零基础入门，通俗易懂\n✅ 实战案例分析，学完即用\n✅ 终身答疑群，持续进步\n\n限时优惠进行中，点击链接立即报名👇', copyCount: 1256, tags: ['八字', '课程'], scene: '朋友圈/社群推广' },
  { id: 102, title: '风水服务推广文案', content: '🏠 家居风水布局，影响一家人的运势！\n\n专业风水师在线指导，帮您打造好风水：\n• 客厅布局优化\n• 卧室床位调整\n• 财位催旺方法\n• 煞气化解技巧\n\n现在咨询，享首次优惠价！', copyCount: 876, tags: ['风水', '服务'], scene: '私聊/群发' },
  { id: 103, title: '平台注册邀请文案', content: '📚 发现一个超棒的国学学习平台！\n\n这里有：\n• 大师在线直播授课\n• 海量国学课程资源\n• 专业命理排盘工具\n• 同好交流圈子\n\n用我的邀请链接注册，新人还能领取专属福利哦~', copyCount: 2341, tags: ['注册', '邀请'], scene: '分享拉新' },
]
const mockQrcodes: Qr[] = [
  { id: 201, title: '分站注册二维码', targetUrl: 'https://example.com/register?ref=station001', scanCount: 3256 },
  { id: 202, title: '热门课程二维码', targetUrl: 'https://example.com/course/123', scanCount: 1892 },
  { id: 203, title: '官方圈子二维码', targetUrl: 'https://example.com/circle/1', scanCount: 2156 },
]

type MatTab = 'all' | 'poster' | 'qrcode' | 'copywriting'
const tabs: { value: MatTab; label: string; icon: string }[] = [
  { value: 'all', label: '全部', icon: '' },
  { value: 'poster', label: '海报', icon: 'image' },
  { value: 'copywriting', label: '文案', icon: 'file-text' },
  { value: 'qrcode', label: '二维码', icon: 'qr-code' },
]

const activeTab = ref<MatTab>('all')
const searchKeyword = ref('')
const expandedCopy = ref<number | null>(null)
const copiedId = ref<number | null>(null)
const selectedPoster = ref<Poster | null>(null)
const selectedQrcode = ref<Qr | null>(null)

const kw = computed(() => searchKeyword.value.trim())
const posters = computed(() => {
  if (activeTab.value !== 'all' && activeTab.value !== 'poster') return []
  return mockPosters.filter((p) => !kw.value || p.title.includes(kw.value) || p.tags.some((t) => t.includes(kw.value)))
})
const copywritings = computed(() => {
  if (activeTab.value !== 'all' && activeTab.value !== 'copywriting') return []
  return mockCopywritings.filter((c) => !kw.value || c.title.includes(kw.value) || c.content.includes(kw.value))
})
const qrcodes = computed(() => {
  if (activeTab.value !== 'all' && activeTab.value !== 'qrcode') return []
  return mockQrcodes.filter((q) => !kw.value || q.title.includes(kw.value))
})
const filteredEmpty = computed(() => posters.value.length === 0 && copywritings.value.length === 0 && qrcodes.value.length === 0)

function handleCopy(c: Copy) {
  uni.setClipboardData({
    data: c.content,
    success: () => {
      copiedId.value = c.id
      setTimeout(() => { copiedId.value = null }, 2000)
    },
  })
}
function savePoster() {
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}
function sharePoster() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}
function saveQrcode() {
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}
function copyQrLink() {
  if (!selectedQrcode.value) return
  uni.setClipboardData({ data: selectedQrcode.value.targetUrl, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
function goPoster() {
  uni.navigateTo({ url: '/pkg-operator/station-poster/index' })
}
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
.mat-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
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
  background: linear-gradient(to right, #C41E3A, #A01830);
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

.mat-empty {
  padding: 120rpx 0;
  text-align: center;
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
  color: #C41E3A;
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
  margin-bottom: 16rpx;
}
.mat-copy-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #111827;
  display: block;
}
.mat-copy-scene {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
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
  color: #C41E3A;
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
}

/* 海报预览弹层 */
.mat-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}
.mat-dialog {
  width: 90%;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 16rpx;
  overflow: hidden;
}
.mat-dialog-img {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mat-dialog-foot {
  padding: 32rpx;
}
.mat-dialog-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
  margin-bottom: 24rpx;
  display: block;
}
.mat-dialog-actions {
  display: flex;
  gap: 16rpx;
}
.mat-dialog-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.mat-dialog-btn-white {
  background: #fff;
}
.mat-dialog-btn-red {
  background: #C41E3A;
}
.mat-dialog-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #111827;
}
.mat-sheet-btn-outline {
  border: 1rpx solid #d8d2c8;
  background: #fff;
}

/* 二维码底部弹层 */
.mat-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.mat-sheet {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mat-sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
  margin-bottom: 32rpx;
}
.mat-sheet-qr {
  width: 384rpx;
  height: 384rpx;
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.mat-sheet-tip {
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}
.mat-sheet-scan {
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 48rpx;
}
.mat-sheet-actions {
  display: flex;
  gap: 24rpx;
  width: 100%;
}
</style>
