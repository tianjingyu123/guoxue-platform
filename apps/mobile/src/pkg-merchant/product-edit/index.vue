<template>
  <view class="pe-page">
    <!-- 顶部导航 -->
    <view class="pe-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pe-header-inner">
        <view class="pe-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="pe-title">{{ isEdit ? '编辑商品' : '发布商品' }}</text>
      </view>
    </view>

    <!-- Loading（编辑预填中） -->
    <view v-if="loading" class="pe-state" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <text class="pe-state-txt">加载中…</text>
    </view>
    <!-- Error -->
    <view v-else-if="error" class="pe-state" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <AppIcon name="alert-circle" :size="44" color="#dc2626" />
      <text class="pe-state-txt">{{ error }}</text>
      <view class="pe-state-btn" @tap="loadProduct"><text class="pe-state-btn-txt">重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="pe-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
        <view class="pe-body">
          <!-- 商品图片 -->
          <view class="pe-card">
            <view class="pe-card-head">
              <text class="pe-card-title">商品图片</text>
              <text class="pe-card-sub">首图为封面</text>
            </view>
            <view class="pe-img-grid">
              <view v-for="(img, i) in form.images" :key="i" class="pe-img">
                <image lazy-load :src="img" class="pe-img-pic" mode="aspectFill" />
                <view class="pe-img-del" @tap="removeImage(i)">
                  <AppIcon name="x" :size="14" color="#fff" />
                </view>
                <text v-if="i === 0" class="pe-img-cover">封面</text>
              </view>
              <view v-if="form.images.length < 9" class="pe-img-add" @tap="onUploadImage">
                <AppIcon name="plus" :size="28" color="#9ca3af" />
                <text class="pe-img-add-txt">添加图片</text>
              </view>
            </view>
          </view>

          <!-- 基本信息 -->
          <view class="pe-card">
            <text class="pe-card-title pe-mb">基本信息</text>
            <view class="pe-field">
              <text class="pe-label">商品名称 <text class="pe-req">*</text></text>
              <input class="pe-input" v-model="form.title" maxlength="60" placeholder="请输入商品名称（最多60字）" placeholder-class="pe-ph" />
              <text class="pe-count">{{ form.title.length }}/60</text>
            </view>
            <view class="pe-field">
              <text class="pe-label">商品卖点</text>
              <input class="pe-input" v-model="form.intro" maxlength="60" placeholder="简要描述商品特点" placeholder-class="pe-ph" />
            </view>
            <view class="pe-field">
              <text class="pe-label">商品详情</text>
              <textarea class="pe-textarea" v-model="form.detail" placeholder="详细描述商品信息、规格、使用方法等" placeholder-class="pe-ph" />
            </view>
          </view>

          <!-- 价格库存 -->
          <view class="pe-card">
            <text class="pe-card-title pe-mb">价格库存</text>
            <view class="pe-grid2">
              <view class="pe-field">
                <text class="pe-label">售价 <text class="pe-req">*</text></text>
                <view class="pe-input-prefix">
                  <text class="pe-prefix">¥</text>
                  <input class="pe-input pe-input-pl" type="digit" v-model="form.price" placeholder="0.00" placeholder-class="pe-ph" />
                </view>
              </view>
              <view class="pe-field">
                <text class="pe-label">库存 <text class="pe-req">*</text></text>
                <input class="pe-input" type="number" v-model="form.stock" placeholder="请输入库存数量" placeholder-class="pe-ph" />
              </view>
            </view>
          </view>

          <!-- 分类与标签 -->
          <view class="pe-card">
            <text class="pe-card-title pe-mb">分类与标签</text>
            <view class="pe-field">
              <text class="pe-label">商品分类 <text class="pe-req">*</text></text>
              <view class="pe-select" @tap="showCatPicker = true">
                <text :class="form.categoryId ? 'pe-select-val' : 'pe-select-ph'">
                  {{ selectedCategory ? selectedCategory.name : '请选择商品分类' }}
                </text>
                <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
              </view>
              <view v-if="selectedCategory" class="pe-fee-tip">
                <AppIcon name="info" :size="12" color="#9ca3af" />
                <text>该分类平台收取 {{ selectedCategory.fee }} 技术服务费</text>
              </view>
            </view>
            <view class="pe-field">
              <text class="pe-label">商品标签（最多5个）</text>
              <view v-if="form.tags.length" class="pe-tags">
                <view v-for="tag in form.tags" :key="tag" class="pe-tag">
                  <text>{{ tag }}</text>
                  <view @tap="removeTag(tag)"><AppIcon name="x" :size="12" color="#6b7280" /></view>
                </view>
              </view>
              <view class="pe-tag-input-row">
                <input class="pe-input pe-tag-input" v-model="newTag" placeholder="输入标签后点击添加" placeholder-class="pe-ph" @confirm="addTag" />
                <view class="pe-tag-add" :class="{ disabled: form.tags.length >= 5 }" @tap="addTag">
                  <AppIcon name="plus" :size="16" color="#1a1a1a" />
                </view>
              </view>
            </view>
          </view>

          <!-- 审核提示 -->
          <view class="pe-notice">
            <AppIcon name="info" :size="14" color="#b45309" />
            <text class="pe-notice-txt">商品提交后需平台审核（审核中状态）通过方可上架销售。</text>
          </view>
        </view>
        <view style="height: 90px" />
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="pe-footer">
        <view class="pe-foot-btn primary" @tap="onSubmit">
          <AppIcon name="send" :size="16" color="#fff" />
          <text>{{ submitting ? '提交中...' : isEdit ? '保存修改' : '提交审核' }}</text>
        </view>
      </view>

      <!-- 分类选择浮层 -->
      <view v-if="showCatPicker" class="pe-mask" @tap="showCatPicker = false">
        <view class="pe-sheet" @tap.stop>
          <text class="pe-sheet-title">选择商品分类</text>
          <scroll-view scroll-y class="pe-sheet-list">
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="pe-sheet-item"
              :class="{ active: form.categoryId === cat.id }"
              @tap="pickCategory(cat.id)"
            >
              <text>{{ cat.name }}</text>
              <text class="pe-sheet-fee">服务费{{ cat.fee }}</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'
