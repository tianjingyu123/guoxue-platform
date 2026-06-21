<template>
  <view class="ag-page">
    <app-nav-bar
      title="站长协议"
      :border="true"
    />
    <scroll-view
      scroll-y
      class="ag-scroll"
    >
      <view
        v-if="loading"
        class="ag-loading"
      >
        <view class="ag-loading-spinner" />
        <text class="ag-loading-text">
          加载中...
        </text>
      </view>
      <view
        v-else-if="error"
        class="ag-error"
      >
        <text class="ag-error-text">
          {{ error }}
        </text>
        <view
          class="ag-retry-btn"
          @tap="loadData"
        >
          <text class="ag-retry-txt">
            重试
          </text>
        </view>
      </view>
      <view v-else>
        <!-- 重要提示 -->
        <view class="ag-tip">
          <text class="ag-tip-title">
            重要提示
          </text>
          <text class="ag-tip-text">
            {{ tip }}
          </text>
        </view>

        <!-- 协议内容 -->
        <view class="ag-list">
          <view
            v-for="(s, i) in sections"
            :key="i"
            class="ag-card"
          >
            <text class="ag-card-title">
              {{ s.title }}
            </text>
            <text class="ag-card-content">
              {{ s.content }}
            </text>
          </view>
        </view>

        <!-- 更新时间 -->
        <view class="ag-footer">
          <text class="ag-footer-text">
            最后更新时间：2024年1月1日
          </text>
          <text class="ag-footer-text">
            版本号：v1.0
          </text>
        </view>
      </view>
      <view class="ag-bottom-pad" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { operatorApi } from '@/lib/operator-data'
import type { AgreementSection } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')

const sections = ref<AgreementSection[]>([])
const tip = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await operatorApi.stationAgreement()
    sections.value = res.sections
    tip.value = res.tip
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.ag-page { display: flex; flex-direction: column; height: 100vh; background: #f5f2ec; }
.ag-scroll { flex: 1; }
.ag-tip { margin: 32rpx; padding: 32rpx; background: #eff6ff; border: 1rpx solid #bfdbfe; border-radius: 16rpx; }
.ag-tip-title { display: block; font-size: 28rpx; font-weight: 600; color: #1e3a8a; margin-bottom: 16rpx; }
.ag-tip-text { font-size: 26rpx; color: #1e40af; line-height: 1.5; }
.ag-list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.ag-card { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.ag-card-title { display: block; font-size: 28rpx; font-weight: 600; color: #2a2a2a; margin-bottom: 16rpx; }
.ag-card-content { font-size: 26rpx; color: #8a8178; line-height: 1.6; }
.ag-footer { margin: 48rpx 32rpx 0; padding: 32rpx; background: rgba(138,129,120,0.1); border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.ag-footer-text { font-size: 22rpx; color: #8a8178; }
.ag-bottom-pad { height: 48rpx; }

.ag-loading, .ag-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80rpx 32rpx; }
.ag-loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #EDE7DC; border-top-color: #16a34a; border-radius: 50%; animation: ag-spin 0.8s linear infinite; }
@keyframes ag-spin { to { transform: rotate(360deg); } }
.ag-loading-text { font-size: 26rpx; color: #8a8178; margin-top: 24rpx; }
.ag-error-text { font-size: 26rpx; color: #ef4444; margin-bottom: 24rpx; }
.ag-retry-btn { padding: 16rpx 48rpx; background: #16a34a; border-radius: 16rpx; }
.ag-retry-txt { font-size: 26rpx; color: #fff; }
</style>
