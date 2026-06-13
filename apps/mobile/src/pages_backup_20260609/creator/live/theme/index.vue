<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">主题皮肤</text></view><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <text class="sec">预设模板</text>
      <view v-for="t in templates" :key="t.id" class="tpl-card" :class="{using:t.isUsing}">
        <view class="tpl-preview" :style="{background: t.bgGradient}"><text class="tpl-icon">{{t.preview}}</text></view>
        <view class="tpl-info"><text class="tpl-name">{{t.name}}</text><text class="tpl-desc">{{t.desc}}</text><view class="tpl-colors"><view class="tc-dot" :style="{backgroundColor:t.primaryColor}"/><view class="tc-dot" :style="{backgroundColor:t.secondaryColor}"/></view></view>
        <view class="tpl-action" @click="applyTheme(t)"><text>{{t.isUsing?'使用中':'应用'}}</text></view>
      </view>

      <text class="sec mt">自定义设置</text>
      <view class="card">
        <view class="field"><text class="fl">弹幕不透明度</text><input type="range" class="slider"/></view>
        <view class="field"><text class="fl">显示观众入场</text><switch class="sw" checked/></view>
        <view class="field"><text class="fl">显示礼物特效</text><switch class="sw" checked/></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const templates=ref([{id:'default',name:'默认主题',desc:'简洁大气',primaryColor:'#8B5CF6',secondaryColor:'#A78BFA',bgGradient:'linear-gradient(135deg,#333,#555)',preview:'🎯',isFree:true,isUsing:true},{id:'chinese',name:'新中式',desc:'古典韵味',primaryColor:'#C41E3A',secondaryColor:'#F59E0B',bgGradient:'linear-gradient(135deg,#8B0000,#3d1c00)',preview:'🏮',isFree:true,isUsing:false},{id:'ink',name:'墨韵',desc:'水墨风格',primaryColor:'#333',secondaryColor:'#666',bgGradient:'linear-gradient(135deg,#1a1a1a,#2d2d2d)',preview:'🖌️',isFree:false,isUsing:false},{id:'gold',name:'金玉满堂',desc:'奢华典雅',primaryColor:'#C9A96E',secondaryColor:'#FFD700',bgGradient:'linear-gradient(135deg,#4a2800,#8B6914)',preview:'👑',isFree:false,isUsing:false}])
function applyTheme(t:any){templates.value.forEach(x=>x.isUsing=x.id===t.id)}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.content{padding:24rpx}
.sec{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.mt{margin-top:32rpx}
.tpl-card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);border:2rpx solid transparent}.tpl-card.using{border-color:#C41E3A}.tpl-preview{width:120rpx;height:80rpx;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:40rpx;flex-shrink:0}.tpl-icon{font-size:44rpx}.tpl-info{flex:1}.tpl-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.tpl-desc{font-size:22rpx;color:#999;margin-top:4rpx}.tpl-colors{display:flex;gap:8rpx;margin-top:8rpx}.tc-dot{width:20rpx;height:20rpx;border-radius:50%}
.tpl-action{padding:12rpx 28rpx;border-radius:40rpx;font-size:24rpx;background:#C41E3A;color:#fff}
.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.field{display:flex;align-items:center;justify-content:space-between;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.fl{font-size:26rpx;color:#2C2C2C}.slider{flex:1;margin-left:24rpx}.sw{transform:scale(.8)}
</style>
