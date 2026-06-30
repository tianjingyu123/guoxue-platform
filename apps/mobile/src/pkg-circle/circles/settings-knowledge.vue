<!--
  知识库管理（视觉层沿用原型 settings/knowledge；逻辑层重写为真连后端）
  统计三卡(真实来源统计) + 知识条目列表(摘要/来源/删除) + 添加(手动录入) + 三态。
  与 knowledge 页分工：本页偏「管理(增删全部条目)」，knowledge 页偏「浏览+候选审核」，同一后端知识库。
  注：原型的「启用开关 / 文档·链接·问答分类」后端无对应模型，已去除（不造假）。
-->
<template>
  <view class="page">
    <view class="hdr" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="hdr-bar">
        <view class="hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="36" color="#2C2C2C" /></view>
        <text class="hdr-title">知识库管理</text>
        <view class="add-btn" @tap="addKnowledge"><app-icon name="plus" :size="26" color="#ffffff" /><text class="add-btn-t">添加</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view class="body">
        <!-- 统计 -->
        <view class="stats">
          <view v-for="s in stats" :key="s.label" class="stat">
            <text class="stat-num">{{ s.count }}</text>
            <text class="stat-label">{{ s.label }}</text>
          </view>
        </view>

        <!-- 三态 -->
        <view v-if="loading" class="empty"><text class="empty-t">加载中…</text></view>
        <view v-else-if="error" class="empty">
          <text class="empty-t">{{ error }}</text>
          <view class="retry" @tap="load"><text class="retry-t">重试</text></view>
        </view>
        <view v-else-if="items.length === 0" class="empty">
          <app-icon name="file-text" :size="60" color="#D9D4C8" />
          <text class="empty-t">暂无知识库内容</text>
          <text class="empty-sub">点击右上角「添加」，让圈主助理更懂你的圈子</text>
        </view>

        <view v-else class="list">
          <view v-for="item in items" :key="item.id" class="item">
            <view class="item-icon"><app-icon name="file-text" :size="26" color="#C41E3A" /></view>
            <view class="item-info">
              <text class="item-title">{{ item.title }}</text>
              <text class="item-desc">{{ item.summary }}</text>
              <text class="item-time">来源：{{ item.sourceLabel }} · {{ fmtDate(item.createdAt) }}</text>
            </view>
            <view class="item-ops">
              <view class="op" @tap="remove(item.id)"><app-icon name="trash-2" :size="28" color="#999999" /></view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 知识库管理页：真连后端知识库 CRUD（list / add / remove）。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { knowledgeApi, type KnowledgeItem } from '@/lib/circle-knowledge-data'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

const circleId = ref('')
const items = ref<KnowledgeItem[]>([])
const loading = ref(true)
const error = ref('')
const acting = ref(false)

const stats = computed(() => {
  const total = items.value.length
  const manual = items.value.filter(i => i.sourceLabel === '手动添加').length
  return [
    { label: '知识条目', count: total },
    { label: '手动添加', count: manual },
    { label: '自动采集', count: total - manual },
  ]
})

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await knowledgeApi.list(circleId.value)
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function addKnowledge() {
  uni.showModal({
    title: '添加知识',
    editable: true,
    placeholderText: '输入要加入知识库的内容…',
    success: async (r) => {
      const content = (r.content || '').trim()
      if (!r.confirm || !content || acting.value) return
      acting.value = true
      try {
        await knowledgeApi.add(circleId.value, content)
        uni.showToast({ title: '已添加', icon: 'success' })
        await load()
      } catch {
        uni.showToast({ title: '添加失败', icon: 'none' })
      } finally {
        acting.value = false
      }
    },
  })
}

function remove(id: string) {
  uni.showModal({
    title: '删除知识',
    content: '确定删除这条知识吗？',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm || acting.value) return
      acting.value = true
      try {
        await knowledgeApi.remove(circleId.value, id)
        uni.showToast({ title: '已删除', icon: 'none' })
        await load()
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      } finally {
        acting.value = false
      }
    },
  })
}

onLoad((opt) => { circleId.value = (opt?.id || opt?.circleId || '') as string })
onMounted(load)
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F7F4EE; }
.hdr { background: #F7F4EE; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #ECE7DD; }
.hdr-bar { display: flex; align-items: center; gap: 18rpx; height: 96rpx; padding: 0 24rpx; }
.hdr-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.add-btn { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 24rpx; background: var(--brand); border-radius: 14rpx; }
.add-btn-t { font-size: 24rpx; color: #ffffff; }
.scroll { height: calc(100vh - 96rpx); }
.body { padding: 32rpx; }

.stats { display: flex; gap: 20rpx; margin-bottom: 36rpx; }
.stat { flex: 1; text-align: center; padding: 24rpx 0; background: rgba(0,0,0,0.03); border-radius: 20rpx; }
.stat-num { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.stat-label { font-size: 22rpx; color: #999999; }

.list { display: flex; flex-direction: column; gap: 14rpx; }
.item { display: flex; align-items: center; gap: 18rpx; padding: 24rpx; background: #ffffff; border: 1rpx solid #ECE7DD; border-radius: 20rpx; }
.item-icon { width: 60rpx; height: 60rpx; border-radius: 14rpx; background: #FBF1F2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-desc { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-time { display: block; font-size: 18rpx; color: #BBBBBB; margin-top: 4rpx; }
.item-ops { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.op { display: flex; align-items: center; justify-content: center; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; gap: 16rpx; }
.empty-t { font-size: 26rpx; color: #999999; }
.empty-sub { font-size: 22rpx; color: #BBBBBB; text-align: center; }
.retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.retry-t { font-size: 26rpx; color: #fff; }
</style>
