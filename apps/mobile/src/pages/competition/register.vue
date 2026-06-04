<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">竞赛报名</text>
      </view>
    </view>

    <view class="content" v-if="comp.id">
      <!-- 竞赛信息卡片 -->
      <view class="comp-card">
        <image v-if="comp.cover" :src="comp.cover" class="comp-cover" mode="aspectFill" />
        <view class="comp-info">
          <text class="comp-name">{{ comp.name || comp.title }}</text>
          <view class="comp-meta">
            <text class="meta-item">🕐 {{ formatDate(comp.startDate) }} - {{ formatDate(comp.endDate) }}</text>
            <text class="meta-item">👥 {{ comp.enrolledCount || 0 }}人已报名</text>
          </view>
          <view v-if="comp.fee > 0" class="comp-fee">
            <text class="fee-label">报名费</text>
            <text class="fee-amount">¥{{ comp.fee }}</text>
          </view>
          <text v-else class="free-tag">免费报名</text>
        </view>
      </view>

      <!-- 报名表单 -->
      <view class="form-section">
        <text class="section-title">报名信息</text>

        <view class="form-group">
          <text class="form-label">参赛者姓名 *</text>
          <input v-model="form.name" placeholder="请输入姓名" class="form-input" maxlength="20" />
        </view>

        <view class="form-group">
          <text class="form-label">联系电话 *</text>
          <input v-model="form.phone" placeholder="请输入手机号" class="form-input" type="number" maxlength="11" />
        </view>

        <view class="form-group">
          <text class="form-label">身份证号</text>
          <input v-model="form.idCard" placeholder="选填，用于身份核验" class="form-input" maxlength="18" />
        </view>

        <view class="form-group">
          <text class="form-label">学校/机构</text>
          <input v-model="form.organization" placeholder="选填" class="form-input" maxlength="50" />
        </view>

        <view class="form-group">
          <text class="form-label">参赛组别</text>
          <view class="group-select">
            <text
              v-for="g in groups"
              :key="g.value"
              class="group-option"
              :class="{ active: form.group === g.value }"
              @click="form.group = g.value"
            >{{ g.label }}</text>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">备注</text>
          <textarea v-model="form.remark" placeholder="选填，特殊需求说明" class="form-textarea" maxlength="200" />
        </view>
      </view>

      <!-- 协议 -->
      <view class="agreement">
        <view class="agree-check" :class="{ checked: agreed }" @click="agreed = !agreed">
          <text v-if="agreed">✓</text>
        </view>
        <text class="agree-text">我已阅读并同意<text class="agree-link" @click="showRules">《竞赛参赛协议》</text></text>
      </view>

      <!-- 提交按钮 -->
      <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
        <text v-if="submitting">提交中...</text>
        <text v-else>{{ comp.fee > 0 ? '确认报名并支付' : '确认报名' }}</text>
      </button>
    </view>

    <!-- 加载/错误态 -->
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && !comp.id"
      empty-icon="🏆"
      empty-title="竞赛不存在"
      skeleton-type="detail"
      @retry="fetchDetail"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { competitionApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface Competition {
  id: string
  name?: string
  title?: string
  cover?: string
  startDate?: string
  endDate?: string
  enrolledCount?: number
  fee?: number
  rules?: string
}

interface RegisterForm {
  name: string
  phone: string
  idCard: string
  organization: string
  group: string
  remark: string
}

const comp = ref<Competition>({ id: '' })
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitting = ref(false)
const agreed = ref(false)

const form = ref<RegisterForm>({
  name: '',
  phone: '',
  idCard: '',
  organization: '',
  group: 'beginner',
  remark: '',
})

const groups = [
  { label: '初级组', value: 'beginner' },
  { label: '中级组', value: 'intermediate' },
  { label: '高级组', value: 'advanced' },
]

function getCompId(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.id || page?.options?.competitionId || ''
}

onMounted(() => {
  fetchDetail()
})

async function fetchDetail() {
  const id = getCompId()
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const res: any = await competitionApi.detail(id)
    comp.value = res || {}
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function formatDate(d?: string): string {
  if (!d) return ''
  return d.slice(0, 10)
}

async function handleSubmit() {
  if (!form.value.name) {
    uni.showToast({ title: '请输入参赛者姓名', icon: 'none' })
    return
  }
  if (!form.value.phone || form.value.phone.length < 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!agreed.value) {
    uni.showToast({ title: '请阅读并同意参赛协议', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await competitionApi.register(comp.value.id, form.value)
    uni.showToast({ title: '报名成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '报名失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function showRules() {
  uni.showModal({
    title: '参赛协议',
    content: comp.value.rules || '请遵守竞赛规则，诚信参赛。具体规则以竞赛主办方公布为准。',
    showCancel: false,
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.header { background: #fff; padding: 20rpx 24rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.content { padding: 24rpx; }

.comp-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); margin-bottom: 24rpx; }
.comp-cover { width: 100%; height: 320rpx; }
.comp-info { padding: 24rpx; }
.comp-name { font-size: 34rpx; font-weight: bold; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.comp-meta { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 16rpx; }
.meta-item { font-size: 24rpx; color: #666; }
.comp-fee { display: flex; align-items: center; gap: 12rpx; }
.fee-label { font-size: 26rpx; color: #999; }
.fee-amount { font-size: 36rpx; font-weight: bold; color: #C41E3A; }
.free-tag { font-size: 26rpx; color: #52C41A; font-weight: 500; }

.form-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.form-group { margin-bottom: 20rpx; }
.form-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 8rpx; }
.form-input { width: 100%; height: 80rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.form-textarea { width: 100%; height: 160rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }

.group-select { display: flex; gap: 16rpx; }
.group-option { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 12rpx; font-size: 26rpx; color: #666; background: #F5F0E8; }
.group-option.active { background: #C41E3A; color: #fff; font-weight: 500; }

.agreement { display: flex; align-items: center; gap: 12rpx; margin-bottom: 32rpx; }
.agree-check { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #fff; flex-shrink: 0; }
.agree-check.checked { background: #C41E3A; border-color: #C41E3A; }
.agree-text { font-size: 24rpx; color: #999; }
.agree-link { color: #C41E3A; }

.submit-btn { width: 100%; height: 96rpx; background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; font-size: 32rpx; font-weight: 600; border-radius: 48rpx; display: flex; align-items: center; justify-content: center; border: none; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.submit-btn:disabled { opacity: 0.6; }
</style>
