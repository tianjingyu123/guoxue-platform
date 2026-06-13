<template>
  <view class="pub-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">发布内容</text>
        <view class="header-pub" :class="{ off: !canPublish }" @click="handlePublish">
          <text>{{ scheduleEnabled ? '定时发布' : '发布' }}</text>
        </view>
      </view>
    </view>

    <view class="pub-body">
      <!-- 内容类型 -->
      <view class="type-row">
        <view v-for="t in contentTypes" :key="t.id" class="type-card" :class="{ active: contentType === t.id }" @click="contentType = t.id; uploadedMedia = []">
          <text class="type-icon">{{ t.icon }}</text>
          <text class="type-label">{{ t.label }}</text>
          <text class="type-desc">{{ t.desc }}</text>
        </view>
      </view>

      <!-- 标题 -->
      <input v-if="contentType !== 'post'" v-model="title" class="title-input" :placeholder="contentType === 'video' ? '添加视频标题，获得更多曝光' : '请输入标题（选填）'" />

      <!-- 正文 -->
      <view v-if="contentType !== 'video'" class="editor-wrap">
        <view v-if="contentType === 'article'" class="editor-toolbar">
          <text class="et-btn">B</text>
          <text class="et-btn">I</text>
          <text class="et-btn">☰</text>
          <text class="et-btn">🔗</text>
          <text class="et-btn">≡</text>
          <view class="et-spacer" />
          <view class="et-card-btn" @click="showCardPanel = !showCardPanel">
            <text>＋ 推荐卡片</text>
          </view>
        </view>
        <textarea v-model="content" class="editor-text" :placeholder="contentType === 'article' ? '开始撰写你的文章...' : '分享你的想法...'" />
      </view>

      <!-- 推荐卡片面板 -->
      <view v-if="showCardPanel && contentType === 'article'" class="card-panel">
        <text class="cp-title">插入推荐卡片</text>
        <view class="cp-grid">
          <view v-for="c in cardTypes" :key="c.id" class="cp-item" @click="insertCard(c.id)">
            <view class="cp-icon" :style="{ background: c.bg }">{{ c.icon }}</view>
            <text class="cp-label">{{ c.label }}</text>
          </view>
        </view>
      </view>

      <!-- 图片上传（帖子） -->
      <view v-if="contentType === 'post'" class="media-section">
        <view class="ms-header">
          <text class="ms-label">添加图片/视频</text>
          <text class="ms-count">{{ uploadedMedia.length }}/9</text>
        </view>
        <view class="ms-grid">
          <view v-for="m in uploadedMedia" :key="m.id" class="ms-item">
            <text class="ms-icon">{{ m.type === 'video' ? '🎬' : '🖼️' }}</text>
            <view class="ms-remove" @click="removeMedia(m.id)"><text>✕</text></view>
          </view>
          <view v-if="uploadedMedia.length < 9" class="ms-add" @click="addMedia">
            <text class="ms-add-icon">＋</text>
            <text class="ms-add-text">添加</text>
          </view>
        </view>
      </view>

      <!-- 视频上传 -->
      <view v-if="contentType === 'video'" class="video-section">
        <text class="ms-label">上传视频</text>
        <view v-if="uploadedMedia.length === 0" class="video-upload" @click="addMedia">
          <view class="vu-icon">🎬</view>
          <text class="vu-text">点击上传视频</text>
          <text class="vu-hint">支持 MP4、MOV 格式，最大 500MB</text>
        </view>
        <view v-else class="video-preview">
          <view class="vp-inner">🎬</view>
          <text class="vp-name">{{ uploadedMedia[0].name }}</text>
          <view class="vp-remove" @click="uploadedMedia = []"><text>✕</text></view>
        </view>

        <view v-if="uploadedMedia.length > 0" class="cover-row">
          <text class="ms-label">选择封面</text>
          <view class="cover-grid">
            <view v-for="i in 3" :key="i" class="cover-item" :class="{ sel: videoCover === String(i) }" @click="videoCover = String(i)">
              <text>第{{ i }}帧</text>
            </view>
            <view class="cover-item custom"><text>＋ 自定义</text></view>
          </view>
        </view>

        <view v-if="uploadedMedia.length > 0" class="link-product" @click="linkedProducts = [1]">
          <view class="lp-left">
            <text class="lp-icon">🛍️</text>
            <view>
              <text class="lp-title">关联商品</text>
              <text class="lp-sub">{{ linkedProducts.length ? '已关联 ' + linkedProducts.length + ' 件商品' : '从商城选择商品进行带货' }}</text>
            </view>
          </view>
          <text class="lp-arrow">›</text>
        </view>
      </view>

      <!-- 关联圈子 -->
      <view class="circle-card" @click="showCircleSelect = !showCircleSelect">
        <view class="cc-left">
          <view class="cc-avatar">{{ selectedCircle.name[0] }}</view>
          <view>
            <text class="cc-name">{{ selectedCircle.name }}</text>
            <text class="cc-members">{{ selectedCircle.members }} 成员</text>
          </view>
        </view>
        <view class="cc-right">
          <text class="cc-badge">发布到此圈子</text>
          <text class="cc-arrow">›</text>
        </view>
      </view>

      <view v-if="showCircleSelect" class="circle-panel">
        <view v-for="c in myCircles" :key="c.id" class="ci-item" :class="{ sel: selectedCircle.id === c.id }" @click="selectedCircle = c; showCircleSelect = false">
          <view class="ci-avatar">{{ c.name[0] }}</view>
          <view class="ci-info">
            <text class="ci-name">{{ c.name }}</text>
            <text class="ci-members">{{ c.members }} 成员</text>
          </view>
          <text v-if="selectedCircle.id === c.id" class="ci-check">✓</text>
        </view>
      </view>

      <!-- 发布设置 -->
      <view class="settings-card">
        <view class="sc-toggle" @click="showSettings = !showSettings">
          <text class="sc-label">⚙️ 发布设置</text>
          <text class="sc-arrow" :class="{ open: showSettings }">›</text>
        </view>
        <view v-if="showSettings" class="sc-body">
          <view class="sc-row">
            <view class="sc-left">
              <text class="sc-name">⏰ 定时发布</text>
              <text v-if="scheduleEnabled && scheduleTime" class="sc-hint">{{ scheduleTime }}</text>
            </view>
            <view class="sc-switch" :class="{ on: scheduleEnabled }" @click="scheduleEnabled = !scheduleEnabled"><view class="sc-dot" /></view>
          </view>
          <view v-if="scheduleEnabled" class="sc-date-row">
            <text class="sc-date-icon">📅</text>
            <input v-model="scheduleTime" class="sc-date-input" placeholder="选择发布时间" />
          </view>
          <view v-if="contentType === 'article'" class="sc-row">
            <view>
              <text class="sc-name">🌐 推送到首页</text>
              <text class="sc-hint-sub">需经平台审核</text>
            </view>
            <view class="sc-switch" :class="{ on: pushToHome }" @click="pushToHome = !pushToHome"><view class="sc-dot" /></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部栏 -->
    <view class="bottom-bar">
      <view class="bb-draft" @click="uni.showToast({ title: '已保存为草稿', icon: 'success' })">
        <text>存为草稿</text>
      </view>
      <view class="bb-pub" :class="{ off: !canPublish }" @click="handlePublish">
        <text>{{ scheduleEnabled ? '定时发布' : '立即发布' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type ContentType = 'post' | 'article' | 'video'

const contentType = ref<ContentType>('post')
const title = ref('')
const content = ref('')
const uploadedMedia = ref<{ id: string; type: string; name: string }[]>([])
const selectedCircle = ref({ id: 1, name: '八字命理研习社', avatar: '', members: 1280 })
const showCircleSelect = ref(false)
const showSettings = ref(false)
const showCardPanel = ref(false)
const scheduleEnabled = ref(false)
const scheduleTime = ref('')
const pushToHome = ref(false)
const videoCover = ref('')
const linkedProducts = ref<number[]>([])

const contentTypes = [
  { id: 'post' as ContentType, label: '帖子', icon: '🖼️', desc: '图文动态，快速分享' },
  { id: 'article' as ContentType, label: '文章', icon: '📖', desc: '深度长文，知识沉淀' },
  { id: 'video' as ContentType, label: '短视频', icon: '🎬', desc: '视频内容，生动展示' },
]

const cardTypes = [
  { id: 'circle', label: '圈子', icon: '👥', bg: 'rgba(22,119,255,0.08)' },
  { id: 'course', label: '课程', icon: '📖', bg: 'rgba(82,196,26,0.08)' },
  { id: 'product', label: '商品', icon: '🛍️', bg: 'rgba(250,140,22,0.08)' },
  { id: 'paipan', label: '排盘', icon: '🧭', bg: 'rgba(196,30,58,0.08)' },
  { id: 'agent', label: '智能体', icon: '🤖', bg: 'rgba(114,46,209,0.08)' },
]

const myCircles = [
  { id: 1, name: '八字命理研习社', avatar: '', members: 1280 },
  { id: 2, name: '紫微斗数交流群', avatar: '', members: 856 },
  { id: 3, name: '风水堪舆学院', avatar: '', members: 2100 },
]

const canPublish = computed(() => title.value.trim() || content.value.trim() || uploadedMedia.value.length > 0)

function addMedia() {
  const m = { id: Date.now().toString(), type: contentType.value === 'video' ? 'video' : 'image', name: contentType.value === 'video' ? 'video_001.mp4' : 'image_' + (uploadedMedia.value.length + 1) + '.jpg' }
  if (contentType.value === 'video') { uploadedMedia.value = [m] }
  else if (uploadedMedia.value.length < 9) { uploadedMedia.value.push(m) }
}

function removeMedia(id: string) { uploadedMedia.value = uploadedMedia.value.filter(m => m.id !== id) }

function insertCard(type: string) { content.value += '\n[' + type.toUpperCase() + '_CARD]\n'; showCardPanel.value = false }

function handlePublish() {
  if (canPublish.value) { uni.showToast({ title: '发布成功', icon: 'success' }) }
}
</script>

<style scoped>
.pub-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-pub { padding: 8rpx 24rpx; background: #C41E3A; color: #fff; border-radius: 32rpx; font-size: 24rpx; }
.header-pub.off { background: #DDD; color: #999; }

.pub-body { padding: 16rpx 24rpx; }

.type-row { display: flex; gap: 10rpx; margin-bottom: 16rpx; }
.type-card { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 16rpx 8rpx; border-radius: 16rpx; border: 2rpx solid #E8E0D5; background: #fff; }
.type-card.active { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.type-icon { font-size: 36rpx; margin-bottom: 4rpx; }
.type-label { font-size: 24rpx; font-weight: 500; color: #333; }
.type-desc { font-size: 18rpx; color: #BBB; }
.type-card.active .type-label { color: #C41E3A; }

.title-input { width: 100%; padding: 16rpx 20rpx; background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; font-size: 26rpx; color: #333; box-sizing: border-box; }

.editor-wrap { background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; overflow: hidden; margin-bottom: 14rpx; }
.editor-toolbar { display: flex; align-items: center; gap: 4rpx; padding: 8rpx 12rpx; border-bottom: 1px solid #F0EDE5; }
.et-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #999; border-radius: 8rpx; }
.et-spacer { flex: 1; }
.et-card-btn { padding: 4rpx 14rpx; background: rgba(196,30,58,0.06); color: #C41E3A; font-size: 20rpx; border-radius: 8rpx; }
.editor-text { width: 100%; min-height: 300rpx; padding: 16rpx; font-size: 26rpx; color: #333; box-sizing: border-box; }

.card-panel { background: #fff; border-radius: 14rpx; padding: 16rpx; margin-bottom: 14rpx; border: 1px solid rgba(196,30,58,0.2); }
.cp-title { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }
.cp-grid { display: flex; gap: 12rpx; }
.cp-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.cp-icon { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.cp-label { font-size: 20rpx; color: #666; }

.media-section { margin-bottom: 14rpx; }
.ms-header { display: flex; justify-content: space-between; margin-bottom: 10rpx; }
.ms-label { font-size: 22rpx; color: #666; display: block; margin-bottom: 10rpx; }
.ms-count { font-size: 20rpx; color: #BBB; }
.ms-grid { display: flex; flex-wrap: wrap; gap: 10rpx; }
.ms-item { width: 200rpx; height: 200rpx; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; position: relative; }
.ms-icon { font-size: 48rpx; opacity: 0.4; }
.ms-remove { position: absolute; top: 6rpx; right: 6rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.ms-remove text { font-size: 18rpx; color: #fff; }
.ms-add { width: 200rpx; height: 200rpx; background: #F5F1EB; border-radius: 12rpx; border: 2px dashed #E8E0D5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
.ms-add-icon { font-size: 40rpx; color: #BBB; }
.ms-add-text { font-size: 20rpx; color: #BBB; }

.video-section { margin-bottom: 14rpx; }
.video-upload { width: 100%; aspect-ratio: 16/9; background: #F5F1EB; border-radius: 14rpx; border: 2px dashed #E8E0D5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.vu-icon { font-size: 52rpx; }
.vu-text { font-size: 24rpx; color: #999; }
.vu-hint { font-size: 18rpx; color: #BBB; }
.video-preview { width: 100%; aspect-ratio: 16/9; background: #F5F1EB; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; position: relative; }
.vp-inner { font-size: 64rpx; opacity: 0.3; }
.vp-name { position: absolute; top: 12rpx; left: 12rpx; font-size: 20rpx; color: #fff; background: rgba(0,0,0,0.5); padding: 4rpx 12rpx; border-radius: 8rpx; }
.vp-remove { position: absolute; top: 12rpx; right: 12rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.vp-remove text { font-size: 20rpx; color: #fff; }

.cover-row { margin-top: 14rpx; }
.cover-grid { display: flex; gap: 10rpx; }
.cover-item { flex: 1; aspect-ratio: 16/9; background: #F5F1EB; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; border: 2px solid transparent; }
.cover-item.sel { border-color: #C41E3A; }
.cover-item.custom { border: 2px dashed #E8E0D5; }

.link-product { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 18rpx; background: #fff; border-radius: 14rpx; margin-top: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.lp-left { display: flex; align-items: center; gap: 12rpx; }
.lp-icon { font-size: 36rpx; }
.lp-title { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.lp-sub { font-size: 18rpx; color: #BBB; }
.lp-arrow { font-size: 28rpx; color: #BBB; }

.circle-card { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 18rpx; background: #fff; border-radius: 14rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cc-left { display: flex; align-items: center; gap: 12rpx; }
.cc-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #C41E3A; }
.cc-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.cc-members { font-size: 18rpx; color: #BBB; }
.cc-right { display: flex; align-items: center; gap: 8rpx; }
.cc-badge { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.06); padding: 4rpx 12rpx; border-radius: 6rpx; }
.cc-arrow { font-size: 28rpx; color: #BBB; }

.circle-panel { background: #fff; border-radius: 14rpx; padding: 8rpx; margin-bottom: 14rpx; border: 1px solid rgba(196,30,58,0.2); }
.ci-item { display: flex; align-items: center; gap: 12rpx; padding: 14rpx; border-radius: 10rpx; }
.ci-item.sel { background: rgba(196,30,58,0.04); }
.ci-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; }
.ci-info { flex: 1; }
.ci-name { font-size: 24rpx; color: #333; display: block; }
.ci-members { font-size: 18rpx; color: #BBB; }
.ci-check { font-size: 28rpx; color: #C41E3A; }

.settings-card { background: #fff; border-radius: 14rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.sc-toggle { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 18rpx; }
.sc-label { font-size: 24rpx; font-weight: 500; color: #333; }
.sc-arrow { font-size: 28rpx; color: #BBB; transition: transform 0.2s; display: inline-block; }
.sc-arrow.open { transform: rotate(90deg); }
.sc-body { border-top: 1px solid #F0EDE5; }
.sc-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 18rpx; border-bottom: 1px solid #F0EDE5; }
.sc-name { font-size: 22rpx; color: #333; display: block; }
.sc-hint { font-size: 18rpx; color: #C41E3A; }
.sc-hint-sub { font-size: 18rpx; color: #BBB; }
.sc-switch { width: 64rpx; height: 34rpx; border-radius: 17rpx; background: #DDD; position: relative; transition: background 0.2s; }
.sc-switch.on { background: #C41E3A; }
.sc-dot { width: 28rpx; height: 28rpx; border-radius: 50%; background: #fff; position: absolute; top: 3rpx; left: 3rpx; transition: left 0.2s; }
.sc-switch.on .sc-dot { left: 33rpx; }
.sc-date-row { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 18rpx; border-bottom: 1px solid #F0EDE5; background: #FAF8F5; }
.sc-date-icon { font-size: 28rpx; }
.sc-date-input { flex: 1; font-size: 22rpx; color: #333; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 24rpx; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; display: flex; gap: 16rpx; }
.bb-draft { flex: 1; height: 80rpx; border-radius: 20rpx; border: 1px solid #E8E0D5; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #666; }
.bb-pub { flex: 1; height: 80rpx; border-radius: 20rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; font-weight: 500; }
.bb-pub.off { background: #DDD; color: #999; }
</style>
