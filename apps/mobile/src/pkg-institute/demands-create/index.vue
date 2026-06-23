<template>
  <view class="page">
    <!-- 成功页 -->
    <view v-if="success" class="success-page">
      <app-icon name="check-circle-2" :size="64" color="#16a34a" />
      <text class="success-title">需求已发布</text>
      <text class="success-sub">您的需求已成功发布，平台将为您匹配合适的合作资源，请留意消息通知。</text>
      <view class="success-btn" @tap="goBack"><text class="success-btn-text">返回</text></view>
    </view>

    <block v-else>
      <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-bar">
          <view class="nav-back" @tap="goBack">
            <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="nav-title">发布需求</text>
        </view>
      </view>

      <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
        <view class="form">
          <view class="field">
            <text class="field-label">需求标题 <text class="req-mark">*</text></text>
            <input class="field-input" v-model="form.title" placeholder="简明扼要描述您的需求，如：招募命理类课程合作讲师" placeholder-class="ph" />
          </view>

          <view class="field">
            <text class="field-label">需求类型 <text class="req-mark">*</text></text>
            <view class="chip-group">
              <view
                v-for="c in categories"
                :key="c"
                class="chip"
                :class="{ 'chip-active': form.category === c }"
                @tap="form.category = c"
              >
                <text class="chip-text" :class="{ 'chip-text-active': form.category === c }">{{ c }}</text>
              </view>
            </view>
          </view>

          <view class="field">
            <text class="field-label">预算范围</text>
            <view class="chip-group">
              <view
                v-for="b in budgets"
                :key="b"
                class="chip"
                :class="{ 'chip-active': form.budget === b }"
                @tap="form.budget = b"
              >
                <text class="chip-text" :class="{ 'chip-text-active': form.budget === b }">{{ b }}</text>
              </view>
            </view>
          </view>

          <view class="field">
            <text class="field-label">截止日期</text>
            <picker mode="date" :value="form.deadline" @change="onDateChange">
              <view class="date-picker">
                <text class="date-text" :class="{ 'date-ph': !form.deadline }">{{ form.deadline || '请选择截止日期' }}</text>
              </view>
            </picker>
          </view>

          <view class="field">
            <view class="label-row">
              <text class="field-label">需求详情 <text class="req-mark">*</text></text>
              <text class="counter">{{ form.desc.length }}/500</text>
            </view>
            <textarea
              class="field-textarea"
              v-model="form.desc"
              maxlength="500"
              placeholder="详细描述您的需求内容、合作方式、期望效果等"
              placeholder-class="ph"
            />
          </view>

          <view class="field">
            <text class="field-label">联系人</text>
            <input class="field-input" v-model="form.contactName" placeholder="请输入联系人姓名" placeholder-class="ph" />
          </view>

          <view class="field">
            <text class="field-label">联系方式 <text class="req-mark">*</text></text>
            <input class="field-input" v-model="form.contact" placeholder="手机号或微信号" placeholder-class="ph" />
          </view>
        </view>
      </scroll-view>

      <view class="footer">
        <view class="submit-btn" :class="{ 'btn-disabled': !valid || loading }" @tap="handleSubmit">
          <app-icon v-if="loading" name="loader-2" :size="16" color="#fff" />
          <text class="submit-btn-text">{{ loading ? '发布中…' : '发布需求' }}</text>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { instituteApi, demandCreateCategories as categories, demandCreateBudgets as budgets } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44 - 72
} catch (e) {}

const form = ref({ title: '', category: '', budget: '', deadline: '', desc: '', contactName: '', contact: '' })
const loading = ref(false)
const success = ref(false)

const valid = computed(() => !!form.value.title && !!form.value.category && !!form.value.desc && !!form.value.contact)

function onDateChange(e: any) {
  form.value.deadline = e.detail.value
}
function handleSubmit() {
  if (!valid.value || loading.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    success.value = true
  }, 1200)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }

.scroll { width: 100%; }
.form { padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; }
.label-row { display: flex; align-items: center; justify-content: space-between; }
.field-label { font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.req-mark { color: #dc2626; }
.counter { font-size: 12px; color: #9ca3af; }
.field-input { height: 42px; padding: 0 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; color: #1a1a1a; }
.field-textarea { width: 100%; min-height: 120px; padding: 10px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; color: #1a1a1a; box-sizing: border-box; }
.ph { color: #9ca3af; }

.chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 7px 14px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; }
.chip-active { background: #c41e3a; border-color: #c41e3a; }
.chip-text { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.chip-text-active { color: #fff; }

.date-picker { height: 42px; padding: 0 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; }
.date-text { font-size: 14px; color: #1a1a1a; }
.date-ph { color: #9ca3af; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 14px 16px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; background: #c41e3a; border-radius: 8px; }
.submit-btn-text { font-size: 15px; color: #fff; font-weight: 600; }
.btn-disabled { background: #d1d5db; }

.success-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 32px; }
.success-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 16px; }
.success-sub { font-size: 13px; color: #6b7280; text-align: center; margin-top: 8px; margin-bottom: 32px; line-height: 1.6; }
.success-btn { width: 100%; height: 44px; background: #c41e3a; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.success-btn-text { font-size: 15px; color: #fff; font-weight: 600; }
</style>
