<template>
  <view class="vp-root" :style="rootStyle">
    <!-- ========== Step: 选择视频 ========== -->
    <view v-if="step === 'select'" class="vp-select">
      <view class="vp-sel-header" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="vp-sel-close" @tap="goBack">
          <AppIcon name="x" :size="48" color="#ffffff" />
        </view>
        <text class="vp-sel-title">发布视频</text>
        <view class="vp-sel-spacer" />
      </view>

      <view class="vp-sel-body">
        <view class="vp-sel-icon">
          <AppIcon name="video" :size="96" color="rgba(255,255,255,0.8)" />
        </view>
        <text class="vp-sel-h2">选择视频</text>
        <text class="vp-sel-tip">支持 MP4、MOV 格式，最长60秒</text>

        <view class="vp-sel-actions">
          <view class="vp-sel-btn vp-sel-btn-primary" @tap="pickFromAlbum">
            <AppIcon name="image" :size="40" color="#ffffff" />
            <text class="vp-sel-btn-txt">从相册选择</text>
          </view>
          <view class="vp-sel-btn vp-sel-btn-ghost" @tap="onShoot">
            <AppIcon name="camera" :size="40" color="#ffffff" />
            <text class="vp-sel-btn-txt">拍摄视频</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== Step: 编辑封面 ========== -->
    <view v-else-if="step === 'edit'" class="vp-edit">
      <view class="vp-edit-header" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="vp-edit-back" @tap="step = 'select'">
          <AppIcon name="chevron-left" :size="48" color="#ffffff" />
        </view>
        <text class="vp-edit-title">编辑视频</text>
        <text class="vp-edit-next" @tap="step = 'publish'">下一步</text>
      </view>

      <view class="vp-edit-preview">
        <view class="vp-edit-video">
          <view class="vp-edit-play" @tap="isPlaying = !isPlaying">
            <view v-if="!isPlaying" class="vp-edit-playbtn">
              <AppIcon name="play" :size="64" color="#ffffff" />
            </view>
          </view>
        </view>
      </view>

      <view class="vp-edit-cover">
        <view class="vp-edit-cover-head">
          <text class="vp-edit-cover-label">选择封面</text>
          <view class="vp-edit-cover-upload">
            <AppIcon name="upload" :size="32" color="#c41e3a" />
            <text class="vp-edit-cover-upload-txt">上传封面</text>
          </view>
        </view>
        <scroll-view scroll-x class="vp-edit-frames" :show-scrollbar="false">
          <view
            v-for="(f, idx) in mockFrames"
            :key="idx"
            class="vp-edit-frame"
            :class="{ active: coverFrameIndex === idx }"
            @tap="coverFrameIndex = idx"
          >
            <view class="vp-edit-frame-img" :style="{ backgroundColor: f }" />
            <view v-if="coverFrameIndex === idx" class="vp-edit-frame-check">
              <AppIcon name="check" :size="40" color="#ffffff" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== Step: 发布设置 ========== -->
    <view v-else class="vp-publish">
      <view class="vp-pub-header" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="vp-pub-back" @tap="step = 'edit'">
          <AppIcon name="chevron-left" :size="48" color="#2C2C2C" />
        </view>
        <text class="vp-pub-title">发布设置</text>
        <view class="vp-pub-submit" :class="{ disabled: uploading || submitting }" @tap="handlePublish">
          <text class="vp-pub-submit-txt">{{ uploading ? '发布中...' : '发布' }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="vp-pub-body">
        <!-- 视频预览 + 标题 -->
        <view class="vp-pub-section">
          <view class="vp-pub-titlecard">
            <view class="vp-pub-cover">
              <view class="vp-pub-cover-img" :style="{ backgroundColor: mockFrames[coverFrameIndex] }" />
              <view class="vp-pub-cover-dur">00:30</view>
            </view>
            <textarea
              v-model="title"
              class="vp-pub-title-input"
              placeholder="添加标题，让更多人看到"
              placeholder-class="vp-ph"
              :maxlength="50"
            />
          </view>
          <text v-if="titleError" class="vp-pub-err">{{ titleError }}</text>
        </view>

        <!-- 描述 -->
        <view class="vp-pub-section">
          <view class="vp-pub-card">
            <textarea
              v-model="description"
              class="vp-pub-desc-input"
              placeholder="添加描述..."
              placeholder-class="vp-ph"
              :maxlength="200"
            />
            <text class="vp-pub-count">{{ description.length }}/200</text>
          </view>
        </view>

        <!-- 话题标签 -->
        <view class="vp-pub-section">
          <view class="vp-pub-card">
            <view class="vp-pub-row-head">
              <AppIcon name="hash" :size="40" color="#c41e3a" />
              <text class="vp-pub-row-title">话题标签</text>
              <text class="vp-pub-row-tip">(最多5个)</text>
            </view>
            <view v-if="tags.length" class="vp-pub-tags">
              <view v-for="tag in tags" :key="tag" class="vp-pub-tag">
                <text class="vp-pub-tag-txt">#{{ tag }}</text>
                <view class="vp-pub-tag-x" @tap="removeTag(tag)">
                  <AppIcon name="x" :size="28" color="#c41e3a" />
                </view>
              </view>
            </view>
            <view class="vp-pub-taginput">
              <input
                v-model="tagInput"
                class="vp-pub-taginput-field"
                placeholder="输入标签，回车添加"
                placeholder-class="vp-ph"
                confirm-type="done"
                @confirm="addTag"
              />
              <view class="vp-pub-taginput-btn" @tap="addTag">
                <text class="vp-pub-taginput-btn-txt">添加</text>
              </view>
            </view>
            <text class="vp-pub-hot-label">热门标签</text>
            <view class="vp-pub-hottags">
              <view
                v-for="tag in hotTags"
                :key="tag"
                class="vp-pub-hottag"
                :class="{ disabled: tags.includes(tag) }"
                @tap="selectHotTag(tag)"
              >
                <text class="vp-pub-hottag-txt" :class="{ disabled: tags.includes(tag) }">#{{ tag }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 关联商品 -->
        <view class="vp-pub-section">
          <view class="vp-pub-card">
            <view class="vp-pub-row-head between">
              <view class="vp-pub-row-left">
                <AppIcon name="shopping-bag" :size="40" color="#C9A96E" />
                <text class="vp-pub-row-title">关联商品</text>
                <text class="vp-pub-row-tip">(最多5件)</text>
              </view>
              <view class="vp-pub-add" @tap="showProductSearch = true">
                <AppIcon name="plus" :size="32" color="#c41e3a" />
                <text class="vp-pub-add-txt">添加</text>
              </view>
            </view>

            <view v-if="selectedProducts.length" class="vp-pub-selprods">
              <view v-for="(p, idx) in selectedProducts" :key="p.id" class="vp-pub-selprod">
                <view class="vp-pub-selprod-idx">{{ idx + 1 }}</view>
                <image lazy-load class="vp-pub-selprod-img" :src="p.cover" mode="aspectFill" />
                <view class="vp-pub-selprod-info">
                  <text class="vp-pub-selprod-name">{{ p.name }}</text>
                  <view class="vp-pub-selprod-meta">
                    <text class="vp-pub-selprod-price">¥{{ p.price }}</text>
                    <text class="vp-pub-selprod-comm">{{ p.commission }}%佣金</text>
                  </view>
                </view>
                <view class="vp-pub-selprod-x" @tap="toggleProduct(p)">
                  <AppIcon name="x" :size="32" color="#999999" />
                </view>
              </view>
            </view>

            <view v-if="selectedProducts.length" class="vp-pub-commission">
              <text class="vp-pub-commission-label">预计每单佣金收益</text>
              <text class="vp-pub-commission-val">¥{{ estimatedCommission.toFixed(2) }}</text>
            </view>

            <text v-if="!selectedProducts.length" class="vp-pub-empty">添加商品，开启带货赚佣金</text>
          </view>
        </view>

        <!-- 隐私 -->
        <view class="vp-pub-section">
          <view class="vp-pub-card">
            <view class="vp-pub-privacy">
              <view class="vp-pub-privacy-left">
                <AppIcon :name="isPublic ? 'eye' : 'eye-off'" :size="40" :color="isPublic ? '#22C55E' : '#999999'" />
                <text class="vp-pub-privacy-txt">{{ isPublic ? '公开可见' : '仅自己可见' }}</text>
              </view>
              <view class="vp-pub-switch" :class="{ on: isPublic }" @tap="isPublic = !isPublic">
                <view class="vp-pub-switch-knob" :class="{ on: isPublic }" />
              </view>
            </view>
          </view>
        </view>

        <view style="height: 40rpx" />
      </scroll-view>
    </view>

    <!-- 上传进度遮罩 -->
    <view v-if="uploading" class="vp-upload-mask">
      <view class="vp-upload-box">
        <view class="vp-upload-icon">
          <AppIcon name="upload" :size="64" color="#c41e3a" />
        </view>
        <text class="vp-upload-txt">正在发布...</text>
        <view class="vp-upload-bar">
          <view class="vp-upload-bar-fill" :style="{ width: uploadProgress + '%' }" />
        </view>
        <text class="vp-upload-pct">{{ uploadProgress }}%</text>
      </view>
    </view>

    <!-- 商品搜索弹层 -->
    <view v-if="showProductSearch" class="vp-prod-mask" @tap="showProductSearch = false">
      <view class="vp-prod-sheet" @tap.stop>
        <view class="vp-prod-head">
          <text class="vp-prod-head-title">选择商品</text>
          <view class="vp-prod-head-right">
            <text v-if="selectedProducts.length" class="vp-prod-head-count">已选 {{ selectedProducts.length }}/5</text>
            <view @tap="showProductSearch = false">
              <AppIcon name="x" :size="48" color="#666666" />
            </view>
          </view>
        </view>

        <view class="vp-prod-search">
          <view class="vp-prod-search-input">
            <AppIcon name="search" :size="40" color="#999999" />
            <input
              v-model="productKeyword"
              class="vp-prod-search-field"
              placeholder="搜索商品"
              placeholder-class="vp-ph"
              confirm-type="search"
              @confirm="searchProducts"
            />
          </view>
          <view class="vp-prod-search-btn" @tap="searchProducts">
            <text class="vp-prod-search-btn-txt">搜索</text>
          </view>
        </view>

        <view class="vp-prod-listlabel">
          <text class="vp-prod-listlabel-txt">{{ showMyProducts ? '我的商品库' : '搜索结果' }}</text>
        </view>

        <scroll-view scroll-y class="vp-prod-list">
          <view v-if="!searchResults.length" class="vp-prod-noresult">
            <text class="vp-prod-noresult-txt">暂无商品</text>
          </view>
          <view
            v-for="p in searchResults"
            :key="p.id"
            class="vp-prod-item"
            :class="{ selected: isProductSelected(p), disabled: !isProductSelected(p) && selectedProducts.length >= 5 }"
            @tap="toggleProduct(p)"
          >
            <view class="vp-prod-item-imgwrap">
              <image lazy-load class="vp-prod-item-img" :src="p.cover" mode="aspectFill" />
              <view v-if="isProductSelected(p)" class="vp-prod-item-check">
                <AppIcon name="check" :size="24" color="#ffffff" />
              </view>
            </view>
            <view class="vp-prod-item-info">
              <text class="vp-prod-item-name">{{ p.name }}</text>
              <view class="vp-prod-item-meta">
                <text class="vp-prod-item-price">¥{{ p.price }}</text>
                <text class="vp-prod-item-comm">{{ p.commission }}%佣金</text>
              </view>
              <text class="vp-prod-item-stock">库存 {{ p.stock }}</text>
            </view>
            <text class="vp-prod-item-state">{{ isProductSelected(p) ? '已选' : '选择' }}</text>
          </view>
        </scroll-view>

        <view v-if="selectedProducts.length" class="vp-prod-confirm">
          <view class="vp-prod-confirm-btn" @tap="showProductSearch = false">
            <text class="vp-prod-confirm-btn-txt">确认选择 ({{ selectedProducts.length }}件商品)</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { videoApi, publishHotTags, type PublishProduct } from '@/lib/video-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const rootStyle = computed(() => ({}))

const step = ref<'select' | 'edit' | 'publish'>('select')
const isPlaying = ref(false)
const coverFrameIndex = ref(0)

// 模拟视频帧（原型从真实视频提取，uni H5 无法选本地文件，用占位灰阶帧）
const mockFrames = ['#3a3a3a', '#4a4540', '#52453a', '#3f4a45', '#454552', '#4a3f3f', '#3a4552', '#504a3a']

const title = ref('')
const description = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const isPublic = ref(true)
const titleError = ref('')

const hotTags = publishHotTags

const productLibrary = ref<PublishProduct[]>([])
const showProductSearch = ref(false)
const productKeyword = ref('')
const selectedProducts = ref<PublishProduct[]>([])
const searchResults = ref<PublishProduct[]>([])
const showMyProducts = ref(true)

onMounted(async () => {
  try {
    productLibrary.value = await videoApi.getProductLibrary()
    searchResults.value = [...productLibrary.value]
  } catch {
    // 失败时保持空数组
  }
})

const uploading = ref(false)
const uploadProgress = ref(0)

const estimatedCommission = computed(() =>
  selectedProducts.value.reduce((sum, p) => sum + (p.price * (p.commission || 10)) / 100, 0),
)

const submitting = ref(false)

function pickFromAlbum() {
  // uni H5 无法真正提取帧，直接进入编辑步骤展示流程
  step.value = 'edit'
}
function onShoot() {
  uni.showToast({ title: '请使用相册选择', icon: 'none' })
}

function addTag() {
  const t = tagInput.value.trim()
  if (t && tags.value.length < 5 && !tags.value.includes(t)) {
    tags.value.push(t)
    tagInput.value = ''
  }
}
function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
}
function selectHotTag(tag: string) {
  if (tags.value.length < 5 && !tags.value.includes(tag)) {
    tags.value.push(tag)
  }
}

