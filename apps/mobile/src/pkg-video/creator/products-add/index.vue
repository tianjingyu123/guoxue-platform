<template>
  <!-- 成功态 -->
  <view v-if="success" class="pa-success">
    <AppIcon name="check-circle-2" :size="64" color="#16a34a" />
    <text class="pa-success-title">商品已添加</text>
    <text class="pa-success-desc">您的商品已成功发布，用户可以在您的主页中看到。</text>
    <view class="pa-success-btn" @tap="goBack">返回商品列表</view>
  </view>

  <view v-else class="pa-page">
    <view class="pa-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pa-header-inner">
        <view class="pa-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="pa-title">添加商品</text>
      </view>
    </view>

    <scroll-view scroll-y class="pa-scroll" :style="{ paddingTop: statusBarHeight + 48 + 'px' }">
      <view class="pa-body">
        <!-- 商品类型 -->
        <view class="pa-field">
          <text class="pa-label">商品类型</text>
          <view class="pa-type-grid">
            <view
              v-for="t in TYPES"
              :key="t.key"
              class="pa-type"
              :class="{ 'pa-type-active': type === t.key }"
              @tap="type = t.key"
            >
              <text class="pa-type-label" :class="{ 'pa-type-label-active': type === t.key }">{{ t.label }}</text>
              <text class="pa-type-desc">{{ t.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 封面 -->
        <view class="pa-field">
          <text class="pa-label">封面图片</text>
          <view class="pa-upload">
            <AppIcon name="upload" :size="24" color="#999" />
            <text class="pa-upload-txt">点击上传封面图</text>
          </view>
        </view>

        <!-- 标题 -->
        <view class="pa-field">
          <text class="pa-label">商品标题 <text class="pa-req">*</text></text>
          <input class="pa-input" v-model="form.title" placeholder="请输入商品名称" />
        </view>

        <!-- 描述 -->
        <view class="pa-field">
          <text class="pa-label">商品描述</text>
          <textarea class="pa-textarea" v-model="form.desc" placeholder="详细描述商品内容、适合人群、学习收获等" />
        </view>

        <!-- 价格 -->
        <view class="pa-field">
          <view class="pa-price-grid">
            <view class="pa-price-col">
              <text class="pa-label">售价（元）<text class="pa-req">*</text></text>
              <input class="pa-input" type="number" v-model="form.price" placeholder="0.00" />
            </view>
            <view class="pa-price-col">
              <text class="pa-label">原价（元）</text>
              <input class="pa-input" type="number" v-model="form.originalPrice" placeholder="0.00（可选）" />
            </view>
          </view>
        </view>

        <!-- 库存（仅咨询服务） -->
        <view v-if="type === 'consult'" class="pa-field">
          <text class="pa-label">库存数量</text>
          <view class="pa-stock">
            <view class="pa-step-btn" @tap="stepStock(-1)"><AppIcon name="minus" :size="16" color="#1a1a1a" /></view>
            <input class="pa-input pa-stock-input" type="number" v-model="form.stock" placeholder="不限" />
            <view class="pa-step-btn" @tap="stepStock(1)"><AppIcon name="plus" :size="16" color="#1a1a1a" /></view>
          </view>
        </view>

        <!-- 标签 -->
        <view class="pa-field">
          <text class="pa-label">商品标签</text>
          <view class="pa-tag-row">
            <input class="pa-input pa-tag-input" v-model="tagInput" placeholder="输入标签后点添加" @confirm="addTag" />
            <view class="pa-tag-add" @tap="addTag">添加</view>
          </view>
          <view v-if="tags.length > 0" class="pa-tags">
            <view v-for="tag in tags" :key="tag" class="pa-tag">
              <text>{{ tag }}</text>
              <view @tap="removeTag(tag)"><AppIcon name="x" :size="12" color="#c41e3a" /></view>
            </view>
          </view>
        </view>
      </view>
      <view class="pa-pad" />
    </scroll-view>

    <view class="pa-footer">
      <view class="pa-submit" :class="{ 'pa-submit-disabled': !valid || loading }" @tap="handleSubmit">
        <AppIcon v-if="loading" name="loader-2" :size="16" color="#ffffff" class="pa-spin" />
        <text>{{ loading ? '发布中…' : '发布商品' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorApi } from '@/lib/creator-data'

type ProductType = 'video' | 'course' | 'consult' | 'material'
const TYPES: { key: ProductType; label: string; desc: string }[] = [
  { key: 'video', label: '付费视频', desc: '单个或系列付费视频' },
  { key: 'course', label: '课程套餐', desc: '多视频组合成课程' },
  { key: 'consult', label: '咨询服务', desc: '一对一在线咨询' },
  { key: 'material', label: '资料包', desc: '文档/图片等学习资料' },
]

const statusBarHeight = ref(0)
const type = ref<ProductType>('video')
const form = ref({ title: '', desc: '', price: '', originalPrice: '', stock: '', cover: '' })
const tags = ref<string[]>([])
const tagInput = ref('')
const loading = ref(false)
const success = ref(false)

const valid = computed(() => !!form.value.title && !!form.value.price)

function stepStock(delta: number) {
  const next = Math.max(0, Number(form.value.stock || 0) + delta)
  form.value.stock = String(next)
}
function addTag() {
  const t = tagInput.value.trim()
  if (t && !tags.value.includes(t)) tags.value.push(t)
  tagInput.value = ''
}
function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
}
async function handleSubmit() {
  if (!valid.value || loading.value) return
  loading.value = true
  try {
    await creatorApi.addProduct({
      type: type.value,
      title: form.value.title,
      desc: form.value.desc,
      price: form.value.price,
      originalPrice: form.value.originalPrice,
      stock: form.value.stock,
      tags: tags.value,
    })
    success.value = true
  } catch {
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
</script>

<style scoped>
.pa-page { min-height: 100vh; background: #f5f5f5; }
/* 成功态 */
.pa-success {
  min-height: 100vh; background: #f5f5f5;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 0 32px; text-align: center;
}
.pa-success-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 16px; }
.pa-success-desc { font-size: 14px; color: #999; margin: 8px 0 32px; line-height: 1.5; }
.pa-success-btn { width: 100%; height: 44px; line-height: 44px; background: #c41e3a; color: #ffffff; border-radius: 8px; font-weight: 500; }
/* 表单 */
.pa-header { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #ffffff; border-bottom: 1px solid #eee; }
.pa-header-inner { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; }
.pa-icon-btn { padding: 2px; }
.pa-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.pa-scroll { height: 100vh; box-sizing: border-box; }
.pa-body { padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }
.pa-field { display: flex; flex-direction: column; }
.pa-label { font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.pa-req { color: #dc2626; }
.pa-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pa-type { padding: 12px; border-radius: 12px; border: 1px solid #e5e5e5; background: #ffffff; }
.pa-type-active { border-color: #c41e3a; background: rgba(196, 30, 58, 0.05); }
.pa-type-label { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; }
.pa-type-label-active { color: #c41e3a; }
.pa-type-desc { display: block; font-size: 12px; color: #999; margin-top: 2px; }
.pa-upload {
  height: 128px; background: rgba(0, 0, 0, 0.02); border: 2px dashed #e5e5e5; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.pa-upload-txt { font-size: 12px; color: #999; }
.pa-input {
  width: 100%; height: 40px; padding: 0 12px; font-size: 14px; box-sizing: border-box;
  background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; color: #1a1a1a;
}
.pa-textarea {
  width: 100%; min-height: 90px; padding: 8px 12px; font-size: 14px; box-sizing: border-box;
  background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; color: #1a1a1a;
}
.pa-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pa-price-col { display: flex; flex-direction: column; }
.pa-stock { display: flex; align-items: center; gap: 12px; }
.pa-step-btn {
  width: 36px; height: 36px; border: 1px solid #e5e5e5; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pa-stock-input { flex: 1; text-align: center; }
.pa-tag-row { display: flex; gap: 8px; }
.pa-tag-input { flex: 1; }
.pa-tag-add { padding: 0 12px; height: 40px; line-height: 40px; font-size: 14px; color: #ffffff; background: #c41e3a; border-radius: 8px; flex-shrink: 0; }
.pa-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pa-tag {
  display: flex; align-items: center; gap: 4px; font-size: 12px;
  background: rgba(196, 30, 58, 0.1); color: #c41e3a; padding: 4px 8px; border-radius: 999px;
}
.pa-pad { height: 100px; }
.pa-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #ffffff; border-top: 1px solid #eee; padding: 16px; }
.pa-submit {
  height: 44px; border-radius: 8px; background: #c41e3a; color: #ffffff;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600;
}
.pa-submit-disabled { opacity: 0.5; }
.pa-spin { animation: pa-rotate 1s linear infinite; }
@keyframes pa-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>
