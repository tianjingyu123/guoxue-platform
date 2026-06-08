<template>
  <view class="ziwei-card">
    <!-- 命主信息 -->
    <view class="owner-info" v-if="input">
      <text class="owner-name">{{ input.name || '命主' }}</text>
      <text class="owner-meta">{{ input.gender }} · {{ wuXingJu }}</text>
      <text class="owner-meta">命宫: {{ mingGongName }} | 身宫: {{ shenGongName }}</text>
    </view>

    <!-- 四化 -->
    <view class="sihua-bar" v-if="siHua">
      <view class="sihua-item lu"><text class="sihua-label">化禄</text><text class="sihua-star">{{ siHua.huaLu }}</text></view>
      <view class="sihua-item quan"><text class="sihua-label">化权</text><text class="sihua-star">{{ siHua.huaQuan }}</text></view>
      <view class="sihua-item ke"><text class="sihua-label">化科</text><text class="sihua-star">{{ siHua.huaKe }}</text></view>
      <view class="sihua-item ji"><text class="sihua-label">化忌</text><text class="sihua-star">{{ siHua.huaJi }}</text></view>
    </view>

    <!-- 十二宫格 -->
    <view class="gong-grid-section">
      <view class="section-title">十二宫</view>
      <view class="gong-grid">
        <view
          v-for="(gong, i) in gongLayout"
          :key="i"
          class="gong-cell"
          :class="{
            'is-ming': gong.name === mingGongName,
            'is-shen': gong.name === shenGongName,
          }"
          @click="activeGong = gong.name"
        >
          <text class="gong-name">{{ gong.name }}</text>
          <text class="gong-ganzhi">{{ gong.gan }}{{ gong.zhi }}</text>
          <view class="gong-stars">
            <text v-for="s in gong.stars?.slice(0, 4)" :key="s.name" class="gong-star" :class="'star-' + s.liangJi">{{ s.name }}</text>
          </view>
          <text class="gong-daxian">{{ gong.daXianStart }}-{{ gong.daXianEnd }}</text>
        </view>
      </view>
    </view>

    <!-- 选中宫位详情 -->
    <view class="gong-detail" v-if="activeGongData">
      <view class="section-title">{{ activeGong }} · {{ activeGongData.gan }}{{ activeGongData.zhi }}</view>
      <text class="gong-qi">宫气: {{ activeGongData.gongQi }}</text>
      <view class="gong-all-stars">
        <view v-for="s in activeGongData.stars" :key="s.name" class="star-detail" :class="'star-' + s.liangJi">
          <text class="star-name">{{ s.name }}</text>
          <text class="star-info">{{ s.type === 'main' ? '主星' : s.type === 'assist' ? '辅星' : '四煞' }} · {{ s.wuXing }}</text>
        </view>
      </view>
      <view class="gong-relations">
        <text>三方: {{ activeGongData.sanFang?.join('、') }}</text>
        <text>对宫: {{ activeGongData.duiGong }}</text>
      </view>
    </view>

    <!-- 格局 -->
    <view class="geshi-section" v-if="geShi?.length">
      <view class="section-title">格局</view>
      <view class="geshi-list">
        <text v-for="(g, i) in geShi" :key="i" class="geshi-item">{{ g }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  data: Record<string, any>
}

const props = defineProps<Props>()
const activeGong = ref('')

const input = computed(() => props.data?.input)
const wuXingJu = computed(() => props.data?.wuXingJu || '')
const gongWei = computed(() => props.data?.gongWei || [])
const siHua = computed(() => props.data?.siHua)
const geShi = computed(() => props.data?.geShi || [])
const shenGongName = computed(() => props.data?.shenGong || '')
const mingGongName = computed(() => {
  const mg = props.data?.mingGong
  return mg?.name || (gongWei.value[0]?.name || '命宫')
})

const gongLayout = computed(() => {
  // 紫微十二宫标准布局: 命宫→兄弟→夫妻→子女→财帛→疾厄→迁移→交友→官禄→田宅→福德→父母
  // 按逆行排列（命宫在寅位的简化处理：按标准顺序展示）
  const order = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母']
  return order.map(name => {
    const found = gongWei.value.find((g: any) => g.name === name)
    return found || { name, gan: '-', zhi: '-', stars: [], daXianStart: 0, daXianEnd: 0 }
  })
})

