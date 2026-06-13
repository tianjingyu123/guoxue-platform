<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text class="back-icon">←</text><text class="nav-title">圈子智能体</text></view><text v-if="isAdmin" class="nav-settings" @click="goManage">⚙️</text></view>

    <view v-if="circle" class="circle-bar">
      <view class="cb-avatar">✨</view><view class="cb-info"><text class="cb-name">{{circle.name}}</text><text class="cb-meta">{{circle.members}}成员·{{bots.length}}个智能体</text></view>
    </view>

    <view class="search-wrap"><text class="s-icon">🔍</text><input v-model="searchQuery" class="s-input" placeholder="搜索智能体..."/></view>

    <view v-if="loading" class="skel-list"><view v-for="i in 4" :key="i" class="skel-item"/></view>
    <view v-else-if="filteredBots.length===0" class="empty"><text class="empty-icon">🤖</text><text class="empty-text">{{searchQuery?'未找到相关智能体':'暂无智能体'}}</text></view>
    <view v-else class="bot-list">
      <view v-for="bot in filteredBots" :key="bot.id" class="bot-card" @click="go(`/pages/bots/chat/id-detail/index`)">
        <view class="bc-top">
          <view class="bc-avatar"><text>🤖</text></view>
          <view class="bc-info">
            <view class="bc-name-row"><text class="bc-name">{{bot.name}}</text><text v-if="bot.isOfficial" class="bc-badge">✨</text></view>
            <text class="bc-desc">{{bot.description}}</text>
          </view>
        </view>
        <view class="bc-foot">
          <text class="bf-stat">💬{{fmt(bot.chats)}}</text>
          <text class="bf-stat">❤️{{fmt(bot.likes)}}</text>
          <view class="bf-btn">对话</view>
        </view>
      </view>
    </view>

    <view v-if="isAdmin&&!loading&&bots.length>0" class="fab" @click="goCreate">
      <text>＋</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const circle=ref<any>({name:'周易研习社',members:12800,description:'传承易学精髓'})
const bots=ref<any[]>([])
const loading=ref(true),searchQuery=ref(''),isAdmin=ref(true)

const mockBots=[{id:'1',name:'周易解卦助手',description:'专业解读六十四卦，帮助您理解卦象含义与人生指引',category:'占卜解读',chats:12580,likes:3420,isOfficial:true},{id:'2',name:'风水顾问',description:'提供家居风水布局建议',category:'风水堪舆',chats:8960,likes:2180,isOfficial:true},{id:'3',name:'八字命理分析',description:'根据生辰八字分析命理运势',category:'命理分析',chats:15620,likes:4890,isOfficial:false},{id:'4',name:'易经学习导师',description:'系统讲解易经知识，从入门到精通',category:'学习辅导',chats:6780,likes:1560,isOfficial:false}]

const filteredBots=computed(()=>{const q=searchQuery.value.toLowerCase();return bots.value.filter(b=>b.name.toLowerCase().includes(q)||b.description.toLowerCase().includes(q)||b.category.toLowerCase().includes(q))})

function fmt(n:number){return n>=10000?(n/10000).toFixed(1)+'万':n>=1000?(n/1000).toFixed(1)+'k':''+n}
function goBack(){uni.navigateBack()}
function go(u:string){uni.navigateTo({url:u})}
function goManage(){uni.navigateTo({url:'/pages/circles/id-detail/bots/manage/index'})}
function goCreate(){uni.navigateTo({url:'/pages/circles/id-detail/bots/create/index'})}

onMounted(async()=>{loading.value=true;await new Promise(r=>setTimeout(r,500));bots.value=mockBots;loading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx}
.back-icon{font-size:36rpx;color:#2C2C2C}
.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.nav-settings{font-size:32rpx;color:#666}
.circle-bar{display:flex;align-items:center;gap:16rpx;background:#fff;padding:20rpx 24rpx;border-bottom:1px solid #E8E0D5}
.cb-avatar{width:72rpx;height:72rpx;border-radius:20rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:36rpx}
.cb-name{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block}
.cb-meta{font-size:22rpx;color:#999}
.search-wrap{display:flex;align-items:center;padding:20rpx 24rpx}
.s-icon{font-size:28rpx;margin-right:12rpx}
.s-input{flex:1;height:72rpx;background:#fff;border:1px solid #E8E0D5;border-radius:40rpx;padding:0 24rpx;font-size:26rpx;color:#2C2C2C}
.skel-list{padding:24rpx}
.skel-item{height:180rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
.empty{text-align:center;padding:160rpx 0}
.empty-icon{font-size:96rpx;opacity:.3;display:block;margin-bottom:16rpx}
.empty-text{font-size:26rpx;color:#999}
.bot-list{padding:0 24rpx}
.bot-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.bc-top{display:flex;gap:16rpx}
.bc-avatar{width:80rpx;height:80rpx;border-radius:20rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:40rpx;flex-shrink:0}
.bc-info{flex:1;min-width:0}
.bc-name-row{display:flex;align-items:center;gap:8rpx}
.bc-name{font-size:28rpx;font-weight:600;color:#2C2C2C}
.bc-badge{font-size:20rpx;background:#C41E3A;color:#fff;width:32rpx;height:32rpx;border-radius:50%;display:flex;align-items:center;justify-content:center}
.bc-desc{font-size:24rpx;color:#999;margin-top:6rpx;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bc-foot{display:flex;align-items:center;gap:24rpx;padding-top:16rpx;border-top:1px solid #F5F1EB;margin-top:16rpx}
.bf-stat{font-size:22rpx;color:#999}
.bf-btn{margin-left:auto;padding:10rpx 32rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:22rpx}
.fab{position:fixed;bottom:160rpx;right:32rpx;width:92rpx;height:92rpx;border-radius:50%;background:#C41E3A;display:flex;align-items:center;justify-content:center;font-size:44rpx;color:#fff;box-shadow:0 4rpx 24rpx rgba(196,30,58,.3);z-index:45}
</style>
