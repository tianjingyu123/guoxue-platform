<template>
  <!-- 今日发什么（课-P1 获客环）：自包含拉取选题；点选题弹生成层（选类型→生成→结果+一键复制） -->
  <view class="mtc-card">
    <view class="mtc-head">
      <text class="mtc-title">今日发什么</text>
      <text v-if="date" class="mtc-date">{{ date }}</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="mtc-state"><text class="mtc-state-txt">选题加载中...</text></view>
    <view v-else-if="error" class="mtc-state">
      <text class="mtc-state-txt">{{ error }}</text>
      <view class="mtc-retry" @tap="loadTopics"><text class="mtc-retry-txt">重试</text></view>
    </view>
    <view v-else-if="topics.length === 0" class="mtc-state"><text class="mtc-state-txt">今日暂无选题</text></view>

    <!-- 选题列表 -->
    <template v-else>
      <view v-for="t in topics" :key="t.id" class="mtc-item" @tap="openGen(t)">
        <view class="mtc-item-main">
          <view class="mtc-item-top">
            <view class="mtc-tag" :class="t.source === 'JIEQI' ? 'jieqi' : 'tpl'">
              <text class="mtc-tag-txt">{{ t.source === 'JIEQI' ? '节气' : '选题' }}</text>
            </view>
            <text class="mtc-item-title">{{ t.title }}</text>
          </view>
          <text class="mtc-item-desc">{{ t.desc }}</text>
        </view>
        <text class="mtc-item-go">去生成</text>
      </view>
    </template>

    <!-- 生成弹层 -->
    <view v-if="showGen" class="mtc-mask" @tap.self="closeGen">
      <view class="mtc-sheet">
        <view class="mtc-sheet-head">
          <text class="mtc-sheet-title">AI 生成获客内容</text>
          <text class="mtc-sheet-close" @tap="closeGen">✕</text>
        </view>
        <text class="mtc-sheet-topic">{{ activeTopic?.title }}</text>

        <!-- 类型选择 -->
        <view class="mtc-kinds">
          <view
            v-for="k in kinds"
            :key="k"
            class="mtc-kind"
            :class="{ active: selectedKind === k }"
            @tap="selectedKind = k"
          >
            <text class="mtc-kind-txt" :class="{ active: selectedKind === k }">{{ kindLabel[k] }}</text>
          </view>
        </view>

        <!-- 生成中 / 生成失败 / 结果 -->
        <view v-if="genError" class="mtc-gen-error">
          <text class="mtc-gen-error-txt">{{ genError }}</text>
        </view>
        <scroll-view v-if="result" scroll-y class="mtc-result">
          <text class="mtc-result-txt">{{ result.content }}</text>
        </scroll-view>
        <text v-if="result" class="mtc-quota">本月已用 {{ result.monthlyUsed }}/{{ result.monthlyLimit }} 次 · 内容已过合规审核，尾部含你的专属推广链接</text>

        <!-- 操作区 -->
        <view class="mtc-actions">
          <view class="mtc-btn primary" :class="{ disabled: submitting }" @tap="onGenerate">
            <text class="mtc-btn-txt primary">{{ submitting ? '生成中...' : result ? '重新生成' : '开始生成' }}</text>
          </view>
          <view v-if="result" class="mtc-btn" :class="{ disabled: submitting }" @tap="onCopy">
            <text class="mtc-btn-txt">一键复制</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  marketingContentApi,
  MARKETING_KIND_LABEL,
  type MarketingKind,
  type MarketingTopic,
  type MarketingGenerated,
} from '@/lib/marketing-content-data'

const kinds: MarketingKind[] = ['SHORT_VIDEO', 'MOMENTS', 'XIAOHONGSHU']
const kindLabel = MARKETING_KIND_LABEL

// ── 选题列表三态 ──
const loading = ref(true)
const error = ref('')
const date = ref('')
const topics = ref<MarketingTopic[]>([])

