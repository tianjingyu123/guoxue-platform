<script setup lang="ts">
/**
 * 智能头像：有 src 则显示图；src 为空或加载失败(URL失效/404)则优雅兜底为
 * 「昵称首字 + 稳定色块」，无首字则默认用户图标。避免头像失效留空圈/破图。
 *
 * 用法：在消费方的圆形尺寸容器类上直接用本组件即可，组件内部绝对填充，
 * 不设自身宽高，故不会与消费方的 width/height/border-radius 冲突。
 *   <smart-avatar class="member-avatar" :src="m.avatar" :name="m.nickname" />
 *   .member-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; }
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface Props { src?: string | null; name?: string }
const props = withDefaults(defineProps<Props>(), { src: '', name: '' })

const imgError = ref(false)
watch(() => props.src, () => { imgError.value = false })
const hasImg = computed(() => typeof props.src === 'string' && props.src.trim() !== '' && !imgError.value)

// 昵称首字（中文/英文取第一个可见字符）
const initial = computed(() => (props.name || '').trim().slice(0, 1))

// 由昵称哈希出稳定的国学品牌渐变底（大平台默认头像质感：渐变 + 白色首字）
const bgColor = computed(() => {
  const palette = [
    'linear-gradient(135deg, #a06a45, #6b4023)',
    'linear-gradient(135deg, #4a76a8, #284a6d)',
    'linear-gradient(135deg, #6d8a4c, #3f5626)',
    'linear-gradient(135deg, #85628f, #4d3568)',
    'linear-gradient(135deg, #b25563, #6f2c38)',
    'linear-gradient(135deg, #4a8571, #235241)',
    'linear-gradient(135deg, #c07040, #834321)',
  ]
  const n = props.name || ''
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
})
</script>

<template>
  <view class="sa-root">
    <image v-if="hasImg" class="sa-fill" :src="src as string" mode="aspectFill" @error="imgError = true" />
    <view v-else class="sa-fill sa-fb" :style="{ background: bgColor }">
      <text v-if="initial" class="sa-init">{{ initial }}</text>
      <AppIcon v-else name="user" :size="18" color="rgba(255,255,255,0.92)" />
    </view>
  </view>
</template>

<style scoped>
/* 不设自身宽高：完全由消费方尺寸类控制，避免冲突。圆角由消费方设置 + overflow 裁切 */
.sa-root { position: relative; overflow: hidden; }
.sa-fill { position: absolute; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.sa-fb { }
.sa-init { color: #fff; font-weight: 600; font-size: 42rpx; line-height: 1; font-family: 'STKaiti', 'KaiTi', 'STSong', serif; text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.18); letter-spacing: 0; }
</style>
