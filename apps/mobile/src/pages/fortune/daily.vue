<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="header-title">
          每日运势
        </text>
        <view style="width:60rpx" />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <!-- 运势卡片 -->
      <view class="fortune-card">
        <view class="fc-date-row">
          <text class="fc-date">
            {{ today }}
          </text>
          <text class="fc-lunar">
            {{ lunarDate }}
          </text>
        </view>
        <view class="fc-divider" />
        <view class="fc-level-row">
          <text class="fc-level-icon">
            {{ levelIcon }}
          </text>
          <text
            class="fc-level-text"
            :class="levelKey"
          >
            {{ levelText }}
          </text>
        </view>
        <text class="fc-score">
          {{ score }}分
        </text>
        <text class="fc-stars">
          {{ stars }}
        </text>
      </view>

      <!-- 各项运势 -->
      <view class="aspects-card">
        <view
          v-for="a in aspects"
          :key="a.key"
          class="aspect-row"
        >
          <text class="aspect-label">
            {{ a.label }}
          </text>
          <view class="aspect-bar-wrap">
            <view
              class="aspect-bar"
              :style="{ width: a.percent + '%', background: a.color }"
            />
          </view>
          <text
            class="aspect-value"
            :style="{ color: a.color }"
          >
            {{ a.value }}
          </text>
        </view>
      </view>

      <!-- 幸运信息 -->
      <view class="luck-card">
        <view class="luck-item">
          <text class="luck-label">
            幸运数字
          </text><text class="luck-value">
            {{ lucky.number }}
          </text>
        </view>
        <view class="luck-item">
          <text class="luck-label">
            幸运颜色
          </text><text class="luck-value">
            {{ lucky.color }}
          </text>
        </view>
        <view class="luck-item">
          <text class="luck-label">
            幸运方位
          </text><text class="luck-value">
            {{ lucky.direction }}
          </text>
        </view>
        <view class="luck-item">
          <text class="luck-label">
            开运物
          </text><text class="luck-value">
            {{ lucky.item }}
          </text>
        </view>
      </view>

      <!-- 今日建议 -->
      <view class="advice-card">
        <view class="advice-header">
          <text class="advice-icon">
            📜
          </text>
          <text class="advice-title">
            今日建议
          </text>
        </view>
        <text class="advice-text">
          {{ advice }}
        </text>
      </view>

      <!-- 宜忌 -->
      <view class="yiji-card">
        <view class="yi-section">
          <text class="yi-label yi">
            宜
          </text>
          <view class="yi-tags">
            <text
              v-for="item in yi"
              :key="item"
              class="yi-tag yi"
            >
              {{ item }}
            </text>
          </view>
        </view>
        <view class="yi-divider" />
        <view class="yi-section">
          <text class="yi-label ji">
            忌
          </text>
          <view class="yi-tags">
            <text
              v-for="item in ji"
              :key="item"
              class="yi-tag ji"
            >
              {{ item }}
            </text>
          </view>
        </view>
      </view>

      <!-- 十二时辰 -->
      <view class="shichen-card">
        <text class="sc-title">
          十二时辰吉凶
        </text>
        <view
          v-for="s in shichen"
          :key="s.name"
          class="sc-row"
        >
          <text class="sc-name">
            {{ s.name }}
          </text>
          <text class="sc-time">
            {{ s.time }}
          </text>
          <text class="sc-desc">
            {{ s.desc }}
          </text>
          <text
            class="sc-luck"
            :class="s.luck === '吉' ? 'good' : s.luck === '凶' ? 'bad' : 'mid'"
          >
            {{ s.luck }}
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const today = ref(new Date().toISOString().slice(0, 10))
const lunarDate = ref('农历四月廿八')
const levelKey = ref('good'); const levelText = ref('大吉'); const levelIcon = ref('🌟')
const score = ref(92); const stars = ref('★★★★★')

const aspects = ref([
  { key: 'love', label: '爱情运势', value: '渐入佳境', percent: 85, color: '#e91e63' },
  { key: 'career', label: '事业运势', value: '顺利', percent: 90, color: '#C41E3A' },
  { key: 'wealth', label: '财运运势', value: '平稳', percent: 75, color: '#C9A96E' },
  { key: 'health', label: '健康运势', value: '良好', percent: 88, color: '#4CAF50' },
])

const lucky = { number: '6, 8', color: '红色、金色', direction: '东南', item: '玉佩' }
const advice = '今日运势总体向好，适合开展新的计划和项目。工作中可能会有贵人相助，把握机会。财运平稳，不宜冲动消费。感情方面有望收获惊喜，多与伴侣沟通交流。健康方面注意饮食规律。'
const yi = ['嫁娶', '开市', '出行', '签约', '祈福']
const ji = ['破土', '安葬', '诉讼', '求医']

