<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">研究院入驻申请</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">基本信息</text>
        <view class="field"><text class="fl">机构名称</text><input class="fi" placeholder="请输入机构名称"/></view>
        <view class="field"><text class="fl">联系人</text><input class="fi" placeholder="请输入联系人"/></view>
        <view class="field"><text class="fl">联系电话</text><input class="fi" placeholder="请输入联系电话"/></view>
      </view>

      <view class="card"><text class="ct">资质信息</text>
        <view class="field"><text class="fl">研究方向</text>
          <view class="tags"><text v-for="t in researchTags" :key="t" class="tag" :class="{sel:selectedTags.includes(t)}" @click="toggleTag(t)">{{t}}</text></view>
        </view>
        <view class="field"><text class="fl">机构简介</text><textarea class="fi ta" placeholder="请描述机构背景和研究成果..." :rows="4"/></view>
        <view class="field"><text class="fl">资质证书</text><view class="upload-area"><text class="ua-icon">📄</text><text class="ua-hint">点击上传资质证书照片</text></view></view>
      </view>

      <view class="card"><text class="ct">申请须知</text>
        <view v-for="n in notices" :key="n" class="notice-item">• {{n}}</view>
      </view>

      <view class="btn" @click="handleSubmit">提交申请</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const selectedTags=ref<string[]>([]);const researchTags=['八字命理','紫微斗数','风水堪舆','六爻预测','奇门遁甲','梅花易数','姓名学','择日学','大六壬','太乙神数'];const notices=['申请审核需要3-5个工作日','请确保提交的资质证书真实有效','入驻后需遵守平台规则','研究院享有独立的展示页面'];function toggleTag(t:string){const i=selectedTags.value.indexOf(t);i>-1?selectedTags.value.splice(i,1):selectedTags.value.push(t)};function handleSubmit(){uni.showToast({title:'提交成功',icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.fi.ta{height:160rpx;padding:20rpx;resize:none}.tags{display:flex;flex-wrap:wrap;gap:12rpx}.tag{padding:12rpx 24rpx;background:#F5F1EB;border-radius:40rpx;font-size:22rpx;color:#999}.tag.sel{background:#C41E3A;color:#fff}.upload-area{width:100%;height:200rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8rpx}.ua-icon{font-size:48rpx}.ua-hint{font-size:22rpx;color:#999}.notice-item{font-size:24rpx;color:#666;padding:8rpx 0}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
