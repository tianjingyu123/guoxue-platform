<script setup lang="ts">
/**
 * 智能体广场（入口：agent/history「探索智能体广场」）
 * 接真实 GET /bots 全局智能体列表(BotConfig)。原型臆想字段(评分/使用量/创建者/置顶)后端无→降级隐藏。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { botApi, botTypeLabel, type BotItem } from '@/lib/bot-data'

const inputVal = ref('')
const keyword = ref('')
const bots = ref<BotItem[]>([])
const loading = ref(true)
const error = ref('')

const filtered = computed(() => {
  const kw = keyword.value.toLowerCase().trim()
  if (!kw) return bots.value
  return bots.value.filter(
    (b) => b.name.toLowerCase().includes(kw) || b.intro.toLowerCase().includes(kw) || botTypeLabel(b.type).includes(kw),
  )
})

function isNew(createdAt: string): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return !Number.isNaN(t) && Date.now() - t < 7 * 24 * 3600 * 1000
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    bots.value = await botApi.list()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
    bots.value = []
  } finally {
    loading.value = false
  }
}

function doSearch() { keyword.value = inputVal.value }
function openBot(bot: BotItem) { navigateTo(`/pkg-agent/bots/chat?id=${bot.id}`) }

onMounted(load)
</script>

<template>
  <view class="cb">
    <!-- 红色渐变头 -->
    <view class="cb-top">
      <view class="cb-top-nav" :style="{ paddingTop: 'calc(24rpx + var(--status-bar-height, 0px))' }">
        <view class="cb-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#ffffff" /></view>
        <text class="cb-top-title">智能体广场</text>
        <view class="cb-nav-btn" />
      </view>
      <view class="cb-summary">
        <view class="cb-summary-icon"><app-icon name="sparkles" :size="40" color="#ffffff" /></view>
        <view class="cb-summary-main">
          <text class="cb-summary-name">国学智能体</text>
          <text class="cb-summary-desc">命理文化 · 国学 · 客服，AI 助你随时随地求解</text>
        </view>
        <view class="cb-summary-total">
          <text class="cb-summary-total-n">{{ bots.length }}</text>
          <text class="cb-summary-total-l">智能体</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cb-body">
      <!-- 搜索 -->
      <view class="cb-filter">
        <view class="cb-search-row">
          <view class="cb-search">
            <app-icon name="search" :size="30" color="#999999" />
            <input v-model="inputVal" class="cb-search-input" placeholder="搜索智能体" placeholder-class="cb-ph" confirm-type="search" @confirm="doSearch" />
          </view>
          <view class="cb-search-btn" @tap="doSearch"><text class="cb-search-btn-t">搜索</text></view>
        </view>
      </view>

      <!-- loading -->
      <view v-if="loading" class="cb-state">
        <app-icon name="loader-2" :size="40" color="#C41E3A" class="spin" />
        <text class="cb-state-t">加载中...</text>
      </view>
      <!-- error -->
      <view v-else-if="error" class="cb-state">
        <view class="cb-state-icon"><app-icon name="alert-circle" :size="48" color="#C41E3A" /></view>
        <text class="cb-state-t">{{ error }}</text>
        <view class="cb-retry" @tap="load"><text class="cb-retry-t">重试</text></view>
      </view>
      <!-- empty -->
      <view v-else-if="filtered.length === 0" class="cb-state">
        <view class="cb-state-icon"><app-icon name="bot" :size="48" color="#999999" /></view>
        <text class="cb-state-t">{{ keyword ? '未找到相关智能体' : '暂无智能体' }}</text>
      </view>

      <!-- Bot 网格 -->
      <view v-else class="cb-grid">
        <view v-for="bot in filtered" :key="bot.id" class="cb-card" @tap="openBot(bot)">
          <view class="cb-card-head">
            <view v-if="isNew(bot.createdAt)" class="cb-tag-badge green"><text class="cb-tag-badge-t">NEW</text></view>
            <!-- 智能体图标：有图显图，无图/坏图翻字母色块兜底（不再露米色空框） -->
            <smart-avatar class="cb-card-avatar" :src="bot.avatar" :name="bot.name" />
            <text class="cb-card-name">{{ bot.name }}</text>
          </view>
          <text class="cb-card-desc">{{ bot.intro || '暂无简介' }}</text>
          <view class="cb-card-taglist">
            <text class="cb-card-tag">{{ botTypeLabel(bot.type) }}</text>
          </view>
          <view class="cb-card-foot">
            <text v-if="bot.isFree" class="cb-card-free">免费</text>
            <text v-else class="cb-card-price">{{ bot.price }}币/次</text>
            <view class="cb-card-chat">对话</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.cb { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
/* 红色渐变头 */
.cb-top { background: linear-gradient(135deg, var(--brand), #8B0000); padding: 0 32rpx 32rpx; flex-shrink: 0; }
.cb-top-nav { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24rpx; }
.cb-nav-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; }
.cb-top-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.cb-summary { display: flex; align-items: center; gap: 20rpx; background: rgba(255,255,255,0.12); border-radius: 24rpx; padding: 24rpx; }
.cb-summary-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; flex-shrink: 0; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; }
.cb-summary-main { flex: 1; min-width: 0; }
.cb-summary-name { font-size: 30rpx; font-weight: 700; color: #fff; }
.cb-summary-desc { display: block; font-size: 24rpx; color: rgba(255,255,255,0.7); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-top: 6rpx; }
.cb-summary-total { text-align: center; flex-shrink: 0; }
.cb-summary-total-n { display: block; font-size: 36rpx; font-weight: 700; color: #fff; }
.cb-summary-total-l { display: block; font-size: 20rpx; color: rgba(255,255,255,0.7); }
/* body */
.cb-body { flex: 1; overflow: hidden; }
.cb-filter { background: #FAF8F5; border-bottom: 2rpx solid #E8E4DE; padding: 24rpx 32rpx; }
.cb-search-row { display: flex; gap: 16rpx; }
.cb-search { flex: 1; display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; height: 72rpx; background: #fff; border: 2rpx solid #E8E4DE; border-radius: 16rpx; }
.cb-search-input { flex: 1; font-size: 26rpx; color: #333; }
.cb-ph { color: #b5aea3; }
.cb-search-btn { padding: 0 36rpx; display: flex; align-items: center; background: var(--brand); border-radius: 16rpx; }
.cb-search-btn-t { font-size: 26rpx; color: #fff; font-weight: 500; }
/* 三态 */
.cb-state { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 140rpx 0; }
.cb-state-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: #E8E4DE; display: flex; align-items: center; justify-content: center; }
.cb-state-t { font-size: 26rpx; color: #999; }
.cb-retry { margin-top: 8rpx; padding: 16rpx 56rpx; background: var(--brand); border-radius: 999rpx; }
.cb-retry-t { font-size: 26rpx; color: #fff; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
/* 网格 */
.cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; padding: 24rpx 32rpx 48rpx; }
.cb-card { background: #fff; border-radius: 24rpx; border: 2rpx solid #E8E4DE; overflow: hidden; }
.cb-card-head { position: relative; padding: 28rpx 24rpx 12rpx; display: flex; flex-direction: column; align-items: center; }
.cb-tag-badge { position: absolute; top: 16rpx; right: 16rpx; display: flex; align-items: center; gap: 4rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.cb-tag-badge.green { background: #22c55e; }
.cb-tag-badge-t { font-size: 18rpx; color: #fff; }
.cb-card-avatar { width: 96rpx; height: 96rpx; border-radius: 20rpx; margin-bottom: 16rpx; background: #f0ebe3; border: 4rpx solid rgba(201,169,110,0.3); }
.cb-card-avatar-ph { display: flex; align-items: center; justify-content: center; }
.cb-card-avatar-t { font-size: 44rpx; font-weight: 700; color: #fff; }
.cb-card-name { font-size: 28rpx; font-weight: 700; color: #333; text-align: center; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cb-card-desc { display: block; padding: 0 24rpx; font-size: 22rpx; color: #999; line-height: 1.4; height: 62rpx; overflow: hidden; }
.cb-card-taglist { display: flex; flex-wrap: wrap; gap: 8rpx; padding: 12rpx 24rpx; }
.cb-card-tag { font-size: 20rpx; padding: 2rpx 12rpx; background: #FAF8F5; color: #666; border-radius: 8rpx; }
.cb-card-foot { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; border-top: 2rpx solid #F0EDE8; }
.cb-card-price { font-size: 20rpx; font-weight: 500; color: var(--brand); }
.cb-card-free { font-size: 20rpx; color: #16a34a; }
.cb-card-chat { padding: 8rpx 24rpx; background: var(--brand); color: #fff; font-size: 20rpx; border-radius: 999rpx; font-weight: 500; }
</style>
