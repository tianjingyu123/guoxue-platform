<template>
  <view class="page">
    <view class="header">
      <text class="title">
        每日运势
      </text>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        v-for="t in tabs"
        :key="t.value"
        :class="['tab-item', { active: activeTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <LoadingSkeleton
      v-if="loading"
      type="detail"
    />

    <template v-if="!loading && fortune">
      <!-- 运势总览卡片 -->
      <view class="fortune-card">
        <view class="score-circle">
          <text class="score-value">
            {{ fortune.overallScore }}
          </text>
          <text class="score-label">
            综合评分
          </text>
        </view>
        <view class="score-detail">
          <view class="score-item">
            <text class="si-label">
              事业
            </text>
            <view class="si-bar">
              <view
                class="si-fill"
                :style="{ width: fortune.careerScore + '%' }"
              />
            </view>
            <text class="si-value">
              {{ fortune.careerScore }}
            </text>
          </view>
          <view class="score-item">
            <text class="si-label">
              爱情
            </text>
            <view class="si-bar">
              <view
                class="si-fill love"
                :style="{ width: fortune.loveScore + '%' }"
              />
            </view>
            <text class="si-value">
              {{ fortune.loveScore }}
            </text>
          </view>
          <view class="score-item">
            <text class="si-label">
              财运
            </text>
            <view class="si-bar">
              <view
                class="si-fill wealth"
                :style="{ width: fortune.wealthScore + '%' }"
              />
            </view>
            <text class="si-value">
              {{ fortune.wealthScore }}
            </text>
          </view>
          <view class="score-item">
            <text class="si-label">
              健康
            </text>
            <view class="si-bar">
              <view
                class="si-fill health"
                :style="{ width: fortune.healthScore + '%' }"
              />
            </view>
            <text class="si-value">
              {{ fortune.healthScore }}
            </text>
          </view>
        </view>
      </view>

      <!-- 幸运信息 -->
      <view class="luck-card">
        <text class="section-title">
          今日幸运
        </text>
        <view class="luck-grid">
          <view class="luck-item">
            <text class="luck-icon">
              🧭
            </text>
            <text class="luck-label">
              幸运方向
            </text>
            <text class="luck-value">
              {{ fortune.luckyDirection || '--' }}
            </text>
          </view>
          <view class="luck-item">
            <text class="luck-icon">
              🎨
            </text>
            <text class="luck-label">
              幸运颜色
            </text>
            <text class="luck-value">
              {{ fortune.luckyColor || '--' }}
            </text>
          </view>
          <view class="luck-item">
            <text class="luck-icon">
              🔢
            </text>
            <text class="luck-label">
              幸运数字
            </text>
            <text class="luck-value">
              {{ fortune.luckyNumber || '--' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 运势解读 -->
      <view class="advice-card">
        <text class="section-title">
          运势解读
        </text>
        <text class="advice-text">
          {{ fortune.advice || '暂无解读' }}
        </text>
      </view>

      <!-- 订阅推送 -->
      <view class="subscribe-section">
        <button
          class="subscribe-btn"
          @click="goSubscribe"
        >
          <text class="sub-icon">
            🔔
          </text>
          <text class="sub-text">
            订阅运势推送
          </text>
        </button>
      </view>
    </template>

    <EmptyState
      v-else-if="!loading && !fortune"
      icon="⭐"
      text="暂无运势数据"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const tabs = [
  { label: '今日', value: 'DAILY' },
  { label: '本周', value: 'WEEKLY' },
  { label: '本月', value: 'MONTHLY' },
  { label: '年度', value: 'YEARLY' },
]

const activeTab = ref('DAILY')
const fortune = ref<any>(null)
const loading = ref(true)

onMounted(() => {
  fetchFortune()
})

async function fetchFortune() {
  loading.value = true
  try {
    fortune.value = await api.get(`/fortune/${activeTab.value.toLowerCase()}`)
  } catch { /* */ } finally {
    loading.value = false
  }
}

function switchTab(tab: string) {
  activeTab.value = tab
  fetchFortune()
}

function goSubscribe() {
  uni.navigateTo({ url: '/pages/fortune/subscribe' })
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; padding-bottom: 40px; }
.header { margin-bottom: 12px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }

.tab-bar { display: flex; background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.tab-item { flex: 1; text-align: center; padding: 12px 0; font-size: 14px; color: #666; transition: color 0.2s; }
.tab-item.active { color: #C41E3A; font-weight: 500; background: #fff; position: relative; }
.tab-item.active::after { content: ""; position: absolute; bottom: 0; left: 25%; right: 25%; height: 2px; background: #C41E3A; border-radius: 1px; }

.fortune-card { background: linear-gradient(135deg, #C41E3A, #8B0000); border-radius: 16px; padding: 20px; margin-bottom: 12px; display: flex; gap: 16px; }
.score-circle { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.4); flex-shrink: 0; }
.score-value { font-size: 28px; font-weight: bold; color: #fff; }
.score-label { font-size: 10px; color: rgba(255,255,255,0.7); }
.score-detail { flex: 1; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.score-item { display: flex; align-items: center; gap: 6px; }
.si-label { font-size: 12px; color: rgba(255,255,255,0.8); width: 32px; }
.si-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; }
.si-fill { height: 100%; background: #C9A96E; border-radius: 3px; }
.si-fill.love { background: #ff6b81; }
.si-fill.wealth { background: #ffd700; }
.si-fill.health { background: #2ed573; }
.si-value { font-size: 11px; color: rgba(255,255,255,0.7); width: 24px; text-align: right; }

.luck-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid #C41E3A; }
.luck-grid { display: flex; gap: 12px; }
.luck-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: #F5F0E8; border-radius: 10px; }
.luck-icon { font-size: 24px; margin-bottom: 6px; }
.luck-label { font-size: 11px; color: #999; margin-bottom: 4px; }
.luck-value { font-size: 15px; color: #C41E3A; font-weight: bold; }

.advice-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.advice-text { font-size: 14px; color: #555; line-height: 1.8; }

.subscribe-section { text-align: center; margin-top: 8px; }
.subscribe-btn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #C9A96E, #D4AF37); color: #fff; border: none; border-radius: 24px; padding: 12px 32px; font-size: 15px; }
.sub-icon { font-size: 16px; }
.sub-text { font-size: 15px; }
</style>
