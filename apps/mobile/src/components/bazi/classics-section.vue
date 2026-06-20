<script setup lang="ts">
/** 古籍参考（书封网格 + 原文/译文/对照切换）——对应原型 ClassicsSection */
import { ref, onMounted } from 'vue'
import SectionTitle from './section-title.vue'
import { baziApi } from '@/lib/bazi-result-data'

const loading = ref(true)
const error = ref<string | null>(null)
const classicsList = ref<any[]>([])
const classicsContentMap = ref<Record<string, { title: string; original: string; translation: string }>>({})

const selected = ref<string | null>(null)
const mode = ref<'原文' | '译文' | '对照'>('原文')

function toggle(id: string) { selected.value = selected.value === id ? null : id }

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const res = await baziApi.getClassics('bazi')
    classicsList.value = res.list
    classicsContentMap.value = res.content
  } catch (e: any) {
    error.value = e.message || '加载古籍失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <view class="cs">
    <section-title title="古籍参考">
      <template #extra>
        <text class="cs-more">
          更多古籍
        </text>
      </template>
    </section-title>

    <!-- loading -->
    <view
      v-if="loading"
      class="state-wrap"
    >
      <view class="spinner" />
    </view>

    <!-- error -->
    <view
      v-else-if="error"
      class="state-wrap"
    >
      <text class="state-text">
        加载失败
      </text>
      <view
        class="retry-btn"
        @tap="loadData"
      >
        重试
      </view>
    </view>

    <!-- content -->
    <template v-else>
      <view class="cs-grid">
        <view
          v-for="b in classicsList"
          :key="b.id"
          class="cs-book"
          @tap="toggle(b.id)"
        >
          <view
            class="cs-cover"
            :class="{ 'cs-cover-on': selected === b.id }"
          >
            <view class="cs-cover-bg" />
            <view class="cs-spine" />
            <view class="cs-frame">
              <text class="cs-name-v">
                {{ b.name }}
              </text>
            </view>
          </view>
          <text
            class="cs-label"
            :class="{ 'cs-label-on': selected === b.id }"
          >
            {{ b.name }}
          </text>
        </view>
      </view>
      <view
        v-if="selected && classicsContentMap[selected]"
        class="cs-detail"
      >
        <view class="cs-modes">
          <view
            v-for="m in (['原文','译文','对照'] as const)"
            :key="m"
            class="cs-mode"
            :class="{ 'cs-mode-on': mode === m }"
            @tap="mode = m"
          >
            <text
              class="cs-mode-text"
              :class="{ 'cs-mode-text-on': mode === m }"
            >
              {{ m }}
            </text>
          </view>
        </view>
        <view class="cs-card">
          <text class="cs-title">
            {{ classicsContentMap[selected].title }}
          </text>
          <text
            v-if="mode === '原文'"
            class="cs-body"
          >
            {{ classicsContentMap[selected].original }}
          </text>
          <text
            v-else-if="mode === '译文'"
            class="cs-body"
          >
            {{ classicsContentMap[selected].translation }}
          </text>
          <text
            v-else
            class="cs-body"
          >
            <text class="cs-tag-ink">
              【原文】
            </text>{{ classicsContentMap[selected].original }}{{ '\n\n' }}<text class="cs-tag-brand">
              【译文】
            </text>{{ classicsContentMap[selected].translation }}
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.cs { background: var(--card); border-radius: 16rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); overflow: hidden; }
.cs-more { font-size: 22rpx; color: var(--brand); }
.cs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; padding: 0 24rpx 24rpx; }
.cs-book { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.cs-cover { position: relative; width: 136rpx; height: 184rpx; border-radius: 4rpx; overflow: hidden; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1); }
.cs-cover-on { box-shadow: 0 0 0 4rpx var(--brand), 0 4rpx 10rpx rgba(0,0,0,0.15); }
.cs-cover-bg { position: absolute; inset: 0; background: linear-gradient(to bottom, #fef3c7, #fffbeb, #fef3c7); }
.cs-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 12rpx; background: linear-gradient(to right, rgba(253,230,138,0.8), transparent); border-right: 2rpx solid rgba(252,211,77,0.4); }
.cs-frame { position: absolute; left: 28rpx; right: 12rpx; top: 20rpx; bottom: 20rpx; border: 2rpx solid rgba(251,191,36,0.4); border-radius: 2rpx; display: flex; align-items: center; justify-content: center; }
.cs-name-v { writing-mode: vertical-rl; font-size: 22rpx; font-weight: 700; color: var(--brand); letter-spacing: 2rpx; }
.cs-label { font-size: 22rpx; color: var(--text-soft); line-height: 1.2; }
.cs-label-on { color: var(--brand); font-weight: 600; }
.cs-detail { border-top: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding: 24rpx; background: rgba(0,0,0,0.02); }
.cs-modes { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.cs-mode { padding: 8rpx 24rpx; border-radius: 999rpx; background: var(--card); border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.cs-mode-on { background: var(--brand); border-color: var(--brand); }
.cs-mode-text { font-size: 22rpx; color: var(--text-soft); }
.cs-mode-text-on { color: #fff; }
.cs-card { background: var(--card); border-radius: 16rpx; padding: 24rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.08)); }
.cs-title { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-ink); margin-bottom: 12rpx; }
.cs-body { font-size: 28rpx; line-height: 1.7; color: var(--text-soft); white-space: pre-line; }
.cs-tag-ink { color: var(--text-ink); font-weight: 500; }
.cs-tag-brand { color: var(--brand); font-weight: 500; }

/* 加载/错误状态 */
.state-wrap {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48rpx 40rpx; gap: 16rpx;
}
.spinner {
  width: 48rpx; height: 48rpx; border: 4rpx solid var(--border, rgba(0,0,0,0.08));
  border-top-color: var(--brand); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.state-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn {
  padding: 12rpx 40rpx; background: var(--brand); border-radius: 999rpx;
  color: #fff; font-size: 26rpx;
}
</style>
