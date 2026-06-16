<!--
  知识库设置（从原型 app/circles/[id]/settings/knowledge/page.tsx 高保真迁移）
  统计三卡 + 知识项列表(类型图标/启用切换/删除) + 空态
-->
<template>
  <view class="page">
    <view class="hdr" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="hdr-bar">
        <view class="hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="36" color="#2C2C2C" /></view>
        <text class="hdr-title">知识库</text>
        <view class="add-btn" @tap="toastComingSoon"><app-icon name="plus" :size="26" color="#ffffff" /><text class="add-btn-t">添加</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view class="body">
        <!-- 骨架屏 -->
        <view v-if="loading" class="knw-skeleton">
          <view v-for="i in 3" :key="i" class="knw-sk-card sk-anim" />
        </view>
        <error-state v-else-if="error" :message="error" @retry="loadData" />
        <template v-else>
          <!-- 统计 -->
          <view class="stats">
          <view v-for="s in stats" :key="s.label" class="stat">
            <text class="stat-num">{{ s.count }}</text>
            <text class="stat-label">{{ s.label }}</text>
          </view>
        </view>

        <view class="list">
          <view v-for="item in items" :key="item.id" class="item" :class="{ off: !item.enabled }">
            <view class="item-icon" :style="{ background: cfg(item.type).bg }"><app-icon :name="cfg(item.type).icon" :size="26" :color="cfg(item.type).text" /></view>
            <view class="item-info">
              <text class="item-title">{{ item.title }}</text>
              <text class="item-desc">{{ item.desc }}</text>
              <text class="item-time">更新于 {{ item.updatedAt }}</text>
            </view>
            <view class="item-ops">
              <view class="op" @tap="toggle(item.id)"><app-icon :name="item.enabled ? 'toggle-right' : 'toggle-left'" :size="36" :color="item.enabled ? '#C41E3A' : '#999999'" /></view>
              <view class="op" @tap="remove(item.id)"><app-icon name="trash-2" :size="28" color="#999999" /></view>
              <app-icon name="chevron-right" :size="28" color="#cccccc" />
            </view>
          </view>
        </view>

        <view v-if="items.length === 0" class="empty">
          <app-icon name="file-text" :size="60" color="#D9D4C8" />
          <text class="empty-t">暂无知识库内容</text>
          <text class="empty-sub">添加文档、链接或问答，让 AI 助手更了解您的圈子</text>
        </view>
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 知识库设置页（启用切换/删除为本地状态，1:1 还原无持久化）
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack, toastComingSoon } from '@/utils/router'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

interface KItem { id: string; type: 'doc' | 'link' | 'qa'; title: string; desc: string; enabled: boolean; updatedAt: string }

const MOCK_ITEMS: KItem[] = [
  { id: '1', type: 'doc', title: '圈子规则手册', desc: '圈子基本规则与行为准则', enabled: true, updatedAt: '2024-01-15' },
  { id: '2', type: 'qa', title: '命理常见问题解答', desc: '28条常见命理问题标准回答', enabled: true, updatedAt: '2024-01-18' },
  { id: '3', type: 'link', title: '易经基础资料', desc: 'https://example.com/yijing', enabled: true, updatedAt: '2024-01-10' },
  { id: '4', type: 'doc', title: '专家介绍合集', desc: '圈内专家背景与专长介绍', enabled: false, updatedAt: '2024-01-05' },
  { id: '5', type: 'qa', title: '报名流程说明', desc: '活动报名常见疑问及解答', enabled: true, updatedAt: '2024-01-20' },
]

const loading = ref(true)
const error = ref('')
const items = ref<KItem[]>([])

onMounted(() => { loadData() })

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 500))
    items.value = MOCK_ITEMS
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const TYPE_CFG: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  doc: { label: '文档', icon: 'file-text', bg: '#EFF6FF', text: '#2563EB' },
  link: { label: '链接', icon: 'link-2', bg: '#F0FDF4', text: '#16A34A' },
  qa: { label: '问答', icon: 'file-text', bg: '#FFF7ED', text: '#EA580C' },
}
function cfg(type: string) { return TYPE_CFG[type] }

const stats = computed(() => [
  { label: '文档', count: items.value.filter(i => i.type === 'doc').length },
  { label: '链接', count: items.value.filter(i => i.type === 'link').length },
  { label: '问答', count: items.value.filter(i => i.type === 'qa').length },
])

function toggle(id: string) { const i = items.value.find(x => x.id === id); if (i) i.enabled = !i.enabled }
function remove(id: string) { items.value = items.value.filter(x => x.id !== id) }
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F7F4EE; }
.hdr { background: #F7F4EE; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #ECE7DD; }
.hdr-bar { display: flex; align-items: center; gap: 18rpx; height: 96rpx; padding: 0 24rpx; }
.hdr-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.add-btn { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 24rpx; background: #C41E3A; border-radius: 14rpx; }
.add-btn-t { font-size: 24rpx; color: #ffffff; }
.scroll { height: calc(100vh - 96rpx); }
.body { padding: 32rpx; }

.stats { display: flex; gap: 20rpx; margin-bottom: 36rpx; }
.stat { flex: 1; text-align: center; padding: 24rpx 0; background: rgba(0,0,0,0.03); border-radius: 20rpx; }
.stat-num { display: block; font-size: 40rpx; font-weight: 700; color: #2C2C2C; }
.stat-label { font-size: 22rpx; color: #999999; }

.list { display: flex; flex-direction: column; gap: 14rpx; }
.item { display: flex; align-items: center; gap: 18rpx; padding: 24rpx; background: #ffffff; border: 1rpx solid #ECE7DD; border-radius: 20rpx; }
.item.off { opacity: 0.6; }
.item-icon { width: 60rpx; height: 60rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-desc { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-time { display: block; font-size: 18rpx; color: #BBBBBB; margin-top: 4rpx; }
.item-ops { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.op { display: flex; align-items: center; justify-content: center; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-t { font-size: 26rpx; color: #999999; margin-top: 20rpx; }
.empty-sub { font-size: 22rpx; color: #BBBBBB; margin-top: 6rpx; text-align: center; }

/* 骨架屏 */
.knw-skeleton { display: flex; flex-direction: column; gap: 14rpx; }
.knw-sk-card { height: 120rpx; background: #fff; border-radius: 20rpx; border: 1rpx solid #ECE7DD; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
