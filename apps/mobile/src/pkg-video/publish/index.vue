<template>
  <view class="vp-root">
    <!-- ========== 顶栏（自定义导航） ========== -->
    <view class="vp-topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vp-top-back" hover-class="vp-hover" @tap="goBack">
        <AppIcon name="chevron-left" :size="40" color="#6E6E73" />
        <text class="vp-top-back-txt">返回</text>
      </view>
      <text class="vp-top-title">发布短视频</text>
      <view class="vp-top-ph" />
    </view>

    <!-- ========== 表单主体 ========== -->
    <scroll-view scroll-y class="vp-body" :scroll-into-view="scrollTarget">
      <!-- 视频上传区 -->
      <view id="fld-video" class="vp-field">
        <!-- 未选：虚线大框 -->
        <view
          v-if="!videoTempPath"
          class="vp-upload"
          :class="{ error: videoError }"
          hover-class="vp-upload-hover"
          @tap="pickFromAlbum"
        >
          <view class="vp-upload-plus">
            <AppIcon name="plus" :size="40" color="#C41E3A" />
          </view>
          <text class="vp-upload-t1">选择视频</text>
          <text class="vp-upload-t2">支持本地视频直传，最长 60 秒</text>
          <text class="vp-hint">竖屏 9:16 · 1080×1920</text>
        </view>

        <!-- 已选：封面预览 + 操作 -->
        <view v-else class="vp-preview">
          <view class="vp-pv-cover">
            <view class="vp-pv-ratio">
              <image
                v-if="coverPreview"
                class="vp-pv-img"
                :src="coverPreview"
                mode="aspectFill"
              />
              <view v-else class="vp-pv-img vp-pv-ph" />
              <!-- 上传中：封面叠白纱 + 百分比 -->
              <view v-if="uploading" class="vp-pv-uploading">
                <text class="vp-pv-uploading-pct num">{{ uploadProgress }}%</text>
              </view>
            </view>
            <view class="vp-pv-dur num">{{ durationText }}</view>
          </view>

          <view class="vp-pv-ops">
            <template v-if="!uploading">
              <view class="vp-btn-ghost" hover-class="vp-hover" @tap="pickCover">
                <text class="vp-btn-ghost-txt">{{ uploadingCover ? '上传中…' : '更换封面' }}</text>
              </view>
              <text class="vp-hint">封面建议 3:4 竖图 · 900×1200</text>
              <view class="vp-btn-ghost vp-btn-ghost-dashed" hover-class="vp-hover" @tap="pickFromAlbum">
                <text class="vp-btn-ghost-txt vp-btn-ghost-txt-weak">重新选择视频</text>
              </view>
            </template>
            <template v-else>
              <text class="vp-pv-uptxt">上传中… <text class="num">{{ uploadProgress }}%</text></text>
              <view class="vp-prog-track">
                <view class="vp-prog-bar" :style="{ width: uploadProgress + '%' }" />
              </view>
            </template>
          </view>
        </view>
        <view v-if="videoError" class="vp-errmsg">
          <AppIcon name="x-circle" :size="26" color="#D64541" />
          <text class="vp-errmsg-txt">请先选择视频</text>
        </view>
      </view>

      <!-- 标题 -->
      <view id="fld-title" class="vp-field">
        <view class="vp-label">
          <text class="vp-label-txt">标题</text>
          <text class="vp-req">*</text>
        </view>
        <view class="vp-input-wrap" :class="{ error: titleError }">
          <input
            v-model="title"
            class="vp-input"
            placeholder="给视频起个标题（建议 30 字内）"
            placeholder-class="vp-ph"
            :maxlength="50"
          />
        </view>
        <view v-if="titleError" class="vp-errmsg">
          <AppIcon name="x-circle" :size="26" color="#D64541" />
          <text class="vp-errmsg-txt">{{ titleError }}</text>
        </view>
      </view>

      <!-- 描述 -->
      <view class="vp-field">
        <view class="vp-label">
          <text class="vp-label-txt">描述</text>
          <text class="vp-opt">（可选）</text>
        </view>
        <view class="vp-input-wrap">
          <textarea
            v-model="description"
            class="vp-textarea"
            placeholder="补充描述…"
            placeholder-class="vp-ph"
            :maxlength="200"
            auto-height
          />
        </view>
      </view>

      <!-- 所属圈子（必选，真连 /circles/my 我的圈子选择） -->
      <view class="vp-field">
        <view class="vp-label">
          <text class="vp-label-txt">所属圈子</text>
          <text class="vp-req">*</text>
        </view>
        <view class="vp-row" hover-class="vp-hover" @tap="openCircleSheet">
          <AppIcon name="users" :size="30" color="#C9A96E" />
          <text class="vp-row-txt">{{ selectedCircle ? selectedCircle.name : (circlesLoading ? '加载我的圈子…' : '选择所属圈子') }}</text>
          <view class="vp-row-arrow">
            <text class="vp-row-arrow-txt">{{ myCircles.length > 1 ? '切换' : '选择' }}</text>
            <AppIcon name="chevron-right" :size="26" color="#999999" />
          </view>
        </view>
      </view>

      <!-- 可见范围 -->
      <view class="vp-field">
        <view class="vp-label">
          <text class="vp-label-txt">可见范围</text>
        </view>
        <view class="vp-seg">
          <view
            class="vp-seg-item"
            :class="{ on: visibility === 'PLATFORM' }"
            hover-class="vp-hover"
            @tap="visibility = 'PLATFORM'"
          >
            <text class="vp-seg-txt" :class="{ on: visibility === 'PLATFORM' }">全平台</text>
          </view>
          <view
            class="vp-seg-item"
            :class="{ on: visibility === 'CIRCLE_ONLY' }"
            hover-class="vp-hover"
            @tap="visibility = 'CIRCLE_ONLY'"
          >
            <text class="vp-seg-txt" :class="{ on: visibility === 'CIRCLE_ONLY' }">仅圈子内</text>
          </view>
        </view>
      </view>

      <!-- 关联商品（可选，单件） -->
      <view class="vp-field">
        <view class="vp-label">
          <text class="vp-label-txt">关联商品</text>
          <text class="vp-opt">{{ selectedProduct ? '（已选）' : '（可选）' }}</text>
        </view>

        <!-- 未选：入口行 -->
        <view
          v-if="!selectedProduct"
          class="vp-row vp-row-weak"
          hover-class="vp-hover"
          @tap="openProductSheet"
        >
          <AppIcon name="shopping-bag" :size="30" color="#999999" />
          <text class="vp-row-txt vp-row-txt-weak">从商品库选一件挂在视频上</text>
          <view class="vp-row-arrow">
            <text class="vp-row-arrow-txt">去选择</text>
            <AppIcon name="chevron-right" :size="26" color="#999999" />
          </view>
        </view>

        <!-- 已选：商品小卡 -->
        <view v-else class="vp-goods-card">
          <image lazy-load class="vp-goods-img" :src="selectedProduct.cover" mode="aspectFill" />
          <view class="vp-goods-info">
            <text class="vp-goods-name">{{ selectedProduct.name }}</text>
            <text class="vp-goods-price num">￥{{ formatPrice(selectedProduct.price) }}</text>
          </view>
          <view class="vp-goods-rm" hover-class="vp-hover" @tap="clearProduct">
            <AppIcon name="x-circle" :size="30" color="#999999" />
            <text class="vp-goods-rm-txt">移除</text>
          </view>
        </view>
      </view>

      <view style="height: 48rpx" />
    </scroll-view>

    <!-- ========== 底部发布按钮 ========== -->
    <view class="vp-footer" :style="{ paddingBottom: 'calc(24rpx + env(safe-area-inset-bottom))' }">
      <view
        class="vp-submit"
        :class="{ disabled: !canSubmit || uploading || submitting }"
        hover-class="vp-submit-hover"
        @tap="handlePublish"
      >
        <text class="vp-submit-txt">{{ uploading ? '上传中…' : '发布' }}</text>
      </view>
    </view>

    <!-- ========== 选品抽屉（半屏 · 单选） ========== -->
    <view v-if="showProductSearch" class="vp-sheet-mask" @tap="showProductSearch = false">
      <view class="vp-sheet" @tap.stop>
        <view class="vp-sheet-head">
          <text class="vp-sheet-title">选择关联商品</text>
          <view class="vp-sheet-close" hover-class="vp-hover" @tap="showProductSearch = false">
            <AppIcon name="x-circle" :size="40" color="#999999" />
          </view>
        </view>

        <!-- 搜索 -->
        <view class="vp-sheet-search">
          <view class="vp-search-box">
            <AppIcon name="search" :size="34" color="#999999" />
            <input
              v-model="productKeyword"
              class="vp-search-field"
              placeholder="搜索商品名称"
              placeholder-class="vp-ph"
              confirm-type="search"
              @confirm="searchProducts"
              @input="searchProducts"
            />
          </view>
        </view>

        <!-- 商品列表（单选） -->
        <scroll-view scroll-y class="vp-sheet-list">
          <view v-if="!searchResults.length" class="vp-sheet-empty">
            <text class="vp-sheet-empty-txt">暂无可带货商品</text>
          </view>
          <view
            v-for="p in searchResults"
            :key="p.id"
            class="vp-g-item"
            hover-class="vp-hover"
            @tap="pickProduct(p)"
          >
            <image lazy-load class="vp-g-img" :src="p.cover" mode="aspectFill" />
            <view class="vp-g-info">
              <text class="vp-g-name">{{ p.name }}</text>
              <view class="vp-g-meta">
                <text class="vp-g-price num">￥{{ formatPrice(p.price) }}</text>
                <text class="vp-g-stock">库存 {{ p.stock }}</text>
              </view>
            </view>
            <view class="vp-radio" :class="{ on: isProductPicked(p) }" />
          </view>
        </scroll-view>

        <!-- 确认 -->
        <view class="vp-sheet-confirm" :style="{ paddingBottom: 'calc(32rpx + env(safe-area-inset-bottom))' }">
          <view
            class="vp-confirm-btn"
            :class="{ disabled: !pendingProduct }"
            hover-class="vp-submit-hover"
            @tap="confirmProduct"
          >
            <text class="vp-confirm-txt">{{ pendingProduct ? '确认关联（已选 1 件）' : '请选择一件商品' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 所属圈子抽屉（半屏 · 单选即选即用） ========== -->
    <view v-if="showCircleSheet" class="vp-sheet-mask" @tap="showCircleSheet = false">
      <view class="vp-sheet vp-sheet-short" @tap.stop>
        <view class="vp-sheet-head">
          <text class="vp-sheet-title">选择所属圈子</text>
          <view class="vp-sheet-close" hover-class="vp-hover" @tap="showCircleSheet = false">
            <AppIcon name="x-circle" :size="40" color="#999999" />
          </view>
        </view>
        <scroll-view scroll-y class="vp-sheet-list">
          <view v-if="!myCircles.length" class="vp-sheet-empty">
            <text class="vp-sheet-empty-txt">{{ circlesLoading ? '加载中…' : '你还没有可发布的圈子' }}</text>
          </view>
          <view
            v-for="c in myCircles"
            :key="c.id"
            class="vp-g-item"
            hover-class="vp-hover"
            @tap="pickCircle(c)"
          >
            <image lazy-load class="vp-c-cover" :src="c.cover" mode="aspectFill" />
            <view class="vp-g-info">
              <text class="vp-g-name">{{ c.name }}</text>
              <view class="vp-g-meta">
                <text class="vp-c-role">{{ c.role === 'owner' ? '圈主' : c.role === 'admin' ? '管理员' : '成员' }}</text>
                <text class="vp-g-stock">{{ c.memberCount }} 人</text>
              </view>
            </view>
            <view class="vp-radio" :class="{ on: selectedCircle?.id === c.id }" />
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { videoApi, publishHotTags, type PublishProduct } from '@/lib/video-data'
import { circleApi, type MyCircle } from '@/lib/circle-data'
import { formatPrice } from '@/utils/format'
import { uploadVideo, uploadImage, chooseAndUploadImage } from '@/utils/request'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

// 发布归属圈子：真连 /circles/my。跳转带 circleId 则默认选中该圈；否则默认第一个；都无则留空由后端兜底官方圈
const circleId = ref('')
onLoad((options) => { circleId.value = (options as Record<string, string> | undefined)?.circleId || '' })
const myCircles = ref<MyCircle[]>([])
const circlesLoading = ref(false)
const selectedCircle = ref<MyCircle | null>(null)
const showCircleSheet = ref(false)
function openCircleSheet() {
  if (!myCircles.value.length && !circlesLoading.value) loadMyCircles()
  showCircleSheet.value = true
}
function pickCircle(c: MyCircle) {
  selectedCircle.value = c
  circleId.value = c.id
  showCircleSheet.value = false
}
async function loadMyCircles() {
  circlesLoading.value = true
  try {
    myCircles.value = await circleApi.getMyCircles()
    // 默认选中：跳转带来的 circleId 优先，否则第一个
    if (!selectedCircle.value) {
      selectedCircle.value =
        myCircles.value.find((c) => c.id === circleId.value) || myCircles.value[0] || null
      if (selectedCircle.value) circleId.value = selectedCircle.value.id
    }
  } catch {
    // 失败保持空：后端仍会兜底落官方圈
  } finally {
    circlesLoading.value = false
  }
}

// 选中的真实视频
const videoTempPath = ref('') // 本地临时路径（预览+上传）
const videoDuration = ref(0) // 秒
const coverTempPath = ref('') // chooseVideo 返回的缩略图（小程序支持，H5 无）
const coverUploadedUrl = ref('') // 用户手动上传的封面（已是可访问 URL）
const uploadingCover = ref(false)

const title = ref('')
const description = ref('')
// tags/isPrivate：V4 重设计未暴露 UI，但后端 CreateVideoDto 仍接收，保留默认值保持契约不变
const tags = ref<string[]>([])
const isPublic = ref(true)
// 开放范围（后端 CreateVideoDto.visibility 已收·默认全平台；发布即可见，机审后台异步）
const visibility = ref<'CIRCLE_ONLY' | 'PLATFORM'>('PLATFORM')
const titleError = ref('')
const videoError = ref(false)
const scrollTarget = ref('')

// 保留导出引用，避免 tree-shaking 警告；热门标签在 V4 已不展示
void publishHotTags

const productLibrary = ref<PublishProduct[]>([])
const showProductSearch = ref(false)
const productKeyword = ref('')
// 单件带货：selectedProduct 为已确认商品；pendingProduct 为抽屉内待确认选中
const selectedProduct = ref<PublishProduct | null>(null)
const pendingProduct = ref<PublishProduct | null>(null)
const searchResults = ref<PublishProduct[]>([])

onMounted(async () => {
  loadMyCircles()
  try {
    productLibrary.value = await videoApi.getProductLibrary()
    searchResults.value = [...productLibrary.value]
  } catch {
    // 失败时保持空数组
  }
})

const uploading = ref(false)
const uploadProgress = ref(0)
const submitting = ref(false)

const coverPreview = computed(() => coverUploadedUrl.value || coverTempPath.value)
const durationText = computed(() => {
  const s = Math.round(videoDuration.value)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
})
// 必填：视频 + 标题（圈子由后端兜底）
const canSubmit = computed(() => !!videoTempPath.value && !!title.value.trim())

function chooseVideo(sourceType: 'album' | 'camera') {
  uni.chooseVideo({
    sourceType: [sourceType],
    compressed: true,
    maxDuration: 60,
    success: (res: { tempFilePath?: string; duration?: number; thumbTempFilePath?: string }) => {
      videoTempPath.value = res.tempFilePath || ''
      videoDuration.value = res.duration || 0
      coverTempPath.value = res.thumbTempFilePath || ''
      coverUploadedUrl.value = ''
      if (!videoTempPath.value) {
        uni.showToast({ title: '未获取到视频', icon: 'none' })
        return
      }
      videoError.value = false
    },
    fail: () => {},
  })
}
function pickFromAlbum() {
  chooseVideo('album')
}

async function pickCover() {
  if (uploadingCover.value) return
  uploadingCover.value = true
  try {
    coverUploadedUrl.value = await chooseAndUploadImage()
  } catch (e) {
    const msg = (e as Error)?.message
    if (msg && msg !== '已取消') uni.showToast({ title: msg, icon: 'none' })
  } finally {
    uploadingCover.value = false
  }
}

// ===== 选品（单选） =====
function openProductSheet() {
  pendingProduct.value = selectedProduct.value
  productKeyword.value = ''
  searchResults.value = [...productLibrary.value]
  showProductSearch.value = true
}
function isProductPicked(p: { id: string }) {
  return pendingProduct.value?.id === p.id
}
function pickProduct(p: PublishProduct) {
  // 单选：再次点击已选项则取消
  pendingProduct.value = pendingProduct.value?.id === p.id ? null : p
}
function confirmProduct() {
  if (!pendingProduct.value) return
  selectedProduct.value = pendingProduct.value
  showProductSearch.value = false
}
function clearProduct() {
  selectedProduct.value = null
  pendingProduct.value = null
}
function searchProducts() {
  const kw = productKeyword.value.trim()
  searchResults.value = kw
    ? productLibrary.value.filter((p) => p.name.includes(kw))
    : [...productLibrary.value]
}

async function handlePublish() {
  if (uploading.value || submitting.value) return
  // 统一校验：滚动定位到第一个错误项，无弹窗打断
  videoError.value = false
  titleError.value = ''
  if (!videoTempPath.value) {
    videoError.value = true
    scrollTarget.value = ''
    scrollTarget.value = 'fld-video'
    return
  }
  if (!title.value.trim()) {
    titleError.value = '请填写标题'
    scrollTarget.value = ''
    scrollTarget.value = 'fld-title'
    return
  }
  if (title.value.length > 50) {
    titleError.value = '标题不能超过50字'
    scrollTarget.value = ''
    scrollTarget.value = 'fld-title'
    return
  }
  uploading.value = true
  submitting.value = true
  uploadProgress.value = 0
  try {
    // 1. 真实上传视频到后端（真进度，占 0-90%）
    const videoUrl = await uploadVideo(videoTempPath.value, (p) => {
      uploadProgress.value = Math.min(90, Math.round(p * 0.9))
    })
    // 2. 封面：优先用户上传的封面，其次视频缩略图（若平台提供）
    let coverUrl = coverUploadedUrl.value
    if (!coverUrl && coverTempPath.value) {
      try {
        coverUrl = await uploadImage(coverTempPath.value)
      } catch {
        // 封面上传失败不阻断发布，后端封面留空由详情页兜底
      }
    }
    uploadProgress.value = 95
    // 3. 发布（字段对齐后端 CreateVideoDto）
    await videoApi.publish({
      circleId: circleId.value || undefined,
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      videoUrl,
      coverUrl: coverUrl || undefined,
      duration: Math.round(videoDuration.value) || undefined,
      tags: tags.value,
      isPrivate: !isPublic.value,
      products: selectedProduct.value ? [selectedProduct.value.id] : [],
      visibility: visibility.value,
    })
    uploadProgress.value = 100
    await new Promise((r) => setTimeout(r, 300))
    // 审核无感化（20260711 第八节）：发布即可见，机审后台异步完成，无任何审核提示
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => navigateTo('/videos'), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败，请重试', icon: 'none' })
  } finally {
    uploading.value = false
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.vp-root {
  min-height: 100vh;
  background-color: #FAF8F5;
  display: flex;
  flex-direction: column;
}
.num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
.vp-hover { opacity: 0.6; }

/* ===== 顶栏 ===== */
.vp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx 20rpx;
  background-color: #FAF8F5;
}
.vp-top-back {
  display: flex;
  align-items: center;
  width: 120rpx;
  height: 64rpx;
}
.vp-top-back-txt { font-size: 28rpx; color: #6E6E73; }
.vp-top-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.vp-top-ph { width: 120rpx; }

/* ===== 主体 ===== */
.vp-body { flex: 1; padding: 8rpx 40rpx 0; box-sizing: border-box; }
.vp-field { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 32rpx; }
.vp-label { display: flex; align-items: baseline; gap: 8rpx; }
.vp-label-txt { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.vp-req { font-size: 26rpx; color: #C41E3A; }
.vp-opt { font-size: 24rpx; color: #999999; font-weight: 400; }

/* 输入框 */
.vp-input-wrap {
  background-color: #ffffff;
  border: 1rpx solid #EDE7DD;
  border-radius: 24rpx;
  padding: 26rpx 28rpx;
}
.vp-input-wrap.error { border-color: #D64541; }
.vp-input { width: 100%; font-size: 28rpx; color: #2C2C2C; }
.vp-textarea { width: 100%; min-height: 120rpx; font-size: 28rpx; color: #2C2C2C; line-height: 1.5; }
.vp-ph { color: #999999; }

/* 校验错误提示 */
.vp-errmsg { display: flex; align-items: center; gap: 8rpx; }
.vp-errmsg-txt { font-size: 23rpx; color: #D64541; }

/* 素材尺寸建议（体验标准 V1.0 五·附节） */
.vp-hint { font-size: 22rpx; color: #999999; }

/* ===== 上传区（未选） ===== */
.vp-upload {
  height: 352rpx;
  border: 3rpx dashed #D9CFC0;
  border-radius: 36rpx;
  background-color: #FFFEFB;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.vp-upload.error { border-color: #D64541; }
.vp-upload-hover { background-color: #FAF6EF; }
.vp-upload-plus {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-upload-t1 { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.vp-upload-t2 { font-size: 23rpx; color: #999999; }

/* ===== 上传区（已选：封面预览） ===== */
.vp-preview { display: flex; gap: 28rpx; }
.vp-pv-cover {
  position: relative;
  width: 236rpx;
  flex-shrink: 0;
  border-radius: 28rpx;
  overflow: hidden;
}
/* X5 禁 aspect-ratio：padding-top 撑 2:3 */
.vp-pv-ratio { position: relative; width: 100%; height: 0; padding-top: 150%; }
.vp-pv-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.vp-pv-ph { background-color: #E8E3DB; }
.vp-pv-dur {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  border-radius: 10rpx;
  font-size: 21rpx;
  padding: 4rpx 12rpx;
}
.vp-pv-uploading {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-pv-uploading-pct { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.vp-pv-ops {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  justify-content: center;
}
.vp-btn-ghost {
  height: 76rpx;
  padding: 0 32rpx;
  border: 1rpx solid #EDE7DD;
  border-radius: 999rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-btn-ghost-dashed { border-style: dashed; }
.vp-btn-ghost-txt { font-size: 26rpx; color: #2C2C2C; }
.vp-btn-ghost-txt-weak { color: #999999; }
.vp-pv-uptxt { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.vp-prog-track {
  height: 12rpx;
  background-color: #EFEBE4;
  border-radius: 999rpx;
  overflow: hidden;
}
.vp-prog-bar { height: 100%; background-color: #C41E3A; border-radius: 999rpx; transition: width 0.3s; }

/* ===== 通用行 ===== */
.vp-row {
  background-color: #ffffff;
  border: 1rpx solid #EDE7DD;
  border-radius: 24rpx;
  padding: 26rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.vp-row-txt { font-size: 28rpx; color: #2C2C2C; }
.vp-row-weak { }
.vp-row-txt-weak { color: #999999; }
.vp-row-arrow { margin-left: auto; display: flex; align-items: center; gap: 4rpx; }
.vp-row-arrow-txt { font-size: 26rpx; color: #999999; }

/* ===== 可见范围分段 ===== */
.vp-seg { display: flex; gap: 20rpx; }
.vp-seg-item {
  flex: 1;
  border: 1rpx solid #EDE7DD;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-seg-item.on { border-color: #C41E3A; background-color: rgba(196, 30, 58, 0.05); }
.vp-seg-txt { font-size: 28rpx; color: #6E6E73; }
.vp-seg-txt.on { color: #C41E3A; font-weight: 700; }

/* ===== 已选商品小卡 ===== */
.vp-goods-card {
  background-color: #ffffff;
  border: 1rpx solid #EDE7DD;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.vp-goods-img { width: 88rpx; height: 88rpx; border-radius: 16rpx; flex-shrink: 0; }
.vp-goods-info { flex: 1; min-width: 0; }
.vp-goods-name {
  font-size: 25rpx;
  color: #2C2C2C;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.vp-goods-price { display: block; font-size: 26rpx; font-weight: 700; color: #C9A96E; margin-top: 6rpx; }
.vp-goods-rm { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.vp-goods-rm-txt { font-size: 23rpx; color: #999999; }

/* ===== 底部发布按钮 ===== */
.vp-footer {
  padding: 24rpx 40rpx;
  background-color: #FAF8F5;
  border-top: 1rpx solid #EDE7DD;
}
.vp-submit {
  height: 96rpx;
  border-radius: 999rpx;
  background-color: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-submit.disabled { background-color: #E3D9D2; }
.vp-submit-hover { opacity: 0.85; }
.vp-submit-txt { color: #ffffff; font-size: 30rpx; font-weight: 600; }

/* ===== 选品抽屉 ===== */
.vp-sheet-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(20, 18, 22, 0.45);
  z-index: 50;
  display: flex;
  align-items: flex-end;
}
.vp-sheet {
  width: 100%;
  height: 74vh;
  background-color: #FAF8F5;
  border-radius: 36rpx 36rpx 0 0;
  display: flex;
  flex-direction: column;
}
.vp-sheet-short { height: 56vh; }
.vp-sheet-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 40rpx 20rpx;
}
.vp-sheet-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.vp-sheet-close { position: absolute; right: 32rpx; }
.vp-sheet-search { padding: 8rpx 40rpx 16rpx; }
.vp-search-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background-color: #ffffff;
  border: 1rpx solid #EDE7DD;
  border-radius: 999rpx;
  padding: 18rpx 32rpx;
}
.vp-search-field { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.vp-sheet-list { flex: 1; }
.vp-sheet-empty { text-align: center; padding: 96rpx 0; }
.vp-sheet-empty-txt { font-size: 26rpx; color: #999999; }
.vp-g-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 40rpx;
}
.vp-g-img { width: 116rpx; height: 116rpx; border-radius: 20rpx; flex-shrink: 0; }
.vp-c-cover { width: 96rpx; height: 96rpx; border-radius: 20rpx; flex-shrink: 0; background-color: #EFEBE4; }
.vp-c-role { font-size: 22rpx; color: #A8823F; font-weight: 600; }
.vp-g-info { flex: 1; min-width: 0; }
.vp-g-name {
  font-size: 26rpx;
  color: #2C2C2C;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.vp-g-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 8rpx; }
.vp-g-price { font-size: 27rpx; font-weight: 700; color: #C9A96E; }
.vp-g-stock { font-size: 22rpx; color: #6E6E73; }
.vp-radio {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 3rpx solid #D9CFC0;
  box-sizing: border-box;
  flex-shrink: 0;
  position: relative;
}
.vp-radio.on { border-color: #C41E3A; background-color: #C41E3A; }
.vp-radio.on::after {
  content: "";
  position: absolute;
  left: 14rpx;
  top: 7rpx;
  width: 10rpx;
  height: 18rpx;
  border: solid #ffffff;
  border-width: 0 4rpx 4rpx 0;
  transform: rotate(45deg);
}
.vp-sheet-confirm { padding: 24rpx 40rpx 0; }
.vp-confirm-btn {
  height: 92rpx;
  border-radius: 999rpx;
  background-color: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-confirm-btn.disabled { background-color: #E3D9D2; }
.vp-confirm-txt { color: #ffffff; font-size: 28rpx; font-weight: 600; }
</style>
