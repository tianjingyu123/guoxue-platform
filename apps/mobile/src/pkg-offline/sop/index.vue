<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="navbar-left">
        <view class="icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="navbar-title">驿站经营手册</text>
      </view>
      <view class="icon-btn" @tap="showToc = true">
        <app-icon name="list" :size="20" color="#2c2c2c" />
      </view>
    </view>

    <!-- 滚动区 -->
    <scroll-view
      scroll-y
      class="scroll-area"
      :scroll-into-view="scrollTarget"
      scroll-with-animation
    >
      <!-- Loading -->
      <view v-if="loading" class="state-box">
        <text class="state-text">加载中...</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="state-box">
        <text class="state-text">加载失败，请重试</text>
        <view class="state-btn" @tap="load">
          <text class="state-btn-text">重新加载</text>
        </view>
      </view>
      <!-- 内容 -->
      <view v-else-if="doc" class="ok-wrap">
        <!-- 文档信息 -->
        <view class="doc-info">
          <text class="doc-title">{{ doc.title }}</text>
          <view class="doc-meta">
            <view class="meta-item">
              <app-icon name="file-text" :size="14" color="#999999" />
              <text class="meta-text">版本 {{ doc.version }}</text>
            </view>
            <view v-if="doc.effectiveDate" class="meta-item">
              <app-icon name="clock" :size="14" color="#999999" />
              <text class="meta-text">{{ doc.effectiveDate }} 发布</text>
            </view>
          </view>
          <text class="doc-summary">平台官方经营建议模板，驿站可结合自身情况自主采用。</text>
        </view>

        <!-- 正文 -->
        <view class="content">
          <view v-for="section in doc.sections" :id="section.id" :key="section.id" class="section">
            <text class="h2">{{ section.title }}</text>
            <block v-for="(blk, bi) in section.blocks" :key="bi">
              <view v-if="blk.type === 'p'" class="para">
                <text v-for="(run, ri) in blk.runs" :key="ri" :class="['run', { 'run-bold': run.bold }]">{{ run.text }}</text>
              </view>
              <view v-else class="ul">
                <view v-for="(li, li2) in blk.items" :key="li2" class="li">
                  <text class="li-dot">•</text>
                  <text class="li-text">{{ li }}</text>
                </view>
              </view>
            </block>
          </view>
        </view>
      </view>
      <!-- Empty -->
      <view v-else class="state-box">
        <text class="state-text">手册内容暂未发布</text>
      </view>
    </scroll-view>

    <!-- 目录抽屉 -->
    <view v-if="showToc" class="toc-overlay">
      <view class="toc-mask" @tap="showToc = false" />
      <view class="toc-panel">
        <view class="toc-head">
          <text class="toc-title">目录</text>
          <view class="icon-btn" @tap="showToc = false">
            <app-icon name="x" :size="20" color="#2c2c2c" />
          </view>
        </view>
        <scroll-view scroll-y class="toc-list">
          <view
            v-for="item in toc"
            :key="item.id"
            class="toc-item"
            :class="{ 'toc-item-sub': item.level !== 2, 'toc-item-active': activeSection === item.id }"
            @tap="goSection(item.id)"
          >
            <app-icon name="chevron-right" :size="16" :color="activeSection === item.id ? '#c41e3a' : '#999999'" />
            <text class="toc-item-text">{{ item.title }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { goBack } from '@/utils/router'
import { legalApi, extractToc, type LegalDoc, type LegalTocItem } from '@/lib/legal-data'

// 驿站经营 SOP 手册（种子 legal-documents.seed.ts 入库·type=sop_offline）
const TYPE = 'sop_offline'

const doc = ref<LegalDoc | null>(null)
const toc = ref<LegalTocItem[]>([])
const loading = ref(true)
const error = ref(false)

const showToc = ref(false)
const activeSection = ref('')
const scrollTarget = ref('')

async function load() {
  loading.value = true
  error.value = false
  try {
    const d = await legalApi.getDoc(TYPE)
    doc.value = d
    toc.value = d ? extractToc(d) : []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

const goSection = (id: string) => {
  activeSection.value = id
  scrollTarget.value = ''
  // 强制重新触发 scroll-into-view
  setTimeout(() => { scrollTarget.value = id }, 0)
  showToc.value = false
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #faf8f5;
}

/* 导航栏 */
.navbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.navbar-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.icon-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.navbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 滚动区 */
.scroll-area {
  flex: 1;
  overflow: hidden;
}
.ok-wrap {
  display: block;
}

/* 三态 */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 160rpx 48rpx;
}
.state-text {
  font-size: 28rpx;
  color: #999999;
}
.state-btn {
  padding: 16rpx 48rpx;
  background-color: var(--brand);
  border-radius: 12rpx;
}
.state-btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* 文档信息 */
.doc-info {
  padding: 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
  background-color: rgba(245, 241, 235, 0.3);
}
.doc-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.doc-meta {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 16rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.meta-text {
  font-size: 28rpx;
  color: #999999;
}
.doc-summary {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #999999;
  line-height: 1.6;
}

/* 正文 */
.content {
  padding: 48rpx 32rpx;
}
.section {
  display: block;
}
.h2 {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-top: 64rpx;
  margin-bottom: 32rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #e8e0d5;
}
.section:first-child .h2 {
  margin-top: 0;
}
.para {
  margin-bottom: 24rpx;
}
.run {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
}
.run-bold {
  color: #2c2c2c;
  font-weight: 500;
}
.ul {
  margin: 24rpx 0;
}
.li {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.li-dot {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
}
.li-text {
  flex: 1;
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
}

/* 目录抽屉 */
.toc-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.toc-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}
.toc-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 480rpx;
  background-color: #faf8f5;
  box-shadow: -8rpx 0 24rpx rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}
.toc-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
}
.toc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.toc-list {
  flex: 1;
  padding: 16rpx;
}
.toc-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
}
.toc-item-sub {
  padding-left: 48rpx;
}
.toc-item-active {
  background-color: rgba(196, 30, 58, 0.1);
}
.toc-item-text {
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 500;
}
.toc-item-sub .toc-item-text {
  color: #999999;
  font-weight: 400;
}
.toc-item-active .toc-item-text {
  color: var(--brand);
}
</style>
