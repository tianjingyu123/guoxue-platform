<script setup lang="ts">
/** 语音+图片附件工具栏——对应原型 AttachmentBar(notes-panel 内部组件) */
import AppIcon from '@/components/common/app-icon.vue'
import type { useMediaNotes } from '@/composables/use-media-notes'

const props = defineProps<{
  noteKey: string
  media: ReturnType<typeof useMediaNotes>
}>()

function imgList() { return props.media.imageNotes[props.noteKey] || [] }
function voiceList() { return props.media.voiceNotes[props.noteKey] || [] }
</script>

<template>
  <view class="ab">
    <!-- 操作按钮 -->
    <view class="ab-actions">
      <view v-if="media.recordingKey.value === noteKey" class="btn rec" @tap="media.stopRecording()">
        <app-icon name="square" :size="22" color="#c41e3a" />
        <text class="rec-time">{{ media.formatSeconds(media.recordingTime.value) }}</text>
        <text class="rec-label">停止</text>
      </view>
      <view v-else class="btn ghost" @tap="media.startRecording(noteKey)">
        <app-icon name="mic" :size="24" color="#9ca3af" />
        <text class="ghost-text">语音</text>
      </view>
      <view class="btn ghost" @tap="media.chooseImage(noteKey)">
        <app-icon name="image" :size="24" color="#9ca3af" />
        <text class="ghost-text">图片</text>
      </view>
    </view>

    <!-- 语音列表 -->
    <view v-if="voiceList().length" class="voice-list">
      <view v-for="(v, i) in voiceList()" :key="i" class="voice-item">
        <view class="voice-play" @tap="media.playingId.value === noteKey + '-' + i ? media.stopVoice() : media.playVoice(v.url, noteKey + '-' + i)">
          <app-icon :name="media.playingId.value === noteKey + '-' + i ? 'pause' : 'play'" :size="22" color="#c41e3a" />
        </view>
        <view class="voice-bar"><view class="voice-bar-fill" :class="{ playing: media.playingId.value === noteKey + '-' + i }" /></view>
        <text class="voice-dur">{{ media.formatSeconds(v.duration) }}</text>
        <view class="voice-del" @tap="media.deleteVoice(noteKey, i)"><app-icon name="x" :size="22" color="#9ca3af" /></view>
      </view>
    </view>

    <!-- 图片网格 -->
    <view v-if="imgList().length" class="img-grid">
      <view v-for="(url, i) in imgList()" :key="i" class="img-cell">
        <image :src="url" class="img" mode="aspectFill" @tap="media.previewImage(imgList(), url)" />
        <view class="img-del" @tap.stop="media.deleteImage(noteKey, i)"><app-icon name="x" :size="18" color="#ffffff" /></view>
      </view>
    </view>
</template>

<style scoped lang="scss">
.ab { margin-top: 16rpx; }
.ab-actions { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.btn { display: flex; align-items: center; gap: 10rpx; padding: 10rpx 24rpx; border-radius: 999rpx; }
.btn.ghost { background: var(--bg-soft, rgba(0,0,0,0.04)); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.ghost-text { font-size: 22rpx; color: var(--text-soft); }
.btn.rec { background: rgba(196,30,58,0.1); }
.rec-time { font-size: 22rpx; color: var(--brand); font-variant-numeric: tabular-nums; }
.rec-label { font-size: 22rpx; color: var(--brand); font-weight: 500; }
.voice-list { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 16rpx; }
.voice-item { display: flex; align-items: center; gap: 16rpx; background: var(--bg-soft, rgba(0,0,0,0.03)); border-radius: 12rpx; padding: 12rpx 20rpx; }
.voice-play { width: 52rpx; height: 52rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.voice-bar { flex: 1; height: 8rpx; background: var(--border, rgba(0,0,0,0.1)); border-radius: 999rpx; overflow: hidden; }
.voice-bar-fill { height: 100%; background: var(--brand); border-radius: 999rpx; width: 0; transition: width 0.3s; }
.voice-bar-fill.playing { width: 100%; }
.voice-dur { font-size: 18rpx; color: var(--text-soft); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.voice-del { flex-shrink: 0; padding: 4rpx; }
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 16rpx; }
.img-cell { position: relative; width: 128rpx; height: 128rpx; border-radius: 12rpx; overflow: hidden; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.img { width: 100%; height: 100%; }
.img-del { position: absolute; top: 6rpx; right: 6rpx; width: 32rpx; height: 32rpx; border-radius: 999rpx; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
</style>
