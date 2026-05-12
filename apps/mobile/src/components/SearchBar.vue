<template>
  <view class="search-bar">
    <view class="search-input-wrapper">
      <text class="search-icon">🔍</text>
      <input
        v-model="keyword"
        :placeholder="placeholder"
        class="search-input"
        confirm-type="search"
        @confirm="onSearch"
        @input="onInput"
      />
      <text v-if="keyword" class="clear-btn" @click="clear">✕</text>
    </view>
    <text class="search-action" @click="onSearch">搜索</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  placeholder?: string
}>(), {
  placeholder: '搜索经典、诗词、课程...',
})

const emit = defineEmits<{
  search: [keyword: string]
  input: [keyword: string]
}>()

const keyword = ref('')

function onSearch() {
  const val = keyword.value.trim()
  if (!val) return
  emit('search', val)
}

function onInput(e: any) {
  keyword.value = e.detail.value
  emit('input', keyword.value)
}

function clear() {
  keyword.value = ''
}
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20px;
  padding: 0 14px;
  border: 1px solid #E8E0D5;
  height: 40px;
}

.search-icon {
  font-size: 16px;
  margin-right: 6px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #333;
  height: 100%;
}

.search-input::placeholder {
  color: #bbb;
}

.clear-btn {
  font-size: 14px;
  color: #bbb;
  padding: 4px;
  flex-shrink: 0;
}

.search-action {
  font-size: 14px;
  color: #8b4513;
  font-weight: 500;
  flex-shrink: 0;
  padding: 4px 0;
}
</style>