import { merchantBackendApi, productCategories } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const categories = productCategories
const productId = ref('')
const isEdit = computed(() => !!productId.value)
const showCatPicker = ref(false)
const newTag = ref('')
const loading = ref(false)
const error = ref('')
const submitting = ref(false)

const form = ref({
  images: [] as string[],
  title: '',
  intro: '',
  detail: '',
  price: '',
  stock: '',
  categoryId: '',
  tags: [] as string[],
})

const selectedCategory = computed(() => categories.find((c) => c.id === form.value.categoryId))

async function loadProduct() {
  if (!productId.value) return
  loading.value = true
  error.value = ''
  try {
    const p = await merchantBackendApi.getProduct(productId.value)
    form.value = {
      images: [...(p.images || [])],
      title: p.title || '',
      intro: p.intro || '',
      detail: p.detail || '',
      price: p.price != null ? String(p.price) : '',
      stock: p.stock != null ? String(p.stock) : '',
      categoryId: p.categoryId || '',
      tags: [...(p.tags || [])],
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((opts) => {
  if (opts?.id) {
    productId.value = String(opts.id)
    loadProduct()
  }
})

// 图片上传暂未开放，先降级提示
function onUploadImage() {
  uni.showToast({ title: '图片上传功能即将开放', icon: 'none' })
}
function removeImage(i: number) {
  form.value.images.splice(i, 1)
}
function pickCategory(id: string) {
  form.value.categoryId = id
  showCatPicker.value = false
}
function addTag() {
  const t = newTag.value.trim()
  if (t && !form.value.tags.includes(t) && form.value.tags.length < 5) {
    form.value.tags.push(t)
    newTag.value = ''
  }
}
function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter((t) => t !== tag)
}

async function onSubmit() {
  if (submitting.value) return
  if (!form.value.title.trim()) { uni.showToast({ title: '请填写商品名称', icon: 'none' }); return }
  if (!form.value.price || Number(form.value.price) <= 0) { uni.showToast({ title: '请填写有效售价', icon: 'none' }); return }
  if (form.value.stock === '' || Number(form.value.stock) < 0) { uni.showToast({ title: '请填写库存', icon: 'none' }); return }
  if (!form.value.categoryId) { uni.showToast({ title: '请选择商品分类', icon: 'none' }); return }

  const payload = {
    title: form.value.title.trim(),
    intro: form.value.intro.trim(),
    detail: form.value.detail.trim(),
    price: Number(form.value.price),
    stock: Number(form.value.stock),
    categoryId: form.value.categoryId,
    tags: form.value.tags,
    images: form.value.images,
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      await merchantBackendApi.updateProduct(productId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await merchantBackendApi.createProduct(payload)
      uni.showToast({ title: '已提交审核', icon: 'success' })
    }
    setTimeout(() => navigateTo('/merchant/products'), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.pe-page { min-height: 100vh; background: #f5f5f7; }
.pe-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.pe-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.pe-back { width: 32px; display: flex; align-items: center; }
.pe-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.pe-scroll { height: 100vh; box-sizing: border-box; }
.pe-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.pe-card { background: #fff; border-radius: 12px; padding: 16px; }
.pe-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pe-card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.pe-mb { margin-bottom: 16px; display: block; }
.pe-card-sub { font-size: 12px; color: #9ca3af; }

.pe-img-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.pe-img, .pe-img-add { width: calc((100% - 24px) / 3); aspect-ratio: 1; border-radius: 8px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pe-img { background: #f3f0ea; overflow: hidden; }
.pe-img-pic { width: 100%; height: 100%; }
.pe-img-add { border: 2px dashed #e5e5e5; }
.pe-img-del { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.pe-img-cover { position: absolute; bottom: 4px; left: 4px; font-size: 10px; color: #fff; background: var(--brand); padding: 1px 6px; border-radius: 4px; }
.pe-img-add-txt { font-size: 12px; color: #9ca3af; margin-top: 4px; }

.pe-field { margin-bottom: 16px; }
.pe-field:last-child { margin-bottom: 0; }
.pe-label { font-size: 14px; color: #1a1a1a; display: block; margin-bottom: 8px; }
.pe-req { color: #ef4444; }
.pe-input { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1a1a1a; background: #fff; }
.pe-ph { color: #9ca3af; }
.pe-count { font-size: 12px; color: #9ca3af; text-align: right; display: block; margin-top: 4px; }
.pe-textarea { width: 100%; box-sizing: border-box; min-height: 100px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1a1a1a; }
.pe-grid2 { display: flex; gap: 16px; }
.pe-grid2 .pe-field { flex: 1; }
.pe-input-prefix { position: relative; display: flex; align-items: center; }
.pe-prefix { position: absolute; left: 12px; font-size: 14px; color: #9ca3af; z-index: 1; }
.pe-input-pl { padding-left: 26px; }

.pe-select { height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; }
.pe-select-val { font-size: 14px; color: #1a1a1a; }
.pe-select-ph { font-size: 14px; color: #9ca3af; }
.pe-fee-tip { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; color: #9ca3af; }
.pe-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.pe-tag { display: flex; align-items: center; gap: 4px; background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-size: 12px; color: #1a1a1a; }
.pe-tag-input-row { display: flex; gap: 8px; }
.pe-tag-input { flex: 1; }
.pe-tag-add { width: 42px; height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.pe-tag-add.disabled { opacity: 0.4; }

.pe-notice { display: flex; align-items: flex-start; gap: 6px; background: #fffbeb; border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 12px; }
.pe-notice-txt { flex: 1; font-size: 12px; color: #b45309; line-height: 1.5; }

.pe-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ededed; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 12px; z-index: 60; }
.pe-foot-btn { flex: 1; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; }
.pe-foot-btn.primary { background: var(--brand); color: #fff; }

.pe-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 24px; }
.pe-state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.pe-state-btn { margin-top: 4px; border: 1px solid #d1d5db; padding: 8px 24px; border-radius: 8px; }
.pe-state-btn-txt { font-size: 14px; color: #1a1a1a; }

.pe-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.pe-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.pe-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; text-align: center; margin-bottom: 12px; }
.pe-sheet-list { max-height: 50vh; }
.pe-sheet-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 4px; border-bottom: 1px solid #f3f4f6; font-size: 15px; color: #1a1a1a; }
.pe-sheet-item.active { color: var(--brand); }
.pe-sheet-fee { font-size: 12px; color: #9ca3af; }
</style>
