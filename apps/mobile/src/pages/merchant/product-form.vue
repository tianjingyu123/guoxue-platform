<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">{{ isEdit ? '编辑商品' : '发布商品' }}</text>
      <view class="header-spacer" />
    </view>

    <!-- 加载态 -->
    <view v-if="pageLoading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 表单 -->
      <view class="form-wrap">
        <!-- 商品标题 -->
        <view class="form-group">
          <text class="form-label">商品标题 <text class="required">*</text></text>
          <input
            class="form-input"
            v-model="form.title"
            placeholder="请输入商品标题"
            placeholder-class="ph"
            maxlength="100"
          />
        </view>

        <!-- 商品描述 -->
        <view class="form-group">
          <text class="form-label">商品描述</text>
          <textarea
            class="form-textarea"
            v-model="form.description"
            placeholder="请输入商品描述"
            placeholder-class="ph"
            maxlength="2000"
          />
        </view>

        <!-- 分类 -->
        <view class="form-group">
          <text class="form-label">商品分类 <text class="required">*</text></text>
          <view class="picker-wrap" @click="showCategoryPicker = true">
            <text class="picker-text" :class="{ ph: !form.category }">
              {{ form.category ? categoryLabel(form.category) : '请选择分类' }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </view>

        <!-- 价格 -->
        <view class="form-group">
          <text class="form-label">价格（元）<text class="required">*</text></text>
          <input
            class="form-input"
            v-model="form.price"
            type="digit"
            placeholder="请输入价格"
            placeholder-class="ph"
          />
        </view>

        <!-- 库存 -->
        <view class="form-group">
          <text class="form-label">库存数量</text>
          <input
            class="form-input"
            v-model="form.stock"
            type="number"
            placeholder="不填表示不限库存"
            placeholder-class="ph"
          />
        </view>

        <!-- 图片上传 -->
        <view class="form-group">
          <text class="form-label">商品图片</text>
          <view class="image-list">
            <view
              v-for="(img, idx) in images"
              :key="idx"
              class="image-item"
            >
              <image class="uploaded-img" :src="img" mode="aspectFill" />
              <view class="image-remove" @click="removeImage(idx)">✕</view>
            </view>
            <view
              v-if="images.length < 9"
              class="image-uploader"
              @click="uploadImage"
            >
              <text class="uploader-icon">+</text>
              <text class="uploader-text">上传图片</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="bottom-bar">
        <view class="submit-btn" :class="{ disabled: submitting }" @click="submitForm">
          <text class="submit-btn-text">{{ submitting ? '提交中...' : (isEdit ? '保存修改' : '发布商品') }}</text>
        </view>
      </view>
    </template>

    <!-- 分类选择弹窗 -->
    <view v-if="showCategoryPicker" class="picker-mask" @click="showCategoryPicker = false">
      <view class="picker-panel" @click.stop>
        <view class="picker-head">
          <text class="picker-cancel" @click="showCategoryPicker = false">取消</text>
          <text class="picker-title">选择分类</text>
          <text class="picker-confirm" @click="showCategoryPicker = false">确定</text>
        </view>
        <view class="picker-body">
          <view
            v-for="cat in categories"
            :key="cat.value"
            class="picker-option"
            :class="{ selected: form.category === cat.value }"
            @click="selectCategory(cat.value)"
          >
            <text>{{ cat.label }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { merchantApi } from '@/api'

const categories = [
  { value: 'COURSE', label: '课程' },
  { value: 'PHYSICAL', label: '实物' },
  { value: 'VIRTUAL', label: '虚拟' },
  { value: 'SERVICE', label: '服务' },
]

const form = reactive({
  title: '',
  description: '',
  category: '',
  price: '',
  stock: '',
})

const images = ref<string[]>([])
const isEdit = ref(false)
const productId = ref('')
const pageLoading = ref(false)
const submitting = ref(false)
const showCategoryPicker = ref(false)

onMounted(() => {
  const params = parseQuery()
  if (params.id) {
    isEdit.value = true
    productId.value = params.id
    loadProduct(params.id)
  }
})

function parseQuery(): Record<string, string> {
  const params: Record<string, string> = {}
  try {
    const pages = getCurrentPages()
    const curPage = pages[pages.length - 1] as any
    const ops = curPage?.$page?.options || curPage?.options || {}
    Object.assign(params, ops)
  } catch {
    // fallback
  }
  return params
}

async function loadProduct(id: string) {
  pageLoading.value = true
  try {
    const res = await merchantApi.getProduct(id)
    const data = res?.data || res || {}
    form.title = data.title || ''
    form.description = data.description || ''
    form.category = data.category || ''
    form.price = String(data.price ?? '')
    form.stock = String(data.stock ?? '')
    if (Array.isArray(data.images)) {
      images.value = [...data.images]
    } else if (data.image) {
      images.value = [data.image]
    }
  } catch {
    uni.showToast({ title: '加载商品信息失败', icon: 'none' })
  } finally {
    pageLoading.value = false
  }
}

function categoryLabel(val: string) {
  const c = categories.find((cat) => cat.value === val)
  return c ? c.label : val
}

function selectCategory(val: string) {
  form.category = val
  showCategoryPicker.value = false
}

function uploadImage() {
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFiles = res.tempFilePaths || []
      images.value = images.value.concat(tempFiles)
    },
  })
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

