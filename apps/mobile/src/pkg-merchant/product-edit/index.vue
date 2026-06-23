<template>
  <view class="pe-page">
    <!-- 顶部导航 -->
    <view class="pe-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pe-header-inner">
        <view class="pe-back" @tap="go('/merchant/products')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="pe-title">{{ isEdit ? '编辑商品' : '发布商品' }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="pe-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <view v-if="loading" class="loading-state"><text>加载中...</text></view>
      <view v-else class="pe-body">
        <!-- 商品图片 -->
        <view class="pe-card">
          <view class="pe-card-head">
            <text class="pe-card-title">商品图片</text>
            <text class="pe-card-sub">最多9张，首图为封面</text>
          </view>
          <view class="pe-img-grid">
            <view v-for="(img, i) in form.images" :key="i" class="pe-img">
              <AppIcon name="camera" :size="28" color="#9ca3af" />
              <view class="pe-img-del" @tap="removeImage(i)">
                <AppIcon name="x" :size="14" color="#fff" />
              </view>
              <text v-if="i === 0" class="pe-img-cover">封面</text>
            </view>
            <view v-if="form.images.length < 9" class="pe-img-add" @tap="addImage">
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
            <input class="pe-input" v-model="form.subtitle" maxlength="30" placeholder="简要描述商品特点（最多30字）" placeholder-class="pe-ph" />
          </view>
          <view class="pe-field">
            <text class="pe-label">商品详情</text>
            <textarea class="pe-textarea" v-model="form.description" placeholder="详细描述商品信息、规格、使用方法等" placeholder-class="pe-ph" />
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
              <text class="pe-label">原价（划线价）</text>
              <view class="pe-input-prefix">
                <text class="pe-prefix">¥</text>
                <input class="pe-input pe-input-pl" type="digit" v-model="form.originalPrice" placeholder="0.00" placeholder-class="pe-ph" />
              </view>
            </view>
          </view>
          <view class="pe-grid2">
            <view class="pe-field">
              <text class="pe-label">库存 <text class="pe-req">*</text></text>
              <input class="pe-input" type="number" v-model="form.stock" placeholder="请输入库存数量" placeholder-class="pe-ph" />
            </view>
            <view class="pe-field">
              <text class="pe-label">限购数量</text>
              <input class="pe-input" type="number" v-model="form.limitPerPerson" placeholder="不限制" placeholder-class="pe-ph" />
            </view>
          </view>
        </view>

        <!-- 分类与标签 -->
        <view class="pe-card">
          <text class="pe-card-title pe-mb">分类与标签</text>
          <view class="pe-field">
            <text class="pe-label">商品分类 <text class="pe-req">*</text></text>
            <view class="pe-select" @tap="showCatPicker = true">
              <text :class="form.category ? 'pe-select-val' : 'pe-select-ph'">
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

        <!-- 其他设置 -->
        <view class="pe-card">
          <text class="pe-card-title pe-mb">其他设置</text>
          <view class="pe-switch-row">
            <view>
              <text class="pe-switch-label">虚拟商品</text>
              <text class="pe-switch-desc">虚拟商品无需发货</text>
            </view>
            <view class="pe-switch" :class="{ on: form.isVirtual }" @tap="form.isVirtual = !form.isVirtual">
              <view class="pe-switch-knob" />
            </view>
          </view>
          <view class="pe-switch-row">
            <view>
              <text class="pe-switch-label">支持退款</text>
              <text class="pe-switch-desc">买家可申请退款退货</text>
            </view>
            <view class="pe-switch" :class="{ on: form.allowRefund }" @tap="form.allowRefund = !form.allowRefund">
              <view class="pe-switch-knob" />
            </view>
          </view>
        </view>
      </view>
      <view style="height: 90px" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="pe-footer">
      <view class="pe-foot-btn outline" @tap="saveDraft">
        <AppIcon name="save" :size="16" color="#1a1a1a" />
        <text>{{ isSaving ? '保存中...' : '保存草稿' }}</text>
      </view>
      <view class="pe-foot-btn primary" @tap="publish">
        <AppIcon name="send" :size="16" color="#fff" />
        <text>{{ isSubmitting ? '提交中...' : isEdit ? '保存修改' : '立即发布' }}</text>
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
            :class="{ active: form.category === cat.id }"
            @tap="pickCategory(cat.id)"
          >
            <text>{{ cat.name }}</text>
            <text class="pe-sheet-fee">佣金{{ cat.fee }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantAdminApi, productCategories } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const loading = ref(false)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const categories = productCategories