const activeGongData = computed(() => {
  if (!activeGong.value) {
    // 默认显示命宫
    const mg = gongWei.value.find((g: any) => g.name === (mingGongName.value || '命宫'))
    return mg || gongWei.value[0]
  }
  return gongWei.value.find((g: any) => g.name === activeGong.value)
})
</script>

<style scoped>
.ziwei-card { padding: 16rpx 0; }

.owner-info { display: flex; flex-direction: column; gap: 4rpx; padding: 24rpx; background: linear-gradient(135deg, #06B6D4, #0891B2); border-radius: 16rpx; margin-bottom: 24rpx; }
.owner-name { font-size: 36rpx; font-weight: bold; color: #fff; }
.owner-meta { font-size: 24rpx; color: rgba(255,255,255,0.85); }

.section-title { font-size: 28rpx; font-weight: 600; color: #3C2415; margin-bottom: 16rpx; padding-left: 8rpx; border-left: 4rpx solid #06B6D4; }

/* 四化 */
.sihua-bar { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.sihua-item { flex: 1; padding: 16rpx; border-radius: 12rpx; text-align: center; }
.sihua-item.lu { background: #E8F5E9; }
.sihua-item.quan { background: #FFF3E0; }
.sihua-item.ke { background: #E3F2FD; }
.sihua-item.ji { background: #FCE4EC; }
.sihua-label { font-size: 20rpx; display: block; margin-bottom: 4rpx; }
.sihua-item.lu .sihua-label { color: #2E7D32; }
.sihua-item.quan .sihua-label { color: #E65100; }
.sihua-item.ke .sihua-label { color: #1565C0; }
.sihua-item.ji .sihua-label { color: #C62828; }
.sihua-star { font-size: 26rpx; font-weight: 600; color: #3C2415; display: block; }

/* 十二宫 */
.gong-grid-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.gong-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; }
.gong-cell { padding: 12rpx 8rpx; text-align: center; border-radius: 8rpx; background: #FAFAF8; border: 2rpx solid transparent; }
.gong-cell.is-ming { border-color: #06B6D4; background: #E0F7FA; }
.gong-cell.is-shen { border-color: #EC4899; background: #FCE4EC; }
.gong-name { font-size: 22rpx; font-weight: 600; color: #3C2415; display: block; }
.gong-ganzhi { font-size: 20rpx; color: #999; display: block; margin: 2rpx 0; }
.gong-stars { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rpx; }
.gong-star { font-size: 16rpx; padding: 1rpx 6rpx; border-radius: 4rpx; }
.star-吉 { color: #2E7D32; }
.star-凶 { color: #C62828; }
.star-中性 { color: #666; }
.gong-daxian { font-size: 16rpx; color: #8b6914; display: block; margin-top: 4rpx; }

/* 宫位详情 */
.gong-detail { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.gong-qi { font-size: 22rpx; color: #8b6914; display: block; margin-bottom: 12rpx; }
.gong-all-stars { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 12rpx; }
.star-detail { padding: 8rpx 16rpx; border-radius: 10rpx; }
.star-detail.star-吉 { background: #E8F5E9; }
.star-detail.star-凶 { background: #FCE4EC; }
.star-detail.star-中性 { background: #F5F0E8; }
.star-name { font-size: 24rpx; font-weight: 600; display: block; }
.star-detail.star-吉 .star-name { color: #2E7D32; }
.star-detail.star-凶 .star-name { color: #C62828; }
.star-info { font-size: 18rpx; color: #999; display: block; }
.gong-relations { display: flex; flex-direction: column; gap: 4rpx; }
.gong-relations text { font-size: 22rpx; color: #999; }

/* 格局 */
.geshi-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.geshi-list { display: flex; flex-wrap: wrap; gap: 10rpx; }
.geshi-item { font-size: 24rpx; color: #06B6D4; background: #E0F7FA; padding: 10rpx 20rpx; border-radius: 12rpx; }
</style>
