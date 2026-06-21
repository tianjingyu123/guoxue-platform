<script setup lang="ts">
import { computed } from 'vue'
import { navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

const props = defineProps<{
  icon: string
  title: string
  subtitle?: string
  moreLink?: string
  iconColor?: string
}>()

const iconBg = computed(() => (props.iconColor ? props.iconColor + '1a' : 'var(--surface-sunken)'))
function openMore() { if (props.moreLink) navigateTo(props.moreLink) }
</script>

<template>
  <view class="sh">
    <view
      class="sh-ico"
      :style="{ background: iconBg }"
    >
      <app-icon
        :name="icon"
        :size="28"
        :color="iconColor || 'var(--brand)'"
      />
    </view>
    <view class="sh-text">
      <text class="sh-title">
        {{ title }}
      </text>
      <text
        v-if="subtitle"
        class="sh-sub"
      >
        {{ subtitle }}
      </text>
    </view>
    <view
      v-if="moreLink"
      class="sh-more"
      @tap="openMore"
    >
      <text class="sh-more-txt">
        全部
      </text>
      <app-icon
        name="chevron-right"
        :size="28"
        color="var(--text-soft)"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
.sh { display: flex; align-items: center; gap: 16rpx; padding: 0 32rpx; margin-bottom: 24rpx; }
.sh-ico { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 16rpx; }
.sh-text { display: flex; align-items: baseline; gap: 16rpx; min-width: 0; }
.sh-title { font-size: 34rpx; font-weight: 700; letter-spacing: -0.5rpx; color: var(--text-strong); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.sh-sub { font-size: 24rpx; color: var(--text-soft); flex-shrink: 0; }
.sh-more { margin-left: auto; display: flex; align-items: center; gap: 2rpx; flex-shrink: 0; }
.sh-more-txt { font-size: 26rpx; color: var(--text-soft); }
</style>