async function loadTopics() {
  loading.value = true
  error.value = ''
  try {
    const res = await marketingContentApi.todayTopics()
    date.value = res.date
    topics.value = res.topics
  } catch (e) {
    error.value = (e as Error)?.message || '选题加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadTopics)

// ── 生成弹层 ──
const showGen = ref(false)
const activeTopic = ref<MarketingTopic | null>(null)
const selectedKind = ref<MarketingKind>('MOMENTS')
const submitting = ref(false)
const genError = ref('')
const result = ref<MarketingGenerated | null>(null)

function openGen(t: MarketingTopic) {
  activeTopic.value = t
  selectedKind.value = 'MOMENTS'
  genError.value = ''
  result.value = null
  showGen.value = true
}

function closeGen() {
  if (submitting.value) return
  showGen.value = false
}

async function onGenerate() {
  if (submitting.value || !activeTopic.value) return
  submitting.value = true
  genError.value = ''
  try {
    result.value = await marketingContentApi.generate(selectedKind.value, activeTopic.value.title)
  } catch (e) {
    result.value = null
    genError.value = (e as Error)?.message || '生成失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

function onCopy() {
  if (!result.value) return
  uni.setClipboardData({
    data: result.value.content,
    success: () => uni.showToast({ title: '已复制，去发布吧', icon: 'none' }),
  })
}
</script>

<style scoped lang="scss">
.mtc-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.mtc-head {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.mtc-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.mtc-date {
  font-size: 22rpx;
  color: #999999;
}

/* 三态 */
.mtc-state {
  padding: 32rpx 0 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.mtc-state-txt {
  font-size: 24rpx;
  color: #999999;
}
.mtc-retry {
  padding: 8rpx 36rpx;
  border-radius: 999rpx;
  border: 1rpx solid #c41e3a;
}
.mtc-retry-txt {
  font-size: 24rpx;
  color: #c41e3a;
}

/* 选题条目 */
.mtc-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #fafafa;
}
.mtc-item-main {
  flex: 1;
  min-width: 0;
}
.mtc-item-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.mtc-tag {
  flex-shrink: 0;
  padding: 2rpx 14rpx;
  border-radius: 8rpx;

  &.jieqi { background: #dcfce7; }
  &.tpl { background: #fee2e2; }
}
.mtc-tag-txt {
  font-size: 20rpx;
  font-weight: 600;

  .mtc-tag.jieqi & { color: #16a34a; }
  .mtc-tag.tpl & { color: #c41e3a; }
}
.mtc-item-title {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mtc-item-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #888888;
}
.mtc-item-go {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 600;
  color: #c41e3a;
}

/* 生成弹层 */
.mtc-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.mtc-sheet {
  width: 100%;
  max-height: 80vh;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: #ffffff;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.mtc-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mtc-sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.mtc-sheet-close {
  padding: 8rpx 16rpx;
  font-size: 32rpx;
  color: #999999;
}
.mtc-sheet-topic {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #666666;
}

.mtc-kinds {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.mtc-kind {
  flex: 1;
  padding: 14rpx 0;
  border-radius: 12rpx;
  border: 1rpx solid #e5e5e5;
  background: #ffffff;
  display: flex;
  justify-content: center;

  &.active {
    border-color: #c41e3a;
    background: #fdf2f4;
  }
}
.mtc-kind-txt {
  font-size: 24rpx;
  color: #666666;

  &.active {
    font-weight: 600;
    color: #c41e3a;
  }
}

.mtc-gen-error {
  margin-top: 24rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: #fee2e2;
}
.mtc-gen-error-txt {
  font-size: 24rpx;
  color: #dc2626;
}

.mtc-result {
  margin-top: 24rpx;
  max-height: 480rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: #fafafa;
  box-sizing: border-box;
}
.mtc-result-txt {
  font-size: 26rpx;
  line-height: 1.7;
  color: #333333;
  white-space: pre-wrap;
  word-break: break-all;
}
.mtc-quota {
  display: block;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #999999;
}

.mtc-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}
.mtc-btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 999rpx;
  border: 1rpx solid #e5e5e5;
  background: #ffffff;
  display: flex;
  justify-content: center;

  &.primary {
    border-color: #c41e3a;
    background: #c41e3a;
  }
  &.disabled { opacity: 0.5; }
}
.mtc-btn-txt {
  font-size: 28rpx;
  color: #666666;

  &.primary {
    font-weight: 600;
    color: #ffffff;
  }
}
</style>
