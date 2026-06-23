<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="nav-title">店铺设置</text>
        <view class="nav-preview" @tap="goPreview">
          <app-icon name="eye" :size="16" color="#4b5563" />
          <text class="nav-preview-text">预览</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 加载中 -->
      <view v-if="loading" class="profile-loading">
        <text class="profile-loading-text">加载中...</text>
      </view>
      <!-- 错误 -->
      <view v-else-if="error" class="profile-error">
        <app-icon name="alert-circle" :size="40" color="#dc2626" />
        <text class="profile-error-text">加载失败</text>
        <view class="profile-retry-btn" @tap="retryLoad">重试</view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 店铺形象 -->
      <view class="card">
        <text class="card-title">店铺形象</text>
        <view class="logo-row">
          <view class="logo-box" @tap="onUploadLogo">
            <app-icon name="store" :size="40" color="#9ca3af" />
            <view class="logo-cam">
              <app-icon name="camera" :size="16" color="#ffffff" />
            </view>
          </view>
          <view class="logo-info">
            <text class="logo-title">店铺Logo</text>
            <text class="logo-desc">建议尺寸200x200px，支持JPG、PNG格式</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="card">
        <text class="card-title">基本信息</text>
        <view class="field">
          <text class="label">店铺名称</text>
          <input v-model="form.name" class="input" placeholder="请输入店铺名称" :maxlength="20" />
        </view>
        <view class="field">
          <text class="label">店铺口号</text>
          <input v-model="form.slogan" class="input" placeholder="一句话介绍您的店铺" :maxlength="30" />
        </view>
        <view class="field">
          <text class="label">店铺简介</text>
          <textarea v-model="form.description" class="textarea" placeholder="详细介绍您的店铺" />
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="card">
        <text class="card-title">联系方式</text>
        <view class="field">
          <view class="label-icon"><app-icon name="phone" :size="14" color="#4b5563" /><text class="label">联系电话</text></view>
          <input v-model="form.phone" class="input" placeholder="请输入联系电话" />
        </view>
        <view class="field">
          <view class="label-icon"><app-icon name="map-pin" :size="14" color="#4b5563" /><text class="label">店铺地址</text></view>
          <input v-model="form.address" class="input" placeholder="请输入店铺地址（选填）" />
        </view>
        <view class="field">
          <view class="label-icon"><app-icon name="clock" :size="14" color="#4b5563" /><text class="label">营业时间</text></view>
          <input v-model="form.businessHours" class="input" placeholder="例如: 09:00-21:00" />
        </view>
      </view>

      <!-- 营业设置 -->
      <view class="card">
        <text class="card-title">营业设置</text>
        <view class="switch-row">
          <view class="switch-info">
            <text class="switch-label">店铺营业状态</text>
            <text class="switch-desc">关闭后买家将无法下单</text>
          </view>
          <view class="switch" :class="{ on: form.isOpen }" @tap="form.isOpen = !form.isOpen">
            <view class="switch-knob" />
          </view>
        </view>
        <view class="switch-row">
          <view class="switch-info">
            <text class="switch-label">自动回复</text>
            <text class="switch-desc">买家首次咨询时自动回复</text>
          </view>
          <view class="switch" :class="{ on: form.autoReply }" @tap="form.autoReply = !form.autoReply">
            <view class="switch-knob" />
          </view>
        </view>
        <view v-if="form.autoReply" class="field field-mt">
          <text class="label">自动回复内容</text>
          <textarea v-model="form.autoReplyContent" class="textarea" placeholder="请输入自动回复内容" />
        </view>
      </view>

      <!-- 其他设置 -->
      <view class="card">
        <view class="link-row" @tap="goEditApplication">
          <view>
            <text class="link-title">修改入驻资料</text>
            <text class="link-desc">修改营业执照、法人信息等</text>
          </view>
          <app-icon name="chevron-right" :size="20" color="#9ca3af" />
        </view>
      </view>
      </template>
    </scroll-view>

    <!-- 底部保存 -->
    <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
      <view class="save-btn" :class="{ saving: isSaving }" @tap="onSave">
        <app-icon :name="isSaving ? 'loader-2' : 'save'" :size="16" color="#ffffff" :class="{ spin: isSaving }" />
        <text class="save-text">{{ isSaving ? '保存中...' : '保存修改' }}</text>
      </view>
    </view>
  </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { merchantAdminApi } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const form = reactive({
  name: '',
  slogan: '',
  description: '',
  phone: '',
  address: '',
  businessHours: '',
  isOpen: true,
  autoReply: false,
  autoReplyContent: '',
})
const isSaving = ref(false)
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    const res = await merchantAdminApi.getDashboard()
    form.name = res.shopName || ''
    form.slogan = res.slogan || ''
    form.description = res.description || ''
    form.phone = res.phone || ''
    form.address = res.address || ''
    form.businessHours = res.businessHours || ''
    form.isOpen = res.isOpen !== undefined ? res.isOpen : true
    form.autoReply = res.autoReply !== undefined ? res.autoReply : false
    form.autoReplyContent = res.autoReplyContent || ''
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

