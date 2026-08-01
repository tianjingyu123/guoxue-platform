<script setup lang="ts">
/**
 * 通用空状态（全平台空态标准组件）。
 * 用法：<AppEmpty icon="inbox" title="这里还空着" desc="..." actionText="去逛逛" @action="..." />
 * 视觉签名批0：默认文案接 voice.ts；新增 seal 可选项——true 时上方以 96rpx 白文印章替代默认图标。
 * （注：本文件原默认文案在磁盘上为乱码字节，本次重写为干净 UTF-8。）
 */
import AppIcon from '@/components/common/app-icon.vue'
import BrandSeal from '@/components/common/brand-seal.vue'
import { VOICE } from '@/lib/voice'

withDefaults(defineProps<{
  icon?: string
  title?: string
  desc?: string
  actionText?: string
  /** true 时用 96rpx 白文印章替代默认图标 */
  seal?: boolean
  /** 印章文字（配合 seal 使用） */
  sealChars?: string
}>(), {
  icon: 'inbox',
  title: VOICE.EMPTY_DEFAULT,
  desc: '',
  actionText: '',
  seal: false,
  sealChars: '空',
})

const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <view class="app-empty content-fade-in">
    <view v-if="seal" class="app-empty__seal">
      <BrandSeal :chars="sealChars" :size="96" variant="bai" />
    </view>
    <view v-else class="app-empty__icon">
      <AppIcon :name="icon" :size="56" color="#C9C2B6" />
    </view>
    <text class="app-empty__title">{{ title }}</text>
    <text v-if="desc" class="app-empty__desc">{{ desc }}</text>
    <view v-if="actionText" class="app-empty__action btn-press" @tap="emit('action')">
      <text class="app-empty__action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}
.app-empty__seal {
  margin-bottom: $space-lg;
  opacity: 0.85;
}
.app-empty__icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: var(--surface-sunken);
  @include flex-center;
  margin-bottom: $space-lg;
}
.app-empty__title {
  font-size: 30rpx;
  color: var(--text-strong);
  font-weight: 600;
  margin-bottom: 12rpx;
}
.app-empty__desc {
  font-size: $font-md;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.5;
}
.app-empty__action {
  margin-top: $space-xl;
  padding: 0 56rpx;
  height: 80rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, var(--brand), var(--gugong-red-soft, #d94452));
  @include flex-center;
}
.app-empty__action-text {
  font-size: $font-md;
  color: #fff;
  font-weight: 600;
}
</style>
