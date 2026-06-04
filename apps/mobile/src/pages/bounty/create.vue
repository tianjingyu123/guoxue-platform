<template>
  <view class="page">
    <view class="header">
      <text class="title">
        发布悬赏
      </text>
    </view>

    <view class="form">
      <view class="form-item">
        <text class="form-label">
          标题 <text class="required">
            *
          </text>
        </text>
        <input
          v-model="title"
          placeholder="简明扼要的标题（最多50字）"
          maxlength="50"
          class="form-input"
        >
        <text class="char-count">
          {{ title.length }}/50
        </text>
      </view>

      <view class="form-item">
        <text class="form-label">
          问题描述 <text class="required">
            *
          </text>
        </text>
        <textarea
          v-model="description"
          placeholder="详细描述你的问题（最多2000字）"
          maxlength="2000"
          class="form-textarea"
        />
        <text class="char-count">
          {{ description.length }}/2000
        </text>
      </view>

      <view class="form-item">
        <text class="form-label">
          分类 <text class="required">
            *
          </text>
        </text>
        <picker
          :range="categoryLabels"
          @change="onCategoryChange"
        >
          <text class="picker-text">
            {{ selectedCategoryLabel || '请选择分类' }}
          </text>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">
          悬赏金额（虚拟币） <text class="required">
            *
          </text>
        </text>
        <view class="price-options">
          <text
            v-for="p in priceOptions"
            :key="p"
            :class="['price-tag', { active: bountyCoin === p }]"
            @click="bountyCoin = p"
          >
            {{ p }}币
          </text>
        </view>
        <input
          v-model.number="bountyCoin"
          type="number"
          placeholder="自定义金额"
          class="custom-input"
        >
        <text class="form-hint">
          当前余额：{{ balance }} 币
        </text>
      </view>

      <view class="form-item">
        <text class="form-label">
          图片上传（可选）
        </text>
        <view class="upload-area">
          <view
            v-for="(img, idx) in images"
            :key="idx"
            class="upload-preview"
          >
            <image
              :src="img"
              mode="aspectFill"
              class="upload-img"
            />
            <text
              class="upload-remove"
              @click="removeImage(idx)"
            >
              ×
            </text>
          </view>
          <view
            v-if="images.length < 9"
            class="upload-btn"
            @click="chooseImage"
          >
            <text class="upload-plus">
              +
            </text>
            <text class="upload-hint">
              上传图片
            </text>
          </view>
        </view>
      </view>

      <button
        class="submit-btn"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="submit"
      >
        提交悬赏
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api, uploadApi } from '../../api'
import { useCoinStore } from '../../store/coinStore'

const coinStore = useCoinStore()
const title = ref('')
const description = ref('')
const category = ref('')
const bountyCoin = ref(50)
const images = ref<string[]>([])
const submitting = ref(false)
const balance = ref(0)

const priceOptions = [10, 30, 50, 100, 200, 500]

const categories = [
  { label: '八字', value: 'BAZI' },
  { label: '紫微', value: 'ZIWEI' },
  { label: '风水', value: 'FENGSHUI' },
  { label: '事业', value: 'CAREER' },
  { label: '情感', value: 'LOVE' },
  { label: '通用', value: 'GENERAL' },
]

const categoryLabels = categories.map(c => c.label)
const selectedCategoryLabel = computed(() => categories.find(c => c.value === category.value)?.label || '')

const canSubmit = computed(() => {
  return title.value.trim() && description.value.trim() && category.value && bountyCoin.value >= 10
})

onMounted(async () => {
  try {
    await coinStore.fetchBalance()
    balance.value = coinStore.balance
  } catch { /* */ }
})

function onCategoryChange(e: any) {
  const idx = e.detail.value
  category.value = categories[idx]?.value || ''
}

async function chooseImage() {
  try {
    const res = await uni.chooseImage({ count: 9 - images.value.length, sizeType: ['compressed'] })
    const tempFiles = res.tempFilePaths || res.tempFiles?.map((f: any) => f.path) || []
    uni.showLoading({ title: '上传中...' })
    const results = await uploadApi.images(tempFiles)
    uni.hideLoading()
    const urls = (Array.isArray(results) ? results : []).map((r: any) => r.url || r.data?.url || r)
    images.value.push(...urls)
  } catch { uni.hideLoading() }
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await api.post('/bounty', {
      title: title.value.trim(),
      description: description.value.trim(),
      category: category.value,
      bountyCoin: bountyCoin.value,
      images: images.value,
    })
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '发布失败', icon: 'none' })
  } finally { submitting.value = false }
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.header { margin-bottom: 16px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }
.form { background: #fff; border-radius: 10px; padding: 16px; }
.form-item { margin-bottom: 18px; }
.form-label { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 8px; }
.required { color: #C41E3A; }
.form-input { width: 100%; padding: 10px; border: 1px solid #E8E0D5; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 100px; padding: 10px; border: 1px solid #E8E0D5; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.char-count { font-size: 11px; color: #bbb; text-align: right; display: block; margin-top: 4px; }
.picker-text { font-size: 14px; color: #C41E3A; padding: 8px 12px; background: #F5F0E8; border-radius: 6px; display: block; }
.price-options { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.price-tag { padding: 6px 14px; border-radius: 16px; font-size: 13px; background: #F5F0E8; color: #666; }
.price-tag.active { background: #C41E3A; color: #fff; }
.custom-input { width: 100%; padding: 8px 10px; border: 1px solid #E8E0D5; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-top: 6px; }
.form-hint { font-size: 11px; color: #bbb; display: block; margin-top: 4px; }
.upload-area { display: flex; gap: 8px; flex-wrap: wrap; }
.upload-preview { position: relative; width: 80px; height: 80px; }
.upload-img { width: 100%; height: 100%; border-radius: 8px; }
.upload-remove { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.upload-btn { width: 80px; height: 80px; border: 1px dashed #ccc; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F5F0E8; }
.upload-plus { font-size: 28px; color: #999; line-height: 1; }
.upload-hint { font-size: 10px; color: #999; margin-top: 2px; }
.submit-btn { width: 100%; background: #C41E3A; color: #fff; border-radius: 24px; padding: 12px; font-size: 16px; border: none; margin-top: 8px; }
.submit-btn[disabled] { background: #ccc; }
</style>
