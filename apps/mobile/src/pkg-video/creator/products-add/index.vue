<template>
  <view class="pa-page">
    <view class="pa-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pa-header-inner">
        <view class="pa-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="pa-title">添加带货商品</text>
      </view>
    </view>

    <scroll-view scroll-y class="pa-scroll" :style="{ paddingTop: statusBarHeight + 48 + 'px' }">
      <view class="pa-body">
        <!-- 说明：带货商品来自平台商品库 -->
        <view class="pa-intro">
          <view class="pa-intro-icon"><AppIcon name="shopping-bag" :size="28" color="#c41e3a" /></view>
          <text class="pa-intro-title">带货商品来自平台商品库</text>
          <text class="pa-intro-desc">平台商品由认证商家统一供货，创作者无需自行上传。你可以从商品库挑选商品，在发布视频时挂载带货，按佣金比例获得收益。</text>
        </view>

        <!-- 操作步骤 -->
        <view class="pa-steps">
          <view class="pa-step">
            <view class="pa-step-no">1</view>
            <view class="pa-step-info">
              <text class="pa-step-title">浏览可带货商品库</text>
              <text class="pa-step-desc">在创作者中心「商品管理」查看全部平台商品与佣金比例</text>
            </view>
          </view>
          <view class="pa-step">
            <view class="pa-step-no">2</view>
            <view class="pa-step-info">
              <text class="pa-step-title">发布视频时挂载商品</text>
              <text class="pa-step-desc">发布或编辑视频时选择商品，观众即可在视频中下单</text>
            </view>
          </view>
          <view class="pa-step">
            <view class="pa-step-no">3</view>
            <view class="pa-step-info">
              <text class="pa-step-title">成交后获得佣金</text>
              <text class="pa-step-desc">订单确认收货后按佣金比例自动结算到创作者收益</text>
            </view>
          </view>
        </view>
      </view>
      <view class="pa-pad" />
    </scroll-view>

    <view class="pa-footer">
      <view class="pa-btn pa-btn-ghost" @tap="goBack">查看商品库</view>
      <view class="pa-btn pa-btn-primary" @tap="go('/videos/publish')">去发布视频</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'

const statusBarHeight = ref(0)

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
})
</script>

<style scoped>
.pa-page { min-height: 100vh; background: #f5f5f5; }
.pa-header { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #ffffff; border-bottom: 1px solid #eee; }
.pa-header-inner { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; }
.pa-icon-btn { padding: 2px; }
.pa-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.pa-scroll { height: 100vh; box-sizing: border-box; }
.pa-body { padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }
/* 说明卡 */
.pa-intro { background: #ffffff; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid #f0f0f0; }
.pa-intro-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(196, 30, 58, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.pa-intro-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.pa-intro-desc { font-size: 13px; color: #666; line-height: 1.6; margin-top: 8px; }
/* 步骤 */
.pa-steps { display: flex; flex-direction: column; gap: 12px; }
.pa-step { display: flex; gap: 12px; background: #ffffff; border-radius: 12px; padding: 16px; border: 1px solid #f0f0f0; }
.pa-step-no { width: 24px; height: 24px; border-radius: 50%; background: var(--brand); color: #ffffff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pa-step-info { flex: 1; }
.pa-step-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; }
.pa-step-desc { display: block; font-size: 12px; color: #999; line-height: 1.5; margin-top: 4px; }
.pa-pad { height: 100px; }
.pa-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #ffffff; border-top: 1px solid #eee; padding: 16px; display: flex; gap: 12px; }
.pa-btn { flex: 1; height: 44px; line-height: 44px; text-align: center; border-radius: 8px; font-size: 14px; font-weight: 600; }
.pa-btn-ghost { background: #f0f0f0; color: #1a1a1a; }
.pa-btn-primary { background: var(--brand); color: #ffffff; }
</style>
