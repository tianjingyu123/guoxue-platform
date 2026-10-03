<script setup lang="ts">
/** 多图列表上传组件：批量选图 → 传 COS → 缩略图网格 → HTML5 拖拽排序 → v-model 回填 URL 数组。
 *  用途：商品轮播图/详情图等"多张、有顺序"的图片场景（PC 端·原生 dragstart/dragover/drop 实现排序，无第三方依赖）。
 *  用法：<ImageListUpload v-model="form.carousel" :max="9" tip="展示在商品页顶部轮播" />
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Close, Rank } from '@element-plus/icons-vue'
import { uploadApi } from '@/api'

const props = withDefaults(
  defineProps<{
    modelValue?: string[]
    /** 最多张数（0=不限） */
    max?: number
    /** 用途说明（展示在网格下方） */
    tip?: string
    /** 缩略图尺寸 px */
    size?: number
  }>(),
  { modelValue: () => [], max: 0, tip: '', size: 96 },
)
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const uploading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const dragIndex = ref(-1)
const overIndex = ref(-1)

const list = computed(() => props.modelValue || [])
const canAdd = computed(() => !props.max || list.value.length < props.max)

function pick() {
  if (uploading.value || !canAdd.value) return
  inputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  // 超出上限的截断并提示
  let picked = files
  if (props.max) {
    const room = props.max - list.value.length
    if (room <= 0) return
    if (files.length > room) {
      picked = files.slice(0, room)
      ElMessage.warning(`最多 ${props.max} 张，已截取前 ${room} 张`)
    }
  }
  uploading.value = true
  const next = [...list.value]
  let failed = 0
  try {
    for (const file of picked) {
      try {
        const { data } = await uploadApi.image(file)
        const url = (data as { url?: string }).url
        if (url) next.push(url)
        else failed++
      } catch {
        failed++
      }
    }
    emit('update:modelValue', next)
    if (failed) ElMessage.error(`${failed} 张上传失败，请重试`)
  } finally {
    uploading.value = false
  }
}

function remove(idx: number) {
  const next = [...list.value]
  next.splice(idx, 1)
  emit('update:modelValue', next)
}

/* ── HTML5 拖拽排序 ── */
function onDragStart(idx: number, e: DragEvent) {
  dragIndex.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // Firefox 需要 setData 才启动拖拽
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

function onDragOver(idx: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  overIndex.value = idx
}

function onDrop(idx: number, e: DragEvent) {
  e.preventDefault()
  const from = dragIndex.value
  if (from < 0 || from === idx) {
    resetDrag()
    return
  }
  const next = [...list.value]
  const [moved] = next.splice(from, 1)
  next.splice(idx, 0, moved)
  emit('update:modelValue', next)
  resetDrag()
}

function resetDrag() {
  dragIndex.value = -1
  overIndex.value = -1
}
</script>

<template>
  <div class="image-list-upload">
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden-input"
      @change="onFileChange"
    >
    <div class="grid">
      <div
        v-for="(url, idx) in list"
        :key="url + idx"
        class="item"
        :class="{ 'is-dragging': dragIndex === idx, 'is-over': overIndex === idx && dragIndex !== idx }"
        :style="{ width: size + 'px', height: size + 'px' }"
        draggable="true"
        @dragstart="onDragStart(idx, $event)"
        @dragover="onDragOver(idx, $event)"
        @drop="onDrop(idx, $event)"
        @dragend="resetDrag"
      >
        <img
          :src="url"
          draggable="false"
        >
        <span class="order-badge">{{ idx + 1 }}</span>
        <span
          class="remove-btn"
          title="删除"
          @click.stop="remove(idx)"
        ><el-icon><Close /></el-icon></span>
        <span class="drag-hint"><el-icon><Rank /></el-icon></span>
      </div>
      <div
        v-if="canAdd"
        class="add-box"
        :class="{ 'is-disabled': uploading }"
        :style="{ width: size + 'px', height: size + 'px' }"
        @click="pick"
      >
        <el-icon><Plus /></el-icon>
        <span class="add-text">{{ uploading ? '上传中...' : '添加图片' }}</span>
        <span
          v-if="max"
          class="add-count"
        >{{ list.length }}/{{ max }}</span>
      </div>
    </div>
    <div
      v-if="tip"
      class="tip"
    >
      {{ tip }}
    </div>
  </div>
</template>

<style scoped>
.hidden-input { display: none; }
.grid { display: flex; flex-wrap: wrap; gap: 10px; }
.item {
  position: relative; border-radius: 8px; overflow: hidden;
  border: 1px solid var(--el-border-color, #dcdfe6);
  cursor: grab; transition: box-shadow 0.15s, opacity 0.15s, border-color 0.15s;
}
.item:active { cursor: grabbing; }
.item img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.item.is-dragging { opacity: 0.4; }
.item.is-over { border-color: var(--el-color-primary, #409eff); box-shadow: 0 0 0 2px var(--el-color-primary-light-7, #c6e2ff); }
.order-badge {
  position: absolute; left: 0; top: 0; min-width: 20px; height: 20px;
  background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0 0 8px 0; padding: 0 4px;
}
.remove-btn {
  position: absolute; right: 0; top: 0; width: 20px; height: 20px;
  background: rgba(0, 0, 0, 0.55); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0 0 0 8px; font-size: 12px;
}
.remove-btn:hover { background: var(--el-color-danger, #f56c6c); }
.drag-hint {
  position: absolute; right: 2px; bottom: 2px; color: #fff; font-size: 12px;
  opacity: 0; transition: opacity 0.15s; text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}
.item:hover .drag-hint { opacity: 0.9; }
.add-box {
  border: 1px dashed var(--el-border-color, #dcdfe6); border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; cursor: pointer; color: #8c939d; font-size: 20px;
  transition: border-color 0.2s;
}
.add-box:hover { border-color: var(--el-color-primary, #409eff); }
.add-box.is-disabled { cursor: not-allowed; opacity: 0.6; }
.add-text { font-size: 12px; }
.add-count { font-size: 11px; color: var(--color-text-placeholder, #c0c4cc); }
.tip { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; line-height: 1.5; }
</style>
