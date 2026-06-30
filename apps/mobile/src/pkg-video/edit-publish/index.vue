<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
      </view>
      <text class="nav-title">编辑视频</text>
      <view class="nav-publish" :class="{ disabled: !title.trim() }" @tap="handlePublish">
        <text class="nav-publish-text">发布</text>
      </view>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: scrollHeight + 'px' }">
      <!-- 视频预览区 -->
      <view class="preview">
        <view class="preview-inner">
          <view class="preview-placeholder">
            <view class="play-circle" @tap="togglePlay">
              <app-icon :name="isPlaying ? 'pause' : 'play'" :size="32" color="rgba(255,255,255,0.7)" />
            </view>
            <text class="preview-tip">视频预览区</text>
          </view>
          <view class="mute-btn" @tap="toggleMute">
            <app-icon :name="isMuted ? 'volume-x' : 'volume-2'" :size="18" color="#fff" />
          </view>
          <view v-if="selectedFilter !== 'none'" class="filter-overlay" :class="'filter-' + selectedFilter" />
        </view>
      </view>

      <!-- 编辑工具条 -->
      <view class="tools">
        <view
          v-for="tool in tools"
          :key="tool.id"
          class="tool-item"
          :class="{ active: activeTab === tool.id }"
          @tap="toggleTab(tool.id)"
        >
          <app-icon :name="tool.icon" :size="22" :color="activeTab === tool.id ? '#c41e3a' : '#888'" />
          <text class="tool-label" :class="{ active: activeTab === tool.id }">{{ tool.name }}</text>
        </view>
      </view>

      <!-- 裁剪面板 -->
      <view v-if="activeTab === 'trim'" class="panel">
        <text class="panel-tip">拖动滑块选择视频片段</text>
        <view class="trim-track">
          <view class="trim-frames">
            <view v-for="i in 10" :key="i" class="trim-frame" />
          </view>
          <view class="trim-selected" :style="{ left: trimStart + '%', right: (100 - trimEnd) + '%' }" />
        </view>
        <view class="trim-times">
          <text>00:00</text>
          <text>已选 {{ Math.round((trimEnd - trimStart) / 100 * 15) }}秒</text>
          <text>00:15</text>
        </view>
      </view>

      <!-- 滤镜面板 -->
      <view v-if="activeTab === 'filter'" class="panel">
        <scroll-view scroll-x class="filter-scroll">
          <view class="filter-row">
            <view
              v-for="filter in filters"
              :key="filter.id"
              class="filter-item"
              @tap="selectedFilter = filter.id"
            >
              <view class="filter-thumb" :class="['thumb-' + filter.id, { active: selectedFilter === filter.id }]">
                <app-icon name="sparkles" :size="18" color="rgba(0,0,0,0.25)" />
              </view>
              <text class="filter-name" :class="{ active: selectedFilter === filter.id }">{{ filter.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 音乐面板 -->
      <view v-if="activeTab === 'music'" class="panel panel-music">
        <view
          v-for="music in musicList"
          :key="music.id"
          class="music-item"
          :class="{ active: selectedMusic === String(music.id) }"
          @tap="selectedMusic = String(music.id)"
        >
          <view class="music-icon" :class="{ active: selectedMusic === String(music.id) }">
            <app-icon name="music" :size="18" :color="selectedMusic === String(music.id) ? '#fff' : '#888'" />
          </view>
          <view class="music-info">
            <text class="music-name" :class="{ active: selectedMusic === String(music.id) }">{{ music.name }}</text>
            <text v-if="music.artist" class="music-meta">{{ music.artist }} · {{ music.duration }}</text>
          </view>
          <app-icon v-if="selectedMusic === String(music.id)" name="check" :size="18" color="#c41e3a" />
        </view>
      </view>

      <!-- 封面面板 -->
      <view v-if="activeTab === 'cover'" class="panel">
        <text class="panel-tip">从视频中选择封面</text>
        <scroll-view scroll-x class="cover-scroll">
          <view class="cover-row">
            <view
              v-for="(frame, index) in coverFrames"
              :key="index"
              class="cover-item"
              :class="{ active: selectedCover === index }"
              @tap="selectedCover = index"
            >
              <text class="cover-num">{{ index + 1 }}</text>
            </view>
            <view class="cover-upload" @tap="chooseCover">
              <app-icon name="plus" :size="16" color="#888" />
              <text class="cover-upload-text">上传</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 发布设置区 -->
      <view class="settings">
        <!-- 标题 -->
        <view class="title-box">
          <textarea
            v-model="title"
            class="title-input"
            placeholder="添加视频标题和描述，让更多人发现你的作品..."
            :maxlength="200"
            placeholder-class="ph"
          />
          <text class="title-count">{{ title.length }}/200</text>
        </view>

        <!-- 话题标签 -->
        <view class="field">
          <text class="field-label">话题标签</text>
          <view class="topic-tags">
            <view v-for="topic in topics" :key="topic" class="topic-tag">
              <text class="topic-tag-text">#{{ topic }}</text>
              <view class="topic-remove" @tap="removeTopic(topic)">
                <app-icon name="x" :size="12" color="#888" />
              </view>
            </view>
            <view v-if="topics.length < 5" class="topic-input-wrap">
              <text class="topic-hash">#</text>
              <input
                v-model="topicInput"
                class="topic-input"
                placeholder="添加话题"
                placeholder-class="ph"
                @confirm="addTopic(topicInput)"
              />
            </view>
          </view>
          <view class="hot-topics">
            <view
              v-for="topic in hotTopicsFiltered"
              :key="topic"
              class="hot-topic"
              @tap="addTopic(topic)"
            >
              <text class="hot-topic-text">#{{ topic }}</text>
            </view>
          </view>
        </view>

        <!-- 位置 -->
        <view class="row-item" @tap="toastSoon">
          <view class="row-left">
            <app-icon name="map-pin" :size="20" color="#888" />
            <text class="row-text">{{ location || '添加位置' }}</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#ccc" />
        </view>

        <!-- 关联圈子 -->
        <view class="row-item" @tap="toastSoon">
          <view class="row-left">
            <app-icon name="users" :size="20" color="#888" />
            <text class="row-text">{{ selectedCircle.name || '选择发布圈子' }}</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#ccc" />
        </view>

        <!-- 关联商品 -->
        <view class="row-item" @tap="toastSoon">
          <view class="row-left">
            <app-icon name="shopping-bag" :size="20" color="#888" />
            <text class="row-text">{{ linkedProducts.length > 0 ? '已选 ' + linkedProducts.length + ' 件商品' : '关联商品（可选）' }}</text>
          </view>
          <app-icon name="chevron-right" :size="16" color="#ccc" />
        </view>

        <!-- 可见范围 -->
        <view class="row-item">
          <view class="row-left">
            <app-icon :name="visibility === 'public' ? 'eye' : 'lock'" :size="20" color="#888" />
            <text class="row-text">谁可以看</text>
          </view>
          <view class="vis-toggle">
            <view class="vis-btn" :class="{ active: visibility === 'public' }" @tap="visibility = 'public'">
              <text class="vis-btn-text" :class="{ active: visibility === 'public' }">公开</text>
            </view>
            <view class="vis-btn" :class="{ active: visibility === 'circle' }" @tap="visibility = 'circle'">
              <text class="vis-btn-text" :class="{ active: visibility === 'circle' }">仅圈内</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部发布按钮 -->
    <view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="publish-btn" :class="{ disabled: !title.trim() }" @tap="handlePublish">
        <text class="publish-btn-text">发布视频</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'

const statusBarHeight = ref(20)
const safeBottom = ref(0)
const scrollHeight = ref(600)

const isPlaying = ref(true)
const isMuted = ref(false)
const activeTab = ref<string | null>(null)
const selectedFilter = ref('none')
const selectedMusic = ref('none')
const selectedCover = ref(0)
const trimStart = ref(0)
const trimEnd = ref(100)

const title = ref('')
const topics = ref<string[]>([])
const topicInput = ref('')
const location = ref('')
const selectedCircle = ref<{ id: number; name: string }>({ id: 1, name: '八字命理研习社' })
const linkedProducts = ref<any[]>([])
const visibility = ref<'public' | 'circle'>('public')

const coverFrames = [0, 1, 2, 3, 4, 5, 6, 7]

const tools = [
  { id: 'trim', name: '裁剪', icon: 'maximize' },
  { id: 'filter', name: '滤镜', icon: 'sparkles' },
  { id: 'music', name: '音乐', icon: 'music' },
  { id: 'cover', name: '封面', icon: 'image' },
]

const filters = [
  { id: 'none', name: '原片' },
  { id: 'guofeng', name: '国风' },
  { id: 'xuanzhi', name: '宣纸' },
  { id: 'shuimo', name: '水墨' },
  { id: 'huaijiu', name: '怀旧' },
  { id: 'qingxin', name: '清新' },
  { id: 'nuanyang', name: '暖阳' },
]

const musicList = [
  { id: 'none', name: '无背景音乐', artist: '', duration: '' },
  { id: 1, name: '古风悠扬', artist: '平台精选', duration: '03:25' },
  { id: 2, name: '山水意境', artist: '平台精选', duration: '02:48' },
  { id: 3, name: '禅意空灵', artist: '平台精选', duration: '04:12' },
  { id: 4, name: '国韵悠长', artist: '热门推荐', duration: '03:05' },
  { id: 5, name: '书香墨韵', artist: '热门推荐', duration: '02:56' },
]

const hotTopics = ['八字命理', '风水布局', '紫微斗数', '每日运势', '国学智慧', '传统文化']
const hotTopicsFiltered = computed(() =>
  hotTopics.filter((t) => !topics.value.includes(t)).slice(0, 4)
)

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    safeBottom.value = (info.safeAreaInsets && info.safeAreaInsets.bottom) || 0
    const navH = statusBarHeight.value + 44
    scrollHeight.value = info.windowHeight - navH - 64 - safeBottom.value
  } catch (e) {
    // ignore
  }
})