const isEdit = ref(false)
const showCatPicker = ref(false)
const newTag = ref('')
const isSaving = ref(false)
const isSubmitting = ref(false)

const form = ref({
  images: [] as string[],
  title: '',
  subtitle: '',
  description: '',
  price: '',
  originalPrice: '',
  stock: '',
  category: '',
  tags: [] as string[],
  isVirtual: false,
  allowRefund: true,
  limitPerPerson: '',
})

onLoad(async (opts: any) => {
  if (opts?.id) {
    isEdit.value = true
    loading.value = true
    try {
      const products = await merchantAdminApi.getProducts()
      const product = products.find((p: any) => p.id === opts.id)
      if (product) {
        form.value = {
          images: ['1', '2'],
          title: product.title || '',
          subtitle: '',
          description: '',
          price: String(product.price || ''),
          originalPrice: product.originalPrice ? String(product.originalPrice) : '',
          stock: String(product.stock || ''),
          category: product.category || '',
          tags: [],
          isVirtual: false,
          allowRefund: true,
          limitPerPerson: '',
        }
      }
    } catch {
      uni.showToast({ title: '加载商品信息失败', icon: 'none' })
    } finally {
      loading.value = false
    }
  }
})

const selectedCategory = computed(() => categories.find((c) => c.id === form.value.category))

function addImage() {
  uni.chooseImage({
    count: 1,
    success: () => {
      form.value.images.push(String(form.value.images.length + 1))
    },
  })
}
function removeImage(i: number) {
  form.value.images.splice(i, 1)
}
function pickCategory(id: string) {
  form.value.category = id
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
function saveDraft() {
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    uni.showToast({ title: '已保存草稿', icon: 'success' })
  }, 1000)
}
function publish() {
  if (!form.value.title || !form.value.price || !form.value.stock || !form.value.category) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    return
  }
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    navigateTo('/merchant/products')
  }, 1500)
}
function go(path: string) {
  navigateTo(path)
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
.pe-img { background: #f3f0ea; border: 2px dashed #e5e5e5; }
.pe-img-add { border: 2px dashed #e5e5e5; }
.pe-img-del { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.pe-img-cover { position: absolute; bottom: 4px; left: 4px; font-size: 10px; color: #fff; background: #c41e3a; padding: 1px 6px; border-radius: 4px; }
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

.pe-switch-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.pe-switch-row:last-child { margin-bottom: 0; }
.pe-switch-label { font-size: 14px; color: #1a1a1a; display: block; }
.pe-switch-desc { font-size: 12px; color: #9ca3af; margin-top: 2px; display: block; }
.pe-switch { width: 44px; height: 24px; border-radius: 12px; background: #d1d5db; position: relative; transition: background 0.2s; }
.pe-switch.on { background: #c41e3a; }
.pe-switch-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
.pe-switch.on .pe-switch-knob { transform: translateX(20px); }

.pe-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ededed; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 12px; z-index: 60; }
.pe-foot-btn { flex: 1; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; }
.pe-foot-btn.outline { border: 1px solid #d1d5db; color: #1a1a1a; }
.pe-foot-btn.primary { background: #c41e3a; color: #fff; }

.pe-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.pe-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.pe-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; text-align: center; margin-bottom: 12px; }
.pe-sheet-list { max-height: 50vh; }
.pe-sheet-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 4px; border-bottom: 1px solid #f3f4f6; font-size: 15px; color: #1a1a1a; }
.pe-sheet-item.active { color: #c41e3a; }
.pe-sheet-fee { font-size: 12px; color: #9ca3af; }

.loading-state { padding: 60px 0; display: flex; align-items: center; justify-content: center; }
.loading-state text { font-size: 14px; color: #9ca3af; }
</style>
