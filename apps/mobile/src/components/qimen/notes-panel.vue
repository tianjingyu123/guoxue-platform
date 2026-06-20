<script setup lang="ts">
/**
 * 奇门笔记面板（从原型 components/paipan/qimen/notes-panel.tsx 1:1 迁移）
 * 全屏覆盖：顶栏 + 6个可展开笔记项(求测事项/用神/格局/断事/应期/反馈) + 添加项 + 管理设置弹窗
 * 录音/选图复用 use-media-notes composable + attachment-bar 组件。
 */
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AttachmentBar from '@/components/bazi/attachment-bar.vue'
import { useMediaNotes } from '@/composables/use-media-notes'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const media = useMediaNotes()

const NOTE_ITEMS = [
  { key: 'qiuce', label: '求测事项' },
  { key: 'yongshen', label: '用神分析' },
  { key: 'geju', label: '格局分析' },
  { key: 'duanshi', label: '断事结论' },
  { key: 'yingqi', label: '应期预测' },
  { key: 'fankui', label: '反馈验证' },
] as const

const showSettings = ref(false)
const expandedItem = ref<string | null>(null)
const notes = reactive<Record<string, string>>({})
const itemVisible = reactive<Record<string, boolean>>({
  qiuce: true, yongshen: true, geju: true, duanshi: true, yingqi: true, fankui: true,
})

const visibleItems = computed(() => NOTE_ITEMS.filter(i => itemVisible[i.key]))

function toggleVisibility(key: string) { itemVisible[key] = !itemVisible[key] }
function deleteNoteItem(key: string) {
  itemVisible[key] = false
  delete notes[key]
  if (expandedItem.value === key) expandedItem.value = null
}
</script>

<template>
  <view
    v-if="open"
    class="np"
  >
    <!-- 顶栏 -->
    <view class="np-hdr">
      <view
        class="np-icon"
        @tap="emit('close')"
      >
        <app-icon
          name="x"
          :size="34"
          color="#666666"
        />
      </view>
      <text class="np-title">
        奇门笔记
      </text>
      <view
        class="np-icon"
        @tap="showSettings = true"
      >
        <app-icon
          name="settings"
          :size="34"
          color="#666666"
        />
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view
      scroll-y
      class="np-body"
    >
      <view
        v-for="item in visibleItems"
        :key="item.key"
        class="np-row"
      >
        <view
          class="np-row-head"
          @tap="expandedItem = expandedItem === item.key ? null : item.key"
        >
          <text class="np-row-label">
            {{ item.label }}
          </text>
          <view class="np-row-right">
            <view
              class="np-del"
              @tap.stop="deleteNoteItem(item.key)"
            >
              <app-icon
                name="trash-2"
                :size="28"
                color="#9ca3af"
              />
            </view>
            <view
              class="np-chev"
              :class="{ rot: expandedItem === item.key }"
            >
              <app-icon
                name="chevron-right"
                :size="28"
                color="#9ca3af"
              />
            </view>
          </view>
        </view>
        <view
          v-if="expandedItem === item.key"
          class="np-row-body"
        >
          <textarea
            v-model="notes[item.key]"
            class="np-textarea"
            placeholder="请输入"
            :auto-height="false"
          />
          <attachment-bar
            :note-key="item.key"
            :media="media"
          />
        </view>
      </view>

      <!-- 添加笔记项 -->
      <view
        class="np-add"
        @tap="showSettings = true"
      >
        <app-icon
          name="plus"
          :size="28"
          color="#c41e3a"
        />
        <text class="np-add-text">
          添加笔记项
        </text>
      </view>
    </scroll-view>

    <!-- 设置弹窗 -->
    <view
      v-if="showSettings"
      class="np-mask"
      @tap="showSettings = false"
    >
      <view
        class="np-sheet"
        @tap.stop
      >
        <view class="np-sheet-head">
          <text class="np-sheet-title">
            管理笔记项
          </text>
          <view
            class="np-icon"
            @tap="showSettings = false"
          >
            <app-icon
              name="x"
              :size="34"
              color="#666666"
            />
          </view>
        </view>
        <scroll-view
          scroll-y
          class="np-sheet-body"
        >
          <text class="np-sheet-tip">
            选择要显示的笔记项目：
          </text>
          <view
            v-for="item in NOTE_ITEMS"
            :key="item.key"
            class="np-set-row"
            @tap="toggleVisibility(item.key)"
          >
            <text class="np-set-label">
              {{ item.label }}
            </text>
            <view
              class="np-radio"
              :class="{ on: itemVisible[item.key] }"
            >
              <app-icon
                v-if="itemVisible[item.key]"
                name="check"
                :size="20"
                color="#ffffff"
              />
            </view>
          </view>
        </scroll-view>
        <view class="np-sheet-foot">
          <view
            class="np-done"
            @tap="showSettings = false"
          >
            <text class="np-done-text">
              完成
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.np { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; background: var(--bg-paper); padding-top: var(--status-bar-height, 0); }
.np-hdr { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 32rpx; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-icon { padding: 4rpx; }
.np-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink); }
.np-body { flex: 1; padding: 0 32rpx 180rpx; }
.np-row { border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-row-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; }
.np-row-label { font-size: 32rpx; font-weight: 500; color: var(--text-ink); }
.np-row-right { display: flex; align-items: center; gap: 16rpx; }
.np-del { padding: 4rpx; }
.np-chev { transition: transform 0.2s; }
.np-chev.rot { transform: rotate(90deg); }
.np-row-body { padding-bottom: 24rpx; }
.np-textarea { width: 100%; box-sizing: border-box; background: var(--bg-soft, rgba(0,0,0,0.03)); border-radius: 12rpx; padding: 24rpx; font-size: 28rpx; color: var(--text-ink); min-height: 160rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-add { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 32rpx 0; }
.np-add-text { font-size: 28rpx; font-weight: 500; color: var(--brand); }
/* 设置弹窗 */
.np-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.np-sheet { width: 100%; background: var(--card); border-radius: 32rpx 32rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; }
.np-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 40rpx; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-sheet-title { font-size: 34rpx; font-weight: 600; color: var(--text-ink); }
.np-sheet-body { flex: 1; padding: 32rpx 40rpx; }
.np-sheet-tip { display: block; font-size: 28rpx; color: var(--text-soft); margin-bottom: 24rpx; }
.np-set-row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 0; border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.06)); }
.np-set-label { font-size: 28rpx; color: var(--text-ink); }
.np-radio { width: 40rpx; height: 40rpx; border-radius: 999rpx; border: 4rpx solid var(--border, #d1d5db); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.np-radio.on { border-color: var(--brand); background: var(--brand); }
.np-sheet-foot { padding: 28rpx 40rpx calc(28rpx + env(safe-area-inset-bottom)); border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.np-done { padding: 24rpx 0; background: var(--brand); border-radius: 999rpx; text-align: center; }
.np-done-text { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