function isProductSelected(p: { id: string }) {
  return !!selectedProducts.value.find((x) => x.id === p.id)
}
function toggleProduct(p: PublishProduct) {
  if (isProductSelected(p)) {
    selectedProducts.value = selectedProducts.value.filter((x) => x.id !== p.id)
  } else if (selectedProducts.value.length < 5) {
    selectedProducts.value.push(p)
  }
}
function searchProducts() {
  const kw = productKeyword.value.trim()
  if (kw) {
    searchResults.value = productLibrary.value.filter((p) => p.name.includes(kw))
    showMyProducts.value = false
  } else {
    searchResults.value = [...productLibrary.value]
    showMyProducts.value = true
  }
}

async function handlePublish() {
  if (uploading.value || submitting.value) return
  if (!title.value.trim()) {
    titleError.value = '请输入视频标题'
    return
  }
  if (title.value.length > 50) {
    titleError.value = '标题不能超过50字'
    return
  }
  titleError.value = ''
  uploading.value = true
  submitting.value = true
  try {
    // 模拟上传进度
    for (let i = 0; i <= 80; i += 10) {
      await new Promise((r) => setTimeout(r, 200))
      uploadProgress.value = i
    }
    // 调用真实 API 发布
    await videoApi.publish({
      title: title.value,
      description: description.value,
      tags: tags.value,
      isPublic: isPublic.value,
      products: selectedProducts.value.map((p) => p.id),
    })
    uploadProgress.value = 100
    await new Promise((r) => setTimeout(r, 400))
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => navigateTo('/videos'), 600)
  } catch {
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  } finally {
    uploading.value = false
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.vp-root {
  min-height: 100vh;
}

/* ===== 选择视频 ===== */
.vp-select {
  min-height: 100vh;
  background-color: #000000;
  display: flex;
  flex-direction: column;
}
.vp-sel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16rpx;
  padding-right: 16rpx;
  height: 88rpx;
}
.vp-sel-close { padding: 16rpx; }
.vp-sel-title { color: #ffffff; font-size: 34rpx; font-weight: 500; }
.vp-sel-spacer { width: 80rpx; }
.vp-sel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
}
.vp-sel-icon {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.vp-sel-h2 { color: #ffffff; font-size: 40rpx; font-weight: 500; margin-bottom: 16rpx; }
.vp-sel-tip { color: rgba(255, 255, 255, 0.6); font-size: 26rpx; text-align: center; margin-bottom: 64rpx; }
.vp-sel-actions { width: 100%; display: flex; flex-direction: column; gap: 24rpx; }
.vp-sel-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.vp-sel-btn-primary { background-color: var(--brand); }
.vp-sel-btn-ghost { background-color: rgba(255, 255, 255, 0.1); }
.vp-sel-btn-txt { color: #ffffff; font-size: 30rpx; }

/* ===== 编辑封面 ===== */
.vp-edit {
  min-height: 100vh;
  background-color: #000000;
  display: flex;
  flex-direction: column;
}
.vp-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16rpx;
  padding-right: 24rpx;
  height: 88rpx;
}
.vp-edit-back { padding: 16rpx; }
.vp-edit-title { color: #ffffff; font-size: 34rpx; font-weight: 500; }
.vp-edit-next { color: var(--brand); font-size: 30rpx; font-weight: 500; }
.vp-edit-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
}
.vp-edit-video {
  position: relative;
  width: 100%;
  height: 60vh;
  background-color: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-edit-play {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-edit-playbtn {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-edit-cover {
  background-color: #18181b;
  padding: 32rpx;
}
.vp-edit-cover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.vp-edit-cover-label { color: #ffffff; font-size: 26rpx; }
.vp-edit-cover-upload { display: flex; align-items: center; gap: 8rpx; }
.vp-edit-cover-upload-txt { color: var(--brand); font-size: 26rpx; }
.vp-edit-frames { white-space: nowrap; }
.vp-edit-frame {
  display: inline-block;
  position: relative;
  width: 112rpx;
  height: 168rpx;
  border-radius: 16rpx;
  overflow: hidden;
  margin-right: 16rpx;
  box-sizing: border-box;
}
.vp-edit-frame.active { border: 4rpx solid var(--brand); }
.vp-edit-frame-img { width: 100%; height: 100%; }
.vp-edit-frame-check {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(196, 30, 58, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 发布设置 ===== */
.vp-publish {
  min-height: 100vh;
  background-color: #FAF8F5;
  display: flex;
  flex-direction: column;
}
.vp-pub-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: #ffffff;
  border-bottom: 1rpx solid #E8E3DB;
}
.vp-pub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16rpx;
  padding-right: 24rpx;
  padding-bottom: 12rpx;
}
.vp-pub-back { padding: 16rpx; }
.vp-pub-title { color: #2C2C2C; font-size: 34rpx; font-weight: 500; }
.vp-pub-submit {
  padding: 12rpx 32rpx;
  background-color: var(--brand);
  border-radius: 999rpx;
}
.vp-pub-submit.disabled { opacity: 0.5; }
.vp-pub-submit-txt { color: #ffffff; font-size: 26rpx; }
.vp-pub-body { flex: 1; }
.vp-pub-section { padding: 0 32rpx; margin-top: 24rpx; }
.vp-pub-section:first-child { padding-top: 8rpx; }
.vp-pub-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.vp-pub-titlecard {
  display: flex;
  gap: 32rpx;
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.vp-pub-cover {
  position: relative;
  width: 192rpx;
  height: 256rpx;
  border-radius: 24rpx;
  overflow: hidden;
  flex-shrink: 0;
}
.vp-pub-cover-img { width: 100%; height: 100%; }
.vp-pub-cover-dur {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}
.vp-pub-title-input {
  flex: 1;
  height: 256rpx;
  font-size: 26rpx;
  color: #2C2C2C;
  line-height: 1.5;
}
.vp-ph { color: #999999; }
.vp-pub-err { color: #EF4444; font-size: 22rpx; margin-top: 8rpx; display: block; }
.vp-pub-desc-input { width: 100%; height: 120rpx; font-size: 26rpx; color: #2C2C2C; line-height: 1.5; }
.vp-pub-count { display: block; text-align: right; font-size: 22rpx; color: #999999; }
.vp-pub-row-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.vp-pub-row-head.between { justify-content: space-between; }
.vp-pub-row-left { display: flex; align-items: center; gap: 12rpx; }
.vp-pub-row-title { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.vp-pub-row-tip { font-size: 22rpx; color: #999999; }
.vp-pub-add { display: flex; align-items: center; gap: 4rpx; }
.vp-pub-add-txt { color: var(--brand); font-size: 26rpx; }
.vp-pub-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 24rpx; }
.vp-pub-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: rgba(196, 30, 58, 0.1);
  border-radius: 999rpx;
}
.vp-pub-tag-txt { color: var(--brand); font-size: 26rpx; }
.vp-pub-tag-x { display: flex; align-items: center; }
.vp-pub-taginput { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.vp-pub-taginput-field {
  flex: 1;
  padding: 16rpx 24rpx;
  background-color: #FAF8F5;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #2C2C2C;
}
.vp-pub-taginput-btn {
  padding: 16rpx 32rpx;
  background-color: var(--brand);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
}
.vp-pub-taginput-btn-txt { color: #ffffff; font-size: 26rpx; }
.vp-pub-hot-label { display: block; font-size: 22rpx; color: #999999; margin-bottom: 16rpx; }
.vp-pub-hottags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.vp-pub-hottag {
  padding: 8rpx 24rpx;
  background-color: #FAF8F5;
  border-radius: 999rpx;
}
.vp-pub-hottag.disabled { background-color: #f4f4f5; }
.vp-pub-hottag-txt { font-size: 26rpx; color: #666666; }
.vp-pub-hottag-txt.disabled { color: #a1a1aa; }
.vp-pub-selprods { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 24rpx; }
.vp-pub-selprod {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 16rpx;
  background-color: #FAF8F5;
  border-radius: 24rpx;
}
.vp-pub-selprod-idx {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: var(--brand);
  color: #ffffff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.vp-pub-selprod-img { width: 80rpx; height: 80rpx; border-radius: 16rpx; flex-shrink: 0; }
.vp-pub-selprod-info { flex: 1; min-width: 0; }
.vp-pub-selprod-name {
  font-size: 22rpx;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.vp-pub-selprod-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.vp-pub-selprod-price { font-size: 22rpx; color: var(--brand); font-weight: 500; }
.vp-pub-selprod-comm {
  font-size: 18rpx;
  color: #16A34A;
  background-color: #F0FDF4;
  padding: 0 8rpx;
  border-radius: 6rpx;
}
.vp-pub-selprod-x { padding: 4rpx; }
.vp-pub-commission {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: rgba(201, 169, 110, 0.1);
  border-radius: 24rpx;
}
.vp-pub-commission-label { font-size: 22rpx; color: #666666; }
.vp-pub-commission-val { font-size: 26rpx; color: #C9A96E; font-weight: 700; }
.vp-pub-empty { display: block; text-align: center; font-size: 22rpx; color: #999999; padding: 32rpx 0; }
.vp-pub-privacy { display: flex; align-items: center; justify-content: space-between; }
.vp-pub-privacy-left { display: flex; align-items: center; gap: 12rpx; }
.vp-pub-privacy-txt { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.vp-pub-switch {
  position: relative;
  width: 96rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background-color: #d4d4d8;
  transition: background-color 0.2s;
}
.vp-pub-switch.on { background-color: #22C55E; }
.vp-pub-switch-knob {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}
.vp-pub-switch-knob.on { transform: translateX(40rpx); }

/* ===== 上传进度 ===== */
.vp-upload-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.vp-upload-box {
  width: 576rpx;
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 48rpx;
}
.vp-upload-icon {
  width: 128rpx;
  height: 128rpx;
  margin: 0 auto 24rpx;
  border-radius: 50%;
  background-color: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-upload-txt { display: block; text-align: center; color: #2C2C2C; font-size: 30rpx; font-weight: 500; margin-bottom: 32rpx; }
.vp-upload-bar { height: 16rpx; background-color: #f4f4f5; border-radius: 999rpx; overflow: hidden; }
.vp-upload-bar-fill { height: 100%; background-color: var(--brand); transition: width 0.3s; }
.vp-upload-pct { display: block; text-align: center; font-size: 26rpx; color: #999999; margin-top: 16rpx; }

/* ===== 商品搜索弹层 ===== */
.vp-prod-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  align-items: flex-end;
}
.vp-prod-sheet {
  width: 100%;
  background-color: #ffffff;
  border-radius: 48rpx 48rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.vp-prod-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.vp-prod-head-title { font-size: 34rpx; font-weight: 500; color: #2C2C2C; }
.vp-prod-head-right { display: flex; align-items: center; gap: 16rpx; }
.vp-prod-head-count { font-size: 22rpx; color: var(--brand); }
.vp-prod-search { display: flex; gap: 16rpx; padding: 32rpx; }
.vp-prod-search-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
  background-color: #FAF8F5;
  border-radius: 24rpx;
}
.vp-prod-search-field { flex: 1; height: 72rpx; font-size: 26rpx; color: #2C2C2C; }
.vp-prod-search-btn {
  padding: 0 32rpx;
  background-color: var(--brand);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
}
.vp-prod-search-btn-txt { color: #ffffff; font-size: 26rpx; }
.vp-prod-listlabel { padding: 0 32rpx 16rpx; }
.vp-prod-listlabel-txt { font-size: 22rpx; color: #999999; }
.vp-prod-list { flex: 1; padding: 0 32rpx; }
.vp-prod-noresult { text-align: center; padding: 64rpx 0; }
.vp-prod-noresult-txt { font-size: 26rpx; color: #999999; }
.vp-prod-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  margin-bottom: 16rpx;
}
.vp-prod-item.selected { background-color: rgba(196, 30, 58, 0.05); border: 1rpx solid rgba(196, 30, 58, 0.3); }
.vp-prod-item.disabled { opacity: 0.5; }
.vp-prod-item-imgwrap { position: relative; flex-shrink: 0; }
.vp-prod-item-img { width: 112rpx; height: 112rpx; border-radius: 16rpx; }
.vp-prod-item-check {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: var(--brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-prod-item-info { flex: 1; min-width: 0; }
.vp-prod-item-name {
  font-size: 26rpx;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.vp-prod-item-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 8rpx; }
.vp-prod-item-price { font-size: 28rpx; color: var(--brand); font-weight: 700; }
.vp-prod-item-comm {
  font-size: 18rpx;
  color: #16A34A;
  background-color: #F0FDF4;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.vp-prod-item-stock { display: block; font-size: 18rpx; color: #999999; margin-top: 4rpx; }
.vp-prod-item-state { font-size: 22rpx; color: #666666; flex-shrink: 0; }
.vp-prod-confirm { padding: 32rpx; border-top: 1rpx solid #E8E3DB; }
.vp-prod-confirm-btn {
  width: 100%;
  height: 88rpx;
  background-color: var(--brand);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-prod-confirm-btn-txt { color: #ffffff; font-size: 30rpx; font-weight: 500; }
</style>
