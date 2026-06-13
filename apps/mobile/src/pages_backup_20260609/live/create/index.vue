<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">创建直播</text><view class="nav-save" @click="handleCreate">创建</view></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">基础信息</text>
        <view class="field"><text class="fl">直播标题</text><input v-model="title" class="fi" placeholder="请输入直播标题" maxlength="30"/></view>
        <view class="field"><text class="fl">直播封面</text><view class="cover-upload"><text class="cu-icon">🖼️</text><text class="cu-hint">点击上传封面</text></view></view>
      </view>
      <view class="card"><text class="ct">直播设置</text>
        <view class="field"><text class="fl">直播类型</text>
          <view class="type-row"><text v-for="t in types" :key="t.key" class="tc" :class="{sel:liveType===t.key}" @click="liveType=t.key">{{t.icon}} {{t.label}}</text></view>
        </view>
        <view class="field"><text class="fl">开播时间</text><picker mode="time" :value="startTime" @change="startTime=$event.detail.value"><text>{{startTime}}</text></picker></view>
        <view class="field"><text class="fl">关联圈子</text><picker :range="circles.map(c=>c.name)"><text>{{circles[0]?.name||'请选择'}}</text></picker></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const title=ref(''),liveType=ref('knowledge'),startTime=ref('20:00');const types=[{key:'knowledge',label:'知识授课',icon:'📚'},{key:'commerce',label:'带货直播',icon:'🛍️'},{key:'chat',label:'聊天互动',icon:'💬'}];const circles=[{name:'易学研习社'},{name:'紫微斗数交流群'},{name:'风水布局研究会'}];function handleCreate(){uni.showToast({title:'创建成功',icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-save{color:#C41E3A;font-size:26rpx;font-weight:500}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.cover-upload{width:100%;height:200rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8rpx}.cu-icon{font-size:56rpx}.cu-hint{font-size:22rpx;color:#999}.type-row{display:flex;gap:12rpx}.tc{padding:14rpx 28rpx;border-radius:16rpx;background:#F5F1EB;font-size:24rpx;color:#999}.tc.sel{background:#C41E3A;color:#fff}
</style>
