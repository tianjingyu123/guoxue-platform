<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">创建直播</text></view><view class="nav-save" @click="handleCreate">创建</view></view>

    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="card"><text class="card-title">基础信息</text>
        <view class="field"><text class="fl">直播标题</text><input v-model="title" class="fi" placeholder="请输入直播标题" maxlength="30"/></view>
        <view class="field"><text class="fl">直播简介</text><textarea v-model="desc" class="fi ta" placeholder="请输入直播简介"/></view>
        <view class="field"><text class="fl">封面图片</text><view class="cover-upload"><text>🖼️</text><text class="cu-hint">点击上传封面</text></view></view>
      </view>

      <view class="card"><text class="card-title">直播设置</text>
        <view class="field"><text class="fl">关联圈子</text>
          <view class="circle-select"><text v-for="c in circleList" :key="c.id" class="cs-chip" :class="{sel:selectedCircle===c.id}" @click="selectedCircle=c.id">{{c.name}}</text></view>
        </view>
        <view class="field"><text class="fl">直播类型</text>
          <view class="type-row"><text v-for="t in liveTypes" :key="t.id" class="type-chip" :class="{sel:liveType===t.id}" @click="liveType=t.id">{{t.icon}} {{t.label}}</text></view>
        </view>
        <view class="field toggle"><text class="fl">开始时间</text><picker mode="time" :value="startTime" @change="startTime=$event.detail.value"><text>{{startTime}}</text></picker></view>
      </view>

      <view class="card"><text class="card-title">🎨 主题皮肤</text>
        <scroll-view scroll-x class="theme-scroll"><view v-for="t in themes" :key="t.id" class="theme-item" :class="{sel:selectedTheme===t.id}" @click="selectedTheme=t.id"><view class="th-preview" :style="{background: t.color}"/><text class="th-name">{{t.name}}</text></view></scroll-view>
      </view>

      <view class="card"><text class="card-title">🛍️ 关联商品</text>
        <view v-for="p in productList" :key="p.id" class="prod-row"><text class="pr-name">{{p.name}}</text><text class="pr-price">¥{{p.price}}</text><text class="pr-toggle" :class="{on:linkedProducts.includes(p.id)}" @click="toggleProduct(p.id)">{{linkedProducts.includes(p.id)?'✓':'＋'}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const title=ref(''),desc=ref(''),selectedCircle=ref(1),liveType=ref('knowledge'),startTime=ref('20:00'),selectedTheme=ref(1),linkedProducts=ref<number[]>([1])

const circleList=[{id:1,name:'易学研习社',members:2860},{id:2,name:'紫微斗数交流群',members:1580},{id:3,name:'风水布局研究会',members:960}]
const liveTypes=[{id:'knowledge',label:'知识授课',icon:'📚'},{id:'commerce',label:'带货直播',icon:'🛍️'},{id:'chat',label:'聊天互动',icon:'💬'}]
const themes=[{id:1,name:'默认',color:'linear-gradient(135deg,#555,#666)'},{id:2,name:'国风红',color:'linear-gradient(135deg,#C41E3A,#e74c3c)'},{id:3,name:'墨韵',color:'linear-gradient(135deg,#333,#555)'},{id:4,name:'金玉',color:'linear-gradient(135deg,#C9A96E,#ffd700)'}]
const productList=[{id:1,name:'渊海子平精装版',price:98},{id:2,name:'专业罗盘（铜制）',price:398},{id:3,name:'五帝钱开光套装',price:88},{id:4,name:'八字精批课程',price:199}]

function toggleProduct(id:number){const i=linkedProducts.value.indexOf(id);i>-1?linkedProducts.value.splice(i,1):linkedProducts.value.push(id)}
function handleCreate(){uni.showToast({title:'创建成功',icon:'success'})}

function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-save{color:#C41E3A;font-size:28rpx;font-weight:500;padding:8rpx 20rpx}
.content{padding:24rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.fi.ta{height:128rpx;padding:20rpx;resize:none}
.cover-upload{width:200rpx;height:140rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8rpx;font-size:32rpx}.cu-hint{font-size:20rpx;color:#999}
.circle-select{display:flex;flex-wrap:wrap;gap:12rpx}.cs-chip{padding:12rpx 24rpx;border-radius:40rpx;background:#F5F1EB;font-size:24rpx;color:#999}.cs-chip.sel{background:#C41E3A;color:#fff}
.type-row{display:flex;gap:12rpx}.type-chip{padding:16rpx 28rpx;border-radius:16rpx;background:#F5F1EB;font-size:24rpx;color:#999}.type-chip.sel{background:#C41E3A;color:#fff}
.theme-scroll{white-space:nowrap}.theme-item{display:inline-flex;flex-direction:column;align-items:center;gap:8rpx;margin-right:20rpx;padding:8rpx;border-radius:16rpx;border:2rpx solid transparent}.theme-item.sel{border-color:#C41E3A}.th-preview{width:120rpx;height:80rpx;border-radius:12rpx}.th-name{font-size:20rpx;color:#999}
.prod-row{display:flex;align-items:center;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.pr-name{font-size:26rpx;color:#2C2C2C;flex:1}.pr-price{font-size:24rpx;color:#C41E3A;margin-right:16rpx}.pr-toggle{width:48rpx;height:48rpx;border-radius:50%;border:2rpx solid #E8E0D5;display:flex;align-items:center;justify-content:center;font-size:22rpx;color:#999}.pr-toggle.on{background:#C41E3A;border-color:#C41E3A;color:#fff}
</style>