const shichen = ref([
  { name: '子时', time: '23:00-01:00', desc: '运势平稳，宜静不宜动', luck: '吉' },
  { name: '丑时', time: '01:00-03:00', desc: '财运上升，利于思考', luck: '吉' },
  { name: '寅时', time: '03:00-05:00', desc: '注意口舌是非', luck: '凶' },
  { name: '卯时', time: '05:00-07:00', desc: '贵人相助，事务顺利', luck: '大吉' },
  { name: '辰时', time: '07:00-09:00', desc: '利于社交和洽谈', luck: '吉' },
  { name: '巳时', time: '09:00-11:00', desc: '小有波折，注意细节', luck: '平' },
  { name: '午时', time: '11:00-13:00', desc: '事业运旺盛', luck: '大吉' },
  { name: '未时', time: '13:00-15:00', desc: '注意休息', luck: '平' },
  { name: '申时', time: '15:00-17:00', desc: '工作效率高', luck: '吉' },
  { name: '酉时', time: '17:00-19:00', desc: '避免冲动决策', luck: '凶' },
  { name: '戌时', time: '19:00-21:00', desc: '适合学习思考', luck: '吉' },
  { name: '亥时', time: '21:00-23:00', desc: '放松身心', luck: '平' },
])

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 20rpx 24rpx 40rpx; }
.fortune-card { background: linear-gradient(135deg, #C41E3A, #9a1830, #C9A96E); border-radius: 20rpx; padding: 32rpx; text-align: center; color: #fff; margin-bottom: 16rpx; }
.fc-date-row { display: flex; justify-content: center; gap: 16rpx; }
.fc-date { font-size: 22rpx; opacity: 0.9; }
.fc-lunar { font-size: 22rpx; opacity: 0.7; }
.fc-divider { width: 60rpx; height: 2rpx; background: rgba(255,255,255,0.3); margin: 12rpx auto; }
.fc-level-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-bottom: 8rpx; }
.fc-level-icon { font-size: 48rpx; }
.fc-level-text { font-size: 48rpx; font-weight: bold; }
.fc-level-text.good { color: #ffeb3b; }
.fc-score { font-size: 72rpx; font-weight: bold; display: block; }
.fc-stars { font-size: 32rpx; display: block; margin-top: 8rpx; color: #ffeb3b; }
.aspects-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.aspect-row { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; }
.aspect-row:not(:last-child) { border-bottom: 1rpx solid #f5f5f5; }
.aspect-label { font-size: 24rpx; color: #666; width: 120rpx; }
.aspect-bar-wrap { flex: 1; height: 16rpx; background: #f0f0f0; border-radius: 8rpx; overflow: hidden; }
.aspect-bar { height: 100%; border-radius: 8rpx; transition: width 0.5s; }
.aspect-value { font-size: 24rpx; font-weight: 500; width: 100rpx; text-align: right; }
.luck-card { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.luck-item { text-align: center; padding: 12rpx; background: #faf8f5; border-radius: 12rpx; }
.luck-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.luck-value { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.advice-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.advice-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.advice-icon { font-size: 32rpx; }
.advice-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.advice-text { font-size: 26rpx; color: #666; line-height: 1.8; }
.yiji-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.yi-section { display: flex; align-items: flex-start; gap: 16rpx; padding: 12rpx 0; }
.yi-divider { height: 1rpx; background: #f5f5f5; }
.yi-label { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: bold; color: #fff; flex-shrink: 0; }
.yi-label.yi { background: #4CAF50; }
.yi-label.ji { background: #e53935; }
.yi-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.yi-tag { padding: 6rpx 16rpx; border-radius: 16rpx; font-size: 22rpx; }
.yi-tag.yi { background: #e8f5e9; color: #2e7d32; }
.yi-tag.ji { background: #fde8e8; color: #c62828; }
.shichen-card { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.sc-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.sc-row { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; font-size: 24rpx; }
.sc-row:last-child { border-bottom: none; }
.sc-name { width: 80rpx; font-weight: 500; color: #2C2C2C; }
.sc-time { width: 140rpx; color: #999; }
.sc-desc { flex: 1; color: #666; }
.sc-luck { width: 60rpx; text-align: center; padding: 2rpx 12rpx; border-radius: 8rpx; font-size: 22rpx; }
.sc-luck.good { background: #e8f5e9; color: #2e7d32; }
.sc-luck.bad { background: #fde8e8; color: #c62828; }
.sc-luck.mid { background: #f5f5f5; color: #999; }
</style>
