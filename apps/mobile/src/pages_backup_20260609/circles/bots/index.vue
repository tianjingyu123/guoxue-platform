<template>
  <view class="page">
    <view class="top-banner">
      <view class="top-nav"><view @click="goBack"><text class="back-btn">←</text></view><text class="top-title">圈子智能体</text><view style="width:48rpx"/></view>
      <view v-if="circle" class="circle-summary">
        <view class="cs-avatar">✨</view>
        <view class="cs-info"><text class="cs-name">{{circle.name}}</text><text class="cs-desc">{{circle.description}}</text></view>
        <view class="cs-count"><text class="cs-num">{{bots.length}}</text><text class="cs-label">智能体</text></view>
      </view>
    </view>

    <view class="search-bar">
      <view class="search-wrap"><text class="search-icon">🔍</text><input v-model="keyword" class="search-input" placeholder="搜索智能体" @confirm="doSearch"/></view>
      <view class="sort-row"><text v-for="o in sortOpts" :key="o.value" class="sort-chip" :class="{active:sortBy===o.value}" @click="sortBy=o.value">{{o.label}}</text></view>
    </view>

    <view v-if="loading" class="skel-grid"><view v-for="i in 6" :key="i" class="skel-card"/></view>
    <view v-else-if="error" class="err-state"><text class="err-text">加载失败</text><view class="err-retry" @click="loadData"><text>重试</text></view></view>
    <view v-else class="bot-grid">
      <view v-for="bot in bots" :key="bot.id" class="bot-card" @click="go(`/pages/bots/chat/id-detail/index`)">
        <view class="bot-top">
          <view v-if="bot.isPinned" class="bot-badge pin">📌置顶</view>
          <view v-if="bot.isOfficial" class="bot-badge official">👑官方</view>
          <view class="bot-avatar">🤖</view>
          <text class="bot-name">{{bot.name}}</text>
          <text class="bot-desc">{{bot.description}}</text>
          <view class="bot-tags"><text v-for="t in bot.tags.slice(0,3)" :key="t" class="bot-tag">{{t}}</text></view>
        </view>
        <view class="bot-foot">
          <text class="bf-stat">⭐{{bot.rating}}</text>
          <text class="bf-stat">⚡{{fmt(bot.usageCount)}}</text>
          <text class="bf-price" :class="{free:bot.price===0}">{{bot.price>0?bot.price+'币/次':'免费'}}</text>
        </view>
      </view>
      <view v-if="bots.length===0" class="empty"><text>暂无智能体</text></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const circle=ref({name:'周易研习社',description:'传承易学精髓'})
const bots=ref<any[]>([])
const loading=ref(true),error=ref<string|null>(null),keyword=ref(''),sortBy=ref<'hot'|'new'|'usage'>('hot')
const sortOpts=[{value:'hot' as const,label:'最热'},{value:'new' as const,label:'最新'},{value:'usage' as const,label:'使用量'}]

const mockBots=[{id:'1',name:'周易解卦助手',description:'专业解读六十四卦',tags:['占卜','解读'],rating:4.9,usageCount:12580,isOfficial:true,isPinned:true,price:0},{id:'2',name:'风水顾问',description:'家居风水布局建议',tags:['风水'],rating:4.8,usageCount:8960,isOfficial:true,isPinned:false,price:5},{id:'3',name:'八字命理分析',description:'生辰八字命理分析',tags:['命理','八字'],rating:4.7,usageCount:15620,isOfficial:false,isPinned:false,price:3},{id:'4',name:'易经学习导师',description:'系统讲解易经知识',tags:['学习'],rating:4.6,usageCount:6780,isOfficial:false,isPinned:false,price:0}]

function fmt(n:number){return n>=10000?(n/10000).toFixed(1)+'万':n>=1000?(n/1000).toFixed(1)+'k':''+n}
async function loadData(){
  loading.value=true;error.value=null
  try{bots.value=mockBots}catch{error.value='加载失败'}finally{loading.value=false}
}
function doSearch(){loadData()}
function goBack(){uni.navigateBack()}
function go(u:string){uni.navigateTo({url:u})}
onMounted(()=>loadData())
onPullDownRefresh(()=>{loadData().finally(()=>uni.stopPullDownRefresh())})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.top-banner{background:linear-gradient(135deg,#C41E3A,#8B0000);padding:24rpx 24rpx 32rpx}
.top-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:20rpx}
.back-btn{font-size:36rpx;color:#fff}
.top-title{font-size:34rpx;font-weight:700;color:#fff}
.circle-summary{display:flex;align-items:center;gap:16rpx;background:rgba(255,255,255,.1);border-radius:20rpx;padding:20rpx}
.cs-avatar{width:72rpx;height:72rpx;border-radius:20rpx;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:36rpx}
.cs-info{flex:1;min-width:0}
.cs-name{font-size:28rpx;font-weight:600;color:#fff;display:block}
.cs-desc{font-size:22rpx;color:rgba(255,255,255,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.cs-count{text-align:center}
.cs-num{font-size:34rpx;font-weight:700;color:#fff;display:block}
.cs-label{font-size:20rpx;color:rgba(255,255,255,.7)}
.search-bar{padding:20rpx 24rpx;background:#FAF8F5}
.search-wrap{display:flex;align-items:center;background:#fff;border-radius:40rpx;padding:0 20rpx;margin-bottom:16rpx}
.search-icon{font-size:28rpx;margin-right:12rpx}
.search-input{flex:1;height:72rpx;font-size:26rpx;color:#2C2C2C}
.sort-row{display:flex;gap:12rpx}
.sort-chip{padding:10rpx 28rpx;border-radius:40rpx;background:#fff;font-size:24rpx;color:#999}
.sort-chip.active{background:#C41E3A;color:#fff}
.skel-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;padding:24rpx}
.skel-card{height:320rpx;background:#fff;border-radius:20rpx}
.err-state{text-align:center;padding:120rpx 0}
.err-text{font-size:28rpx;color:#999;display:block;margin-bottom:24rpx}
.err-retry{display:inline-block;padding:16rpx 48rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:26rpx}
.bot-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;padding:0 24rpx 48rpx}
.bot-card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.bot-top{display:flex;flex-direction:column;align-items:center}
.bot-badge{font-size:18rpx;padding:4rpx 12rpx;border-radius:8rpx;margin-bottom:8rpx}
.bot-badge.pin{background:rgba(196,30,58,.1);color:#C41E3A}
.bot-badge.official{background:#C9A96E;color:#fff}
.bot-avatar{width:88rpx;height:88rpx;border-radius:20rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:44rpx;margin-bottom:12rpx}
.bot-name{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:6rpx}
.bot-desc{font-size:22rpx;color:#999;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12rpx}
.bot-tags{display:flex;gap:6rpx;flex-wrap:wrap;justify-content:center;margin-bottom:16rpx}
.bot-tag{font-size:18rpx;padding:4rpx 12rpx;background:#FAF8F5;border-radius:8rpx;color:#999}
.bot-foot{display:flex;align-items:center;justify-content:space-between;padding-top:16rpx;border-top:1px solid #F5F1EB}
.bf-stat{font-size:20rpx;color:#999}
.bf-price{font-size:22rpx;color:#C41E3A;font-weight:500}
.bf-price.free{color:#22c55e}
.empty{grid-column:span 2;text-align:center;padding:80rpx 0;font-size:26rpx;color:#999}
</style>