function togglePlay() {
  isPlaying.value = !isPlaying.value
}
function toggleMute() {
  isMuted.value = !isMuted.value
}
function toggleTab(id: string) {
  activeTab.value = activeTab.value === id ? null : id
}
function addTopic(topic: string) {
  const t = (topic || '').trim()
  if (t && !topics.value.includes(t) && topics.value.length < 5) {
    topics.value.push(t)
    topicInput.value = ''
  }
}
function removeTopic(topic: string) {
  topics.value = topics.value.filter((t) => t !== topic)
}
function chooseCover() {
  uni.chooseImage({
    count: 1,
    success: () => uni.showToast({ title: '封面已选择', icon: 'success' }),
  })
}
function toastSoon() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
function handlePublish() {
  if (!title.value.trim()) {
    uni.showToast({ title: '请填写视频标题', icon: 'none' })
    return
  }
  uni.showToast({ title: '发布成功！', icon: 'success' })
  setTimeout(() => goBack(), 1200)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f7f8;
  display: flex;
  flex-direction: column;
}
.navbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}
.nav-back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-publish {
  padding: 6px 16px;
  background: var(--brand);
  border-radius: 999px;
}
.nav-publish.disabled {
  opacity: 0.4;
}
.nav-publish-text {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}
.content {
  flex: 1;
}
.preview {
  padding: 16px 16px 0;
}
.preview-inner {
  position: relative;
  width: 100%;
  height: 420rpx;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.preview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2a2a2a, #1a1a1a, #2a2a2a);
}
.play-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.preview-tip {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
.mute-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.filter-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.filter-shuimo {
  background: linear-gradient(135deg, transparent, rgba(203, 213, 225, 0.3));
}
.filter-xuanzhi {
  background: rgba(255, 251, 235, 0.2);
}
.filter-guofeng {
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.1), rgba(120, 53, 15, 0.1));
}
.filter-huaijiu {
  background: rgba(255, 237, 213, 0.25);
}
.filter-qingxin {
  background: linear-gradient(135deg, rgba(187, 247, 208, 0.2), rgba(207, 250, 254, 0.2));
}
.filter-nuanyang {
  background: linear-gradient(135deg, rgba(255, 237, 213, 0.25), rgba(254, 249, 195, 0.2));
}
.tools {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
  border-bottom: 1rpx solid #eee;
}
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 8px;
}
.tool-item.active {
  background: rgba(196, 30, 58, 0.08);
}
.tool-label {
  font-size: 12px;
  color: #888;
}
.tool-label.active {
  color: var(--brand);
}
.panel {
  padding: 16px;
  border-bottom: 1rpx solid #eee;
}
.panel-tip {
  font-size: 13px;
  color: #888;
  margin-bottom: 12px;
  display: block;
}
.trim-track {
  position: relative;
  height: 48px;
  background: #ececec;
  border-radius: 8px;
  overflow: hidden;
}
.trim-frames {
  position: absolute;
  inset: 0;
  display: flex;
}
.trim-frame {
  flex: 1;
  border-right: 1rpx solid rgba(0, 0, 0, 0.05);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.04));
}
.trim-selected {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(196, 30, 58, 0.15);
  border-left: 2px solid var(--brand);
  border-right: 2px solid var(--brand);
}
.trim-times {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: #888;
}
.filter-scroll {
  white-space: nowrap;
}
.filter-row {
  display: flex;
  gap: 12px;
}
.filter-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.filter-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ececec, #ddd);
}
.filter-thumb.active {
  border-color: var(--brand);
}
.thumb-shuimo {
  background: linear-gradient(135deg, #e2e8f0, #94a3b8);
}
.thumb-xuanzhi {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}
.thumb-guofeng {
  background: linear-gradient(135deg, #fee2e2, #fef3c7);
}
.thumb-huaijiu {
  background: linear-gradient(135deg, #fef9c3, #fed7aa);
}
.thumb-qingxin {
  background: linear-gradient(135deg, #bbf7d0, #cffafe);
}
.thumb-nuanyang {
  background: linear-gradient(135deg, #fed7aa, #fef08a);
}
.filter-name {
  font-size: 12px;
  color: #888;
}
.filter-name.active {
  color: var(--brand);
  font-weight: 500;
}
.panel-music {
  max-height: 380rpx;
  overflow-y: auto;
}
.music-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
}
.music-item.active {
  background: rgba(196, 30, 58, 0.08);
}
.music-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.music-icon.active {
  background: var(--brand);
}
.music-info {
  flex: 1;
}
.music-name {
  font-size: 14px;
  color: #1a1a1a;
  display: block;
}
.music-name.active {
  color: var(--brand);
  font-weight: 500;
}
.music-meta {
  font-size: 12px;
  color: #888;
}
.cover-scroll {
  white-space: nowrap;
}
.cover-row {
  display: flex;
  gap: 8px;
}
.cover-item {
  width: 64px;
  height: 114px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: linear-gradient(135deg, #ececec, #ddd);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-item.active {
  border-color: var(--brand);
}
.cover-num {
  font-size: 10px;
  color: #888;
}
.cover-upload {
  width: 64px;
  height: 114px;
  border-radius: 8px;
  border: 2px dashed #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.cover-upload-text {
  font-size: 10px;
  color: #888;
}
.settings {
  padding: 16px;
}
.title-box {
  margin-bottom: 16px;
}
.title-input {
  width: 100%;
  height: 80px;
  padding: 12px;
  background: #f0f0f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1a1a1a;
  box-sizing: border-box;
}
.ph {
  color: #aaa;
}
.title-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
.field {
  margin-bottom: 16px;
}
.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
  display: block;
}
.topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.topic-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 8px;
  background: #f0f0f0;
  border-radius: 6px;
}
.topic-tag-text {
  font-size: 12px;
  color: #555;
}
.topic-remove {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.topic-input-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}
.topic-hash {
  color: #888;
  font-size: 14px;
}
.topic-input {
  width: 120rpx;
  font-size: 14px;
}
.hot-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hot-topic {
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
}
.hot-topic-text {
  font-size: 12px;
  color: #888;
}
.row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f0f0f0;
  border-radius: 12px;
  margin-bottom: 12px;
}
.row-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.row-text {
  font-size: 14px;
  color: #1a1a1a;
}
.vis-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vis-btn {
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff;
}
.vis-btn.active {
  background: var(--brand);
}
.vis-btn-text {
  font-size: 12px;
  color: #888;
}
.vis-btn-text.active {
  color: #fff;
}
.footer {
  padding: 12px 16px;
  background: #fff;
  border-top: 1rpx solid #eee;
}
.publish-btn {
  width: 100%;
  height: 48px;
  background: var(--brand);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.publish-btn.disabled {
  opacity: 0.4;
}
.publish-btn-text {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
}
</style>