function validate(): boolean {
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入商品标题', icon: 'none' })
    return false
  }
  const price = parseFloat(form.price)
  if (!form.price || isNaN(price) || price <= 0) {
    uni.showToast({ title: '请输入正确的价格（大于0）', icon: 'none' })
    return false
  }
  if (!form.category) {
    uni.showToast({ title: '请选择商品分类', icon: 'none' })
    return false
  }
  return true
}

async function submitForm() {
  if (submitting.value) return
  if (!validate()) return

  submitting.value = true
  try {
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: parseFloat(form.price),
      images: images.value,
    }
    if (form.stock) {
      payload.stock = parseInt(form.stock, 10)
    }

    if (isEdit.value) {
      await merchantApi.updateProduct(productId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await merchantApi.createProduct(payload)
      uni.showToast({ title: '发布成功', icon: 'success' })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch {
    uni.showToast({
      title: isEdit.value ? '保存失败' : '发布失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 140rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

/* 表单 */
.form-wrap { margin: 24rpx; background: #fff; border-radius: 16rpx; padding: 32rpx; }
.form-group { margin-bottom: 32rpx; }
.form-group:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #3C2415; font-weight: 500; display: block; margin-bottom: 12rpx; }
.required { color: #C41E3A; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #F5F0E8; border-radius: 12rpx; font-size: 26rpx; color: #3C2415; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #F5F0E8; border-radius: 12rpx; font-size: 26rpx; color: #3C2415; box-sizing: border-box; }
.ph { font-size: 26rpx; color: #ccc; }

/* 分类选择器 */
.picker-wrap { display: flex; align-items: center; justify-content: space-between; height: 72rpx; padding: 0 20rpx; background: #F5F0E8; border-radius: 12rpx; }
.picker-text { font-size: 26rpx; color: #3C2415; }
.picker-text.ph { color: #ccc; }
.picker-arrow { font-size: 32rpx; color: #999; }

/* 图片上传 */
.image-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.image-item { position: relative; width: 160rpx; height: 160rpx; border-radius: 12rpx; overflow: hidden; }
.uploaded-img { width: 100%; height: 100%; }
.image-remove { position: absolute; top: 4rpx; right: 4rpx; width: 32rpx; height: 32rpx; background: rgba(0,0,0,.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #fff; }
.image-uploader { width: 160rpx; height: 160rpx; background: #F5F0E8; border: 2rpx dashed #ccc; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.uploader-icon { font-size: 48rpx; color: #ccc; }
.uploader-text { font-size: 22rpx; color: #ccc; margin-top: 4rpx; }

/* 底部 */
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 16rpx 24rpx 32rpx; background: #F5F0E8; }
.submit-btn { background: #5a3a1a; border-radius: 16rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.submit-btn.disabled { opacity: .6; }
.submit-btn-text { font-size: 30rpx; color: #fff; font-weight: 600; }

/* 分类选择弹窗 */
.picker-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.4); z-index: 999; display: flex; align-items: flex-end; }
.picker-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 60vh; overflow-y: auto; }
.picker-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 1rpx solid #f0ebe0; }
.picker-cancel { font-size: 26rpx; color: #999; }
.picker-title { font-size: 30rpx; color: #3C2415; font-weight: 600; }
.picker-confirm { font-size: 26rpx; color: #5a3a1a; }
.picker-body { padding: 8rpx 0; }
.picker-option { padding: 24rpx 32rpx; font-size: 28rpx; color: #3C2415; }
.picker-option.selected { color: #8b6914; font-weight: 600; background: #FFF8E1; }
</style>