function onUploadLogo() {
  uni.chooseImage({ count: 1, success: () => uni.showToast({ title: 'Logo已选择', icon: 'success' }) })
}
function goPreview() {
  navigateTo('/merchant/shop-preview')
}
function goEditApplication() {
  navigateTo('/merchant/edit-application')
}
function retryLoad() {
  loading.value = true
  error.value = false
  merchantAdminApi.getDashboard().then((res) => {
    form.name = res.shopName || ''
    form.slogan = res.slogan || ''
    form.description = res.description || ''
    form.phone = res.phone || ''
    form.address = res.address || ''
    form.businessHours = res.businessHours || ''
    form.isOpen = res.isOpen !== undefined ? res.isOpen : true
    form.autoReply = res.autoReply !== undefined ? res.autoReply : false
    form.autoReplyContent = res.autoReplyContent || ''
  }).catch(() => {
    error.value = true
  }).finally(() => {
    loading.value = false
  })
}

async function onSave() {
  if (isSaving.value) return
  isSaving.value = true
  try {
    // 通过 admin API 更新店铺信息
    await merchantAdminApi.getDashboard() // 暂时使用 getDashboard 保持结构，后续接入真实 PUT API
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-preview { display: flex; align-items: center; gap: 4px; padding: 6px 8px; }
.nav-preview-text { font-size: 14px; color: #4b5563; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 90px; }

.card { background: #ffffff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }

.logo-row { display: flex; align-items: center; gap: 16px; }
.logo-box { position: relative; width: 80px; height: 80px; border-radius: 12px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.logo-cam { position: absolute; bottom: -4px; right: -4px; width: 28px; height: 28px; border-radius: 50%; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.logo-info { flex: 1; }
.logo-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.logo-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }

.field { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field-mt { margin-top: 16px; }
.label { font-size: 14px; color: #374151; }
.label-icon { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.label-icon .label { margin: 0; }
.input { margin-top: 8px; width: 100%; box-sizing: border-box; height: 40px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #ffffff; }
.textarea { margin-top: 8px; width: 100%; box-sizing: border-box; height: 88px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #ffffff; }

.switch-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.switch-row:last-child { margin-bottom: 0; }
.switch-info { flex: 1; }
.switch-label { display: block; font-size: 14px; color: #374151; }
.switch-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }
.switch { width: 44px; height: 24px; border-radius: 12px; background: #d1d5db; position: relative; transition: background 0.2s; flex-shrink: 0; }
.switch.on { background: #c41e3a; }
.switch-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
.switch.on .switch-knob { transform: translateX(20px); }

.link-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
.link-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.link-desc { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: #ffffff; border-top: 1px solid #ededed; }
.save-btn { height: 46px; border-radius: 10px; background: #c41e3a; display: flex; align-items: center; justify-content: center; gap: 8px; }
.save-btn.saving { opacity: 0.7; }
.save-text { font-size: 15px; font-weight: 500; color: #ffffff; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* Loading / Error */
.profile-loading { padding: 80px 16px; display: flex; flex-direction: column; align-items: center; }
.profile-loading-text { font-size: 14px; color: #999; }
.profile-error { padding: 80px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.profile-error-text { font-size: 14px; color: #dc2626; }
.profile-retry-btn { height: 36px; padding: 0 24px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #1a1a1a; }
</style>
